import type { Express } from "express";
import { createServer, type Server } from "http";
import { Pool } from "pg";
import multer from "multer";
import path from "path";
import { localFileStorage, ObjectNotFoundError } from "./localFileStorage";
import { getSOPContext, getSOPByTitle } from "./sop-loader";
import { sendNewOpportunityEmail, sendVerificationEmail, sendEmail } from "./smtp-client";
import {
  findUserByEmail,
  createUser,
  verifyPassword,
  isAuthenticated,
  verifyEmailCode,
  requestPasswordReset,
  resetPassword
} from "./auth";
import { loginSchema, registerSchema, verifyEmailSchema, forgotPasswordSchema, resetPasswordSchema, newOpportunityFormSchema } from "@shared/schema";

// Configure multer for memory storage (files stored in buffer for cloud upload)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB limit for video uploads
  }
});

// Shared database connection pool for routes
const dbPool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Handle pool errors gracefully to prevent app crashes on connection drops
dbPool.on('error', (err) => {
  console.error('Database pool error (routes):', err.message);
});

// OpenAI features disabled for internal deployment
// Features disabled: Albers Bot chat, IDIQ opportunity scoring, trip report summarization
const OPENAI_ENABLED = false;

// Stub for OpenAI (disabled, but needed for TypeScript compilation)
const openai: any = null;

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const result = registerSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid input", 
          errors: result.error.issues 
        });
      }

      const { email, password, firstName, lastName, businessVertical } = result.data;

      // Check if user already exists
      const existingUser = await findUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ message: "User already exists" });
      }

      // Create new user and send verification email
      const user = await createUser(email, password, firstName, lastName, businessVertical);

      res.json({ 
        message: "Verification email sent. Please check your inbox.",
        email: user.email,
        requiresVerification: true
      });
    } catch (error) {
      console.error("Error during registration:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/verify", async (req, res) => {
    try {
      const result = verifyEmailSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid input", 
          errors: result.error.issues 
        });
      }

      const { email, code } = result.data;

      // Verify the email code
      const verificationResult = await verifyEmailCode(email, code);

      if (!verificationResult.success || !verificationResult.user) {
        return res.status(400).json({ message: verificationResult.message || "Verification failed" });
      }

      // Create session for the verified user
      req.session.userId = verificationResult.user.id;
      req.session.userEmail = verificationResult.user.email;

      // Explicitly save session to database before responding
      req.session.save((err) => {
        if (err) {
          console.error("Error saving session:", err);
          return res.status(500).json({ message: "Verification failed" });
        }
        
        res.json({ 
          message: "Email verified successfully",
          user: { id: verificationResult.user.id, email: verificationResult.user.email }
        });
      });
    } catch (error) {
      console.error("Error during email verification:", error);
      res.status(500).json({ message: "Verification failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const result = loginSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid input", 
          errors: result.error.issues 
        });
      }

      const { email, password } = result.data;

      // Find user
      const user = await findUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Email verification check disabled - allow unverified users to log in
      // This is useful for local development and internal deployments without SMTP
      // if (!user.email_verified) {
      //   // Generate new verification code and resend email
      //   try {
      //     const crypto = await import('crypto');
      //     const newVerificationCode = crypto.randomBytes(3).toString('hex').toUpperCase();
      //     const newExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
      //
      //     // Update user with new verification code
      //     await dbPool.query(
      //       `UPDATE users SET verification_code = $1, verification_code_expires_at = $2 WHERE id = $3`,
      //       [newVerificationCode, newExpiresAt, user.id]
      //     );
      //
      //     // Send new verification email
      //     await sendVerificationEmail(user.email, newVerificationCode);
      //
      //     return res.status(403).json({
      //       message: "Your email is not verified. We've sent a new verification code to your inbox.",
      //       requiresVerification: true,
      //       emailResent: true
      //     });
      //   } catch (emailError) {
      //     console.error("Error resending verification email:", emailError);
      //     return res.status(403).json({
      //       message: "Please verify your email before logging in. Check your inbox for the verification code.",
      //       requiresVerification: true
      //     });
      //   }
      // }

      // Verify password
      const isValidPassword = await verifyPassword(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Create session
      req.session.userId = user.id;
      req.session.userEmail = user.email;

      // Increment login count and update last login time
      try {
        await dbPool.query(
          'UPDATE users SET login_count = COALESCE(login_count, 0) + 1, last_login_at = NOW() WHERE id = $1',
          [user.id]
        );
      } catch (countError) {
        console.error("Error incrementing login count:", countError);
      }

      // Explicitly save session to database before responding
      req.session.save((err) => {
        if (err) {
          console.error("Error saving session:", err);
          return res.status(500).json({ message: "Login failed" });
        }
        
        res.json({ 
          message: "Login successful",
          user: { id: user.id, email: user.email }
        });
      });
    } catch (error) {
      console.error("Error during login:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    try {
      req.session.destroy((err) => {
        if (err) {
          console.error("Error destroying session:", err);
          return res.status(500).json({ message: "Logout failed" });
        }
        res.clearCookie('portal.sid');
        res.json({ success: true, message: "Logged out successfully" });
      });
    } catch (error) {
      console.error("Error during logout:", error);
      res.status(500).json({ message: "Logout failed" });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await findUserByEmail(req.session.userEmail!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ 
        user: { 
          id: user.id, 
          email: user.email, 
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role || "viewer",
          managedDivisions: user.managedDivisions
        }
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Forgot password route
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const result = forgotPasswordSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid input", 
          errors: result.error.issues 
        });
      }

      const { email } = result.data;
      
      // Get base URL from request
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.headers.host;
      const baseUrl = `${protocol}://${host}`;
      
      // Request password reset (always returns success message for security)
      const response = await requestPasswordReset(email, baseUrl);
      
      res.json(response);
    } catch (error) {
      console.error("Error requesting password reset:", error);
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

  // Reset password route
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const result = resetPasswordSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid input", 
          errors: result.error.issues 
        });
      }

      const { token, newPassword } = result.data;
      
      const response = await resetPassword(token, newPassword);
      
      if (!response.success) {
        return res.status(400).json(response);
      }
      
      res.json(response);
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Admin routes - Get all users
  app.get("/api/admin/users", isAuthenticated, async (req, res) => {
    try {
      // Get current user to check if admin
      const currentUser = await findUserByEmail(req.session.userEmail!);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }

      // Fetch all users from database
      const result = await dbPool.query(
        "SELECT id, email, first_name, last_name, role, managed_divisions, email_verified, created_at, business_vertical FROM users ORDER BY created_at DESC"
      );
      
      const users = result.rows.map(row => ({
        id: row.id,
        email: row.email,
        firstName: row.first_name,
        lastName: row.last_name,
        role: row.role || "viewer",
        managedDivisions: row.managed_divisions || [],
        isVerified: row.email_verified,
        createdAt: row.created_at,
        businessVertical: row.business_vertical
      }));

      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Admin routes - Update user role and permissions
  app.patch("/api/admin/users", isAuthenticated, async (req, res) => {
    try {
      // Get current user to check if admin
      const currentUser = await findUserByEmail(req.session.userEmail!);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }

      const { userId, role, managedDivisions, firstName, lastName, businessVertical } = req.body;

      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      // Validate role if provided - updated to include division-specific admin roles
      const validRoles = ["admin", "corporate_admin", "defense_admin", "industrials_admin", "advanced_admin", "bou_admin", "bd_admin", "viewer"];
      if (role && !validRoles.includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      // Validate business vertical if provided
      const validVerticals = ["corporate", "defense", "industrials", "advanced_programs", "bou"];
      if (businessVertical && !validVerticals.includes(businessVertical)) {
        return res.status(400).json({ message: "Invalid business vertical" });
      }

      // Get the user's current role and info before updating
      const userResult = await dbPool.query(
        "SELECT email, first_name, last_name, role, business_vertical FROM users WHERE id = $1",
        [userId]
      );
      
      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const targetUser = userResult.rows[0];
      const previousRole = targetUser.role;
      const newRole = role || previousRole;
      const isBecomingAdmin = newRole !== "viewer" && (previousRole === "viewer" || previousRole !== newRole);

      // Build dynamic update query based on provided fields
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (role !== undefined) {
        updates.push(`role = $${paramIndex}`);
        values.push(role);
        paramIndex++;
      }
      if (managedDivisions !== undefined) {
        updates.push(`managed_divisions = $${paramIndex}`);
        values.push(managedDivisions || []);
        paramIndex++;
      }
      if (firstName !== undefined) {
        updates.push(`first_name = $${paramIndex}`);
        values.push(firstName);
        paramIndex++;
      }
      if (lastName !== undefined) {
        updates.push(`last_name = $${paramIndex}`);
        values.push(lastName);
        paramIndex++;
      }
      if (businessVertical !== undefined) {
        updates.push(`business_vertical = $${paramIndex}`);
        values.push(businessVertical);
        paramIndex++;
      }

      if (updates.length === 0) {
        return res.status(400).json({ message: "No fields to update" });
      }

      values.push(userId);
      await dbPool.query(
        `UPDATE users SET ${updates.join(", ")} WHERE id = $${paramIndex}`,
        values
      );

      // Send email notification if user is being assigned an admin role
      if (isBecomingAdmin && role !== "viewer") {
        try {
          const { sendAdminAssignmentEmail } = await import("./smtp-client");
          const intranetUrl = process.env.BASE_URL || "http://localhost:5000";

          await sendAdminAssignmentEmail(
            targetUser.email,
            targetUser.first_name || targetUser.email.split('@')[0],
            role,
            intranetUrl
          );
          console.log(`Admin assignment email sent to ${targetUser.email} for role ${role}`);
        } catch (emailError) {
          console.error("Failed to send admin assignment email:", emailError);
          // Don't fail the request if email fails - role was still updated
        }
      }

      res.json({ success: true, message: "User updated successfully" });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Admin analytics endpoint
  app.get("/api/admin/analytics", isAuthenticated, async (req, res) => {
    try {
      // Get current user to check if admin
      const currentUser = await findUserByEmail(req.session.userEmail!);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }

      // Get user stats by role
      const roleStatsResult = await dbPool.query(`
        SELECT role, COUNT(*) as count 
        FROM users 
        GROUP BY role 
        ORDER BY count DESC
      `);

      // Get user stats by business vertical
      const verticalStatsResult = await dbPool.query(`
        SELECT business_vertical, COUNT(*) as count 
        FROM users 
        WHERE business_vertical IS NOT NULL
        GROUP BY business_vertical 
        ORDER BY count DESC
      `);

      // Get total users and verified users
      const totalsResult = await dbPool.query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(*) FILTER (WHERE email_verified = true) as verified_users,
          COUNT(*) FILTER (WHERE email_verified = false) as unverified_users
        FROM users
      `);

      // Get news article stats (totals)
      const newsStatsResult = await dbPool.query(`
        SELECT 
          COUNT(*) as total_articles,
          COUNT(*) FILTER (WHERE is_pinned = true) as pinned_articles,
          COUNT(*) FILTER (WHERE attachment_url IS NOT NULL) as articles_with_attachments
        FROM news_articles
      `);

      // Get news article stats by vertical
      const newsStatsByVerticalResult = await dbPool.query(`
        SELECT 
          division,
          COUNT(*) as total_articles,
          COUNT(*) FILTER (WHERE is_pinned = true) as pinned_articles,
          COUNT(*) FILTER (WHERE attachment_url IS NOT NULL) as articles_with_attachments
        FROM news_articles
        GROUP BY division
        ORDER BY division
      `);

      // Get recent registrations (last 30 days, by day)
      const recentRegistrationsResult = await dbPool.query(`
        SELECT 
          DATE(verification_code_expires_at - INTERVAL '15 minutes') as registration_date,
          COUNT(*) as count
        FROM users 
        WHERE verification_code_expires_at IS NOT NULL 
          OR email_verified = true
        GROUP BY DATE(verification_code_expires_at - INTERVAL '15 minutes')
        ORDER BY registration_date DESC
        LIMIT 30
      `);

      // Get top 10 users by login count
      const topUsersResult = await dbPool.query(`
        SELECT 
          id,
          email,
          first_name,
          last_name,
          COALESCE(login_count, 0) as login_count,
          business_vertical
        FROM users 
        WHERE email_verified = true
        ORDER BY login_count DESC
        LIMIT 10
      `);

      const roleStats = roleStatsResult.rows.map(row => ({
        role: row.role || 'viewer',
        count: parseInt(row.count)
      }));

      const verticalStats = verticalStatsResult.rows.map(row => ({
        vertical: row.business_vertical,
        count: parseInt(row.count)
      }));

      const totals = totalsResult.rows[0];
      const newsStats = newsStatsResult.rows[0];
      const newsStatsByVertical = newsStatsByVerticalResult.rows.map(row => ({
        division: row.division,
        totalArticles: parseInt(row.total_articles || 0),
        pinnedArticles: parseInt(row.pinned_articles || 0),
        articlesWithAttachments: parseInt(row.articles_with_attachments || 0)
      }));

      res.json({
        totalUsers: parseInt(totals.total_users),
        verifiedUsers: parseInt(totals.verified_users),
        unverifiedUsers: parseInt(totals.unverified_users),
        roleDistribution: roleStats,
        verticalDistribution: verticalStats,
        newsStats: {
          totalArticles: parseInt(newsStats?.total_articles || 0),
          pinnedArticles: parseInt(newsStats?.pinned_articles || 0),
          articlesWithAttachments: parseInt(newsStats?.articles_with_attachments || 0)
        },
        newsStatsByVertical,
        recentRegistrations: recentRegistrationsResult.rows.map(row => ({
          date: row.registration_date,
          count: parseInt(row.count)
        })),
        topUsers: topUsersResult.rows.map(row => ({
          id: row.id,
          email: row.email,
          firstName: row.first_name,
          lastName: row.last_name,
          loginCount: parseInt(row.login_count),
          businessVertical: row.business_vertical
        }))
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Endpoint to get upload URL for file uploads
  // Disabled: This endpoint was for client-side GCS uploads which is not supported with local storage
  // Use /api/upload endpoint instead for server-side file uploads
  app.post("/api/objects/upload", async (req, res) => {
    res.status(501).json({ error: "Client-side uploads not supported. Use /api/upload endpoint instead." });
  });

  // Generic file upload endpoint for content blocks and other features
  app.post("/api/upload", isAuthenticated, upload.single("file"), async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No file provided" });
      }

      // Upload to local file storage
      const customPath = `content-blocks/${Date.now()}-${crypto.randomUUID()}`;
      const fileUrl = await localFileStorage.uploadFile(file.buffer, file.originalname, customPath);

      res.json({ url: fileUrl, fileName: file.originalname });
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  // Endpoint to serve uploaded files (new path)
  app.get("/api/files/:filename", async (req, res) => {
    try {
      const filename = req.params.filename;
      await localFileStorage.downloadFile(filename, res);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Legacy endpoint for backwards compatibility with old URLs
  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      // Extract filename from legacy path
      const filename = localFileStorage.extractFilename(req.path);
      await localFileStorage.downloadFile(filename, res);
    } catch (error) {
      console.error("Error downloading object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Endpoint to serve public assets from local file storage (hero video, etc.)
  app.get("/api/public-assets/:fileName(*)", async (req, res) => {
    try {
      const fileName = req.params.fileName;
      // Map public-assets path to actual file storage path
      const filePath = `public/${fileName}`;
      await localFileStorage.downloadFile(filePath, res);
    } catch (error) {
      console.error("Error serving public asset:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      res.status(500).json({ error: "Failed to serve asset" });
    }
  });

  // Endpoint to fetch SOP content by title
  app.get("/api/sops/:title", async (req, res) => {
    try {
      const title = decodeURIComponent(req.params.title);
      const sop = await getSOPByTitle(title);
      
      if (!sop) {
        return res.status(404).json({ error: "SOP not found" });
      }
      
      res.json(sop);
    } catch (error) {
      console.error("Error fetching SOP:", error);
      res.status(500).json({ error: "Failed to fetch SOP" });
    }
  });

  // Universal search endpoint for command palette
  app.get("/api/search", async (req, res) => {
    try {
      const searchQuery = (req.query.q as string || "").toLowerCase();
      
      if (!searchQuery || searchQuery.length < 2) {
        return res.json({ news: [], sops: [] });
      }

      // Search news articles using shared pool
      const newsResult = await dbPool.query(
        `SELECT id, title, summary, division, published_at 
         FROM news_articles 
         WHERE (LOWER(title) LIKE $1 OR LOWER(summary) LIKE $1 OR LOWER(content) LIKE $1)
         AND is_archived = false
         ORDER BY published_at DESC
         LIMIT 5`,
        [`%${searchQuery}%`]
      );

      // Search SOPs using actual SOP documents from getSOPContext
      const { loadSOPDocuments } = await import("./sop-loader");
      const sopDocuments = await loadSOPDocuments();
      
      // Match SOPs based on title and content
      const sopMatches = sopDocuments
        .filter(doc => {
          const searchLower = searchQuery.toLowerCase();
          return (
            doc.title.toLowerCase().includes(searchLower) ||
            doc.category.toLowerCase().includes(searchLower) ||
            doc.content.toLowerCase().includes(searchLower)
          );
        })
        .slice(0, 5) // Limit to 5 results
        .map(doc => ({
          title: doc.title,
          category: doc.category
        }));

      res.json({
        news: newsResult.rows,
        sops: sopMatches
      });
    } catch (error) {
      console.error("Error in search endpoint:", error);
      res.status(500).json({ error: "Search failed" });
    }
  });

  // Endpoint to save solicitation info (with file paths from object storage)
  app.post("/api/solicitations", async (req, res) => {
    try {
      const { 
        solicitationName,
        solicitationNumber,
        solicitationType,
        customer,
        publicationDate,
        dueDate,
        periodOfPerformance,
        budget,
        captureManager,
        customerContact,
        opportunityLink,
        notes,
        filePaths
      } = req.body;

      // In a real app, you'd save this to a database
      // For now, we'll just return success with the data
      
      res.json({
        success: true,
        data: {
          solicitationName,
          solicitationNumber,
          solicitationType,
          customer,
          publicationDate,
          dueDate,
          periodOfPerformance,
          budget,
          captureManager,
          customerContact,
          opportunityLink,
          notes,
          filesCount: filePaths?.length || 0,
          filePaths: filePaths || []
        }
      });
    } catch (error) {
      console.error("Error saving solicitation:", error);
      res.status(500).json({ error: "Failed to save solicitation information" });
    }
  });

  // Endpoint to submit new opportunity form
  app.post("/api/new-opportunity", async (req, res) => {
    try {
      // Validate the form data
      const result = newOpportunityFormSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid form data", 
          errors: result.error.issues 
        });
      }

      // Send email with form data
      await sendNewOpportunityEmail(result.data);

      res.json({
        success: true,
        message: "New opportunity form has been submitted and emailed successfully"
      });
    } catch (error) {
      console.error("Error submitting new opportunity:", error);
      res.status(500).json({ error: "Failed to submit new opportunity form" });
    }
  });

  // Endpoint to submit capture questions to Proposal Team via email
  app.post("/api/capture-questions/submit", async (req, res) => {
    try {
      const { 
        solicitationInfo,
        analysisAnswers,
        intelAnswers,
        solutionAnswers,
        completionPercentage
      } = req.body;

      // Validate completion percentage
      if (completionPercentage < 80) {
        return res.status(400).json({ 
          error: "Capture questions must be at least 80% complete before submitting" 
        });
      }

      // Build email content
      const captureManagerName = solicitationInfo.captureManager || "Unknown";
      
      let emailHtml = `
        <h2>Capture Questions Submission</h2>
        <p><strong>From:</strong> ${captureManagerName}</p>
        <p><strong>Completion:</strong> ${completionPercentage}%</p>
        <hr />
        
        <h3>Solicitation Information</h3>
        <ul>
          <li><strong>Name:</strong> ${solicitationInfo.solicitationName || 'N/A'}</li>
          <li><strong>Number:</strong> ${solicitationInfo.solicitationNumber || 'N/A'}</li>
          <li><strong>Type:</strong> ${solicitationInfo.solicitationType || 'N/A'}</li>
          <li><strong>Customer:</strong> ${solicitationInfo.customer || 'N/A'}</li>
          <li><strong>Publication Date:</strong> ${solicitationInfo.publicationDate || 'N/A'}</li>
          <li><strong>Due Date:</strong> ${solicitationInfo.dueDate || 'N/A'}</li>
          <li><strong>Period of Performance:</strong> ${solicitationInfo.periodOfPerformance || 'N/A'}</li>
          <li><strong>Budget:</strong> ${solicitationInfo.budget || 'N/A'}</li>
          <li><strong>Customer Contact:</strong> ${solicitationInfo.customerContact || 'N/A'}</li>
          <li><strong>Opportunity Link:</strong> ${solicitationInfo.opportunityLink ? `<a href="${solicitationInfo.opportunityLink}">${solicitationInfo.opportunityLink}</a>` : 'N/A'}</li>
        </ul>
        ${solicitationInfo.notes ? `<p><strong>Notes:</strong> ${solicitationInfo.notes}</p>` : ''}
        
        <hr />
        <h3>Analysis Phase</h3>
      `;

      Object.entries(analysisAnswers).forEach(([question, answer]) => {
        if (answer) {
          emailHtml += `<p><strong>${question}</strong><br/>${answer}</p>`;
        }
      });

      emailHtml += `<hr /><h3>Intel Phase</h3>`;
      Object.entries(intelAnswers).forEach(([question, answer]) => {
        if (answer) {
          emailHtml += `<p><strong>${question}</strong><br/>${answer}</p>`;
        }
      });

      emailHtml += `<hr /><h3>Solution Phase</h3>`;
      Object.entries(solutionAnswers).forEach(([question, answer]) => {
        if (answer) {
          emailHtml += `<p><strong>${question}</strong><br/>${answer}</p>`;
        }
      });

      // Send email
      await sendEmail({
        to: ['gjames@albers.aero', 'rflood@albers.aero'],
        subject: `Capture Questions from ${captureManagerName}`,
        html: emailHtml
      });

      res.json({
        success: true,
        message: "Capture questions submitted successfully"
      });
    } catch (error) {
      console.error("Error submitting capture questions:", error);
      res.status(500).json({ error: "Failed to submit capture questions" });
    }
  });


  // =============================================
  // NEWS ARTICLES API ROUTES
  // =============================================
  
  // Get news articles (with optional division filter)
  app.get("/api/news", async (req, res) => {
    try {
      const { division, limit, includeArchived } = req.query;
      
      let query = `
        SELECT * FROM news_articles 
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramIndex = 1;
      
      if (division) {
        query += ` AND division = $${paramIndex}`;
        params.push(division);
        paramIndex++;
      }
      
      if (includeArchived !== 'true') {
        query += ` AND is_archived = false`;
      }
      
      // Sort by pinned first, then by published date
      query += ` ORDER BY is_pinned DESC, published_at DESC`;
      
      if (limit) {
        query += ` LIMIT $${paramIndex}`;
        params.push(parseInt(limit as string));
      }
      
      const result = await dbPool.query(query, params);
      
      // Transform snake_case to camelCase for frontend compatibility
      const articles = result.rows.map(row => ({
        id: row.id,
        division: row.division,
        title: row.title,
        summary: row.summary,
        content: row.content,
        publishedAt: row.published_at,
        createdAt: row.created_at,
        createdBy: row.created_by,
        isArchived: row.is_archived,
        isPinned: row.is_pinned,
      }));
      
      res.json(articles);
    } catch (error) {
      console.error("Error fetching news articles:", error);
      res.status(500).json({ error: "Failed to fetch news articles" });
    }
  });
  
  // Get single news article
  app.get("/api/news/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      const result = await dbPool.query(
        'SELECT * FROM news_articles WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Article not found" });
      }
      
      // Transform snake_case to camelCase
      const row = result.rows[0];
      res.json({
        id: row.id,
        division: row.division,
        title: row.title,
        summary: row.summary,
        content: row.content,
        publishedAt: row.published_at,
        createdAt: row.created_at,
        createdBy: row.created_by,
        isArchived: row.is_archived,
        isPinned: row.is_pinned,
      });
    } catch (error) {
      console.error("Error fetching news article:", error);
      res.status(500).json({ error: "Failed to fetch news article" });
    }
  });
  
  // Create news article (admin or division admin)
  app.post("/api/news", isAuthenticated, async (req, res) => {
    try {
      const { division, title, summary, content, publishedAt, attachmentUrl, attachmentName, attachmentType } = req.body;
      const targetDivision = division || 'corporate';
      
      // Check if user has permission to create in this division
      const userResult = await dbPool.query(
        'SELECT role FROM users WHERE id = $1',
        [req.session.userId]
      );
      
      if (userResult.rows.length === 0) {
        return res.status(403).json({ error: "User not found" });
      }
      
      const userRole = userResult.rows[0].role;
      const { canEditDivision } = await import("./permissions");
      
      if (!canEditDivision(userRole, targetDivision)) {
        return res.status(403).json({ error: "You don't have permission to create content in this division" });
      }
      
      if (!title || !content) {
        return res.status(400).json({ error: "Title and content are required" });
      }
      
      // Default summary to first 100 characters of content if not provided
      const bulletinSummary = summary || content.substring(0, 100);
      
      const result = await dbPool.query(
        `INSERT INTO news_articles (division, title, summary, content, published_at, created_by, attachment_url, attachment_name, attachment_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [targetDivision, title, bulletinSummary, content, publishedAt || new Date(), req.session.userId, attachmentUrl || null, attachmentName || null, attachmentType || null]
      );
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error creating news article:", error);
      res.status(500).json({ error: "Failed to create news article" });
    }
  });
  
  // Toggle pin status for news article (admin or division admin)
  app.patch("/api/news/:id/pin", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get user role
      const userResult = await dbPool.query(
        'SELECT role FROM users WHERE id = $1',
        [req.session.userId]
      );
      
      if (userResult.rows.length === 0) {
        return res.status(403).json({ error: "User not found" });
      }
      
      // Get the article's current division and pin status
      const articleResult = await dbPool.query(
        'SELECT division, is_pinned FROM news_articles WHERE id = $1',
        [id]
      );
      
      if (articleResult.rows.length === 0) {
        return res.status(404).json({ error: "Article not found" });
      }
      
      const userRole = userResult.rows[0].role;
      const articleDivision = articleResult.rows[0].division;
      const currentPinned = articleResult.rows[0].is_pinned;
      const { canEditDivision } = await import("./permissions");
      
      if (!canEditDivision(userRole, articleDivision)) {
        return res.status(403).json({ error: "You don't have permission to pin/unpin content in this division" });
      }
      
      const result = await dbPool.query(
        `UPDATE news_articles 
         SET is_pinned = $1,
             updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [!currentPinned, id]
      );
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error toggling pin status:", error);
      res.status(500).json({ error: "Failed to toggle pin status" });
    }
  });

  // Update news article (admin or division admin)
  app.patch("/api/news/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { division, title, summary, content, isArchived, isPinned, attachmentUrl, attachmentName, attachmentType } = req.body;
      
      // Get user role and article division
      const userResult = await dbPool.query(
        'SELECT role FROM users WHERE id = $1',
        [req.session.userId]
      );
      
      if (userResult.rows.length === 0) {
        return res.status(403).json({ error: "User not found" });
      }
      
      // Get the article's current division to check permissions
      const articleResult = await dbPool.query(
        'SELECT division FROM news_articles WHERE id = $1',
        [id]
      );
      
      if (articleResult.rows.length === 0) {
        return res.status(404).json({ error: "Article not found" });
      }
      
      const userRole = userResult.rows[0].role;
      const articleDivision = articleResult.rows[0].division;
      const { canEditDivision } = await import("./permissions");
      
      if (!canEditDivision(userRole, articleDivision)) {
        return res.status(403).json({ error: "You don't have permission to edit content in this division" });
      }
      
      // Auto-update summary when content is changed (if no explicit summary provided)
      const updatedSummary = summary || (content ? content.substring(0, 100) : null);
      
      const result = await dbPool.query(
        `UPDATE news_articles 
         SET division = COALESCE($1, division),
             title = COALESCE($2, title),
             summary = COALESCE($3, summary),
             content = COALESCE($4, content),
             is_archived = COALESCE($5, is_archived),
             is_pinned = COALESCE($6, is_pinned),
             attachment_url = COALESCE($7, attachment_url),
             attachment_name = COALESCE($8, attachment_name),
             attachment_type = COALESCE($9, attachment_type),
             updated_at = NOW()
         WHERE id = $10
         RETURNING *`,
        [division, title, updatedSummary, content, isArchived, isPinned, attachmentUrl, attachmentName, attachmentType, id]
      );
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error updating news article:", error);
      res.status(500).json({ error: "Failed to update news article" });
    }
  });
  
  // Delete news article (admin or division admin)
  app.delete("/api/news/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get user role
      const userResult = await dbPool.query(
        'SELECT role FROM users WHERE id = $1',
        [req.session.userId]
      );
      
      if (userResult.rows.length === 0) {
        return res.status(403).json({ error: "User not found" });
      }
      
      // Get the article's division to check permissions
      const articleResult = await dbPool.query(
        'SELECT division FROM news_articles WHERE id = $1',
        [id]
      );
      
      if (articleResult.rows.length === 0) {
        return res.status(404).json({ error: "Article not found" });
      }
      
      const userRole = userResult.rows[0].role;
      const articleDivision = articleResult.rows[0].division;
      const { canEditDivision } = await import("./permissions");
      
      if (!canEditDivision(userRole, articleDivision)) {
        return res.status(403).json({ error: "You don't have permission to delete content in this division" });
      }
      
      await dbPool.query(
        'DELETE FROM news_articles WHERE id = $1',
        [id]
      );
      
      res.json({ success: true, message: "Article deleted" });
    } catch (error) {
      console.error("Error deleting news article:", error);
      res.status(500).json({ error: "Failed to delete news article" });
    }
  });
  
  // Archive/unarchive news article (admin or division admin)
  app.post("/api/news/:id/archive", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { isArchived } = req.body;
      
      // Get user role
      const userResult = await dbPool.query(
        'SELECT role FROM users WHERE id = $1',
        [req.session.userId]
      );
      
      if (userResult.rows.length === 0) {
        return res.status(403).json({ error: "User not found" });
      }
      
      // Get the article's division to check permissions
      const articleResult = await dbPool.query(
        'SELECT division FROM news_articles WHERE id = $1',
        [id]
      );
      
      if (articleResult.rows.length === 0) {
        return res.status(404).json({ error: "Article not found" });
      }
      
      const userRole = userResult.rows[0].role;
      const articleDivision = articleResult.rows[0].division;
      const { canEditDivision } = await import("./permissions");
      
      if (!canEditDivision(userRole, articleDivision)) {
        return res.status(403).json({ error: "You don't have permission to archive content in this division" });
      }
      
      const result = await dbPool.query(
        `UPDATE news_articles 
         SET is_archived = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [isArchived, id]
      );
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error archiving news article:", error);
      res.status(500).json({ error: "Failed to archive news article" });
    }
  });

  // =============================================
  // NEWSLETTERS API ROUTES
  // =============================================
  
  // Get newsletters (with optional division filter)
  app.get("/api/newsletters", async (req, res) => {
    try {
      const { division, limit } = req.query;
      
      let query = `SELECT * FROM newsletters WHERE 1=1`;
      const params: any[] = [];
      let paramIndex = 1;
      
      if (division) {
        query += ` AND division = $${paramIndex}`;
        params.push(division);
        paramIndex++;
      }
      
      query += ` ORDER BY published_at DESC`;
      
      if (limit) {
        query += ` LIMIT $${paramIndex}`;
        params.push(parseInt(limit as string));
      }
      
      const result = await dbPool.query(query, params);
      
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching newsletters:", error);
      res.status(500).json({ error: "Failed to fetch newsletters" });
    }
  });
  
  // Get current newsletter for a division
  app.get("/api/newsletters/current/:division", async (req, res) => {
    try {
      const { division } = req.params;
      
      const result = await dbPool.query(
        `SELECT * FROM newsletters 
         WHERE division = $1 AND is_current = true 
         ORDER BY published_at DESC 
         LIMIT 1`,
        [division]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "No current newsletter found for this division" });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error fetching current newsletter:", error);
      res.status(500).json({ error: "Failed to fetch current newsletter" });
    }
  });

  // Upload newsletter (admin only) - auto-archives previous current newsletter
  app.post("/api/newsletters", isAuthenticated, async (req, res) => {
    const client = await dbPool.connect();
    try {
      // Check if user is admin
      const userResult = await client.query(
        'SELECT role FROM users WHERE id = $1',
        [req.session.userId]
      );
      
      if (userResult.rows.length === 0 || userResult.rows[0].role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const { division, title, description, fileUrl, fileName, publishedAt } = req.body;
      
      if (!title || !fileUrl || !fileName) {
        return res.status(400).json({ error: "Title, file URL, and file name are required" });
      }
      
      const targetDivision = division || 'corporate';
      
      // Use transaction to ensure atomicity of archive + insert
      await client.query('BEGIN');
      
      // Archive all current newsletters for this division
      await client.query(
        `UPDATE newsletters SET is_current = false WHERE division = $1 AND is_current = true`,
        [targetDivision]
      );
      
      // Insert new newsletter as current
      const result = await client.query(
        `INSERT INTO newsletters (division, title, description, file_url, file_name, published_at, is_current, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6, true, $7)
         RETURNING *`,
        [targetDivision, title, description, fileUrl, fileName, publishedAt || new Date(), req.session.userId]
      );
      
      await client.query('COMMIT');
      
      res.json(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error("Error creating newsletter:", error);
      res.status(500).json({ error: "Failed to create newsletter" });
    } finally {
      client.release();
    }
  });
  
  // Delete newsletter (admin only)
  app.delete("/api/newsletters/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if user is admin
      const userResult = await dbPool.query(
        'SELECT role FROM users WHERE id = $1',
        [req.session.userId]
      );
      
      if (userResult.rows.length === 0 || userResult.rows[0].role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const result = await dbPool.query(
        'DELETE FROM newsletters WHERE id = $1 RETURNING *',
        [id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Newsletter not found" });
      }
      
      res.json({ success: true, message: "Newsletter deleted" });
    } catch (error) {
      console.error("Error deleting newsletter:", error);
      res.status(500).json({ error: "Failed to delete newsletter" });
    }
  });

  // Track newsletter view
  app.post("/api/newsletters/:id/view", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId;
      
      // Get user's business vertical
      const userResult = await dbPool.query(
        'SELECT business_vertical FROM users WHERE id = $1',
        [userId]
      );
      
      const userDivision = userResult.rows[0]?.business_vertical || null;
      
      // Record the view (allow multiple views from same user to track engagement)
      await dbPool.query(
        `INSERT INTO newsletter_views (newsletter_id, user_id, user_division)
         VALUES ($1, $2, $3)`,
        [id, userId, userDivision]
      );
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error tracking newsletter view:", error);
      res.status(500).json({ error: "Failed to track view" });
    }
  });

  // Get newsletter analytics (admin only)
  app.get("/api/newsletters/:id/analytics", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if user is admin
      const userResult = await dbPool.query(
        'SELECT role FROM users WHERE id = $1',
        [req.session.userId]
      );
      
      if (userResult.rows.length === 0 || userResult.rows[0].role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      // Get total unique views
      const totalViewsResult = await dbPool.query(
        `SELECT COUNT(DISTINCT user_id) as unique_views, COUNT(*) as total_views
         FROM newsletter_views WHERE newsletter_id = $1`,
        [id]
      );
      
      // Get views by division
      const divisionViewsResult = await dbPool.query(
        `SELECT 
           COALESCE(user_division::text, 'unassigned') as division,
           COUNT(DISTINCT user_id) as unique_views,
           COUNT(*) as total_views
         FROM newsletter_views 
         WHERE newsletter_id = $1
         GROUP BY user_division
         ORDER BY unique_views DESC`,
        [id]
      );
      
      // Get individual user views with details
      const userViewsResult = await dbPool.query(
        `SELECT 
           u.id as user_id,
           u.email,
           u.first_name,
           u.last_name,
           u.business_vertical,
           COUNT(*) as view_count,
           MAX(nv.viewed_at) as last_viewed
         FROM newsletter_views nv
         JOIN users u ON nv.user_id = u.id
         WHERE nv.newsletter_id = $1
         GROUP BY u.id, u.email, u.first_name, u.last_name, u.business_vertical
         ORDER BY last_viewed DESC`,
        [id]
      );
      
      res.json({
        uniqueViews: parseInt(totalViewsResult.rows[0]?.unique_views || '0'),
        totalViews: parseInt(totalViewsResult.rows[0]?.total_views || '0'),
        byDivision: divisionViewsResult.rows.map(row => ({
          division: row.division,
          uniqueViews: parseInt(row.unique_views),
          totalViews: parseInt(row.total_views)
        })),
        byUser: userViewsResult.rows.map(row => ({
          userId: row.user_id,
          email: row.email,
          firstName: row.first_name,
          lastName: row.last_name,
          division: row.business_vertical,
          viewCount: parseInt(row.view_count),
          lastViewed: row.last_viewed
        }))
      });
    } catch (error) {
      console.error("Error fetching newsletter analytics:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // Get all newsletters analytics summary (admin only)
  app.get("/api/newsletters/analytics", isAuthenticated, async (req, res) => {
    try {
      // Check if user is admin
      const userResult = await dbPool.query(
        'SELECT role FROM users WHERE id = $1',
        [req.session.userId]
      );
      
      if (userResult.rows.length === 0 || userResult.rows[0].role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      // Get view stats for all newsletters
      const statsResult = await dbPool.query(
        `SELECT 
           n.id,
           n.title,
           n.division,
           n.is_current,
           n.published_at,
           COALESCE(COUNT(DISTINCT nv.user_id), 0) as unique_views,
           COALESCE(COUNT(nv.id), 0) as total_views
         FROM newsletters n
         LEFT JOIN newsletter_views nv ON n.id = nv.newsletter_id
         GROUP BY n.id, n.title, n.division, n.is_current, n.published_at
         ORDER BY n.published_at DESC`
      );
      
      res.json(statsResult.rows.map(row => ({
        id: row.id,
        title: row.title,
        division: row.division,
        isCurrent: row.is_current,
        publishedAt: row.published_at,
        uniqueViews: parseInt(row.unique_views),
        totalViews: parseInt(row.total_views)
      })));
    } catch (error) {
      console.error("Error fetching newsletters analytics:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // =============================================
  // Custom Content Blocks API (for homepage customization)
  // =============================================

  // Get content block for a division (public - no authentication required)
  app.get("/api/content-blocks/:division/:blockType", async (req, res) => {
    try {
      const { division, blockType } = req.params;
      
      const result = await dbPool.query(
        `SELECT * FROM custom_content_blocks 
         WHERE division = $1 AND block_type = $2 AND is_active = true
         LIMIT 1`,
        [division, blockType]
      );
      
      if (result.rows.length === 0) {
        return res.json(null);
      }
      
      const block = result.rows[0];
      res.json({
        id: block.id,
        division: block.division,
        blockType: block.block_type,
        title: block.title,
        subtitle: block.subtitle,
        content: block.content,
        imageUrl: block.image_url,
        imageName: block.image_name,
        badges: block.badges ? block.badges.split(',').map((b: string) => b.trim()) : [],
        isActive: block.is_active,
        updatedAt: block.updated_at
      });
    } catch (error) {
      console.error("Error fetching content block:", error);
      res.status(500).json({ error: "Failed to fetch content block" });
    }
  });

  // Create or update content block (admin or division admin only)
  app.put("/api/content-blocks/:division/:blockType", isAuthenticated, async (req, res) => {
    try {
      const { division, blockType } = req.params;
      const { title, subtitle, content, imageUrl, imageName, badges } = req.body;
      
      // Check user permissions
      const userResult = await dbPool.query(
        'SELECT role FROM users WHERE id = $1',
        [req.session.userId]
      );
      
      if (userResult.rows.length === 0) {
        return res.status(403).json({ error: "User not found" });
      }
      
      const userRole = userResult.rows[0].role;
      const { canEditDivision } = await import("./permissions");
      
      // Only system admin or corporate_admin can edit corporate content
      if (!canEditDivision(userRole, division)) {
        return res.status(403).json({ error: "You don't have permission to edit content in this division" });
      }
      
      // Convert badges array to comma-separated string
      const badgesString = Array.isArray(badges) ? badges.join(', ') : badges;
      
      // Check if content block already exists
      const existingResult = await dbPool.query(
        `SELECT id FROM custom_content_blocks WHERE division = $1 AND block_type = $2`,
        [division, blockType]
      );
      
      let result;
      if (existingResult.rows.length > 0) {
        // Update existing block
        result = await dbPool.query(
          `UPDATE custom_content_blocks 
           SET title = $1, subtitle = $2, content = $3, image_url = $4, image_name = $5, 
               badges = $6, updated_by = $7, updated_at = NOW()
           WHERE division = $8 AND block_type = $9
           RETURNING *`,
          [title, subtitle, content, imageUrl, imageName, badgesString, req.session.userId, division, blockType]
        );
      } else {
        // Create new block
        result = await dbPool.query(
          `INSERT INTO custom_content_blocks 
           (division, block_type, title, subtitle, content, image_url, image_name, badges, updated_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING *`,
          [division, blockType, title, subtitle, content, imageUrl, imageName, badgesString, req.session.userId]
        );
      }
      
      const block = result.rows[0];
      res.json({
        id: block.id,
        division: block.division,
        blockType: block.block_type,
        title: block.title,
        subtitle: block.subtitle,
        content: block.content,
        imageUrl: block.image_url,
        imageName: block.image_name,
        badges: block.badges ? block.badges.split(',').map((b: string) => b.trim()) : [],
        isActive: block.is_active,
        updatedAt: block.updated_at
      });
    } catch (error) {
      console.error("Error saving content block:", error);
      res.status(500).json({ error: "Failed to save content block" });
    }
  });

  // Delete content block (admin or division admin only)
  app.delete("/api/content-blocks/:division/:blockType", isAuthenticated, async (req, res) => {
    try {
      const { division, blockType } = req.params;
      
      // Check user permissions
      const userResult = await dbPool.query(
        'SELECT role FROM users WHERE id = $1',
        [req.session.userId]
      );
      
      if (userResult.rows.length === 0) {
        return res.status(403).json({ error: "User not found" });
      }
      
      const userRole = userResult.rows[0].role;
      const { canEditDivision } = await import("./permissions");
      
      if (!canEditDivision(userRole, division)) {
        return res.status(403).json({ error: "You don't have permission to delete content in this division" });
      }
      
      await dbPool.query(
        `DELETE FROM custom_content_blocks WHERE division = $1 AND block_type = $2`,
        [division, blockType]
      );
      
      res.json({ success: true, message: "Content block deleted" });
    } catch (error) {
      console.error("Error deleting content block:", error);
      res.status(500).json({ error: "Failed to delete content block" });
    }
  });

  // =============================================
  // Team Spotlights API Endpoints
  // =============================================

  // Get all team spotlights for a division (public - no authentication required)
  app.get("/api/team-spotlights/:division", async (req, res) => {
    try {
      const { division } = req.params;
      
      const result = await dbPool.query(
        `SELECT * FROM team_spotlights 
         WHERE division = $1 
         ORDER BY display_order ASC`,
        [division]
      );
      
      // Return spotlights with camelCase field names
      const spotlights = result.rows.map(row => ({
        id: row.id,
        division: row.division,
        displayOrder: row.display_order,
        spotlightType: row.spotlight_type,
        name: row.name,
        role: row.role,
        department: row.department,
        context: row.context,
        imageUrl: row.image_url,
        imageName: row.image_name,
        updatedAt: row.updated_at
      }));
      
      res.json(spotlights);
    } catch (error) {
      console.error("Error fetching team spotlights:", error);
      res.status(500).json({ error: "Failed to fetch team spotlights" });
    }
  });

  // Create or update a team spotlight
  app.put("/api/team-spotlights/:division/:displayOrder", isAuthenticated, async (req, res) => {
    try {
      const { division, displayOrder } = req.params;
      const { spotlightType, name, role, department, context, imageUrl, imageName } = req.body;
      
      // Check user permissions
      const userResult = await dbPool.query(
        'SELECT role FROM users WHERE id = $1',
        [req.session.userId]
      );
      
      if (userResult.rows.length === 0) {
        return res.status(403).json({ error: "User not found" });
      }
      
      const userRole = userResult.rows[0].role;
      const { canEditDivision } = await import("./permissions");
      
      if (!canEditDivision(userRole, division)) {
        return res.status(403).json({ error: "You don't have permission to edit spotlights in this division" });
      }
      
      // Check if spotlight exists
      const existing = await dbPool.query(
        `SELECT id FROM team_spotlights WHERE division = $1 AND display_order = $2`,
        [division, displayOrder]
      );
      
      let result;
      if (existing.rows.length > 0) {
        // Update existing
        result = await dbPool.query(
          `UPDATE team_spotlights 
           SET spotlight_type = $1, name = $2, role = $3, department = $4, 
               context = $5, image_url = $6, image_name = $7, 
               updated_by = $8, updated_at = NOW()
           WHERE division = $9 AND display_order = $10
           RETURNING *`,
          [spotlightType, name, role, department, context, imageUrl, imageName, req.session.userId, division, displayOrder]
        );
      } else {
        // Create new
        result = await dbPool.query(
          `INSERT INTO team_spotlights 
           (division, display_order, spotlight_type, name, role, department, context, image_url, image_name, updated_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING *`,
          [division, displayOrder, spotlightType, name, role, department, context, imageUrl, imageName, req.session.userId]
        );
      }
      
      const row = result.rows[0];
      res.json({
        id: row.id,
        division: row.division,
        displayOrder: row.display_order,
        spotlightType: row.spotlight_type,
        name: row.name,
        role: row.role,
        department: row.department,
        context: row.context,
        imageUrl: row.image_url,
        imageName: row.image_name,
        updatedAt: row.updated_at
      });
    } catch (error) {
      console.error("Error saving team spotlight:", error);
      res.status(500).json({ error: "Failed to save team spotlight" });
    }
  });

  // Bulk update all spotlights for a division
  app.put("/api/team-spotlights/:division", isAuthenticated, async (req, res) => {
    try {
      const { division } = req.params;
      const { spotlights } = req.body;
      
      if (!Array.isArray(spotlights)) {
        return res.status(400).json({ error: "Invalid spotlights data" });
      }
      
      // Check user permissions
      const userResult = await dbPool.query(
        'SELECT role FROM users WHERE id = $1',
        [req.session.userId]
      );
      
      if (userResult.rows.length === 0) {
        return res.status(403).json({ error: "User not found" });
      }
      
      const userRole = userResult.rows[0].role;
      const { canEditDivision } = await import("./permissions");
      
      if (!canEditDivision(userRole, division)) {
        return res.status(403).json({ error: "You don't have permission to edit spotlights in this division" });
      }
      
      // Delete existing spotlights for this division
      await dbPool.query(`DELETE FROM team_spotlights WHERE division = $1`, [division]);
      
      // Insert new spotlights
      const results = [];
      for (let i = 0; i < spotlights.length; i++) {
        const s = spotlights[i];
        const result = await dbPool.query(
          `INSERT INTO team_spotlights 
           (division, display_order, spotlight_type, name, role, department, context, image_url, image_name, updated_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING *`,
          [division, String(i + 1), s.spotlightType, s.name, s.role, s.department || null, s.context, s.imageUrl || null, s.imageName || null, req.session.userId]
        );
        const row = result.rows[0];
        results.push({
          id: row.id,
          division: row.division,
          displayOrder: row.display_order,
          spotlightType: row.spotlight_type,
          name: row.name,
          role: row.role,
          department: row.department,
          context: row.context,
          imageUrl: row.image_url,
          imageName: row.image_name,
          updatedAt: row.updated_at
        });
      }
      
      res.json(results);
    } catch (error) {
      console.error("Error saving team spotlights:", error);
      res.status(500).json({ error: "Failed to save team spotlights" });
    }
  });

  // =============================================
  // LinkedIn Posts API Endpoints (Manual Sync)
  // =============================================

  // Get the latest active LinkedIn post (public - no authentication required)
  app.get("/api/linkedin/latest", async (req, res) => {
    try {
      const result = await dbPool.query(
        `SELECT lp.*, u.first_name, u.last_name 
         FROM linkedin_posts lp
         LEFT JOIN users u ON lp.synced_by = u.id
         WHERE lp.is_active = true
         ORDER BY lp.synced_at DESC
         LIMIT 1`
      );
      
      if (result.rows.length === 0) {
        return res.json(null);
      }
      
      const row = result.rows[0];
      res.json({
        id: row.id,
        content: row.content,
        postUrl: row.post_url,
        imageUrl: row.image_url,
        postedAt: row.posted_at,
        syncedBy: row.synced_by,
        syncedByName: row.first_name && row.last_name ? `${row.first_name} ${row.last_name}` : null,
        syncedAt: row.synced_at,
        isActive: row.is_active
      });
    } catch (error) {
      console.error("Error fetching latest LinkedIn post:", error);
      res.status(500).json({ error: "Failed to fetch LinkedIn post" });
    }
  });

  // Get all LinkedIn posts (admin or corporate_admin only)
  app.get("/api/linkedin/posts", isAuthenticated, async (req, res) => {
    try {
      // Check if user is admin or corporate_admin
      const userResult = await dbPool.query(
        'SELECT role FROM users WHERE id = $1',
        [req.session.userId]
      );
      
      const userRole = userResult.rows[0]?.role;
      if (!userRole || (userRole !== 'admin' && userRole !== 'corporate_admin')) {
        return res.status(403).json({ error: "Admin or Corporate Admin access required" });
      }
      
      const result = await dbPool.query(
        `SELECT lp.*, u.first_name, u.last_name 
         FROM linkedin_posts lp
         LEFT JOIN users u ON lp.synced_by = u.id
         ORDER BY lp.synced_at DESC`
      );
      
      const posts = result.rows.map(row => ({
        id: row.id,
        content: row.content,
        postUrl: row.post_url,
        imageUrl: row.image_url,
        postedAt: row.posted_at,
        syncedBy: row.synced_by,
        syncedByName: row.first_name && row.last_name ? `${row.first_name} ${row.last_name}` : null,
        syncedAt: row.synced_at,
        isActive: row.is_active
      }));
      
      res.json(posts);
    } catch (error) {
      console.error("Error fetching LinkedIn posts:", error);
      res.status(500).json({ error: "Failed to fetch LinkedIn posts" });
    }
  });

  // Create a new LinkedIn post (admin or corporate_admin only)
  app.post("/api/linkedin/posts", isAuthenticated, async (req, res) => {
    try {
      // Check if user is admin or corporate_admin
      const userResult = await dbPool.query(
        'SELECT role FROM users WHERE id = $1',
        [req.session.userId]
      );
      
      const userRole = userResult.rows[0]?.role;
      if (!userRole || (userRole !== 'admin' && userRole !== 'corporate_admin')) {
        return res.status(403).json({ error: "Admin or Corporate Admin access required" });
      }
      
      const { content, postUrl, imageUrl, postedAt } = req.body;
      
      if (!content || content.trim() === '') {
        return res.status(400).json({ error: "Content is required" });
      }
      
      // Deactivate all previous posts
      await dbPool.query('UPDATE linkedin_posts SET is_active = false');
      
      // Insert new post
      const result = await dbPool.query(
        `INSERT INTO linkedin_posts (content, post_url, image_url, posted_at, synced_by, is_active)
         VALUES ($1, $2, $3, $4, $5, true)
         RETURNING *`,
        [content.trim(), postUrl || null, imageUrl || null, postedAt || null, req.session.userId]
      );
      
      const row = result.rows[0];
      res.json({
        id: row.id,
        content: row.content,
        postUrl: row.post_url,
        imageUrl: row.image_url,
        postedAt: row.posted_at,
        syncedBy: row.synced_by,
        syncedAt: row.synced_at,
        isActive: row.is_active
      });
    } catch (error) {
      console.error("Error creating LinkedIn post:", error);
      res.status(500).json({ error: "Failed to create LinkedIn post" });
    }
  });

  // Update a LinkedIn post (admin or corporate_admin only)
  app.put("/api/linkedin/posts/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if user is admin or corporate_admin
      const userResult = await dbPool.query(
        'SELECT role FROM users WHERE id = $1',
        [req.session.userId]
      );
      
      const userRole = userResult.rows[0]?.role;
      if (!userRole || (userRole !== 'admin' && userRole !== 'corporate_admin')) {
        return res.status(403).json({ error: "Admin or Corporate Admin access required" });
      }
      
      const { content, postUrl, imageUrl, postedAt, isActive } = req.body;
      
      if (!content || content.trim() === '') {
        return res.status(400).json({ error: "Content is required" });
      }
      
      // If setting this post as active, deactivate all others first
      if (isActive) {
        await dbPool.query('UPDATE linkedin_posts SET is_active = false WHERE id != $1', [id]);
      }
      
      const result = await dbPool.query(
        `UPDATE linkedin_posts 
         SET content = $1, post_url = $2, image_url = $3, posted_at = $4, is_active = $5
         WHERE id = $6
         RETURNING *`,
        [content.trim(), postUrl || null, imageUrl || null, postedAt || null, isActive ?? true, id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Post not found" });
      }
      
      const row = result.rows[0];
      res.json({
        id: row.id,
        content: row.content,
        postUrl: row.post_url,
        imageUrl: row.image_url,
        postedAt: row.posted_at,
        syncedBy: row.synced_by,
        syncedAt: row.synced_at,
        isActive: row.is_active
      });
    } catch (error) {
      console.error("Error updating LinkedIn post:", error);
      res.status(500).json({ error: "Failed to update LinkedIn post" });
    }
  });

  // Delete a LinkedIn post (admin or corporate_admin only)
  app.delete("/api/linkedin/posts/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if user is admin or corporate_admin
      const userResult = await dbPool.query(
        'SELECT role FROM users WHERE id = $1',
        [req.session.userId]
      );
      
      const userRole = userResult.rows[0]?.role;
      if (!userRole || (userRole !== 'admin' && userRole !== 'corporate_admin')) {
        return res.status(403).json({ error: "Admin or Corporate Admin access required" });
      }
      
      const result = await dbPool.query(
        'DELETE FROM linkedin_posts WHERE id = $1 RETURNING id',
        [id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Post not found" });
      }
      
      res.json({ success: true, message: "Post deleted" });
    } catch (error) {
      console.error("Error deleting LinkedIn post:", error);
      res.status(500).json({ error: "Failed to delete LinkedIn post" });
    }
  });

  // Site content management routes
  app.get("/api/site-content/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await dbPool.query(
        "SELECT * FROM site_content WHERE id = $1",
        [id]
      );
      
      if (result.rows.length === 0) {
        return res.json({ 
          id, 
          title: "", 
          content: "", 
          updatedAt: null 
        });
      }
      
      const row = result.rows[0];
      res.json({
        id: row.id,
        title: row.title,
        content: row.content,
        lastUpdatedBy: row.last_updated_by,
        updatedAt: row.updated_at
      });
    } catch (error) {
      console.error("Error fetching site content:", error);
      res.status(500).json({ error: "Failed to fetch content" });
    }
  });

  app.put("/api/site-content/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { title, content } = req.body;
      const userId = (req as any).user?.id;
      
      // Upsert - insert or update
      const result = await dbPool.query(
        `INSERT INTO site_content (id, title, content, last_updated_by, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (id) DO UPDATE SET
           title = EXCLUDED.title,
           content = EXCLUDED.content,
           last_updated_by = EXCLUDED.last_updated_by,
           updated_at = NOW()
         RETURNING *`,
        [id, title, content, userId]
      );
      
      const row = result.rows[0];
      res.json({
        id: row.id,
        title: row.title,
        content: row.content,
        lastUpdatedBy: row.last_updated_by,
        updatedAt: row.updated_at
      });
    } catch (error) {
      console.error("Error updating site content:", error);
      res.status(500).json({ error: "Failed to update content" });
    }
  });

  // ===== BOU BULLETIN BOARD ROUTES =====

  // Helper: Check if user is a BOU member
  async function isBouMember(userId: string): Promise<boolean> {
    const result = await dbPool.query(
      'SELECT id FROM bou_members WHERE user_id = $1',
      [userId]
    );
    return result.rows.length > 0;
  }

  // Helper: Parse @mentions from content and return member user IDs
  async function parseMentions(content: string): Promise<string[]> {
    const mentionPattern = /@([a-zA-Z]+\.[a-zA-Z]+)/g;
    const matches = content.match(mentionPattern);
    console.log('parseMentions - content:', content);
    console.log('parseMentions - matches:', matches);
    if (!matches) return [];

    const tags = matches.map(m => m.substring(1).toLowerCase());
    console.log('parseMentions - tags:', tags);
    if (tags.length === 0) return [];

    // Check for @bou.team - if present, return all BOU member user IDs
    if (tags.includes('bou.team')) {
      console.log('parseMentions - @bou.team detected, fetching all members');
      const allMembersResult = await dbPool.query(
        'SELECT user_id FROM bou_members'
      );
      console.log('parseMentions - all members:', allMembersResult.rows);
      return allMembersResult.rows.map(r => r.user_id);
    }

    const result = await dbPool.query(
      'SELECT user_id FROM bou_members WHERE LOWER(member_tag) = ANY($1::text[])',
      [tags]
    );
    console.log('parseMentions - found members:', result.rows);
    return result.rows.map(r => r.user_id);
  }

  // Helper: Generate branded email template with inline styles for Outlook compatibility
  function getBrandedEmailTemplate(
    title: string,
    recipientName: string,
    bodyContent: string,
    buttonText: string,
    buttonLink: string
  ): string {
    return `
      <!DOCTYPE html>
      <html xmlns="http://www.w3.org/1999/xhtml">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <title>${title}</title>
          <!--[if mso]>
          <style type="text/css">
            table {border-collapse: collapse;}
            .button-link {padding: 14px 32px !important;}
          </style>
          <![endif]-->
        </head>
        <body bgcolor="#D9E4EC" style="margin: 0; padding: 0; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; background-color: #D9E4EC;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" bgcolor="#D9E4EC" style="background-color: #D9E4EC;">
            <tr>
              <td style="padding: 40px 20px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="600" align="center" bgcolor="#ffffff" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                  
                  <!-- Header -->
                  <tr>
                    <td bgcolor="#51142a" style="background-color: #51142a; padding: 40px 30px; text-align: center;">
                      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td style="text-align: center; padding-bottom: 16px;">
                            <span style="font-size: 28px; font-weight: 700; color: #ffffff; letter-spacing: 2px; display: block;">ALBERS AEROSPACE</span>
                            <span style="font-size: 12px; color: #D9E4EC; letter-spacing: 3px; text-transform: uppercase; display: block; margin-top: 4px;">INTRANET PORTAL</span>
                          </td>
                        </tr>
                        <tr>
                          <td style="text-align: center; padding-top: 16px;">
                            <table role="presentation" cellpadding="0" cellspacing="0" align="center">
                              <tr>
                                <td bgcolor="#6b2438" style="background-color: #6b2438; border: 2px solid #D9E4EC; border-radius: 20px; padding: 8px 20px;">
                                  <span style="font-size: 11px; font-weight: 600; color: #D9E4EC; letter-spacing: 1.5px;">BUSINESS OPERATIONS UNIT</span>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        <tr>
                          <td style="text-align: center; padding-top: 12px;">
                            <span style="font-size: 13px; font-style: italic; color: #D9E4EC;">American Made. Warfighter Ready.</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Accent Bar -->
                  <tr>
                    <td bgcolor="#D9E4EC" style="height: 4px; background-color: #D9E4EC;"></td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td bgcolor="#ffffff" style="padding: 40px 30px; background-color: #ffffff;">
                      <p style="font-size: 18px; font-weight: 600; color: #51142a; margin: 0 0 20px 0;">Hi ${recipientName},</p>
                      ${bodyContent}
                      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 32px 0;">
                        <tr>
                          <td style="text-align: center;">
                            <!--[if mso]>
                            <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${buttonLink}" style="height:48px;v-text-anchor:middle;width:200px;" arcsize="17%" strokecolor="#51142a" fillcolor="#51142a">
                              <w:anchorlock/>
                              <center style="color:#ffffff;font-family:'Segoe UI',sans-serif;font-size:15px;font-weight:600;">${buttonText}</center>
                            </v:roundrect>
                            <![endif]-->
                            <!--[if !mso]><!-->
                            <a href="${buttonLink}" style="display: inline-block; background-color: #51142a; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; letter-spacing: 0.5px;">${buttonText}</a>
                            <!--<![endif]-->
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td bgcolor="#f8f9fa" style="background-color: #f8f9fa; padding: 24px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                      <p style="font-size: 14px; font-weight: 600; color: #51142a; margin: 0 0 4px 0;">Albers Aerospace</p>
                      <p style="color: #6b7280; font-size: 12px; margin: 0;">Business Operations Unit Portal</p>
                      <p style="font-size: 11px; color: #9ca3af; font-style: italic; margin: 8px 0 0 0;">&copy; ${new Date().getFullYear()} Albers Aerospace. All rights reserved.</p>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  }

  // Helper: Send mention notification email
  async function sendMentionEmail(
    mentionedUserId: string, 
    mentionedByName: string,
    postId: string,
    commentId?: string
  ) {
    try {
      const userResult = await dbPool.query(
        'SELECT email, first_name FROM users WHERE id = $1',
        [mentionedUserId]
      );
      if (userResult.rows.length === 0) return;

      const { email, first_name } = userResult.rows[0];
      const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
      const link = `${baseUrl}/bou?postId=${postId}${commentId ? `&commentId=${commentId}` : ''}`;

      const bodyContent = `
        <p style="font-size: 15px; color: #374151; margin: 0 0 16px 0; line-height: 1.7;">
          <strong>${mentionedByName}</strong> mentioned you in a ${commentId ? 'comment' : 'post'} on the BOU Bulletin Board.
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0;">
          <tr>
            <td style="background-color: #f3f4f6; border-left: 4px solid #51142a; padding: 16px 20px; border-radius: 0 8px 8px 0;">
              <p style="font-size: 14px; color: #374151; margin: 0;">You've been tagged in a conversation. Click below to view and respond.</p>
            </td>
          </tr>
        </table>
      `;

      await sendEmail({
        to: email,
        subject: `${mentionedByName} mentioned you in the BOU Bulletin Board`,
        html: getBrandedEmailTemplate(
          'You were mentioned',
          first_name || 'there',
          bodyContent,
          'View Post',
          link
        )
      });
    } catch (error) {
      console.error('Error sending mention notification email:', error);
    }
  }

  // Helper: Send comment reply notification email to post author
  async function sendCommentReplyEmail(
    postAuthorId: string,
    commenterName: string,
    postId: string,
    commentId: string,
    commentPreview: string
  ) {
    try {
      const userResult = await dbPool.query(
        'SELECT email, first_name FROM users WHERE id = $1',
        [postAuthorId]
      );
      if (userResult.rows.length === 0) return;

      const { email, first_name } = userResult.rows[0];
      const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
      const link = `${baseUrl}/bou?postId=${postId}&commentId=${commentId}`;

      // Truncate comment preview if too long
      const truncatedPreview = commentPreview.length > 150
        ? commentPreview.substring(0, 150) + '...'
        : commentPreview;

      const bodyContent = `
        <p style="font-size: 15px; color: #374151; margin: 0 0 16px 0; line-height: 1.7;">
          <strong>${commenterName}</strong> commented on your post in the BOU Bulletin Board.
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0;">
          <tr>
            <td style="background-color: #f3f4f6; border-left: 4px solid #51142a; padding: 16px 20px; border-radius: 0 8px 8px 0;">
              <p style="font-size: 14px; color: #374151; margin: 0; font-style: italic;">"${truncatedPreview}"</p>
            </td>
          </tr>
        </table>
        <p style="font-size: 15px; color: #374151; margin: 0; line-height: 1.7;">Click below to view the comment and continue the conversation.</p>
      `;

      await sendEmail({
        to: email,
        subject: `${commenterName} commented on your post`,
        html: getBrandedEmailTemplate(
          'New comment on your post',
          first_name || 'there',
          bodyContent,
          'View Comment',
          link
        )
      });
    } catch (error) {
      console.error('Error sending comment reply notification email:', error);
    }
  }

  // Get all BOU members (for @mention autocomplete)
  app.get("/api/bou/members", isAuthenticated, async (req, res) => {
    try {
      const result = await dbPool.query(
        `SELECT bm.*, u.email, u.first_name, u.last_name 
         FROM bou_members bm
         JOIN users u ON bm.user_id = u.id
         ORDER BY bm.is_lead DESC, bm.display_name ASC`
      );
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching BOU members:", error);
      res.status(500).json({ error: "Failed to fetch BOU members" });
    }
  });

  // Check if current user is a BOU member
  app.get("/api/bou/membership", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      const result = await dbPool.query(
        `SELECT bm.*, u.first_name, u.last_name 
         FROM bou_members bm
         JOIN users u ON bm.user_id = u.id
         WHERE bm.user_id = $1`,
        [userId]
      );
      res.json({ 
        isMember: result.rows.length > 0,
        member: result.rows[0] || null
      });
    } catch (error) {
      console.error("Error checking BOU membership:", error);
      res.status(500).json({ error: "Failed to check membership" });
    }
  });

  // Get BOU posts with likes, comments count, and user info
  app.get("/api/bou/posts", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await dbPool.query(
        `SELECT 
          p.*,
          u.first_name as author_first_name,
          u.last_name as author_last_name,
          u.email as author_email,
          bm.display_name as author_display_name,
          bm.member_tag as author_tag,
          bm.is_lead as author_is_lead,
          (SELECT COUNT(*) FROM bou_post_likes WHERE post_id = p.id) as like_count,
          (SELECT COUNT(*) FROM bou_comments WHERE post_id = p.id) as comment_count,
          (SELECT COUNT(*) FROM bou_post_shares WHERE post_id = p.id) as share_count,
          EXISTS(SELECT 1 FROM bou_post_likes WHERE post_id = p.id AND user_id = $1) as user_liked,
          EXISTS(SELECT 1 FROM bou_post_shares WHERE post_id = p.id AND sharer_id = $1) as user_shared
         FROM bou_posts p
         JOIN users u ON p.author_id = u.id
         LEFT JOIN bou_members bm ON p.author_id = bm.user_id
         ORDER BY p.created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching BOU posts:", error);
      res.status(500).json({ error: "Failed to fetch posts" });
    }
  });

  // Create a new BOU post (BOU members only)
  app.post("/api/bou/posts", isAuthenticated, async (req, res) => {
    const client = await dbPool.connect();
    try {
      const userId = req.session.userId!;
      
      // Check if user is BOU member
      if (!await isBouMember(userId)) {
        return res.status(403).json({ error: "Only BOU members can create posts" });
      }

      const { 
        content, 
        postType = 'text',
        mediaUrl,
        mediaName,
        mediaMimeType,
        linkUrl,
        linkTitle,
        linkDescription,
        linkImage,
        attachmentUrl, 
        attachmentName 
      } = req.body;
      
      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: "Post content is required" });
      }

      await client.query('BEGIN');

      // Create the post with new fields
      const postResult = await client.query(
        `INSERT INTO bou_posts (author_id, content, post_type, media_url, media_name, media_mime_type, link_url, link_title, link_description, link_image, attachment_url, attachment_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [userId, content, postType, mediaUrl || null, mediaName || null, mediaMimeType || null, linkUrl || null, linkTitle || null, linkDescription || null, linkImage || null, attachmentUrl || null, attachmentName || null]
      );
      const post = postResult.rows[0];

      // Parse and store mentions
      const mentionedUserIds = await parseMentions(content);
      const authorResult = await client.query(
        'SELECT first_name, last_name FROM users WHERE id = $1',
        [userId]
      );
      const authorName = `${authorResult.rows[0].first_name} ${authorResult.rows[0].last_name}`;

      for (const mentionedUserId of mentionedUserIds) {
        await client.query(
          `INSERT INTO bou_post_mentions (post_id, mentioned_user_id)
           VALUES ($1, $2)`,
          [post.id, mentionedUserId]
        );
        // Send notification email asynchronously (including self-mentions)
        sendMentionEmail(mentionedUserId, authorName, post.id);
      }

      await client.query('COMMIT');

      // Fetch complete post data
      const fullPostResult = await dbPool.query(
        `SELECT 
          p.*,
          u.first_name as author_first_name,
          u.last_name as author_last_name,
          u.email as author_email,
          bm.display_name as author_display_name,
          bm.member_tag as author_tag,
          bm.is_lead as author_is_lead,
          0 as like_count,
          0 as comment_count,
          0 as share_count,
          false as user_liked,
          false as user_shared
         FROM bou_posts p
         JOIN users u ON p.author_id = u.id
         LEFT JOIN bou_members bm ON p.author_id = bm.user_id
         WHERE p.id = $1`,
        [post.id]
      );

      res.json(fullPostResult.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error("Error creating BOU post:", error);
      res.status(500).json({ error: "Failed to create post" });
    } finally {
      client.release();
    }
  });

  // Delete a BOU post (author only)
  app.delete("/api/bou/posts/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      const postId = req.params.id;

      // Check if user is author or admin
      const postResult = await dbPool.query(
        'SELECT author_id FROM bou_posts WHERE id = $1',
        [postId]
      );

      if (postResult.rows.length === 0) {
        return res.status(404).json({ error: "Post not found" });
      }

      const userResult = await dbPool.query(
        'SELECT role FROM users WHERE id = $1',
        [userId]
      );
      const isAdmin = userResult.rows[0]?.role === 'admin';

      if (postResult.rows[0].author_id !== userId && !isAdmin) {
        return res.status(403).json({ error: "Not authorized to delete this post" });
      }

      await dbPool.query('DELETE FROM bou_posts WHERE id = $1', [postId]);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting BOU post:", error);
      res.status(500).json({ error: "Failed to delete post" });
    }
  });

  // Toggle like on a BOU post (BOU members only)
  app.post("/api/bou/posts/:id/like", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const postId = req.params.id;

      if (!await isBouMember(userId)) {
        return res.status(403).json({ error: "Only BOU members can like posts" });
      }

      // Check if already liked
      const existingLike = await dbPool.query(
        'SELECT id FROM bou_post_likes WHERE post_id = $1 AND user_id = $2',
        [postId, userId]
      );

      let liked = false;
      if (existingLike.rows.length > 0) {
        // Unlike
        await dbPool.query(
          'DELETE FROM bou_post_likes WHERE post_id = $1 AND user_id = $2',
          [postId, userId]
        );
      } else {
        // Like
        await dbPool.query(
          'INSERT INTO bou_post_likes (post_id, user_id) VALUES ($1, $2)',
          [postId, userId]
        );
        liked = true;
      }

      // Get updated like count
      const countResult = await dbPool.query(
        'SELECT COUNT(*) as count FROM bou_post_likes WHERE post_id = $1',
        [postId]
      );

      res.json({ liked, likeCount: parseInt(countResult.rows[0].count) });
    } catch (error) {
      console.error("Error toggling post like:", error);
      res.status(500).json({ error: "Failed to toggle like" });
    }
  });

  // Share a BOU post (BOU members only)
  app.post("/api/bou/posts/:id/share", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const postId = req.params.id;
      const { shareNote } = req.body;

      if (!await isBouMember(userId)) {
        return res.status(403).json({ error: "Only BOU members can share posts" });
      }

      await dbPool.query(
        'INSERT INTO bou_post_shares (post_id, sharer_id, share_note) VALUES ($1, $2, $3)',
        [postId, userId, shareNote || null]
      );

      const countResult = await dbPool.query(
        'SELECT COUNT(*) as count FROM bou_post_shares WHERE post_id = $1',
        [postId]
      );

      res.json({ success: true, shareCount: parseInt(countResult.rows[0].count) });
    } catch (error) {
      console.error("Error sharing post:", error);
      res.status(500).json({ error: "Failed to share post" });
    }
  });

  // Get comments for a post
  app.get("/api/bou/posts/:id/comments", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      const postId = req.params.id;

      const result = await dbPool.query(
        `SELECT 
          c.*,
          u.first_name as author_first_name,
          u.last_name as author_last_name,
          u.email as author_email,
          bm.display_name as author_display_name,
          bm.member_tag as author_tag,
          bm.is_lead as author_is_lead,
          (SELECT COUNT(*) FROM bou_comment_likes WHERE comment_id = c.id) as like_count,
          EXISTS(SELECT 1 FROM bou_comment_likes WHERE comment_id = c.id AND user_id = $1) as user_liked
         FROM bou_comments c
         JOIN users u ON c.author_id = u.id
         LEFT JOIN bou_members bm ON c.author_id = bm.user_id
         WHERE c.post_id = $2
         ORDER BY c.created_at ASC`,
        [userId, postId]
      );

      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  // Create a comment on a post (BOU members only)
  app.post("/api/bou/posts/:id/comments", isAuthenticated, async (req, res) => {
    const client = await dbPool.connect();
    try {
      const userId = req.session.userId!;
      const postId = req.params.id;
      const { content } = req.body;

      if (!await isBouMember(userId)) {
        return res.status(403).json({ error: "Only BOU members can comment" });
      }

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: "Comment content is required" });
      }

      await client.query('BEGIN');

      // Get the post author to notify them
      const postResult = await client.query(
        'SELECT author_id FROM bou_posts WHERE id = $1',
        [postId]
      );
      const postAuthorId = postResult.rows[0]?.author_id;

      // Create the comment
      const commentResult = await client.query(
        `INSERT INTO bou_comments (post_id, author_id, content)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [postId, userId, content]
      );
      const comment = commentResult.rows[0];

      // Parse and store mentions
      const mentionedUserIds = await parseMentions(content);
      const authorResult = await client.query(
        'SELECT first_name, last_name FROM users WHERE id = $1',
        [userId]
      );
      const authorName = `${authorResult.rows[0].first_name} ${authorResult.rows[0].last_name}`;

      for (const mentionedUserId of mentionedUserIds) {
        await client.query(
          `INSERT INTO bou_comment_mentions (comment_id, mentioned_user_id)
           VALUES ($1, $2)`,
          [comment.id, mentionedUserId]
        );
        // Send notification email asynchronously (including self-mentions)
        sendMentionEmail(mentionedUserId, authorName, postId, comment.id);
      }

      // Send notification to post author if they're not the commenter
      // and they weren't already mentioned in the comment
      if (postAuthorId && postAuthorId !== userId && !mentionedUserIds.includes(postAuthorId)) {
        sendCommentReplyEmail(postAuthorId, authorName, postId, comment.id, content);
      }

      await client.query('COMMIT');

      // Fetch complete comment data
      const fullCommentResult = await dbPool.query(
        `SELECT 
          c.*,
          u.first_name as author_first_name,
          u.last_name as author_last_name,
          u.email as author_email,
          bm.display_name as author_display_name,
          bm.member_tag as author_tag,
          bm.is_lead as author_is_lead,
          0 as like_count,
          false as user_liked
         FROM bou_comments c
         JOIN users u ON c.author_id = u.id
         LEFT JOIN bou_members bm ON c.author_id = bm.user_id
         WHERE c.id = $1`,
        [comment.id]
      );

      res.json(fullCommentResult.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error("Error creating comment:", error);
      res.status(500).json({ error: "Failed to create comment" });
    } finally {
      client.release();
    }
  });

  // Delete a comment (author only)
  app.delete("/api/bou/comments/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      const commentId = req.params.id;

      const commentResult = await dbPool.query(
        'SELECT author_id FROM bou_comments WHERE id = $1',
        [commentId]
      );

      if (commentResult.rows.length === 0) {
        return res.status(404).json({ error: "Comment not found" });
      }

      const userResult = await dbPool.query(
        'SELECT role FROM users WHERE id = $1',
        [userId]
      );
      const isAdmin = userResult.rows[0]?.role === 'admin';

      if (commentResult.rows[0].author_id !== userId && !isAdmin) {
        return res.status(403).json({ error: "Not authorized to delete this comment" });
      }

      await dbPool.query('DELETE FROM bou_comments WHERE id = $1', [commentId]);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting comment:", error);
      res.status(500).json({ error: "Failed to delete comment" });
    }
  });

  // Toggle like on a comment (BOU members only)
  app.post("/api/bou/comments/:id/like", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const commentId = req.params.id;

      if (!await isBouMember(userId)) {
        return res.status(403).json({ error: "Only BOU members can like comments" });
      }

      const existingLike = await dbPool.query(
        'SELECT id FROM bou_comment_likes WHERE comment_id = $1 AND user_id = $2',
        [commentId, userId]
      );

      let liked = false;
      if (existingLike.rows.length > 0) {
        await dbPool.query(
          'DELETE FROM bou_comment_likes WHERE comment_id = $1 AND user_id = $2',
          [commentId, userId]
        );
      } else {
        await dbPool.query(
          'INSERT INTO bou_comment_likes (comment_id, user_id) VALUES ($1, $2)',
          [commentId, userId]
        );
        liked = true;
      }

      const countResult = await dbPool.query(
        'SELECT COUNT(*) as count FROM bou_comment_likes WHERE comment_id = $1',
        [commentId]
      );

      res.json({ liked, likeCount: parseInt(countResult.rows[0].count) });
    } catch (error) {
      console.error("Error toggling comment like:", error);
      res.status(500).json({ error: "Failed to toggle like" });
    }
  });

  // Fetch link preview metadata for BOU posts
  app.post("/api/bou/link-preview", isAuthenticated, async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ error: "URL is required" });
      }

      // Validate URL
      let parsedUrl;
      try {
        parsedUrl = new URL(url);
      } catch {
        return res.status(400).json({ error: "Invalid URL" });
      }

      // Fetch the page
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AlbersIntranet/1.0)'
        },
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        return res.status(400).json({ error: "Failed to fetch URL" });
      }

      const html = await response.text();

      // Parse Open Graph and meta tags
      let title = '';
      let description = '';
      let image = '';

      // Extract OG tags
      const ogTitleMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]*)"[^>]*>/i) ||
                          html.match(/<meta[^>]*content="([^"]*)"[^>]*property="og:title"[^>]*>/i);
      const ogDescMatch = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]*)"[^>]*>/i) ||
                         html.match(/<meta[^>]*content="([^"]*)"[^>]*property="og:description"[^>]*>/i);
      const ogImageMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]*)"[^>]*>/i) ||
                          html.match(/<meta[^>]*content="([^"]*)"[^>]*property="og:image"[^>]*>/i);

      // Fallback to regular meta tags
      const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      const descMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/i) ||
                       html.match(/<meta[^>]*content="([^"]*)"[^>]*name="description"[^>]*>/i);

      title = ogTitleMatch?.[1] || titleMatch?.[1] || parsedUrl.hostname;
      description = ogDescMatch?.[1] || descMatch?.[1] || '';
      image = ogImageMatch?.[1] || '';

      // Make image URL absolute if relative
      if (image && !image.startsWith('http')) {
        image = new URL(image, url).href;
      }

      // Decode HTML entities
      title = title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
      description = description.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

      res.json({
        url,
        title: title.substring(0, 200),
        description: description.substring(0, 500),
        image
      });
    } catch (error) {
      console.error("Error fetching link preview:", error);
      res.status(500).json({ error: "Failed to fetch link preview" });
    }
  });

  // Upload media for BOU posts (uses object storage)
  app.post("/api/bou/upload", isAuthenticated, upload.single('file'), async (req, res) => {
    try {
      const userId = req.session.userId!;
      
      // Check if user is BOU member
      if (!await isBouMember(userId)) {
        return res.status(403).json({ error: "Only BOU members can upload media" });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Check file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        return res.status(400).json({ error: "File too large. Maximum size is 50MB" });
      }

      // Determine media type
      const mimeType = file.mimetype;
      let mediaType = 'document';
      if (mimeType.startsWith('image/')) {
        mediaType = 'image';
      } else if (mimeType.startsWith('video/')) {
        mediaType = 'video';
      }

      // Upload to local file storage
      const timestamp = Date.now();
      const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const customPath = `bou-media/${timestamp}-${sanitizedName}`;

      const publicUrl = await localFileStorage.uploadFile(file.buffer, file.originalname, customPath);

      res.json({
        url: publicUrl,
        name: file.originalname,
        mimeType,
        mediaType,
        size: file.size
      });
    } catch (error) {
      console.error("Error uploading BOU media:", error);
      res.status(500).json({ error: "Failed to upload media" });
    }
  });

  // =============================================
  // Trip Reports API Endpoints
  // =============================================
  
  // Get all trip reports (with optional search)
  app.get("/api/trip-reports", isAuthenticated, async (req, res) => {
    try {
      const { q, startDate, endDate } = req.query;
      
      let query = `
        SELECT tr.*, u.first_name, u.last_name, u.email
        FROM trip_reports tr
        LEFT JOIN users u ON tr.created_by = u.id
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramIndex = 1;
      
      if (q) {
        query += ` AND (
          LOWER(tr.event_name) LIKE $${paramIndex} OR
          LOWER(tr.location) LIKE $${paramIndex} OR
          LOWER(tr.albers_poc) LIKE $${paramIndex} OR
          LOWER(tr.other_attendees) LIKE $${paramIndex} OR
          LOWER(tr.importance_summary) LIKE $${paramIndex} OR
          LOWER(tr.meetings_summary) LIKE $${paramIndex} OR
          LOWER(tr.extracted_plaintext) LIKE $${paramIndex} OR
          LOWER(tr.original_file_name) LIKE $${paramIndex}
        )`;
        params.push(`%${(q as string).toLowerCase()}%`);
        paramIndex++;
      }
      
      if (startDate) {
        query += ` AND tr.date_start >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }
      
      if (endDate) {
        query += ` AND tr.date_end <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
      }
      
      query += ` ORDER BY tr.created_at DESC`;
      
      const result = await dbPool.query(query, params);
      
      // Transform to camelCase
      const reports = result.rows.map(row => ({
        id: row.id,
        sourceType: row.source_type || 'form',
        originalFileUrl: row.original_file_url,
        originalFileName: row.original_file_name,
        cleanedHtml: row.cleaned_html,
        extractedPlaintext: row.extracted_plaintext,
        eventName: row.event_name,
        dateStart: row.date_start,
        dateEnd: row.date_end,
        location: row.location,
        albersPoc: row.albers_poc,
        otherAttendees: row.other_attendees,
        justification: row.justification,
        isAttendee: row.is_attendee,
        isSponsor: row.is_sponsor,
        isPanelist: row.is_panelist,
        importanceSummary: row.importance_summary,
        meetingsSummary: row.meetings_summary,
        sponsorshipSummary: row.sponsorship_summary,
        marketingNeeds: row.marketing_needs,
        recommendations: row.recommendations,
        shouldReturn: row.should_return,
        returnType: row.return_type,
        aiSummary: row.ai_summary,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        authorFirstName: row.first_name,
        authorLastName: row.last_name,
        authorEmail: row.email,
      }));
      
      res.json(reports);
    } catch (error) {
      console.error("Error fetching trip reports:", error);
      res.status(500).json({ error: "Failed to fetch trip reports" });
    }
  });
  
  // Get single trip report with photos
  app.get("/api/trip-reports/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      
      const result = await dbPool.query(`
        SELECT tr.*, u.first_name, u.last_name, u.email
        FROM trip_reports tr
        LEFT JOIN users u ON tr.created_by = u.id
        WHERE tr.id = $1
      `, [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Trip report not found" });
      }
      
      const row = result.rows[0];
      
      // Get photos
      const photosResult = await dbPool.query(
        'SELECT * FROM trip_report_photos WHERE trip_report_id = $1 ORDER BY uploaded_at',
        [id]
      );
      
      const photos = photosResult.rows.map(p => ({
        id: p.id,
        tripReportId: p.trip_report_id,
        fileUrl: p.file_url,
        fileName: p.file_name,
        uploadedAt: p.uploaded_at,
      }));
      
      res.json({
        id: row.id,
        sourceType: row.source_type || 'form',
        originalFileUrl: row.original_file_url,
        originalFileName: row.original_file_name,
        cleanedHtml: row.cleaned_html,
        extractedPlaintext: row.extracted_plaintext,
        eventName: row.event_name,
        dateStart: row.date_start,
        dateEnd: row.date_end,
        location: row.location,
        albersPoc: row.albers_poc,
        otherAttendees: row.other_attendees,
        justification: row.justification,
        isAttendee: row.is_attendee,
        isSponsor: row.is_sponsor,
        isPanelist: row.is_panelist,
        importanceSummary: row.importance_summary,
        meetingsSummary: row.meetings_summary,
        sponsorshipSummary: row.sponsorship_summary,
        marketingNeeds: row.marketing_needs,
        recommendations: row.recommendations,
        shouldReturn: row.should_return,
        returnType: row.return_type,
        aiSummary: row.ai_summary,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        authorFirstName: row.first_name,
        authorLastName: row.last_name,
        authorEmail: row.email,
        photos,
      });
    } catch (error) {
      console.error("Error fetching trip report:", error);
      res.status(500).json({ error: "Failed to fetch trip report" });
    }
  });
  
  // Helper function to generate AI summary for trip reports
  async function generateTripReportAISummary(reportData: {
    eventName?: string;
    location?: string;
    dateStart?: string;
    dateEnd?: string;
    importanceSummary?: string;
    meetingsSummary?: string;
    recommendations?: string;
    extractedPlaintext?: string;
    sourceType: string;
  }): Promise<string | null> {
    // OpenAI features disabled for internal deployment
    if (!OPENAI_ENABLED) {
      return null;
    }

    try {
      let contentToSummarize = "";

      if (reportData.sourceType === 'document' && reportData.extractedPlaintext) {
        // For document-based reports, use extracted text
        contentToSummarize = `Event: ${reportData.eventName || 'Business Trip'}\nLocation: ${reportData.location || 'N/A'}\nDate: ${reportData.dateStart || 'N/A'}\n\nDocument Content:\n${reportData.extractedPlaintext.slice(0, 3000)}`;
      } else {
        // For form-based reports, combine key fields
        contentToSummarize = `Event: ${reportData.eventName || 'N/A'}
Location: ${reportData.location || 'N/A'}
Date: ${reportData.dateStart || 'N/A'} to ${reportData.dateEnd || 'N/A'}
Importance: ${reportData.importanceSummary || 'N/A'}
Meetings: ${reportData.meetingsSummary || 'N/A'}
Recommendations: ${reportData.recommendations || 'N/A'}`;
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a professional business report summarizer for an aerospace company. Create a concise 3-4 sentence executive summary of this trip report. Focus on the key takeaways, business value, and any important follow-up actions. Keep the tone professional and informative."
          },
          {
            role: "user",
            content: contentToSummarize
          }
        ],
        max_tokens: 200,
        temperature: 0.3
      });

      return response.choices[0]?.message?.content || null;
    } catch (error) {
      console.error("Error generating AI summary:", error);
      return null;
    }
  }

  // Create trip report (any authenticated user)
  app.post("/api/trip-reports", isAuthenticated, async (req, res) => {
    const client = await dbPool.connect();
    try {
      const {
        sourceType, originalFileUrl, originalFileName, cleanedHtml, extractedPlaintext,
        eventName, dateStart, dateEnd, location, albersPoc, otherAttendees,
        justification, isAttendee, isSponsor, isPanelist, importanceSummary,
        meetingsSummary, sponsorshipSummary, marketingNeeds, recommendations,
        shouldReturn, returnType, photoUrls
      } = req.body;
      
      // For form-based reports, require form fields
      if (sourceType !== 'document') {
        if (!eventName || !dateStart || !dateEnd || !location || !albersPoc || 
            !justification || !importanceSummary || !meetingsSummary || !recommendations) {
          return res.status(400).json({ error: "Required fields are missing" });
        }
      }
      
      // For document-based reports, require the original file URL (cleanedHtml is optional for PDFs)
      if (sourceType === 'document') {
        if (!originalFileUrl) {
          return res.status(400).json({ error: "Document file URL is required" });
        }
      }
      
      // Generate AI summary
      const aiSummary = await generateTripReportAISummary({
        eventName,
        location,
        dateStart,
        dateEnd,
        importanceSummary,
        meetingsSummary,
        recommendations,
        extractedPlaintext,
        sourceType: sourceType || 'form'
      });
      
      await client.query('BEGIN');
      
      const result = await client.query(`
        INSERT INTO trip_reports (
          source_type, original_file_url, original_file_name, cleaned_html, extracted_plaintext,
          event_name, date_start, date_end, location, albers_poc, other_attendees,
          justification, is_attendee, is_sponsor, is_panelist, importance_summary,
          meetings_summary, sponsorship_summary, marketing_needs, recommendations,
          should_return, return_type, ai_summary, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
        RETURNING *
      `, [
        sourceType || 'form',
        originalFileUrl || null,
        originalFileName || null,
        cleanedHtml || null,
        extractedPlaintext || null,
        eventName || null,
        dateStart || null,
        dateEnd || null,
        location || null,
        albersPoc || null,
        otherAttendees || null,
        justification || null,
        isAttendee || false,
        isSponsor || false,
        isPanelist || false,
        importanceSummary || null,
        meetingsSummary || null,
        sponsorshipSummary || null,
        marketingNeeds || null,
        recommendations || null,
        shouldReturn !== false,
        returnType || null,
        aiSummary,
        req.session.userId
      ]);
      
      const tripReportId = result.rows[0].id;
      
      // Insert photos if provided
      if (photoUrls && Array.isArray(photoUrls) && photoUrls.length > 0) {
        for (const photo of photoUrls) {
          await client.query(
            'INSERT INTO trip_report_photos (trip_report_id, file_url, file_name) VALUES ($1, $2, $3)',
            [tripReportId, photo.url, photo.name || 'photo']
          );
        }
      }
      
      await client.query('COMMIT');
      
      res.json({
        id: tripReportId,
        message: "Trip report created successfully"
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error("Error creating trip report:", error);
      res.status(500).json({ error: "Failed to create trip report" });
    } finally {
      client.release();
    }
  });

  // Upload photo for trip report
  app.post("/api/trip-reports/upload", isAuthenticated, upload.single('file'), async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        return res.status(400).json({ error: "File too large. Maximum size is 10MB" });
      }

      // Only allow images
      if (!file.mimetype.startsWith('image/')) {
        return res.status(400).json({ error: "Only image files are allowed" });
      }

      // Upload to local file storage
      const timestamp = Date.now();
      const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const customPath = `trip-reports/${timestamp}-${sanitizedName}`;

      const publicUrl = await localFileStorage.uploadFile(file.buffer, file.originalname, customPath);

      res.json({
        url: publicUrl,
        name: file.originalname,
        size: file.size
      });
    } catch (error) {
      console.error("Error uploading trip report photo:", error);
      res.status(500).json({ error: "Failed to upload photo" });
    }
  });

  // Upload and process PDF document for trip report (with embedded viewer)
  app.post("/api/trip-reports/upload-document", isAuthenticated, upload.single('file'), async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Check file size (max 25MB for PDFs)
      if (file.size > 25 * 1024 * 1024) {
        return res.status(400).json({ error: "File too large. Maximum size is 25MB" });
      }

      // Only allow PDF files
      const isPdf = file.originalname.toLowerCase().endsWith('.pdf') || 
                    file.mimetype === 'application/pdf';
      if (!isPdf) {
        return res.status(400).json({ error: "Only PDF files are supported. Please convert your document to PDF before uploading." });
      }

      const timestamp = Date.now();

      // Upload PDF to local file storage
      const customPath = `trip-reports/documents/${timestamp}-${file.originalname}`;
      const originalFileUrl = await localFileStorage.uploadFile(file.buffer, file.originalname, customPath);

      // For local storage, preview URL is the same as original URL
      const previewUrl = originalFileUrl;

      // Extract text from PDF for search indexing
      let extractedPlaintext = '';
      try {
        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
        // Convert Buffer to Uint8Array as required by pdf.js
        const pdfData = new Uint8Array(file.buffer);
        const loadingTask = pdfjs.getDocument({ data: pdfData });
        const pdfDocument = await loadingTask.promise;
        
        const textParts: string[] = [];
        for (let i = 1; i <= pdfDocument.numPages; i++) {
          const page = await pdfDocument.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');
          textParts.push(pageText);
        }
        extractedPlaintext = textParts.join('\n\n');
      } catch (pdfError) {
        console.error("Error extracting PDF text:", pdfError);
        // Continue without text extraction - PDF will still be viewable
      }

      // Extract title from filename or first line of text
      const metadata: { eventName?: string } = {};
      const baseFilename = file.originalname.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ');
      metadata.eventName = baseFilename;

      res.json({
        success: true,
        data: {
          originalFileUrl,
          previewUrl, // Direct signed URL for immediate preview in dialog
          originalFileName: file.originalname,
          cleanedHtml: null, // PDFs use embedded viewer, not HTML
          extractedPlaintext,
          metadata,
          extractedPhotos: []
        },
        message: "PDF uploaded successfully"
      });
    } catch (error) {
      console.error("Error processing document:", error);
      res.status(500).json({ error: "Failed to process document" });
    }
  });

  // Serve PDF documents with signed URL redirect
  app.get("/api/trip-reports/document/:bucketName/*", isAuthenticated, async (req, res) => {
    try {
      const bucketName = req.params.bucketName;
      const objectPath = req.params[0]; // Everything after bucketName
      
      // Get signed URL from Replit sidecar
      const signedUrlResponse = await fetch('http://localhost:1106/object-storage/signed-object-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bucket_name: bucketName,
          object_name: objectPath,
          method: 'GET',
          expires_at: new Date(Date.now() + 3600 * 1000).toISOString() // 1 hour expiry
        })
      });
      
      if (!signedUrlResponse.ok) {
        return res.status(404).json({ error: "Document not found" });
      }
      
      const { signed_url } = await signedUrlResponse.json();
      res.redirect(signed_url);
    } catch (error) {
      console.error("Error serving document:", error);
      res.status(500).json({ error: "Failed to serve document" });
    }
  });

  // Update trip report
  app.put("/api/trip-reports/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const {
        eventName, dateStart, dateEnd, location, albersPoc, otherAttendees,
        justification, isAttendee, isSponsor, isPanelist, importanceSummary,
        meetingsSummary, sponsorshipSummary, marketingNeeds, recommendations,
        shouldReturn, returnType
      } = req.body;

      await dbPool.query(
        `UPDATE trip_reports SET 
          event_name = $1, date_start = $2, date_end = $3, location = $4,
          albers_poc = $5, other_attendees = $6, justification = $7,
          is_attendee = $8, is_sponsor = $9, is_panelist = $10,
          importance_summary = $11, meetings_summary = $12, sponsorship_summary = $13,
          marketing_needs = $14, recommendations = $15, should_return = $16,
          return_type = $17, updated_at = NOW()
        WHERE id = $18`,
        [
          eventName, dateStart, dateEnd, location, albersPoc, otherAttendees || null,
          justification, isAttendee || false, isSponsor || false, isPanelist || false,
          importanceSummary, meetingsSummary, sponsorshipSummary || null,
          marketingNeeds || null, recommendations, shouldReturn !== false,
          returnType || null, id
        ]
      );

      res.json({ message: "Trip report updated successfully" });
    } catch (error) {
      console.error("Error updating trip report:", error);
      res.status(500).json({ error: "Failed to update trip report" });
    }
  });

  // Delete trip report
  app.delete("/api/trip-reports/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      // Delete photos first (foreign key constraint)
      await dbPool.query('DELETE FROM trip_report_photos WHERE trip_report_id = $1', [id]);
      await dbPool.query('DELETE FROM trip_reports WHERE id = $1', [id]);
      res.json({ message: "Trip report deleted successfully" });
    } catch (error) {
      console.error("Error deleting trip report:", error);
      res.status(500).json({ error: "Failed to delete trip report" });
    }
  });

  // =====================================================
  // INDUSTRY EVENTS - Shows, Conferences, Trade Events
  // =====================================================

  // Get all industry events
  app.get("/api/industry-events", isAuthenticated, async (req, res) => {
    try {
      const result = await dbPool.query(`
        SELECT 
          id, show_name, vertical, start_date, end_date, location, is_active,
          created_by, created_at, updated_at
        FROM industry_events
        WHERE is_active = true
        ORDER BY start_date ASC NULLS LAST
      `);
      
      const events = result.rows.map(row => ({
        id: row.id,
        showName: row.show_name,
        vertical: row.vertical,
        startDate: row.start_date,
        endDate: row.end_date,
        location: row.location,
        isActive: row.is_active,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
      
      res.json(events);
    } catch (error) {
      console.error("Error fetching industry events:", error);
      res.status(500).json({ error: "Failed to fetch industry events" });
    }
  });

  // Create industry event
  app.post("/api/industry-events", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      const { showName, vertical, startDate, endDate, location } = req.body;

      if (!showName) {
        return res.status(400).json({ error: "Show name is required" });
      }

      const result = await dbPool.query(`
        INSERT INTO industry_events (show_name, vertical, start_date, end_date, location, created_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, show_name, vertical, start_date, end_date, location, is_active, created_at
      `, [showName, vertical || null, startDate || null, endDate || null, location || null, userId]);

      const row = result.rows[0];
      res.json({
        id: row.id,
        showName: row.show_name,
        vertical: row.vertical,
        startDate: row.start_date,
        endDate: row.end_date,
        location: row.location,
        isActive: row.is_active,
        createdAt: row.created_at,
      });
    } catch (error) {
      console.error("Error creating industry event:", error);
      res.status(500).json({ error: "Failed to create industry event" });
    }
  });

  // Update industry event
  app.put("/api/industry-events/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { showName, vertical, startDate, endDate, location } = req.body;

      await dbPool.query(`
        UPDATE industry_events 
        SET show_name = $1, vertical = $2, start_date = $3, end_date = $4, location = $5, updated_at = NOW()
        WHERE id = $6
      `, [showName, vertical || null, startDate || null, endDate || null, location || null, id]);

      res.json({ message: "Event updated successfully" });
    } catch (error) {
      console.error("Error updating industry event:", error);
      res.status(500).json({ error: "Failed to update industry event" });
    }
  });

  // Delete industry event (soft delete)
  app.delete("/api/industry-events/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await dbPool.query('UPDATE industry_events SET is_active = false WHERE id = $1', [id]);
      res.json({ message: "Event deleted successfully" });
    } catch (error) {
      console.error("Error deleting industry event:", error);
      res.status(500).json({ error: "Failed to delete industry event" });
    }
  });

  // Bulk import industry events from spreadsheet
  app.post("/api/industry-events/bulk-import", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      const { events } = req.body;

      if (!events || !Array.isArray(events)) {
        return res.status(400).json({ error: "Events array is required" });
      }

      let imported = 0;
      for (const event of events) {
        if (event.showName) {
          await dbPool.query(`
            INSERT INTO industry_events (show_name, vertical, start_date, end_date, location, created_by)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            event.showName,
            event.vertical || null,
            event.startDate || null,
            event.endDate || null,
            event.location || null,
            userId
          ]);
          imported++;
        }
      }

      res.json({ message: `Successfully imported ${imported} events`, imported });
    } catch (error) {
      console.error("Error bulk importing events:", error);
      res.status(500).json({ error: "Failed to import events" });
    }
  });

  // =====================================================
  // DIVISION-AWARE ADMIN ENDPOINTS
  // =====================================================

  const VALID_DIVISIONS = ['corporate', 'defense', 'industrials', 'advanced_programs', 'bou'];

  // Helper: Check if user can admin a specific division
  async function canAdminDivision(userId: string, division: string): Promise<boolean> {
    const result = await dbPool.query('SELECT role FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) return false;
    const role = result.rows[0].role;
    
    // System admin can access all divisions
    if (role === 'admin') return true;
    
    // Check division-specific admin roles
    const divisionAdminMap: Record<string, string> = {
      'corporate': 'corporate_admin',
      'defense': 'defense_admin',
      'industrials': 'industrials_admin',
      'advanced_programs': 'advanced_admin',
      'bou': 'bou_admin'
    };
    
    return role === divisionAdminMap[division];
  }

  // --- Division Home Layout CRUD ---
  
  // Get layout sections (public for rendering)
  app.get("/api/divisions/:division/home-layout", async (req, res) => {
    try {
      const { division } = req.params;
      if (!VALID_DIVISIONS.includes(division)) {
        return res.status(400).json({ error: "Invalid division" });
      }
      const result = await dbPool.query(
        'SELECT * FROM division_home_sections WHERE division = $1 ORDER BY sort_order ASC',
        [division]
      );
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching division home layout:", error);
      res.status(500).json({ error: "Failed to fetch layout" });
    }
  });

  // Get layout sections (admin)
  app.get("/api/divisions/:division/admin/home-layout", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      const { division } = req.params;
      if (!VALID_DIVISIONS.includes(division)) {
        return res.status(400).json({ error: "Invalid division" });
      }
      if (!userId || !(await canAdminDivision(userId, division))) {
        return res.status(403).json({ error: "Division admin access required" });
      }
      const result = await dbPool.query(
        'SELECT * FROM division_home_sections WHERE division = $1 ORDER BY sort_order ASC',
        [division]
      );
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching division home layout:", error);
      res.status(500).json({ error: "Failed to fetch layout" });
    }
  });

  // Update layout sections (admin)
  app.put("/api/divisions/:division/admin/home-layout", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      const { division } = req.params;
      if (!VALID_DIVISIONS.includes(division)) {
        return res.status(400).json({ error: "Invalid division" });
      }
      if (!userId || !(await canAdminDivision(userId, division))) {
        return res.status(403).json({ error: "Division admin access required" });
      }
      
      const { sections } = req.body;
      if (!sections || !Array.isArray(sections)) {
        return res.status(400).json({ error: "Invalid sections data" });
      }
      
      for (const section of sections) {
        await dbPool.query(
          `UPDATE division_home_sections 
           SET sort_order = $1, column_span = $2, is_visible = $3, updated_by = $4, updated_at = NOW()
           WHERE id = $5 AND division = $6`,
          [section.sortOrder, section.columnSpan, section.isVisible, userId, section.id, division]
        );
      }
      
      const result = await dbPool.query(
        'SELECT * FROM division_home_sections WHERE division = $1 ORDER BY sort_order ASC',
        [division]
      );
      res.json(result.rows);
    } catch (error) {
      console.error("Error updating division home layout:", error);
      res.status(500).json({ error: "Failed to update layout" });
    }
  });

  // Reset layout to defaults (admin)
  app.post("/api/divisions/:division/admin/home-layout/reset", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      const { division } = req.params;
      if (!VALID_DIVISIONS.includes(division)) {
        return res.status(400).json({ error: "Invalid division" });
      }
      if (!userId || !(await canAdminDivision(userId, division))) {
        return res.status(403).json({ error: "Division admin access required" });
      }
      
      const defaults = [
        { key: 'hero', order: 0, span: 2 },
        { key: 'news', order: 1, span: 1 },
        { key: 'newsletter', order: 2, span: 1 },
        { key: 'bulletin', order: 3, span: 1 },
        { key: 'quick_links', order: 4, span: 1 },
        { key: 'external_systems', order: 5, span: 1 }
      ];
      
      for (const def of defaults) {
        await dbPool.query(
          `UPDATE division_home_sections 
           SET sort_order = $1, column_span = $2, is_visible = true, updated_by = $3, updated_at = NOW()
           WHERE section_key = $4 AND division = $5`,
          [def.order, def.span, userId, def.key, division]
        );
      }
      
      const result = await dbPool.query(
        'SELECT * FROM division_home_sections WHERE division = $1 ORDER BY sort_order ASC',
        [division]
      );
      res.json(result.rows);
    } catch (error) {
      console.error("Error resetting division home layout:", error);
      res.status(500).json({ error: "Failed to reset layout" });
    }
  });

  // --- Division Quick Links CRUD ---
  
  // Get quick links (public)
  app.get("/api/divisions/:division/quick-links", async (req, res) => {
    try {
      const { division } = req.params;
      if (!VALID_DIVISIONS.includes(division)) {
        return res.status(400).json({ error: "Invalid division" });
      }
      const result = await dbPool.query(
        'SELECT * FROM division_quick_links WHERE division = $1 AND is_visible = true ORDER BY sort_order ASC',
        [division]
      );
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching division quick links:", error);
      res.status(500).json({ error: "Failed to fetch quick links" });
    }
  });

  // Get quick links (admin - all including hidden)
  app.get("/api/divisions/:division/admin/quick-links", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      const { division } = req.params;
      if (!VALID_DIVISIONS.includes(division)) {
        return res.status(400).json({ error: "Invalid division" });
      }
      if (!userId || !(await canAdminDivision(userId, division))) {
        return res.status(403).json({ error: "Division admin access required" });
      }
      const result = await dbPool.query(
        'SELECT * FROM division_quick_links WHERE division = $1 ORDER BY sort_order ASC',
        [division]
      );
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching division quick links:", error);
      res.status(500).json({ error: "Failed to fetch quick links" });
    }
  });

  // Create quick link (admin)
  app.post("/api/divisions/:division/admin/quick-links", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      const { division } = req.params;
      if (!VALID_DIVISIONS.includes(division)) {
        return res.status(400).json({ error: "Invalid division" });
      }
      if (!userId || !(await canAdminDivision(userId, division))) {
        return res.status(403).json({ error: "Division admin access required" });
      }
      
      const { link_type, title, description, icon, url, sort_order, is_visible } = req.body;
      const result = await dbPool.query(
        `INSERT INTO division_quick_links (division, link_type, title, description, icon, url, sort_order, is_visible, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [division, link_type || 'internal', title, description, icon || 'Link', url, sort_order || 0, is_visible !== false, userId]
      );
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error creating division quick link:", error);
      res.status(500).json({ error: "Failed to create quick link" });
    }
  });

  // Update quick link (admin)
  app.put("/api/divisions/:division/admin/quick-links/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      const { division, id } = req.params;
      if (!VALID_DIVISIONS.includes(division)) {
        return res.status(400).json({ error: "Invalid division" });
      }
      if (!userId || !(await canAdminDivision(userId, division))) {
        return res.status(403).json({ error: "Division admin access required" });
      }
      
      const { link_type, title, description, icon, url, sort_order, is_visible } = req.body;
      const result = await dbPool.query(
        `UPDATE division_quick_links 
         SET link_type = COALESCE($1, link_type), title = COALESCE($2, title), description = COALESCE($3, description),
             icon = COALESCE($4, icon), url = COALESCE($5, url), sort_order = COALESCE($6, sort_order), 
             is_visible = COALESCE($7, is_visible), updated_at = NOW()
         WHERE id = $8 AND division = $9 RETURNING *`,
        [link_type, title, description, icon, url, sort_order, is_visible, id, division]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Quick link not found" });
      }
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error updating division quick link:", error);
      res.status(500).json({ error: "Failed to update quick link" });
    }
  });

  // Delete quick link (admin)
  app.delete("/api/divisions/:division/admin/quick-links/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      const { division, id } = req.params;
      if (!VALID_DIVISIONS.includes(division)) {
        return res.status(400).json({ error: "Invalid division" });
      }
      if (!userId || !(await canAdminDivision(userId, division))) {
        return res.status(403).json({ error: "Division admin access required" });
      }
      
      await dbPool.query('DELETE FROM division_quick_links WHERE id = $1 AND division = $2', [id, division]);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting division quick link:", error);
      res.status(500).json({ error: "Failed to delete quick link" });
    }
  });

  // --- Division Hero Assets CRUD ---
  
  // Get active hero asset (public)
  app.get("/api/divisions/:division/hero-asset", async (req, res) => {
    try {
      const { division } = req.params;
      if (!VALID_DIVISIONS.includes(division)) {
        return res.status(400).json({ error: "Invalid division" });
      }
      const result = await dbPool.query(
        'SELECT * FROM division_hero_assets WHERE division = $1 AND is_active = true LIMIT 1',
        [division]
      );
      res.json(result.rows[0] || null);
    } catch (error) {
      console.error("Error fetching division hero asset:", error);
      res.status(500).json({ error: "Failed to fetch hero asset" });
    }
  });

  // Get all hero assets (admin)
  app.get("/api/divisions/:division/admin/hero-assets", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      const { division } = req.params;
      if (!VALID_DIVISIONS.includes(division)) {
        return res.status(400).json({ error: "Invalid division" });
      }
      if (!userId || !(await canAdminDivision(userId, division))) {
        return res.status(403).json({ error: "Division admin access required" });
      }
      const result = await dbPool.query(
        'SELECT * FROM division_hero_assets WHERE division = $1 ORDER BY created_at DESC',
        [division]
      );
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching division hero assets:", error);
      res.status(500).json({ error: "Failed to fetch hero assets" });
    }
  });

  // Set active hero asset (admin)
  app.put("/api/divisions/:division/admin/hero-assets/:id/activate", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      const { division, id } = req.params;
      if (!VALID_DIVISIONS.includes(division)) {
        return res.status(400).json({ error: "Invalid division" });
      }
      if (!userId || !(await canAdminDivision(userId, division))) {
        return res.status(403).json({ error: "Division admin access required" });
      }
      
      // Deactivate all other assets for this division
      await dbPool.query('UPDATE division_hero_assets SET is_active = false WHERE division = $1', [division]);
      
      // Activate selected asset
      const result = await dbPool.query(
        'UPDATE division_hero_assets SET is_active = true WHERE id = $1 AND division = $2 RETURNING *',
        [id, division]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Hero asset not found" });
      }
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error activating division hero asset:", error);
      res.status(500).json({ error: "Failed to activate hero asset" });
    }
  });

  // Delete hero asset (admin)
  app.delete("/api/divisions/:division/admin/hero-assets/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      const { division, id } = req.params;
      if (!VALID_DIVISIONS.includes(division)) {
        return res.status(400).json({ error: "Invalid division" });
      }
      if (!userId || !(await canAdminDivision(userId, division))) {
        return res.status(403).json({ error: "Division admin access required" });
      }
      
      await dbPool.query('DELETE FROM division_hero_assets WHERE id = $1 AND division = $2', [id, division]);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting division hero asset:", error);
      res.status(500).json({ error: "Failed to delete hero asset" });
    }
  });

  // --- Division Bulletins CRUD ---
  
  // Get bulletins (public)
  app.get("/api/divisions/:division/bulletins", async (req, res) => {
    try {
      const { division } = req.params;
      if (!VALID_DIVISIONS.includes(division)) {
        return res.status(400).json({ error: "Invalid division" });
      }
      const result = await dbPool.query(
        `SELECT b.*, u.first_name, u.last_name 
         FROM division_bulletins b 
         LEFT JOIN users u ON b.author_id = u.id
         WHERE b.division = $1 AND b.is_published = true 
         ORDER BY b.is_pinned DESC, b.created_at DESC`,
        [division]
      );
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching division bulletins:", error);
      res.status(500).json({ error: "Failed to fetch bulletins" });
    }
  });

  // Get bulletins (admin - all including unpublished)
  app.get("/api/divisions/:division/admin/bulletins", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      const { division } = req.params;
      if (!VALID_DIVISIONS.includes(division)) {
        return res.status(400).json({ error: "Invalid division" });
      }
      if (!userId || !(await canAdminDivision(userId, division))) {
        return res.status(403).json({ error: "Division admin access required" });
      }
      const result = await dbPool.query(
        `SELECT b.*, u.first_name, u.last_name 
         FROM division_bulletins b 
         LEFT JOIN users u ON b.author_id = u.id
         WHERE b.division = $1 
         ORDER BY b.is_pinned DESC, b.created_at DESC`,
        [division]
      );
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching division bulletins:", error);
      res.status(500).json({ error: "Failed to fetch bulletins" });
    }
  });

  // Create bulletin (admin)
  app.post("/api/divisions/:division/admin/bulletins", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      const { division } = req.params;
      if (!VALID_DIVISIONS.includes(division)) {
        return res.status(400).json({ error: "Invalid division" });
      }
      if (!userId || !(await canAdminDivision(userId, division))) {
        return res.status(403).json({ error: "Division admin access required" });
      }
      
      const { title, content, is_pinned, is_published } = req.body;
      const result = await dbPool.query(
        `INSERT INTO division_bulletins (division, author_id, title, content, is_pinned, is_published)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [division, userId, title, content, is_pinned || false, is_published !== false]
      );
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error creating division bulletin:", error);
      res.status(500).json({ error: "Failed to create bulletin" });
    }
  });

  // Update bulletin (admin)
  app.put("/api/divisions/:division/admin/bulletins/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      const { division, id } = req.params;
      if (!VALID_DIVISIONS.includes(division)) {
        return res.status(400).json({ error: "Invalid division" });
      }
      if (!userId || !(await canAdminDivision(userId, division))) {
        return res.status(403).json({ error: "Division admin access required" });
      }
      
      const { title, content, is_pinned, is_published } = req.body;
      const result = await dbPool.query(
        `UPDATE division_bulletins 
         SET title = COALESCE($1, title), content = COALESCE($2, content), 
             is_pinned = COALESCE($3, is_pinned), is_published = COALESCE($4, is_published), updated_at = NOW()
         WHERE id = $5 AND division = $6 RETURNING *`,
        [title, content, is_pinned, is_published, id, division]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Bulletin not found" });
      }
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error updating division bulletin:", error);
      res.status(500).json({ error: "Failed to update bulletin" });
    }
  });

  // Delete bulletin (admin)
  app.delete("/api/divisions/:division/admin/bulletins/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      const { division, id } = req.params;
      if (!VALID_DIVISIONS.includes(division)) {
        return res.status(400).json({ error: "Invalid division" });
      }
      if (!userId || !(await canAdminDivision(userId, division))) {
        return res.status(403).json({ error: "Division admin access required" });
      }
      
      await dbPool.query('DELETE FROM division_bulletins WHERE id = $1 AND division = $2', [id, division]);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting division bulletin:", error);
      res.status(500).json({ error: "Failed to delete bulletin" });
    }
  });

  // =====================================================
  // Division Newsletters Admin Endpoints
  // =====================================================

  // Get newsletters for division (admin)
  app.get("/api/divisions/:division/admin/newsletters", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      const { division } = req.params;
      if (!VALID_DIVISIONS.includes(division)) {
        return res.status(400).json({ error: "Invalid division" });
      }
      if (!userId || !(await canAdminDivision(userId, division))) {
        return res.status(403).json({ error: "Division admin access required" });
      }
      
      const result = await dbPool.query(
        `SELECT * FROM newsletters WHERE division = $1 ORDER BY published_at DESC`,
        [division]
      );
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching division newsletters:", error);
      res.status(500).json({ error: "Failed to fetch newsletters" });
    }
  });

  // Upload newsletter for division (admin)
  app.post("/api/divisions/:division/admin/newsletters", isAuthenticated, upload.single("file"), async (req, res) => {
    try {
      const userId = req.session.userId;
      const { division } = req.params;
      if (!VALID_DIVISIONS.includes(division)) {
        return res.status(400).json({ error: "Invalid division" });
      }
      if (!userId || !(await canAdminDivision(userId, division))) {
        return res.status(403).json({ error: "Division admin access required" });
      }
      
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { title, description } = req.body;
      if (!title) {
        return res.status(400).json({ error: "Title is required" });
      }

      // Upload file to local file storage
      const timestamp = Date.now();
      const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const customPath = `public/${division}/newsletters/${timestamp}-${sanitizedName}`;

      const publicUrl = await localFileStorage.uploadFile(file.buffer, file.originalname, customPath);

      // Archive all current newsletters for this division
      await dbPool.query(
        `UPDATE newsletters SET is_current = false WHERE division = $1 AND is_current = true`,
        [division]
      );

      // Insert new newsletter as current
      const result = await dbPool.query(
        `INSERT INTO newsletters (division, title, description, file_url, file_name, published_at, is_current, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, NOW(), true, $6) RETURNING *`,
        [division, title, description || null, publicUrl, file.originalname, userId]
      );

      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error uploading division newsletter:", error);
      res.status(500).json({ error: "Failed to upload newsletter" });
    }
  });

  // Set newsletter as current (admin)
  app.post("/api/divisions/:division/admin/newsletters/:id/set-current", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      const { division, id } = req.params;
      if (!VALID_DIVISIONS.includes(division)) {
        return res.status(400).json({ error: "Invalid division" });
      }
      if (!userId || !(await canAdminDivision(userId, division))) {
        return res.status(403).json({ error: "Division admin access required" });
      }
      
      // Archive all current newsletters for this division
      await dbPool.query(
        `UPDATE newsletters SET is_current = false WHERE division = $1 AND is_current = true`,
        [division]
      );

      // Set this newsletter as current
      const result = await dbPool.query(
        `UPDATE newsletters SET is_current = true WHERE id = $1 AND division = $2 RETURNING *`,
        [id, division]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Newsletter not found" });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error setting current newsletter:", error);
      res.status(500).json({ error: "Failed to set current newsletter" });
    }
  });

  // Delete newsletter (admin)
  app.delete("/api/divisions/:division/admin/newsletters/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      const { division, id } = req.params;
      if (!VALID_DIVISIONS.includes(division)) {
        return res.status(400).json({ error: "Invalid division" });
      }
      if (!userId || !(await canAdminDivision(userId, division))) {
        return res.status(403).json({ error: "Division admin access required" });
      }
      
      // Get the newsletter to delete the file
      const newsletter = await dbPool.query(
        'SELECT * FROM newsletters WHERE id = $1 AND division = $2',
        [id, division]
      );

      if (newsletter.rows.length === 0) {
        return res.status(404).json({ error: "Newsletter not found" });
      }

      // Delete the file from local storage if it exists
      if (newsletter.rows[0].file_url && newsletter.rows[0].file_url.startsWith('/api/files/')) {
        try {
          const filename = newsletter.rows[0].file_url.replace('/api/files/', '');
          await localFileStorage.deleteFile(filename);
        } catch (deleteError) {
          console.error("Error deleting newsletter file:", deleteError);
          // Continue with deletion even if file delete fails
        }
      }

      await dbPool.query('DELETE FROM newsletters WHERE id = $1 AND division = $2', [id, division]);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting division newsletter:", error);
      res.status(500).json({ error: "Failed to delete newsletter" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
