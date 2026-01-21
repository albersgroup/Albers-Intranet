import type { Express } from "express";
import { createServer, type Server } from "http";
import { Pool } from "pg";
import multer from "multer";
import path from "path";
import { localFileStorage, ObjectNotFoundError } from "./localFileStorage";
import { getSOPContext, getSOPByTitle } from "./sop-loader";
import { getKnowledgeBase } from "./generate-knowledge-base";
import { sendNewOpportunityEmail, sendTrainingAssignmentEmail, sendVerificationEmail, sendIdiqMentionEmail } from "./smtp-client";
import { 
  findUserByEmail, 
  createUser, 
  verifyPassword, 
  generateSSOToken,
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

// Helper function to send training assignment notifications
async function sendTrainingAssignmentNotifications(
  notifications: { assignedToUserId: string; slideId: string; assignmentId: string }[],
  assignedByUserId: string
) {
  try {
    // Get assigner info
    const assignerResult = await dbPool.query(
      'SELECT first_name, last_name FROM users WHERE id = $1',
      [assignedByUserId]
    );
    const assigner = assignerResult.rows[0];
    const assignerName = assigner ? `${assigner.first_name || ''} ${assigner.last_name || ''}`.trim() || 'BOU Admin' : 'BOU Admin';
    
    // Get base URL for links
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    
    for (const notification of notifications) {
      try {
        // Get user and slide info
        const [userResult, slideResult] = await Promise.all([
          dbPool.query('SELECT email, first_name, last_name FROM users WHERE id = $1', [notification.assignedToUserId]),
          dbPool.query('SELECT title FROM bou_training_slides WHERE id = $1', [notification.slideId])
        ]);
        
        const user = userResult.rows[0];
        const slide = slideResult.rows[0];
        
        if (user && slide) {
          const assigneeName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Team Member';
          const trainingUrl = `${baseUrl}/training`;
          
          // Get due date from assignment
          const assignmentResult = await dbPool.query(
            'SELECT due_at FROM bou_training_assignments WHERE id = $1',
            [notification.assignmentId]
          );
          const dueAt = assignmentResult.rows[0]?.due_at || null;
          
          await sendTrainingAssignmentEmail(
            user.email,
            assigneeName,
            slide.title,
            assignerName,
            dueAt,
            trainingUrl
          );
          
          // Update notification_sent_at
          await dbPool.query(
            'UPDATE bou_training_assignments SET notification_sent_at = NOW() WHERE id = $1',
            [notification.assignmentId]
          );
          
          console.log(`Training assignment notification sent to ${user.email} for module "${slide.title}"`);
        }
      } catch (err) {
        console.error(`Error sending notification for assignment ${notification.assignmentId}:`, err);
      }
    }
  } catch (error) {
    console.error('Error in sendTrainingAssignmentNotifications:', error);
    throw error;
  }
}

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

      // Check if email is verified
      if (!user.email_verified) {
        // Generate new verification code and resend email
        try {
          const crypto = await import('crypto');
          const newVerificationCode = crypto.randomBytes(3).toString('hex').toUpperCase();
          const newExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
          
          // Update user with new verification code
          await dbPool.query(
            `UPDATE users SET verification_code = $1, verification_code_expires_at = $2 WHERE id = $3`,
            [newVerificationCode, newExpiresAt, user.id]
          );
          
          // Send new verification email
          await sendVerificationEmail(user.email, newVerificationCode);
          
          return res.status(403).json({ 
            message: "Your email is not verified. We've sent a new verification code to your inbox.",
            requiresVerification: true,
            emailResent: true
          });
        } catch (emailError) {
          console.error("Error resending verification email:", emailError);
          return res.status(403).json({ 
            message: "Please verify your email before logging in. Check your inbox for the verification code.",
            requiresVerification: true
          });
        }
      }

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
          const { sendAdminAssignmentEmail } = await import("./resend-client");
          const intranetUrl = process.env.REPLIT_DEPLOYMENT_URL || `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
          
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

  // Knowledge Base Admin Routes
  
  // Get all knowledge articles
  app.get("/api/admin/knowledge-articles", isAuthenticated, async (req, res) => {
    try {
      const currentUser = await findUserByEmail(req.session.userEmail!);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }

      const result = await dbPool.query(`
        SELECT id, title, content, category, tags, is_active, priority, created_at, updated_at
        FROM knowledge_articles
        ORDER BY priority DESC, created_at DESC
      `);

      res.json(result.rows.map(row => ({
        id: row.id,
        title: row.title,
        content: row.content,
        category: row.category,
        tags: row.tags,
        isActive: row.is_active,
        priority: row.priority,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })));
    } catch (error) {
      console.error("Error fetching knowledge articles:", error);
      res.status(500).json({ message: "Failed to fetch knowledge articles" });
    }
  });

  // Create a new knowledge article
  app.post("/api/admin/knowledge-articles", isAuthenticated, async (req, res) => {
    try {
      const currentUser = await findUserByEmail(req.session.userEmail!);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }

      const { title, content, category, tags, isActive, priority } = req.body;

      const result = await dbPool.query(`
        INSERT INTO knowledge_articles (title, content, category, tags, is_active, priority, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `, [title, content, category || 'general', tags || null, isActive !== false, priority || 0, currentUser.id]);

      res.json({ id: result.rows[0].id, success: true });
    } catch (error) {
      console.error("Error creating knowledge article:", error);
      res.status(500).json({ message: "Failed to create knowledge article" });
    }
  });

  // Update a knowledge article
  app.patch("/api/admin/knowledge-articles/:id", isAuthenticated, async (req, res) => {
    try {
      const currentUser = await findUserByEmail(req.session.userEmail!);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }

      const { id } = req.params;
      const { title, content, category, tags, isActive, priority } = req.body;

      await dbPool.query(`
        UPDATE knowledge_articles
        SET title = $1, content = $2, category = $3, tags = $4, is_active = $5, priority = $6, updated_at = now()
        WHERE id = $7
      `, [title, content, category, tags, isActive, priority, id]);

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating knowledge article:", error);
      res.status(500).json({ message: "Failed to update knowledge article" });
    }
  });

  // Delete a knowledge article
  app.delete("/api/admin/knowledge-articles/:id", isAuthenticated, async (req, res) => {
    try {
      const currentUser = await findUserByEmail(req.session.userEmail!);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }

      const { id } = req.params;
      await dbPool.query(`DELETE FROM knowledge_articles WHERE id = $1`, [id]);

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting knowledge article:", error);
      res.status(500).json({ message: "Failed to delete knowledge article" });
    }
  });

  // Delete all knowledge articles (or by type)
  app.delete("/api/admin/knowledge-articles", isAuthenticated, async (req, res) => {
    try {
      const currentUser = await findUserByEmail(req.session.userEmail!);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }

      const { type } = req.query; // optional: 'sop', 'newsletter', 'training', 'custom', or 'all'
      
      let result;
      if (type && type !== 'all') {
        result = await dbPool.query(`DELETE FROM knowledge_articles WHERE source_type = $1`, [type]);
      } else {
        result = await dbPool.query(`DELETE FROM knowledge_articles`);
      }

      res.json({ success: true, deleted: result.rowCount });
    } catch (error) {
      console.error("Error deleting knowledge articles:", error);
      res.status(500).json({ message: "Failed to delete knowledge articles" });
    }
  });

  // Import existing content into knowledge articles
  app.post("/api/admin/knowledge-articles/import", isAuthenticated, async (req, res) => {
    try {
      const currentUser = await findUserByEmail(req.session.userEmail!);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }

      const { loadSOPDocuments } = await import("./sop-loader");
      let imported = { sops: 0, newsletters: 0, training: 0 };

      // Import SOPs
      const sops = await loadSOPDocuments();
      for (const sop of sops) {
        // Check if SOP already exists by title (prevents duplicates)
        const existing = await dbPool.query(
          `SELECT id FROM knowledge_articles WHERE title = $1 OR (source_type = 'sop' AND source_id = $2)`,
          [sop.title, sop.filename]
        );
        if (existing.rows.length === 0) {
          // Strip HTML and truncate for knowledge article
          const plainContent = sop.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 5000);
          await dbPool.query(`
            INSERT INTO knowledge_articles (title, content, category, tags, source_type, source_id, is_active, priority)
            VALUES ($1, $2, $3, $4, 'sop', $5, true, 5)
          `, [sop.title, plainContent, 'processes', [sop.category, 'sop'].filter(Boolean), sop.filename]);
          imported.sops++;
        }
      }

      // Import newsletters
      const newsletters = await dbPool.query(`
        SELECT id, title, division, description FROM newsletters WHERE is_current = true
      `);
      for (const newsletter of newsletters.rows) {
        const articleTitle = `Newsletter: ${newsletter.title}`;
        // Check by title OR source_id to prevent duplicates
        const existing = await dbPool.query(
          `SELECT id FROM knowledge_articles WHERE title = $1 OR (source_type = 'newsletter' AND source_id = $2)`,
          [articleTitle, newsletter.id]
        );
        if (existing.rows.length === 0) {
          const desc = newsletter.description || '';
          const plainContent = desc.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 5000);
          await dbPool.query(`
            INSERT INTO knowledge_articles (title, content, category, tags, source_type, source_id, is_active, priority)
            VALUES ($1, $2, $3, $4, 'newsletter', $5, true, 3)
          `, [articleTitle, plainContent || `Newsletter for ${newsletter.division}`, 'company_info', [newsletter.division, 'newsletter'].filter(Boolean), newsletter.id]);
          imported.newsletters++;
        }
      }

      // Import training materials
      const training = await dbPool.query(`
        SELECT s.id, s.title, s.caption, c.name as category_name
        FROM bou_training_slides s
        LEFT JOIN bou_training_categories c ON s.category_id = c.id
        WHERE s.is_published = true
      `);
      for (const slide of training.rows) {
        const articleTitle = `Training: ${slide.title}`;
        // Check by title OR source_id to prevent duplicates
        const existing = await dbPool.query(
          `SELECT id FROM knowledge_articles WHERE title = $1 OR (source_type = 'training' AND source_id = $2)`,
          [articleTitle, slide.id]
        );
        if (existing.rows.length === 0) {
          const content = slide.caption || `Training material: ${slide.title}`;
          await dbPool.query(`
            INSERT INTO knowledge_articles (title, content, category, tags, source_type, source_id, is_active, priority)
            VALUES ($1, $2, $3, $4, 'training', $5, true, 4)
          `, [articleTitle, content.slice(0, 5000), 'training', [slide.category_name || 'training', 'bou'].filter(Boolean), slide.id]);
          imported.training++;
        }
      }

      // Regenerate knowledge base
      const { generateEnhancedKnowledgeBase } = await import("./generate-knowledge-base");
      await generateEnhancedKnowledgeBase("import");

      res.json({ 
        success: true, 
        message: `Imported ${imported.sops} SOPs, ${imported.newsletters} newsletters, ${imported.training} training materials`,
        imported 
      });
    } catch (error) {
      console.error("Error importing content:", error);
      res.status(500).json({ message: "Failed to import content" });
    }
  });

  // Get knowledge update logs
  app.get("/api/admin/knowledge-update-logs", isAuthenticated, async (req, res) => {
    try {
      const currentUser = await findUserByEmail(req.session.userEmail!);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }

      const result = await dbPool.query(`
        SELECT id, update_type, sources_included, articles_count, sops_count, news_count, 
               bulletins_count, newsletters_count, status, error_message, created_at
        FROM knowledge_update_logs
        ORDER BY created_at DESC
        LIMIT 20
      `);

      res.json(result.rows.map(row => ({
        id: row.id,
        updateType: row.update_type,
        sourcesIncluded: row.sources_included,
        articlesCount: row.articles_count,
        sopsCount: row.sops_count,
        newsCount: row.news_count,
        bulletinsCount: row.bulletins_count,
        newslettersCount: row.newsletters_count,
        status: row.status,
        errorMessage: row.error_message,
        createdAt: row.created_at,
      })));
    } catch (error) {
      console.error("Error fetching knowledge update logs:", error);
      res.status(500).json({ message: "Failed to fetch knowledge update logs" });
    }
  });

  // Regenerate knowledge base manually
  app.post("/api/admin/knowledge-base/regenerate", isAuthenticated, async (req, res) => {
    try {
      const currentUser = await findUserByEmail(req.session.userEmail!);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }

      // Import and call the enhanced knowledge base generator
      const { generateEnhancedKnowledgeBase } = await import("./generate-knowledge-base");
      await generateEnhancedKnowledgeBase("manual");

      res.json({ success: true, message: "Knowledge base regenerated successfully" });
    } catch (error) {
      console.error("Error regenerating knowledge base:", error);
      res.status(500).json({ message: "Failed to regenerate knowledge base" });
    }
  });

  // SSO endpoint - Redirect to BI Reports app with authentication token
  app.get("/api/easy-bi-reports", isAuthenticated, (req, res) => {
    try {
      const userEmail = req.session.userEmail;
      
      if (!userEmail) {
        return res.status(401).send('You must be logged in to access BI Reports');
      }

      // Generate SSO token with user email and name
      const userName = userEmail.split('@')[0];
      const token = generateSSOToken(userEmail, userName);
      
      // Get BI app URL from environment
      const biAppUrl = process.env.BI_APP_URL;
      
      if (!biAppUrl) {
        console.error('BI_APP_URL not configured');
        return res.status(500).send('BI app URL not configured');
      }
      
      // Redirect to BI app with SSO token
      res.redirect(`${biAppUrl}/auth/sso?token=${token}`);
      
    } catch (error) {
      console.error('SSO redirect error:', error);
      res.status(500).send('SSO redirect failed');
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

  // Chat endpoint with OpenAI integration and context awareness
  app.post("/api/chat", async (req, res) => {
    // Albers Bot is disabled for internal deployment (no OpenAI API)
    if (!OPENAI_ENABLED) {
      return res.status(503).json({
        error: "Albers Bot is currently unavailable",
        message: "AI chat features are disabled in this deployment. Please contact your administrator if you need assistance."
      });
    }

    try {
      const { messages, uploadedFiles, pageContext, currentData, pageName } = req.body as {
        messages: Message[];
        uploadedFiles?: string[];
        pageContext?: string;
        currentData?: Record<string, any>;
        pageName?: string;
      };

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Messages array is required" });
      }

      // Load SOP context and knowledge base
      const sopContext = await getSOPContext();
      const knowledgeBase = getKnowledgeBase();

      // Build enhanced system message with page context
      let enhancedContext = knowledgeBase + "\n\n" + sopContext;
      
      // Add conversational tone guidelines
      enhancedContext += `\n\n=== COMMUNICATION STYLE ===
You're talking to someone who might be BRAND NEW. Keep it simple, friendly, and super easy to digest.

HOW TO RESPOND:
• Keep it SHORT - aim for 150-200 words max (think 3-4 short sentences or a tiny paragraph)
• Use LINE BREAKS between thoughts so it's easy to scan
• Use BULLET POINTS when listing things (not paragraphs)
• Talk like you're explaining to a friend over coffee
• Ask a follow-up question to keep the conversation going

FORMATTING IS KEY:
✅ Break up your text with blank lines
✅ Use bullets (•) for lists
✅ Keep paragraphs to 1-2 sentences max
❌ Never write a wall of text

LANGUAGE LEVEL: Imagine explaining to someone on their first day. No jargon unless you explain it simply.

BAD EXAMPLE (too wordy, no spacing):
"The capture plan development process involves multiple stakeholders including the Capture Manager who is responsible for coordinating resources, developing win themes, and creating a comprehensive strategy document that addresses technical approach, pricing strategy, and competitive positioning as outlined in SOP-CAP-001."

GOOD EXAMPLE (short, spaced, conversational):
"A capture plan? Think of it as your game plan for winning a contract.

The Capture Manager usually leads this. They figure out:
• What makes you different
• How to price it
• Who needs to be on the team

Working on one now? I can point you to the right docs!"

Remember: SHORT, SPACED, SIMPLE. Always.

=== ALWAYS PROVIDE RESOURCE LINKS ===
When mentioning SOPs, processes, tools, or internal pages, ALWAYS include a clickable link!

Use markdown link format: [Link Text](url)

KEY INTERNAL LINKS TO USE:
• SOP Library: [SOP Library](/sops)
• Proposal Training: [Training](/training)
• Capture Questions: [Capture Questions Form](/capture-questions)
• Bid/No-Bid Tool: [Bid/No-Bid](/bid-no-bid)
• New Opportunity Form: [New Business Opportunity](/new-opportunity)
• Trip Reports: [Trip Reports](/trip-reports)

For specific SOPs, use: [SOP Title](/sops?doc=ENCODED_TITLE)
Example: [Gate 1 Workflow](/sops?doc=Gate%201%20Workflow%20%E2%80%93%20Qualification%20Review)

EVERY response about a process should end with a relevant link!

GOOD EXAMPLE:
"Gate 1 is the Qualification Review - it's where leadership decides if an opportunity is worth pursuing.

Key things reviewed:
• Customer fit
• Technical capability  
• Resource availability

Here's the full process: [Gate 1 Workflow](/sops?doc=Gate%201%20Workflow%20%E2%80%93%20Qualification%20Review)

Want me to explain any specific part?"

=== WHAT YOU CAN AND CANNOT DO ===

✅ YOU CAN:
• Answer questions about BOU processes, SOPs, and procedures
• Explain concepts, workflows, and requirements in simple terms
• Help improve and rewrite text for capture responses (make it professional and government-contract-ready)
• Provide structured templates, outlines, and examples in text format
• Guide users to the right SOPs and resources
• Explain decision criteria, risk assessment, and best practices
• Walk through forms, charts, and tools step-by-step

❌ YOU CANNOT:
• Create or generate downloadable files (Excel, Word, PDF, etc.)
• Access external systems (Salesforce, GovDash, etc.)
• Send emails or make automated submissions
• Store or remember information between conversations
• Access real-time data or live databases

WHEN USERS ASK FOR FILES:
Instead of promising "I can create that file," say:
"I can't generate downloadable files, BUT I can give you a ready-to-copy template you can paste into Excel/Word/Google Sheets."

Then provide:
• A well-formatted text template they can copy/paste
• Clear column headers for spreadsheets (comma-separated or tab-separated)
• Instructions on how to format it in their chosen tool

EXAMPLE RESPONSE WHEN ASKED FOR EXCEL:
"I can't create Excel files directly, but here's a template you can copy into Excel:

**Copy this into Excel (each line is a row):**
Contact Name | Role | Email | Outreach Date | Notes
John Doe | PM | j.doe@customer.com | 2025-11-15 | Initial intro call
Jane Smith | Tech Lead | j.smith@customer.com | 2025-11-22 | Requirements review

Just paste it in, and Excel will auto-format the columns.

Need help adding more rows or adjusting the format?"

BE HONEST ABOUT LIMITATIONS. Guide users to what you CAN do instead of overpromising.
`;

      // Add page-specific context
      if (pageContext === "capture-questions") {
        enhancedContext += `\n\n=== CURRENT PAGE: ${pageName} ===
You're helping with the Capture Questions form.

You can see their form data:
${currentData && Object.keys(currentData).length > 0 
  ? Object.entries(currentData)
      .filter(([_, value]) => value)
      .map(([key, value]) => `  - ${key}: ${value}`)
      .join('\n')
  : '  (Nothing filled in yet)'}

When they ask you to improve text, give them a better version - professional but easy to read.
Keep your help SHORT and ask what they need.`;
      } else if (pageContext === "sop-library") {
        enhancedContext += `\n\n=== CURRENT PAGE: ${pageName} ===
You're helping them find SOPs.

Point them to the right document, don't recite it.
Explain processes in simple, everyday terms.
Ask what they're trying to do so you can help better.`;
      } else if (pageContext === "bid-no-bid") {
        enhancedContext += `\n\n=== CURRENT PAGE: ${pageName} ===
You're helping with the Bid/No Bid chart.

The chart has these sections:
• MANAGER INFO (top row): Capture Manager name and Functional Team
• OPPORTUNITY DESCRIPTION: Customer, Type of Opportunity, Product/Service, Description
• PRELIMINARY REVENUE, TIMING, PWIN: Total Price, Timing, pWin (probability of winning), Notes
• GENERAL/PM/PRELIMINARY RISK ASSESSMENT: PoP (Period of Performance), Competition, Risk levels (Technical, Cost, Schedule)
• PROPOSAL LOE, COST, AND SCHEDULE: Deadline, Team Members, Deliverables, Estimated Hours

This chart helps decide whether to bid on an opportunity or not.

When they ask:
• Explain what should go in each field (short answers!)
• Help them understand decision criteria
• Guide them on how to assess risks
• Point them to relevant SOPs if needed

Keep it simple and actionable!`;
      } else if (pageContext === "new-opportunity") {
        enhancedContext += `\n\n=== CURRENT PAGE: ${pageName} ===
You're helping with the New Business Opportunity Form.

This form sends opportunity information to the CRM Manager to be input into the CRM platform.

The form has 21 fields including:
• Basic Info: Opportunity Name, Capture Manager, Opportunity Type, Business Vertical/Unit
• Prime/Sub Status: When "Subcontractor" is selected, they must provide the Prime Contractor Name
• Opportunity Details: Customer Name, Summary, Discovery Date, NAICS Codes
• Contract Info: Pricing Structure, Pursuit Phase, Final RFP Issue Date
• Additional: Program Duration, Marketplace Sector, Compliance Clauses, Solicitation Link

The form has auto-save and sends an email to the CRM Manager when submitted.

When they ask:
• Explain what goes in each field (short answers!)
• Help them understand the difference between Prime vs Subcontractor
• Guide them on NAICS codes or pricing structures
• Point them to relevant SOPs if they need more context

Keep it helpful and straightforward!`;
      } else if (pageContext === "albers-bot-full") {
        enhancedContext += `\n\n=== CURRENT PAGE: ${pageName} (Full-Screen AI Assistant) ===
You have COMPLETE ACCESS to all information, modules, and documents in the Albers Aerospace Intranet:

=== INTRANET NAVIGATION GUIDE ===
When users ask "where can I find..." or "how do I get to...", provide the exact page path:

MAIN PAGES:
• Home Page → /
• News Archive → /news-archive (browse all company news)
• SOPs & Processes → /sops (Standard Operating Procedures library)
• Albers Bot (this page) → /albers-bot

BUSINESS DEVELOPMENT TOOLS:
• New Opportunity Form → /new-opportunity (submit new business opportunities)
• Bid / No-Bid Tool → /bid-no-bid (opportunity evaluation matrix)
• Capture Questions → /capture-questions (42 questions for capture prep)
• Proposal Training → /proposal-training (best practices slides)

EXTERNAL TOOLS (open in new tab):
• Business Intelligence Tool → Click "Business Intelligence Tool" in sidebar (business intelligence)
• GovDash → https://dashboard.govdash.com/login
• ClickUp → https://app.clickup.com/login
• Salesforce → https://albers.my.salesforce.com/

FINANCE & HR:
• Unanet (Timekeeping) → https://albers-aero.unanet.biz/albers-aero/action/login
• Rippling (HR & Payroll) → https://app.rippling.com/
• 401k / Retirement → https://www.principal.com/
• Healthcare Portal → https://www.anthem.com/

DIVISION PORTALS:
• Albers Defense → /defense
• Albers Industrials → /industrials
• Albers Advanced Programs → /special-projects

PRO TIP: Tell users they can press ⌘K (or Ctrl+K) to open quick search anytime!

=== INTRANET MODULES ===

1. SOPs & PROCESSES MODULE (/sops):
   - Full library of Standard Operating Procedures
   - Visual opportunity lifecycle flowchart (Gate 1 → Gate 2 → Gate 3 process)
   - Document categories: Gate Workflows, Capture Management, Proposal Development, etc.

2. CAPTURE QUESTIONS MODULE (/capture-questions):
   - 42 comprehensive questions organized by phase (Analysis, Intel, Solution)
   - Helps BD/Capture Managers prepare opportunities before proposal handoff
   - 80% completion threshold required for submission

3. BID/NO-BID MODULE (/bid-no-bid):
   - Decision matrix for evaluating opportunities
   - Sections: Manager Info, Opportunity Description, Revenue/Timing/pWin, Risk Assessment, Proposal LOE

4. NEW BUSINESS OPPORTUNITY FORM (/new-opportunity):
   - 21-field intake form that sends opportunity data to CRM Manager
   - Includes Prime/Sub selection with conditional Prime Contractor Name field
   - Auto-save functionality with email submission to CRM platform

5. BUSINESS INTELLIGENCE TOOL (Business Intelligence Tool in sidebar):
   - Analytics and insights for BD activities
   - Tracks opportunities, win rates, pipeline health

You can:
• Answer questions about any SOP or process
• Explain the Gates 1-3 workflow in detail
• NAVIGATE users to the right pages - always provide the path!
• Help users understand capture phases and requirements
• Provide guidance on completing capture questions
• Explain Bid/No-Bid decision criteria
• Improve and rewrite capture responses with professional government contracting language

Be comprehensive but conversational. You have full knowledge - use it!`;
      } else if (pageContext === "business-intelligence") {
        enhancedContext += `\n\n=== CURRENT PAGE: ${pageName} ===
You're helping with business intelligence and analytics.

Explain how to track opportunities, analyze win rates, and understand pipeline health.
Keep it simple and actionable!`;
      } else if (pageContext === "general") {
        enhancedContext += `\n\n=== CURRENT PAGE: ${pageName} ===
You're helping them get started.

Welcome them warmly and point them where they need to go.
Ask about their role so you can guide them better.`;
      }

      // Build messages for OpenAI
      const systemMessage: Message = {
        role: "system",
        content: enhancedContext
      };

      let userContext = "";
      if (uploadedFiles && uploadedFiles.length > 0) {
        userContext += "\n\nThe user has uploaded files for your review. " +
          "Please acknowledge the uploads and offer to help analyze them based on our SOPs and processes.";
      }

      // Add user context to the last user message if needed
      const messagesWithContext = [...messages];
      if (userContext && messagesWithContext.length > 0) {
        const lastUserMsgIndex = messagesWithContext.length - 1;
        if (messagesWithContext[lastUserMsgIndex].role === "user") {
          messagesWithContext[lastUserMsgIndex] = {
            ...messagesWithContext[lastUserMsgIndex],
            content: messagesWithContext[lastUserMsgIndex].content + userContext
          };
        }
      }

      // Call OpenAI - using gpt-5-mini with very short, digestible responses
      // Note: GPT-5 models use reasoning tokens internally, so we need more tokens
      // to allow for both reasoning (internal) and the actual response (150-200 words)
      const completion = await openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: [systemMessage, ...messagesWithContext],
        max_completion_tokens: 1200, // Allows ~500 for reasoning + ~700 for response
      });

      const assistantMessage = completion.choices[0].message.content || "";

      res.json({ 
        message: assistantMessage,
        usage: completion.usage 
      });
    } catch (error) {
      console.error("Error in chat endpoint:", error);
      res.status(500).json({ error: "Failed to process chat request" });
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

      // Get Resend client
      const { client: resend, fromEmail } = await getUncachableResendClient();

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
      await resend.emails.send({
        from: fromEmail,
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

  // Get content block for a division (public - any authenticated user)
  app.get("/api/content-blocks/:division/:blockType", isAuthenticated, async (req, res) => {
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

  // Get all team spotlights for a division
  app.get("/api/team-spotlights/:division", isAuthenticated, async (req, res) => {
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

  // Get the latest active LinkedIn post
  app.get("/api/linkedin/latest", isAuthenticated, async (req, res) => {
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

  // ClickUp API Integration for Proposal Dashboard
  const CLICKUP_API_KEY = process.env.CLICKUP_API_KEY;
  const CLICKUP_SPACE_ID = "90141461317"; // Proposal Management space
  
  // Helper function to fetch from ClickUp API
  async function clickupFetch(endpoint: string) {
    if (!CLICKUP_API_KEY) {
      throw new Error("ClickUp API key not configured");
    }
    const response = await fetch(`https://api.clickup.com/api/v2${endpoint}`, {
      headers: {
        'Authorization': CLICKUP_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      throw new Error(`ClickUp API error: ${response.status}`);
    }
    return response.json();
  }

  // Get ClickUp proposal dashboard data
  app.get("/api/clickup/dashboard", isAuthenticated, async (req, res) => {
    try {
      if (!CLICKUP_API_KEY) {
        return res.status(500).json({ error: "ClickUp API key not configured" });
      }

      // Get all folders in the space
      const foldersData = await clickupFetch(`/space/${CLICKUP_SPACE_ID}/folder`);
      const folders = foldersData.folders || [];
      
      // Get folderless lists in the space
      const folderlessLists = await clickupFetch(`/space/${CLICKUP_SPACE_ID}/list?archived=true`);
      
      // Build list info mapping while collecting list IDs (single pass)
      const listInfo: Record<string, { folderName: string; listName: string }> = {};
      
      for (const list of folderlessLists.lists || []) {
        listInfo[list.id] = { folderName: 'Root', listName: list.name || 'Unknown List' };
      }
      
      for (const folder of folders) {
        const listsData = await clickupFetch(`/folder/${folder.id}/list`);
        for (const list of listsData.lists || []) {
          listInfo[list.id] = { folderName: folder.name || 'Unknown Folder', listName: list.name || 'Unknown List' };
        }
      }
      
      // Fetch tasks from all lists with folder/list context
      const allTasks: any[] = [];
      const listIds = Object.keys(listInfo);
      
      for (const listId of listIds) {
        try {
          const tasksData = await clickupFetch(`/list/${listId}/task?include_closed=true`);
          const info = listInfo[listId];
          allTasks.push(...(tasksData.tasks || []).map((t: any) => ({
            ...t,
            folderName: info.folderName,
            listName: info.listName
          })));
        } catch (e) {
          // Skip lists that fail to fetch
        }
      }

      // Get current year for YTD calculations
      const currentYear = new Date().getFullYear();
      const startOfYear = new Date(currentYear, 0, 1).getTime();
      
      // Helper function to get "Submitted Date" custom field value
      const getSubmittedDate = (task: any): number | null => {
        if (!task.custom_fields) return null;
        const submittedDateField = task.custom_fields.find((cf: any) => 
          cf.name?.toLowerCase().includes('submitted') && 
          (cf.name?.toLowerCase().includes('date') || cf.type === 'date')
        );
        if (submittedDateField && submittedDateField.value) {
          const dateValue = Number(submittedDateField.value);
          return isNaN(dateValue) ? null : dateValue;
        }
        return null;
      };
      
      // Log custom field names for debugging - specifically from Submitted list
      const submittedTask = allTasks.find(t => 
        t.custom_fields?.length > 0 && 
        (t.listName || '').toLowerCase() === 'submitted'
      );
      if (submittedTask) {
        console.log("Custom fields from Submitted list task:", submittedTask.custom_fields?.map((cf: any) => `${cf.name} (${cf.type})`));
        // Log Division field if found
        const divisionField = submittedTask.custom_fields.find((cf: any) => 
          cf.name?.toLowerCase().includes('division')
        );
        if (divisionField) {
          console.log("Division field structure:", JSON.stringify(divisionField, null, 2));
        }
        // Log all dropdown fields to find Division
        const dropdownFields = submittedTask.custom_fields.filter((cf: any) => cf.type === 'drop_down');
        console.log("All dropdown fields:", dropdownFields.map((cf: any) => ({
          name: cf.name,
          value: cf.value,
          options: cf.type_config?.options?.map((o: any) => o.name)
        })));
      }
      
      // For YTD filtering, use date_created as fallback but prioritize Submitted Date for source selection tasks
      const ytdTasks = allTasks.filter(task => {
        // First check if task has a Submitted Date custom field
        const submittedDate = getSubmittedDate(task);
        if (submittedDate) {
          return submittedDate >= startOfYear;
        }
        // Fallback to date_created
        if (!task.date_created) return true;
        const taskDate = Number(task.date_created);
        if (isNaN(taskDate)) return true;
        return taskDate >= startOfYear;
      });
      
      // Status-based categorization
      const statusCounts: Record<string, number> = {};
      const assigneeCounts: Record<string, number> = {};
      const businessUnitCounts: Record<string, number> = { Defense: 0, Innovation: 0, Industrials: 0 };
      
      let winsYTD = 0;
      let lossesYTD = 0;
      let currentlyWriting = 0;
      let sourceSelection = 0;
      let selectedNotFunded = 0;
      let preRfpCount = 0;
      let submittedCount = 0;
      
      for (const task of ytdTasks) {
        const statusName = task.status?.status?.toLowerCase() || '';
        statusCounts[statusName] = (statusCounts[statusName] || 0) + 1;
        
        // Count by assignee for workload
        if (task.assignees && Array.isArray(task.assignees)) {
          for (const assignee of task.assignees) {
            const name = assignee.username || assignee.email || 'Unassigned';
            assigneeCounts[name] = (assigneeCounts[name] || 0) + 1;
          }
        }
        
        // Categorize by status - matching exact ClickUp status names
        const folderName = (task.folderName || '').toLowerCase();
        const listName = (task.listName || '').toLowerCase();
        
        // Match exact ClickUp statuses based on actual dashboard
        if (statusName === 'awarded') {
          winsYTD++;
        } else if (statusName === 'not awarded' || statusName === 'selected / not funded' || statusName === 'selected/not funded') {
          // Losses YTD includes: "not awarded" + "selected / not funded"
          lossesYTD++;
          // Also track selected not funded separately for the breakdown chart
          if (statusName === 'selected / not funded' || statusName === 'selected/not funded') {
            selectedNotFunded++;
          }
        } else if (statusName === 'source selection') {
          // Source Selection YTD only counts tasks with "source selection" status
          sourceSelection++;
        } else if (statusName === 'pre-rfp') {
          preRfpCount++;
        } else if (statusName === 'submitted') {
          submittedCount++;
        }
        
        // Currently Writing: Count tasks in the "Drafting" list (Post-RFP > Drafting)
        if (listName === 'drafting') {
          currentlyWriting++;
        }
        
        // Categorize by business unit from "Division" custom field
        // Only count tasks from the "Submitted" list with Submitted Date in this year
        if (listName === 'submitted' && task.custom_fields) {
          // Check if Submitted Date is this year
          const submittedDate = getSubmittedDate(task);
          const isThisYear = submittedDate ? submittedDate >= startOfYear : false;
          
          if (isThisYear) {
            const divisionField = task.custom_fields.find((cf: any) => 
              cf.name === 'Division' || cf.name?.toLowerCase() === 'division'
            );
            if (divisionField) {
              // For dropdown fields, value is the orderindex of the selected option
              const divisionValue = divisionField.value;
              let divisionName = '';
              
              if (divisionField.type_config?.options && divisionValue !== undefined && divisionValue !== null) {
                const selectedOption = divisionField.type_config.options.find(
                  (o: any) => o.orderindex === divisionValue
                );
                divisionName = selectedOption?.name?.toLowerCase() || '';
              }
              
              if (divisionName.includes('defense')) {
                businessUnitCounts.Defense++;
              } else if (divisionName.includes('innovation')) {
                businessUnitCounts.Innovation++;
              } else if (divisionName.includes('industrial')) {
                businessUnitCounts.Industrials++;
              }
            }
          }
        }
      }
      
      // Total Submittals = 6 statuses: pre-rfp + submitted + awarded + selected/not funded + not awarded + source selection
      // Note: lossesYTD already includes both "not awarded" and "selected / not funded"
      // So we need: awarded + (not awarded + selected/not funded) + source selection + pre-rfp + submitted
      const totalSubmittals = winsYTD + lossesYTD + sourceSelection + preRfpCount + submittedCount;
      // Win Rate = wins / (wins + losses) - only count decided proposals
      const winRate = (winsYTD + lossesYTD) > 0 ? ((winsYTD / (winsYTD + lossesYTD)) * 100) : 0;
      
      // Get top assignees for workload chart (only show specific team members)
      const allowedNames = ['greg', 'maria', 'ryan'];
      const workloadData = Object.entries(assigneeCounts)
        .filter(([name]) => allowedNames.some(allowed => name.toLowerCase().includes(allowed)))
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count }));

      // Log status breakdown for debugging
      console.log("ClickUp Status Breakdown:", JSON.stringify(statusCounts, null, 2));
      console.log("Total tasks fetched:", allTasks.length);
      console.log("YTD tasks:", ytdTasks.length);
      console.log("Business Unit Counts:", JSON.stringify(businessUnitCounts, null, 2));
      
      res.json({
        winsYTD,
        lossesYTD,
        currentlyWriting,
        sourceSelectionYTD: sourceSelection,
        totalSubmittals,
        winRate: winRate.toFixed(2),
        businessUnitSubmissions: businessUnitCounts,
        workloadByAssignee: workloadData,
        winsLossesBreakdown: {
          awarded: winsYTD,
          selectedNotFunded,
          notAwarded: lossesYTD,
          sourceSelection
        },
        statusBreakdown: statusCounts,
        totalTasks: allTasks.length,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error fetching ClickUp data:", error);
      res.status(500).json({ error: "Failed to fetch ClickUp data" });
    }
  });

  // Get raw ClickUp tasks for detailed view
  app.get("/api/clickup/tasks", isAuthenticated, async (req, res) => {
    try {
      if (!CLICKUP_API_KEY) {
        return res.status(500).json({ error: "ClickUp API key not configured" });
      }

      // Get all folders in the space
      const foldersData = await clickupFetch(`/space/${CLICKUP_SPACE_ID}/folder`);
      const folders = foldersData.folders || [];
      
      const allTasks: any[] = [];
      
      // Get folderless lists
      const folderlessLists = await clickupFetch(`/space/${CLICKUP_SPACE_ID}/list?archived=true`);
      
      for (const list of folderlessLists.lists || []) {
        try {
          const tasksData = await clickupFetch(`/list/${list.id}/task?include_closed=true`);
          allTasks.push(...(tasksData.tasks || []).map((t: any) => ({
            ...t,
            listName: list.name,
            folderName: 'Root'
          })));
        } catch (e) {}
      }
      
      for (const folder of folders) {
        const listsData = await clickupFetch(`/folder/${folder.id}/list`);
        for (const list of listsData.lists || []) {
          try {
            const tasksData = await clickupFetch(`/list/${list.id}/task?include_closed=true`);
            allTasks.push(...(tasksData.tasks || []).map((t: any) => ({
              ...t,
              listName: list.name,
              folderName: folder.name
            })));
          } catch (e) {}
        }
      }

      res.json({
        tasks: allTasks.map(task => ({
          id: task.id,
          name: task.name,
          status: task.status?.status,
          statusColor: task.status?.color,
          assignees: task.assignees?.map((a: any) => a.username || a.email) || [],
          dueDate: task.due_date ? new Date(parseInt(task.due_date)).toISOString() : null,
          dateCreated: task.date_created ? new Date(parseInt(task.date_created)).toISOString() : null,
          listName: task.listName,
          folderName: task.folderName,
          url: task.url
        })),
        total: allTasks.length
      });
    } catch (error) {
      console.error("Error fetching ClickUp tasks:", error);
      res.status(500).json({ error: "Failed to fetch ClickUp tasks" });
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
      const { client, fromEmail } = await getUncachableResendClient();
      const baseUrl = process.env.REPLIT_DEPLOYMENT_URL || 'https://business-operations-unit-portal.replit.app';
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

      await client.emails.send({
        from: fromEmail,
        to: [email],
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
      const { client, fromEmail } = await getUncachableResendClient();
      const baseUrl = process.env.REPLIT_DEPLOYMENT_URL || 'https://business-operations-unit-portal.replit.app';
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

      await client.emails.send({
        from: fromEmail,
        to: [email],
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
  // BOU ADMIN ROUTES - Configurable Content Management
  // =====================================================

  // Helper to check BOU admin permissions
  const isBouAdmin = async (userId: string): Promise<boolean> => {
    const result = await dbPool.query('SELECT role FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) return false;
    const role = result.rows[0].role;
    return role === 'admin' || role === 'bou_admin';
  };

  // Helper to check if user is system admin
  const isSystemAdmin = async (userId: string): Promise<boolean> => {
    const result = await dbPool.query('SELECT role FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) return false;
    return result.rows[0].role === 'admin';
  };

  // --- Dashboard View Analytics ---

  // Record a page view (authenticated users only)
  app.post("/api/bou/dashboard/view", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      await dbPool.query(
        'INSERT INTO bou_dashboard_views (user_id) VALUES ($1)',
        [userId]
      );
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error recording dashboard view:", error);
      res.status(500).json({ error: "Failed to record view" });
    }
  });

  // Get dashboard view analytics (system admin only)
  app.get("/api/bou/dashboard/views", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId || !(await isSystemAdmin(userId))) {
        return res.status(403).json({ error: "System Admin access required" });
      }
      
      const result = await dbPool.query(`
        SELECT 
          v.id,
          v.user_id,
          v.viewed_at,
          u.first_name,
          u.last_name,
          u.email
        FROM bou_dashboard_views v
        JOIN users u ON v.user_id = u.id
        ORDER BY v.viewed_at DESC
        LIMIT 100
      `);
      
      // Also get aggregated stats
      const statsResult = await dbPool.query(`
        SELECT 
          COUNT(DISTINCT user_id) as unique_viewers,
          COUNT(*) as total_views
        FROM bou_dashboard_views
      `);
      
      res.json({
        views: result.rows,
        stats: statsResult.rows[0]
      });
    } catch (error) {
      console.error("Error fetching dashboard views:", error);
      res.status(500).json({ error: "Failed to fetch views" });
    }
  });

  // --- Quick Links CRUD ---
  
  // Get all quick links (public)
  app.get("/api/bou/quick-links", async (req, res) => {
    try {
      const result = await dbPool.query(
        'SELECT * FROM bou_quick_links WHERE is_visible = true ORDER BY sort_order ASC'
      );
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching quick links:", error);
      res.status(500).json({ error: "Failed to fetch quick links" });
    }
  });

  // Get all quick links (admin - includes hidden)
  app.get("/api/bou/admin/quick-links", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId || !(await isBouAdmin(userId))) {
        return res.status(403).json({ error: "BOU Admin access required" });
      }
      const result = await dbPool.query(
        'SELECT * FROM bou_quick_links ORDER BY sort_order ASC'
      );
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching quick links:", error);
      res.status(500).json({ error: "Failed to fetch quick links" });
    }
  });

  // Create quick link
  app.post("/api/bou/admin/quick-links", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId || !(await isBouAdmin(userId))) {
        return res.status(403).json({ error: "BOU Admin access required" });
      }
      const { linkType, title, description, icon, url, sortOrder, isVisible } = req.body;
      const result = await dbPool.query(
        `INSERT INTO bou_quick_links (link_type, title, description, icon, url, sort_order, is_visible, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [linkType, title, description, icon || 'Link', url, sortOrder || 0, isVisible !== false, userId]
      );
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error creating quick link:", error);
      res.status(500).json({ error: "Failed to create quick link" });
    }
  });

  // Update quick link
  app.put("/api/bou/admin/quick-links/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId || !(await isBouAdmin(userId))) {
        return res.status(403).json({ error: "BOU Admin access required" });
      }
      const { id } = req.params;
      const { linkType, title, description, icon, url, sortOrder, isVisible } = req.body;
      
      // Get existing sort_order if not provided
      let finalSortOrder = sortOrder;
      if (finalSortOrder === undefined || finalSortOrder === null) {
        const existing = await dbPool.query('SELECT sort_order FROM bou_quick_links WHERE id = $1', [id]);
        finalSortOrder = existing.rows[0]?.sort_order ?? 0;
      }
      
      const result = await dbPool.query(
        `UPDATE bou_quick_links SET 
          link_type = $1, title = $2, description = $3, icon = $4, url = $5, 
          sort_order = $6, is_visible = $7, updated_at = NOW()
         WHERE id = $8 RETURNING *`,
        [linkType, title, description, icon, url, finalSortOrder, isVisible, id]
      );
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error updating quick link:", error);
      res.status(500).json({ error: "Failed to update quick link" });
    }
  });

  // Delete quick link
  app.delete("/api/bou/admin/quick-links/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId || !(await isBouAdmin(userId))) {
        return res.status(403).json({ error: "BOU Admin access required" });
      }
      const { id } = req.params;
      await dbPool.query('DELETE FROM bou_quick_links WHERE id = $1', [id]);
      res.json({ message: "Quick link deleted successfully" });
    } catch (error) {
      console.error("Error deleting quick link:", error);
      res.status(500).json({ error: "Failed to delete quick link" });
    }
  });

  // Reorder quick links
  app.post("/api/bou/admin/quick-links/reorder", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId || !(await isBouAdmin(userId))) {
        return res.status(403).json({ error: "BOU Admin access required" });
      }
      const { orderedIds } = req.body;
      for (let i = 0; i < orderedIds.length; i++) {
        await dbPool.query(
          'UPDATE bou_quick_links SET sort_order = $1, updated_at = NOW() WHERE id = $2',
          [i, orderedIds[i]]
        );
      }
      res.json({ message: "Quick links reordered successfully" });
    } catch (error) {
      console.error("Error reordering quick links:", error);
      res.status(500).json({ error: "Failed to reorder quick links" });
    }
  });

  // --- Hero Assets CRUD ---
  
  // Get active hero asset (public)
  app.get("/api/bou/hero-asset", async (req, res) => {
    try {
      const result = await dbPool.query(
        'SELECT * FROM bou_hero_assets WHERE is_active = true LIMIT 1'
      );
      res.json(result.rows[0] || null);
    } catch (error) {
      console.error("Error fetching hero asset:", error);
      res.status(500).json({ error: "Failed to fetch hero asset" });
    }
  });

  // Get all hero assets (admin)
  app.get("/api/bou/admin/hero-assets", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId || !(await isBouAdmin(userId))) {
        return res.status(403).json({ error: "BOU Admin access required" });
      }
      const result = await dbPool.query(
        'SELECT * FROM bou_hero_assets ORDER BY created_at DESC'
      );
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching hero assets:", error);
      res.status(500).json({ error: "Failed to fetch hero assets" });
    }
  });

  // Upload hero asset
  app.post("/api/bou/admin/hero-assets", isAuthenticated, upload.single('file'), async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId || !(await isBouAdmin(userId))) {
        return res.status(403).json({ error: "BOU Admin access required" });
      }
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      if (!file.mimetype.startsWith('image/')) {
        return res.status(400).json({ error: "Only image files are allowed" });
      }

      const timestamp = Date.now();
      const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const customPath = `public/bou/hero/${timestamp}-${sanitizedName}`;

      // Upload to local file storage
      const publicUrl = await localFileStorage.uploadFile(file.buffer, file.originalname, customPath);
      const altText = req.body.altText || '';

      const result = await dbPool.query(
        `INSERT INTO bou_hero_assets (file_url, file_name, alt_text, is_active, uploaded_by)
         VALUES ($1, $2, $3, false, $4) RETURNING *`,
        [publicUrl, file.originalname, altText, userId]
      );
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error uploading hero asset:", error);
      res.status(500).json({ error: "Failed to upload hero asset" });
    }
  });

  // Set active hero asset
  app.post("/api/bou/admin/hero-assets/:id/activate", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId || !(await isBouAdmin(userId))) {
        return res.status(403).json({ error: "BOU Admin access required" });
      }
      const { id } = req.params;
      // Deactivate all first
      await dbPool.query('UPDATE bou_hero_assets SET is_active = false');
      // Activate selected
      const result = await dbPool.query(
        'UPDATE bou_hero_assets SET is_active = true WHERE id = $1 RETURNING *',
        [id]
      );
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error activating hero asset:", error);
      res.status(500).json({ error: "Failed to activate hero asset" });
    }
  });

  // Delete hero asset
  app.delete("/api/bou/admin/hero-assets/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId || !(await isBouAdmin(userId))) {
        return res.status(403).json({ error: "BOU Admin access required" });
      }
      const { id } = req.params;
      await dbPool.query('DELETE FROM bou_hero_assets WHERE id = $1', [id]);
      res.json({ message: "Hero asset deleted successfully" });
    } catch (error) {
      console.error("Error deleting hero asset:", error);
      res.status(500).json({ error: "Failed to delete hero asset" });
    }
  });

  // --- Training Categories CRUD ---

  // Get published training categories with slides (public)
  app.get("/api/bou/training-categories", async (req, res) => {
    try {
      const result = await dbPool.query(
        'SELECT * FROM bou_training_categories WHERE is_published = true ORDER BY sort_order ASC'
      );
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching training categories:", error);
      res.status(500).json({ error: "Failed to fetch training categories" });
    }
  });

  // Get all training categories (admin)
  app.get("/api/bou/admin/training-categories", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId || !(await isBouAdmin(userId))) {
        return res.status(403).json({ error: "BOU Admin access required" });
      }
      const result = await dbPool.query(
        'SELECT * FROM bou_training_categories ORDER BY sort_order ASC'
      );
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching training categories:", error);
      res.status(500).json({ error: "Failed to fetch training categories" });
    }
  });

  // Create training category (admin)
  app.post("/api/bou/admin/training-categories", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId || !(await isBouAdmin(userId))) {
        return res.status(403).json({ error: "BOU Admin access required" });
      }
      const { name, description } = req.body;
      if (!name) {
        return res.status(400).json({ error: "Category name is required" });
      }
      const maxResult = await dbPool.query('SELECT COALESCE(MAX(sort_order), -1) + 1 as next_order FROM bou_training_categories');
      const sortOrder = maxResult.rows[0].next_order;
      const result = await dbPool.query(
        `INSERT INTO bou_training_categories (name, description, sort_order, is_published, created_by)
         VALUES ($1, $2, $3, true, $4) RETURNING *`,
        [name, description || null, sortOrder, userId]
      );
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error creating training category:", error);
      res.status(500).json({ error: "Failed to create training category" });
    }
  });

  // Update training category (admin)
  app.put("/api/bou/admin/training-categories/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId || !(await isBouAdmin(userId))) {
        return res.status(403).json({ error: "BOU Admin access required" });
      }
      const { id } = req.params;
      const { name, description, sortOrder, isPublished } = req.body;
      const result = await dbPool.query(
        `UPDATE bou_training_categories SET 
          name = COALESCE($1, name), 
          description = COALESCE($2, description), 
          sort_order = COALESCE($3, sort_order), 
          is_published = COALESCE($4, is_published),
          updated_at = NOW()
         WHERE id = $5 RETURNING *`,
        [name, description, sortOrder, isPublished, id]
      );
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error updating training category:", error);
      res.status(500).json({ error: "Failed to update training category" });
    }
  });

  // Delete training category (admin)
  app.delete("/api/bou/admin/training-categories/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId || !(await isBouAdmin(userId))) {
        return res.status(403).json({ error: "BOU Admin access required" });
      }
      const { id } = req.params;
      // Delete all slides in this category first
      await dbPool.query('DELETE FROM bou_training_slides WHERE category_id = $1', [id]);
      await dbPool.query('DELETE FROM bou_training_categories WHERE id = $1', [id]);
      res.json({ message: "Training category deleted successfully" });
    } catch (error) {
      console.error("Error deleting training category:", error);
      res.status(500).json({ error: "Failed to delete training category" });
    }
  });

  // Reorder training categories (admin)
  app.post("/api/bou/admin/training-categories/reorder", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId || !(await isBouAdmin(userId))) {
        return res.status(403).json({ error: "BOU Admin access required" });
      }
      const { orderedIds } = req.body;
      for (let i = 0; i < orderedIds.length; i++) {
        await dbPool.query(
          'UPDATE bou_training_categories SET sort_order = $1, updated_at = NOW() WHERE id = $2',
          [i, orderedIds[i]]
        );
      }
      res.json({ message: "Training categories reordered successfully" });
    } catch (error) {
      console.error("Error reordering training categories:", error);
      res.status(500).json({ error: "Failed to reorder training categories" });
    }
  });

  // --- Training Slides CRUD ---
  
  // Get published training slides by category (public)
  app.get("/api/bou/training-slides", async (req, res) => {
    try {
      const categoryId = req.query.categoryId as string;
      let query = 'SELECT * FROM bou_training_slides WHERE is_published = true';
      const params: string[] = [];
      if (categoryId) {
        query += ' AND category_id = $1';
        params.push(categoryId);
      }
      query += ' ORDER BY sort_order ASC';
      const result = await dbPool.query(query, params);
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching training slides:", error);
      res.status(500).json({ error: "Failed to fetch training slides" });
    }
  });

  // Get all training slides by category (admin)
  app.get("/api/bou/admin/training-slides", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId || !(await isBouAdmin(userId))) {
        return res.status(403).json({ error: "BOU Admin access required" });
      }
      const categoryId = req.query.categoryId as string;
      let query = 'SELECT * FROM bou_training_slides';
      const params: string[] = [];
      if (categoryId) {
        query += ' WHERE category_id = $1';
        params.push(categoryId);
      }
      query += ' ORDER BY sort_order ASC';
      const result = await dbPool.query(query, params);
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching training slides:", error);
      res.status(500).json({ error: "Failed to fetch training slides" });
    }
  });

  // Upload training material (images, PDFs, videos)
  app.post("/api/bou/admin/training-slides", isAuthenticated, upload.single('file'), async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId || !(await isBouAdmin(userId))) {
        return res.status(403).json({ error: "BOU Admin access required" });
      }
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      console.log(`Training upload: ${file.originalname}, MIME: ${file.mimetype}, Size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);

      // Check file size (200MB limit for videos, 50MB for images/PDFs)
      const maxSize = file.mimetype.startsWith('video/') ? 200 * 1024 * 1024 : 50 * 1024 * 1024;
      if (file.size > maxSize) {
        const limitMB = file.mimetype.startsWith('video/') ? 200 : 50;
        return res.status(400).json({ error: `File too large. Maximum size is ${limitMB}MB` });
      }

      // Determine file type category
      let fileType = "image";
      if (file.mimetype.startsWith('image/')) {
        fileType = "image";
      } else if (file.mimetype === 'application/pdf') {
        fileType = "pdf";
      } else if (file.mimetype.startsWith('video/')) {
        fileType = "video";
      } else {
        console.log(`Rejected file type: ${file.mimetype}`);
        return res.status(400).json({ error: `File type not allowed: ${file.mimetype}. Allowed: images, PDFs, videos` });
      }

      const timestamp = Date.now();
      const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const customPath = `public/bou/training-slides/${timestamp}-${sanitizedName}`;

      // Upload to local file storage
      const publicUrl = await localFileStorage.uploadFile(file.buffer, file.originalname, customPath);
      const { title, caption, sortOrder, categoryId } = req.body;

      if (!categoryId) {
        return res.status(400).json({ error: "Category ID is required" });
      }

      // Get max sort order within category if not provided
      let order = sortOrder;
      if (order === undefined) {
        const maxResult = await dbPool.query(
          'SELECT COALESCE(MAX(sort_order), -1) + 1 as next_order FROM bou_training_slides WHERE category_id = $1',
          [categoryId]
        );
        order = maxResult.rows[0].next_order;
      }

      const result = await dbPool.query(
        `INSERT INTO bou_training_slides (title, caption, file_url, file_name, file_type, sort_order, is_published, uploaded_by, category_id)
         VALUES ($1, $2, $3, $4, $5, $6, true, $7, $8) RETURNING *`,
        [title || 'Untitled Material', caption || null, publicUrl, file.originalname, fileType, order, userId, categoryId]
      );
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error uploading training material:", error);
      res.status(500).json({ error: "Failed to upload training material" });
    }
  });

  // Update training slide
  app.put("/api/bou/admin/training-slides/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId || !(await isBouAdmin(userId))) {
        return res.status(403).json({ error: "BOU Admin access required" });
      }
      const { id } = req.params;
      const { title, caption, sortOrder, isPublished } = req.body;
      const result = await dbPool.query(
        `UPDATE bou_training_slides SET 
          title = $1, caption = $2, sort_order = $3, is_published = $4, updated_at = NOW()
         WHERE id = $5 RETURNING *`,
        [title, caption, sortOrder, isPublished, id]
      );
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error updating training slide:", error);
      res.status(500).json({ error: "Failed to update training slide" });
    }
  });

  // Delete training slide
  app.delete("/api/bou/admin/training-slides/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId || !(await isBouAdmin(userId))) {
        return res.status(403).json({ error: "BOU Admin access required" });
      }
      const { id } = req.params;
      await dbPool.query('DELETE FROM bou_training_slides WHERE id = $1', [id]);
      res.json({ message: "Training slide deleted successfully" });
    } catch (error) {
      console.error("Error deleting training slide:", error);
      res.status(500).json({ error: "Failed to delete training slide" });
    }
  });

  // Reorder training slides
  app.post("/api/bou/admin/training-slides/reorder", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId || !(await isBouAdmin(userId))) {
        return res.status(403).json({ error: "BOU Admin access required" });
      }
      const { orderedIds } = req.body;
      for (let i = 0; i < orderedIds.length; i++) {
        await dbPool.query(
          'UPDATE bou_training_slides SET sort_order = $1, updated_at = NOW() WHERE id = $2',
          [i, orderedIds[i]]
        );
      }
      res.json({ message: "Training slides reordered successfully" });
    } catch (error) {
      console.error("Error reordering training slides:", error);
      res.status(500).json({ error: "Failed to reorder training slides" });
    }
  });

  // --- Training Module View Analytics ---
  
  // Record a module view (authenticated users)
  app.post("/api/bou/training-views", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const { slideId } = req.body;
      if (!slideId) {
        return res.status(400).json({ error: "Slide ID is required" });
      }
      
      // Check if slide exists
      const slideCheck = await dbPool.query('SELECT id FROM bou_training_slides WHERE id = $1', [slideId]);
      if (slideCheck.rows.length === 0) {
        return res.status(404).json({ error: "Module not found" });
      }
      
      await dbPool.query(
        'INSERT INTO bou_training_views (slide_id, user_id) VALUES ($1, $2)',
        [slideId, userId]
      );
      
      // Mark any pending assignments for this user/slide as viewed
      await dbPool.query(
        `UPDATE bou_training_assignments 
         SET status = 'viewed', viewed_at = NOW() 
         WHERE slide_id = $1 AND assigned_to_user_id = $2 AND status = 'assigned'`,
        [slideId, userId]
      );
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error recording module view:", error);
      res.status(500).json({ error: "Failed to record view" });
    }
  });
  
  // Get view analytics for a module (admin only)
  app.get("/api/bou/admin/training-views/:slideId", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId || !(await isBouAdmin(userId))) {
        return res.status(403).json({ error: "BOU Admin access required" });
      }
      const { slideId } = req.params;
      
      const result = await dbPool.query(
        `SELECT v.id, v.viewed_at, 
                u.id as user_id, u.first_name, u.last_name, u.email
         FROM bou_training_views v
         JOIN users u ON v.user_id = u.id
         WHERE v.slide_id = $1
         ORDER BY v.viewed_at DESC`,
        [slideId]
      );
      
      // Also get total view count and unique viewer count
      const statsResult = await dbPool.query(
        `SELECT COUNT(*) as total_views, 
                COUNT(DISTINCT user_id) as unique_viewers
         FROM bou_training_views 
         WHERE slide_id = $1`,
        [slideId]
      );
      
      res.json({
        views: result.rows,
        stats: statsResult.rows[0]
      });
    } catch (error) {
      console.error("Error fetching module analytics:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // --- Training Assignments CRUD ---
  
  // Create training assignments (admin only) - bulk assign modules to users
  app.post("/api/bou/admin/training-assignments", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId || !(await isBouAdmin(userId))) {
        return res.status(403).json({ error: "BOU Admin access required" });
      }
      
      const { slideIds, userIds, dueAt, sendNotification } = req.body;
      
      if (!slideIds?.length || !userIds?.length) {
        return res.status(400).json({ error: "At least one module and one user must be selected" });
      }
      
      const assignments = [];
      const notifications = [];
      
      // Create assignments for each slide/user combination
      for (const slideId of slideIds) {
        for (const assignedToUserId of userIds) {
          // Check if assignment already exists
          const existing = await dbPool.query(
            `SELECT id FROM bou_training_assignments 
             WHERE slide_id = $1 AND assigned_to_user_id = $2`,
            [slideId, assignedToUserId]
          );
          
          if (existing.rows.length === 0) {
            const result = await dbPool.query(
              `INSERT INTO bou_training_assignments 
               (slide_id, assigned_to_user_id, assigned_by_user_id, due_at)
               VALUES ($1, $2, $3, $4)
               RETURNING *`,
              [slideId, assignedToUserId, userId, dueAt || null]
            );
            assignments.push(result.rows[0]);
            
            // Queue for notification
            if (sendNotification !== false) {
              notifications.push({ assignedToUserId, slideId, assignmentId: result.rows[0].id });
            }
          }
        }
      }
      
      // Send email notifications async (don't block response)
      if (notifications.length > 0) {
        sendTrainingAssignmentNotifications(notifications, userId).catch(err => {
          console.error("Error sending assignment notifications:", err);
        });
      }
      
      res.json({ 
        success: true, 
        created: assignments.length,
        message: `${assignments.length} assignment(s) created` 
      });
    } catch (error) {
      console.error("Error creating training assignments:", error);
      res.status(500).json({ error: "Failed to create assignments" });
    }
  });
  
  // Get all assignments (admin) with filters
  app.get("/api/bou/admin/training-assignments", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId || !(await isBouAdmin(userId))) {
        return res.status(403).json({ error: "BOU Admin access required" });
      }
      
      const { slideId, assignedToUserId, status } = req.query;
      
      let query = `
        SELECT a.*, 
               s.title as slide_title, s.file_type, s.category_id,
               u.first_name as assigned_to_first_name, u.last_name as assigned_to_last_name, u.email as assigned_to_email,
               ab.first_name as assigned_by_first_name, ab.last_name as assigned_by_last_name
        FROM bou_training_assignments a
        JOIN bou_training_slides s ON a.slide_id = s.id
        JOIN users u ON a.assigned_to_user_id = u.id
        JOIN users ab ON a.assigned_by_user_id = ab.id
        WHERE 1=1
      `;
      const params: any[] = [];
      
      if (slideId) {
        params.push(slideId);
        query += ` AND a.slide_id = $${params.length}`;
      }
      if (assignedToUserId) {
        params.push(assignedToUserId);
        query += ` AND a.assigned_to_user_id = $${params.length}`;
      }
      if (status) {
        params.push(status);
        query += ` AND a.status = $${params.length}`;
      }
      
      query += ` ORDER BY a.assigned_at DESC`;
      
      const result = await dbPool.query(query, params);
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching training assignments:", error);
      res.status(500).json({ error: "Failed to fetch assignments" });
    }
  });
  
  // Get current user's assignments
  app.get("/api/bou/training-assignments/me", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const result = await dbPool.query(
        `SELECT a.*, 
                s.title as slide_title, s.file_type, s.file_url, s.category_id,
                c.name as category_name,
                ab.first_name as assigned_by_first_name, ab.last_name as assigned_by_last_name
         FROM bou_training_assignments a
         JOIN bou_training_slides s ON a.slide_id = s.id
         LEFT JOIN bou_training_categories c ON s.category_id = c.id
         JOIN users ab ON a.assigned_by_user_id = ab.id
         WHERE a.assigned_to_user_id = $1
         ORDER BY 
           CASE WHEN a.status = 'assigned' THEN 0 ELSE 1 END,
           a.due_at NULLS LAST,
           a.assigned_at DESC`,
        [userId]
      );
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching user assignments:", error);
      res.status(500).json({ error: "Failed to fetch assignments" });
    }
  });
  
  // Update assignment (admin - update status/due date or re-send notification)
  app.patch("/api/bou/admin/training-assignments/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId || !(await isBouAdmin(userId))) {
        return res.status(403).json({ error: "BOU Admin access required" });
      }
      
      const { id } = req.params;
      const { status, dueAt, resendNotification } = req.body;
      
      const updates: string[] = [];
      const params: any[] = [];
      
      if (status) {
        params.push(status);
        updates.push(`status = $${params.length}`);
      }
      if (dueAt !== undefined) {
        params.push(dueAt || null);
        updates.push(`due_at = $${params.length}`);
      }
      
      if (updates.length > 0) {
        params.push(id);
        const result = await dbPool.query(
          `UPDATE bou_training_assignments 
           SET ${updates.join(', ')} 
           WHERE id = $${params.length}
           RETURNING *`,
          params
        );
        
        if (result.rows.length === 0) {
          return res.status(404).json({ error: "Assignment not found" });
        }
        
        // Resend notification if requested
        if (resendNotification) {
          const assignment = result.rows[0];
          sendTrainingAssignmentNotifications([{
            assignedToUserId: assignment.assigned_to_user_id,
            slideId: assignment.slide_id,
            assignmentId: assignment.id
          }], userId).catch(err => {
            console.error("Error resending notification:", err);
          });
        }
        
        res.json(result.rows[0]);
      } else {
        res.status(400).json({ error: "No updates provided" });
      }
    } catch (error) {
      console.error("Error updating assignment:", error);
      res.status(500).json({ error: "Failed to update assignment" });
    }
  });
  
  // Delete assignment (admin)
  app.delete("/api/bou/admin/training-assignments/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId || !(await isBouAdmin(userId))) {
        return res.status(403).json({ error: "BOU Admin access required" });
      }
      
      const { id } = req.params;
      const result = await dbPool.query(
        'DELETE FROM bou_training_assignments WHERE id = $1 RETURNING id',
        [id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Assignment not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting assignment:", error);
      res.status(500).json({ error: "Failed to delete assignment" });
    }
  });

  // --- Bot Settings CRUD ---
  
  // Get bot setting by key (public)
  app.get("/api/bou/bot-settings/:key", async (req, res) => {
    try {
      const { key } = req.params;
      const result = await dbPool.query(
        'SELECT * FROM bou_bot_settings WHERE setting_key = $1',
        [key]
      );
      res.json(result.rows[0] || null);
    } catch (error) {
      console.error("Error fetching bot setting:", error);
      res.status(500).json({ error: "Failed to fetch bot setting" });
    }
  });

  // Get all bot settings (admin)
  app.get("/api/bou/admin/bot-settings", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId || !(await isBouAdmin(userId))) {
        return res.status(403).json({ error: "BOU Admin access required" });
      }
      const result = await dbPool.query('SELECT * FROM bou_bot_settings ORDER BY setting_key');
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching bot settings:", error);
      res.status(500).json({ error: "Failed to fetch bot settings" });
    }
  });

  // Upsert bot setting
  app.put("/api/bou/admin/bot-settings/:key", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId || !(await isBouAdmin(userId))) {
        return res.status(403).json({ error: "BOU Admin access required" });
      }
      const { key } = req.params;
      const { value } = req.body;
      const result = await dbPool.query(
        `INSERT INTO bou_bot_settings (setting_key, setting_value, updated_by)
         VALUES ($1, $2, $3)
         ON CONFLICT (setting_key) 
         DO UPDATE SET setting_value = $2, updated_by = $3, updated_at = NOW()
         RETURNING *`,
        [key, value, userId]
      );
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error updating bot setting:", error);
      res.status(500).json({ error: "Failed to update bot setting" });
    }
  });

  // --- BOU Home Layout CRUD ---
  
  // Get layout sections (public for rendering, fetches all sections)
  app.get("/api/bou/home-layout", async (req, res) => {
    try {
      const result = await dbPool.query(
        'SELECT * FROM bou_home_sections ORDER BY sort_order ASC'
      );
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching home layout:", error);
      res.status(500).json({ error: "Failed to fetch layout" });
    }
  });

  // Get layout sections (admin)
  app.get("/api/bou/admin/home-layout", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId || !(await isBouAdmin(userId))) {
        return res.status(403).json({ error: "BOU Admin access required" });
      }
      const result = await dbPool.query(
        'SELECT * FROM bou_home_sections ORDER BY sort_order ASC'
      );
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching home layout:", error);
      res.status(500).json({ error: "Failed to fetch layout" });
    }
  });

  // Update layout sections (admin) - bulk update
  app.put("/api/bou/admin/home-layout", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId || !(await isBouAdmin(userId))) {
        return res.status(403).json({ error: "BOU Admin access required" });
      }
      
      const { sections } = req.body;
      if (!sections || !Array.isArray(sections)) {
        return res.status(400).json({ error: "Invalid sections data" });
      }
      
      // Update each section
      for (const section of sections) {
        await dbPool.query(
          `UPDATE bou_home_sections 
           SET sort_order = $1, column_span = $2, is_visible = $3, updated_by = $4, updated_at = NOW()
           WHERE id = $5`,
          [section.sortOrder, section.columnSpan, section.isVisible, userId, section.id]
        );
      }
      
      // Return updated layout
      const result = await dbPool.query(
        'SELECT * FROM bou_home_sections ORDER BY sort_order ASC'
      );
      res.json(result.rows);
    } catch (error) {
      console.error("Error updating home layout:", error);
      res.status(500).json({ error: "Failed to update layout" });
    }
  });

  // Reset layout to defaults (admin)
  app.post("/api/bou/admin/home-layout/reset", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId || !(await isBouAdmin(userId))) {
        return res.status(403).json({ error: "BOU Admin access required" });
      }
      
      // Reset all sections to default order and visibility
      const defaults = [
        { key: 'hero', order: 0, span: 2 },
        { key: 'dashboard_cta', order: 1, span: 2 },
        { key: 'news', order: 2, span: 1 },
        { key: 'newsletter', order: 3, span: 1 },
        { key: 'bulletin', order: 4, span: 1 },
        { key: 'bou_tools', order: 5, span: 1 },
        { key: 'external_systems', order: 6, span: 1 }
      ];
      
      for (const def of defaults) {
        await dbPool.query(
          `UPDATE bou_home_sections 
           SET sort_order = $1, column_span = $2, is_visible = true, updated_by = $3, updated_at = NOW()
           WHERE section_key = $4`,
          [def.order, def.span, userId, def.key]
        );
      }
      
      const result = await dbPool.query(
        'SELECT * FROM bou_home_sections ORDER BY sort_order ASC'
      );
      res.json(result.rows);
    } catch (error) {
      console.error("Error resetting home layout:", error);
      res.status(500).json({ error: "Failed to reset layout" });
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

  // =====================================================
  // IDIQ OPPORTUNITY INTELLIGENCE ROUTES
  // =====================================================

  // Get IDIQ opportunities with filtering
  app.get("/api/idiq/opportunities", isAuthenticated, async (req, res) => {
    try {
      const { search, days, minScore, source, businessUnit, naicsCode, showArchived, unreadOnly, savedOnly } = req.query;
      const userId = req.session.userId;
      
      let query = `
        SELECT io.* FROM idiq_opportunities io
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramIndex = 1;
      
      // Filter by status (exclude archived unless showArchived is true)
      if (showArchived !== 'true') {
        query += ` AND io.status != 'archived'`;
      }
      
      // Filter by saved status
      if (savedOnly === 'true') {
        query += ` AND io.status = 'saved'`;
      }
      
      // Filter by unread (not in user's read list)
      if (unreadOnly === 'true') {
        query += ` AND NOT EXISTS (
          SELECT 1 FROM idiq_user_reads iur 
          WHERE iur.opportunity_id = io.id AND iur.user_id = $${paramIndex}
        )`;
        params.push(userId);
        paramIndex++;
      }
      
      // Filter by timeframe
      if (days && days !== 'all') {
        query += ` AND io.created_at >= NOW() - INTERVAL '${parseInt(days as string)} days'`;
      }
      
      // Filter by minimum score
      if (minScore && parseInt(minScore as string) > 0) {
        query += ` AND io.match_score >= $${paramIndex}`;
        params.push(parseInt(minScore as string));
        paramIndex++;
      }
      
      // Filter by source type
      if (source && source !== 'all') {
        query += ` AND io.source_type = $${paramIndex}`;
        params.push(source);
        paramIndex++;
      }
      
      // Filter by NAICS code (prefix match for code families)
      if (naicsCode && (naicsCode as string).trim()) {
        query += ` AND io.naics_code LIKE $${paramIndex}`;
        params.push(`${(naicsCode as string).trim()}%`);
        paramIndex++;
      }
      
      // Filter by business unit (using AI category or tags to infer relevance)
      // Keywords aligned with the business vertical profiles used in AI scoring
      if (businessUnit && businessUnit !== 'all') {
        const businessUnitMap: Record<string, string[]> = {
          'defense': ['Defense', 'Military', 'Army', 'Navy', 'Air Force', 'DoD', 'Rotorcraft', 'Fighter', 'tactical', 'ISR', 'UAS', 'NAVAIR', 'Marine Corps', 'Apache', 'Chinook', 'Black Hawk', 'sustainment', 'aviation maintenance'],
          'industrials': ['Industrials', 'Industrial', 'Manufacturing', 'MRO', 'machining', 'fabrication', 'container', 'metal finishing', 'repair station', 'AS9100', 'NADCAP', 'FAA 145', 'CNC', 'sheet metal'],
          'advanced_programs': ['Advanced Programs', 'Advanced', 'R&D', 'Research', 'SBIR', 'STTR', 'DARPA', 'AFRL', 'MBSE', 'digital engineering', 'AI', 'machine learning', 'autonomy', 'Innovation', 'emerging tech'],
        };
        const keywords = businessUnitMap[businessUnit as string] || [];
        if (keywords.length > 0) {
          // Build conditions for each keyword matching ai_category OR any tag
          const keywordConditions = keywords.map((_, idx) => {
            return `(io.ai_category ILIKE $${paramIndex + idx} OR EXISTS (SELECT 1 FROM unnest(io.tags) AS tag WHERE tag ILIKE $${paramIndex + idx}))`;
          }).join(' OR ');
          query += ` AND (${keywordConditions})`;
          keywords.forEach(kw => params.push(`%${kw}%`));
          paramIndex += keywords.length;
        }
      }
      
      // Search filter
      if (search) {
        query += ` AND (
          io.title ILIKE $${paramIndex} 
          OR io.description ILIKE $${paramIndex}
          OR io.agency ILIKE $${paramIndex}
          OR io.contract_vehicle ILIKE $${paramIndex}
          OR io.relevancy_summary ILIKE $${paramIndex}
        )`;
        params.push(`%${search}%`);
        paramIndex++;
      }
      
      query += ` ORDER BY io.created_at DESC LIMIT 100`;
      
      const result = await dbPool.query(query, params);
      
      // Convert snake_case to camelCase for frontend
      const opportunities = result.rows.map(row => ({
        id: row.id,
        sourceType: row.source_type,
        uploadBatchId: row.upload_batch_id,
        externalId: row.external_id,
        title: row.title,
        description: row.description,
        contractVehicle: row.contract_vehicle,
        opportunityType: row.opportunity_type,
        agency: row.agency,
        postedDate: row.posted_date,
        dueDate: row.due_date,
        naicsCode: row.naics_code,
        setAsideType: row.set_aside_type,
        estimatedValue: row.estimated_value,
        placeOfPerformance: row.place_of_performance,
        solicitationNumber: row.solicitation_number,
        originalUrl: row.original_url,
        matchScore: row.match_score,
        relevancySummary: row.relevancy_summary,
        whyRelevant: row.why_relevant,
        pastPerformanceMatch: row.past_performance_match,
        capabilityMatch: row.capability_match,
        requirements: row.requirements,
        discriminatorsStrengths: row.discriminators_strengths,
        discriminatorsWeaknesses: row.discriminators_weaknesses,
        tags: row.tags,
        aiCategory: row.ai_category,
        status: row.status,
        viewCount: row.view_count,
        createdAt: row.created_at,
      }));
      
      res.json(opportunities);
    } catch (error) {
      console.error("Error fetching IDIQ opportunities:", error);
      res.status(500).json({ error: "Failed to fetch opportunities" });
    }
  });

  // Get IDIQ stats
  app.get("/api/idiq/stats", isAuthenticated, async (req, res) => {
    try {
      // Business vertical keyword mappings for counting
      const defenseKeywords = ['Defense', 'Military', 'Army', 'Navy', 'Air Force', 'DoD', 'Rotorcraft', 'Fighter', 'tactical', 'ISR', 'UAS', 'NAVAIR', 'Marine Corps'];
      const industrialsKeywords = ['Industrial', 'Commercial', 'Manufacturing', 'MRO', 'machining', 'fabrication', 'container', 'metal finishing', 'repair station'];
      const advancedKeywords = ['Advanced', 'R&D', 'Research', 'Development', 'Innovation', 'MBSE', 'AI', 'autonomy', 'SBIR', 'STTR', 'DARPA', 'AFRL', 'digital engineering'];

      const [totalResult, unreadResult, matchedResult, savedResult, defenseResult, industrialsResult, advancedResult] = await Promise.all([
        dbPool.query(`SELECT COUNT(*) as count FROM idiq_opportunities WHERE status != 'archived'`),
        dbPool.query(`SELECT COUNT(*) as count FROM idiq_opportunities WHERE status = 'new'`),
        dbPool.query(`SELECT COUNT(*) as count FROM idiq_opportunities WHERE match_score >= 75`),
        dbPool.query(`SELECT COUNT(*) as count FROM idiq_opportunities WHERE status = 'saved'`),
        // Defense count - check ai_category and tags for defense keywords
        dbPool.query(`
          SELECT COUNT(*) as count FROM idiq_opportunities 
          WHERE status != 'archived' AND (
            ${defenseKeywords.map((_, i) => `ai_category ILIKE $${i + 1} OR EXISTS (SELECT 1 FROM unnest(tags) AS tag WHERE tag ILIKE $${i + 1})`).join(' OR ')}
          )
        `, defenseKeywords.map(k => `%${k}%`)),
        // Industrials count
        dbPool.query(`
          SELECT COUNT(*) as count FROM idiq_opportunities 
          WHERE status != 'archived' AND (
            ${industrialsKeywords.map((_, i) => `ai_category ILIKE $${i + 1} OR EXISTS (SELECT 1 FROM unnest(tags) AS tag WHERE tag ILIKE $${i + 1})`).join(' OR ')}
          )
        `, industrialsKeywords.map(k => `%${k}%`)),
        // Advanced Programs count
        dbPool.query(`
          SELECT COUNT(*) as count FROM idiq_opportunities 
          WHERE status != 'archived' AND (
            ${advancedKeywords.map((_, i) => `ai_category ILIKE $${i + 1} OR EXISTS (SELECT 1 FROM unnest(tags) AS tag WHERE tag ILIKE $${i + 1})`).join(' OR ')}
          )
        `, advancedKeywords.map(k => `%${k}%`)),
      ]);
      
      res.json({
        total: parseInt(totalResult.rows[0].count),
        unread: parseInt(unreadResult.rows[0].count),
        matched: parseInt(matchedResult.rows[0].count),
        saved: parseInt(savedResult.rows[0].count),
        defense: parseInt(defenseResult.rows[0].count),
        industrials: parseInt(industrialsResult.rows[0].count),
        advancedPrograms: parseInt(advancedResult.rows[0].count),
      });
    } catch (error) {
      console.error("Error fetching IDIQ stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Get upload batches
  app.get("/api/idiq/batches", isAuthenticated, async (req, res) => {
    try {
      const result = await dbPool.query(`
        SELECT * FROM idiq_upload_batches 
        ORDER BY created_at DESC 
        LIMIT 50
      `);
      
      res.json(result.rows.map(row => ({
        id: row.id,
        fileName: row.file_name,
        totalOpportunities: row.total_opportunities,
        processedOpportunities: row.processed_opportunities,
        status: row.status,
        createdAt: row.created_at,
      })));
    } catch (error) {
      console.error("Error fetching IDIQ batches:", error);
      res.status(500).json({ error: "Failed to fetch batches" });
    }
  });

  // Delete upload batch and associated opportunities
  app.delete("/api/idiq/batches/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      
      // First delete all opportunities from this batch
      await dbPool.query(`
        DELETE FROM idiq_opportunities WHERE upload_batch_id = $1
      `, [id]);
      
      // Then delete the batch record
      const result = await dbPool.query(`
        DELETE FROM idiq_upload_batches WHERE id = $1 RETURNING id
      `, [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Batch not found" });
      }
      
      res.json({ success: true, message: "Batch and associated opportunities deleted" });
    } catch (error) {
      console.error("Error deleting IDIQ batch:", error);
      res.status(500).json({ error: "Failed to delete batch" });
    }
  });

  // Get capability documents
  app.get("/api/idiq/capability-docs", isAuthenticated, async (req, res) => {
    try {
      const result = await dbPool.query(`
        SELECT id, title, description, file_name, is_active, created_at 
        FROM idiq_capability_docs 
        ORDER BY created_at DESC
      `);
      
      res.json(result.rows.map(row => ({
        id: row.id,
        title: row.title,
        description: row.description,
        fileName: row.file_name,
        isActive: row.is_active,
        createdAt: row.created_at,
      })));
    } catch (error) {
      console.error("Error fetching capability docs:", error);
      res.status(500).json({ error: "Failed to fetch capability documents" });
    }
  });

  // Upload Task Order list
  app.post("/api/idiq/upload", isAuthenticated, upload.single("file"), async (req, res) => {
    try {
      const userId = req.session.userId;
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ error: "No file provided" });
      }
      
      // Get file extension
      const ext = file.originalname.split('.').pop()?.toLowerCase() || '';
      const allowedExts = ['xlsx', 'xls', 'csv', 'pdf', 'docx', 'doc'];
      
      if (!allowedExts.includes(ext)) {
        return res.status(400).json({ error: "Unsupported file format" });
      }
      
      // Upload to local file storage
      const customPath = `idiq-uploads/${Date.now()}-${file.originalname}`;
      const fileName = await localFileStorage.uploadFile(file.buffer, file.originalname, customPath);

      // Create upload batch record - store file path
      const batchResult = await dbPool.query(`
        INSERT INTO idiq_upload_batches (file_name, file_url, file_type, status, uploaded_by)
        VALUES ($1, $2, $3, 'processing', $4)
        RETURNING id
      `, [file.originalname, fileName, ext, userId]);
      
      const batchId = batchResult.rows[0].id;
      
      // Process the file asynchronously (in background)
      processIdiqUpload(batchId, file.buffer, ext, file.originalname);
      
      res.json({ 
        success: true, 
        batchId,
        message: "File uploaded, processing in background" 
      });
    } catch (error) {
      console.error("Error uploading IDIQ file:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  // Upload capability document
  app.post("/api/idiq/capability-docs", isAuthenticated, upload.single("file"), async (req, res) => {
    try {
      const userId = req.session.userId;
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ error: "No file provided" });
      }
      
      const ext = file.originalname.split('.').pop()?.toLowerCase() || '';
      const allowedExts = ['pdf', 'docx', 'doc', 'xlsx', 'xls'];
      
      if (!allowedExts.includes(ext)) {
        return res.status(400).json({ error: "Unsupported file format" });
      }
      
      // Upload to local file storage
      const customPath = `idiq-capabilities/${Date.now()}-${file.originalname}`;
      const fileName = await localFileStorage.uploadFile(file.buffer, file.originalname, customPath);
      
      // Extract text from document for AI context
      let extractedText = '';
      try {
        if (ext === 'docx' || ext === 'doc') {
          const mammoth = await import('mammoth');
          const result = await mammoth.extractRawText({ buffer: file.buffer });
          extractedText = result.value;
        } else if (ext === 'pdf') {
          // For PDFs, we'll extract text using pdf.js
          const pdfjs = await import('pdfjs-dist');
          const loadingTask = pdfjs.getDocument({ data: file.buffer });
          const pdf = await loadingTask.promise;
          const textParts: string[] = [];
          
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
              .map((item: any) => item.str)
              .join(' ');
            textParts.push(pageText);
          }
          extractedText = textParts.join('\n\n');
        }
      } catch (extractError) {
        console.error("Error extracting text from capability doc:", extractError);
        // Continue without extracted text
      }
      
      // Create capability doc record
      const title = file.originalname.replace(/\.[^/.]+$/, ''); // Remove extension for title
      await dbPool.query(`
        INSERT INTO idiq_capability_docs (title, file_url, file_name, file_type, extracted_text, uploaded_by)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [title, fileName, file.originalname, ext, extractedText, userId]);
      
      res.json({ success: true, message: "Capability document uploaded" });
    } catch (error) {
      console.error("Error uploading capability doc:", error);
      res.status(500).json({ error: "Failed to upload capability document" });
    }
  });

  // Update opportunity status
  app.patch("/api/idiq/opportunities/:id/status", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = req.session.userId;
      
      const validStatuses = ['new', 'reviewed', 'saved', 'archived'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      
      const updateFields: string[] = ['status = $1', 'updated_at = NOW()'];
      const params: any[] = [status, id];
      let paramIndex = 3;
      
      // If saving, record who saved it
      if (status === 'saved') {
        updateFields.push(`saved_by = $${paramIndex}`);
        updateFields.push(`saved_at = NOW()`);
        params.push(userId);
        paramIndex++;
      }
      
      const result = await dbPool.query(`
        UPDATE idiq_opportunities 
        SET ${updateFields.join(', ')}
        WHERE id = $2
        RETURNING *
      `, params);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Opportunity not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating opportunity status:", error);
      res.status(500).json({ error: "Failed to update status" });
    }
  });

  // Record view
  app.post("/api/idiq/opportunities/:id/view", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId;
      
      // Update view count and add user to viewed_by array
      await dbPool.query(`
        UPDATE idiq_opportunities 
        SET view_count = view_count + 1,
            viewed_by = COALESCE(viewed_by, ARRAY[]::text[]) || ARRAY[$1]::text[],
            status = CASE WHEN status = 'new' THEN 'reviewed' ELSE status END,
            updated_at = NOW()
        WHERE id = $2
      `, [userId, id]);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error recording view:", error);
      res.status(500).json({ error: "Failed to record view" });
    }
  });

  // Helper function to process uploaded IDIQ files
  async function processIdiqUpload(batchId: string, buffer: Buffer, fileType: string, fileName: string) {
    try {
      console.log(`Processing IDIQ upload batch ${batchId}...`);
      
      // Extract opportunities from the file based on type
      let opportunities: any[] = [];
      
      if (fileType === 'csv') {
        // Parse CSV
        const csvContent = buffer.toString('utf-8');
        const lines = csvContent.split('\n').filter(line => line.trim());
        
        if (lines.length > 1) {
          const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
          
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            const opp: any = {};
            
            headers.forEach((header, idx) => {
              if (values[idx]) {
                opp[header] = values[idx].trim().replace(/^"|"$/g, '');
              }
            });
            
            if (opp.title || opp.name || opp.opportunity) {
              opportunities.push({
                title: opp.title || opp.name || opp.opportunity || 'Untitled Opportunity',
                description: opp.description || opp.summary || opp.scope || null,
                agency: opp.agency || opp.organization || null,
                contractVehicle: opp.contract_vehicle || opp.vehicle || opp.idiq || null,
                postedDate: opp.posted_date || opp.posted || opp.date || null,
                dueDate: opp.due_date || opp.deadline || opp.response_date || null,
                naicsCode: opp.naics || opp.naics_code || null,
                setAsideType: opp.set_aside || opp.setaside || null,
                estimatedValue: opp.value || opp.estimated_value || opp.ceiling || null,
                placeOfPerformance: opp.location || opp.place_of_performance || opp.pop || null,
                solicitationNumber: opp.solicitation || opp.solicitation_number || opp.sol_number || null,
                originalUrl: opp.url || opp.link || null,
              });
            }
          }
        }
      } else if (fileType === 'xlsx' || fileType === 'xls') {
        // Parse Excel files row by row
        try {
          const XLSX = await import('xlsx');
          const workbook = XLSX.read(buffer, { type: 'buffer' });
          
          // Process first sheet (or all sheets)
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          
          // Convert to JSON with header row
          const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' });
          
          console.log(`Parsing ${jsonData.length} rows from Excel file ${fileName}`);
          
          // Map common column variations to standardized fields (including SeaportNXG, SAM.gov, DIBBS formats)
          const columnMappings: Record<string, string[]> = {
            title: ['opportunity name', 'title', 'name', 'opportunity', 'task order', 'task_order', 'to name', 'to_name', 'solicitation title', 'project', 'project name', 'requirement', 'subject'],
            description: ['short description', 'description', 'summary', 'scope', 'scope of work', 'sow', 'requirement description', 'work description', 'details', 'abstract'],
            agency: ['issuing office', 'agency', 'organization', 'customer', 'client', 'contracting agency', 'government agency', 'dept', 'department', 'office', 'command'],
            contractVehicle: ['contract vehicle', 'contract', 'vehicle', 'idiq', 'contract_vehicle', 'mac', 'bpa', 'gwac', 'seaport', 'seaportnxg'],
            postedDate: ['start date/time', 'start date', 'posted', 'posted_date', 'posted date', 'release date', 'issue date', 'rfp date', 'date issued', 'date', 'publish date'],
            dueDate: ['closing date/time', 'closing date', 'due', 'due_date', 'due date', 'deadline', 'response date', 'close date', 'proposal due', 'proposal deadline', 'response deadline', 'end date'],
            naicsCode: ['naics', 'naics_code', 'naics code', 'primary naics', 'naics number'],
            setAsideType: ['set-aside', 'set aside', 'set_aside', 'setaside', 'socioeconomic', 'small business'],
            estimatedValue: ['value', 'estimated value', 'ceiling', 'contract value', 'estimated_value', 'amount', 'ceiling value', 'max value', 'award amount'],
            placeOfPerformance: ['place of performance/delivery', 'place of performance', 'location', 'pop', 'place_of_performance', 'work location', 'performance location', 'site', 'state'],
            solicitationNumber: ['solicitation', 'solicitation_number', 'solicitation number', 'sol number', 'rfp number', 'rfq number', 'to number', 'task order number', 'order number'],
            originalUrl: ['url', 'link', 'opportunity url', 'sam.gov link', 'source link', 'actions'],
            opportunityType: ['opportunity type', 'type', 'notice type'],
            opportunityStatus: ['opportunity status', 'status'],
            pscCode: ['psc code', 'psc', 'product service code'],
          };
          
          // Helper to find matching column value
          const findColumnValue = (row: any, fieldMappings: string[]): string | null => {
            const rowLowerKeys = Object.fromEntries(
              Object.entries(row).map(([k, v]) => [k.toLowerCase().trim(), v])
            );
            
            for (const mapping of fieldMappings) {
              if (rowLowerKeys[mapping] !== undefined && rowLowerKeys[mapping] !== '') {
                return String(rowLowerKeys[mapping]);
              }
            }
            return null;
          };
          
          // Process each row as a potential opportunity
          for (const row of jsonData) {
            const title = findColumnValue(row, columnMappings.title);
            
            // Skip rows without a title or that look like headers/totals
            if (!title || title.toLowerCase().includes('total') || title.toLowerCase().includes('header')) {
              continue;
            }
            
            const opp = {
              title: title,
              description: findColumnValue(row, columnMappings.description),
              agency: findColumnValue(row, columnMappings.agency),
              contractVehicle: findColumnValue(row, columnMappings.contractVehicle) || 'SeaportNXG',
              opportunityType: findColumnValue(row, columnMappings.opportunityType),
              postedDate: findColumnValue(row, columnMappings.postedDate),
              dueDate: findColumnValue(row, columnMappings.dueDate),
              naicsCode: findColumnValue(row, columnMappings.naicsCode),
              setAsideType: findColumnValue(row, columnMappings.setAsideType),
              estimatedValue: findColumnValue(row, columnMappings.estimatedValue),
              placeOfPerformance: findColumnValue(row, columnMappings.placeOfPerformance),
              solicitationNumber: findColumnValue(row, columnMappings.solicitationNumber),
              originalUrl: findColumnValue(row, columnMappings.originalUrl),
              rawContent: JSON.stringify(row),
            };
            
            opportunities.push(opp);
          }
          
          console.log(`Extracted ${opportunities.length} opportunities from Excel file`);
          
          // If no opportunities found with column mapping, create one for manual review
          if (opportunities.length === 0) {
            opportunities.push({
              title: `Imported from ${fileName}`,
              description: 'Excel file imported - no matching columns found, manual review required',
              rawContent: JSON.stringify(jsonData.slice(0, 5)),
            });
          }
        } catch (xlsxError) {
          console.error('Error parsing Excel file:', xlsxError);
          opportunities.push({
            title: `Imported from ${fileName}`,
            description: 'Excel file could not be parsed - manual review required',
            rawContent: 'Excel parsing error',
          });
        }
      } else if (fileType === 'pdf' || fileType === 'docx' || fileType === 'doc') {
        // Extract text and create single opportunity for AI analysis
        let extractedText = '';
        
        if (fileType === 'docx' || fileType === 'doc') {
          try {
            const mammoth = await import('mammoth');
            const result = await mammoth.extractRawText({ buffer });
            extractedText = result.value;
          } catch (e) {
            console.error('Error extracting docx text:', e);
          }
        } else if (fileType === 'pdf') {
          try {
            const pdfjs = await import('pdfjs-dist');
            const loadingTask = pdfjs.getDocument({ data: buffer });
            const pdf = await loadingTask.promise;
            const textParts: string[] = [];
            
            for (let i = 1; i <= Math.min(pdf.numPages, 20); i++) {
              const page = await pdf.getPage(i);
              const textContent = await page.getTextContent();
              const pageText = textContent.items
                .map((item: any) => item.str)
                .join(' ');
              textParts.push(pageText);
            }
            extractedText = textParts.join('\n\n');
          } catch (e) {
            console.error('Error extracting PDF text:', e);
          }
        }
        
        if (extractedText) {
          // Use AI to extract opportunities from the text
          opportunities = await extractOpportunitiesWithAI(extractedText, fileName);
        }
      }
      
      // Insert opportunities into database
      let processedCount = 0;
      for (const opp of opportunities) {
        try {
          // Score the opportunity using AI
          const scoring = await scoreOpportunityWithAI(opp);
          
          await dbPool.query(`
            INSERT INTO idiq_opportunities (
              source_type, upload_batch_id, title, description, contract_vehicle, opportunity_type,
              agency, posted_date, due_date, naics_code, set_aside_type,
              estimated_value, place_of_performance, solicitation_number, original_url,
              raw_content, match_score, relevancy_summary, why_relevant,
              past_performance_match, capability_match, requirements, discriminators_strengths,
              discriminators_weaknesses, tags, ai_category, scored_at
            ) VALUES (
              'upload', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
              $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, NOW()
            )
          `, [
            batchId,
            opp.title,
            opp.description,
            opp.contractVehicle,
            opp.opportunityType,
            opp.agency,
            opp.postedDate ? new Date(opp.postedDate) : null,
            opp.dueDate ? new Date(opp.dueDate) : null,
            opp.naicsCode,
            opp.setAsideType,
            opp.estimatedValue,
            opp.placeOfPerformance,
            opp.solicitationNumber,
            opp.originalUrl,
            opp.rawContent || null,
            scoring.matchScore,
            scoring.relevancySummary,
            scoring.whyRelevant,
            scoring.pastPerformanceMatch,
            scoring.capabilityMatch,
            scoring.requirements,
            scoring.discriminatorsStrengths,
            scoring.discriminatorsWeaknesses,
            scoring.tags,
            scoring.aiCategory,
          ]);
          
          processedCount++;
        } catch (insertError) {
          console.error('Error inserting opportunity:', insertError);
        }
      }
      
      // Update batch status
      await dbPool.query(`
        UPDATE idiq_upload_batches 
        SET status = 'completed',
            total_opportunities = $1,
            processed_opportunities = $2,
            completed_at = NOW()
        WHERE id = $3
      `, [opportunities.length, processedCount, batchId]);
      
      console.log(`IDIQ batch ${batchId} completed: ${processedCount}/${opportunities.length} opportunities processed`);
      
    } catch (error) {
      console.error(`Error processing IDIQ batch ${batchId}:`, error);
      await dbPool.query(`
        UPDATE idiq_upload_batches 
        SET status = 'failed', error_message = $1
        WHERE id = $2
      `, [(error as Error).message, batchId]);
    }
  }

  // AI function to extract opportunities from document text
  async function extractOpportunitiesWithAI(text: string, fileName: string): Promise<any[]> {
    // OpenAI features disabled for internal deployment
    if (!OPENAI_ENABLED) {
      return [{
        title: `Imported from ${fileName}`,
        description: text.substring(0, 1000),
        rawContent: text,
      }];
    }

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an expert at parsing government contract opportunities from documents.
Extract each distinct opportunity/task order from the provided text.
For each opportunity, extract: title, description, agency, contract_vehicle, due_date, naics_code, estimated_value, place_of_performance, solicitation_number.
Return a JSON array of opportunities. If only one opportunity is found, return an array with one item.
If no clear opportunities are found, extract what information you can and create one entry.`
          },
          {
            role: "user",
            content: `Parse this document and extract contract opportunities:\n\nFile: ${fileName}\n\n${text.substring(0, 15000)}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });
      
      const content = response.choices[0]?.message?.content || '{"opportunities":[]}';
      const parsed = JSON.parse(content);
      return parsed.opportunities || [parsed];
    } catch (error) {
      console.error('Error extracting opportunities with AI:', error);
      return [{
        title: `Imported from ${fileName}`,
        description: text.substring(0, 1000),
        rawContent: text,
      }];
    }
  }

  // AI function to score an opportunity with feedback learning
  async function scoreOpportunityWithAI(opportunity: any): Promise<{
    matchScore: number;
    relevancySummary: string;
    whyRelevant: string;
    pastPerformanceMatch: string;
    capabilityMatch: string[];
    requirements: string[];
    discriminatorsStrengths: string[];
    discriminatorsWeaknesses: string[];
    tags: string[];
    aiCategory: string;
  }> {
    // OpenAI features disabled for internal deployment
    if (!OPENAI_ENABLED) {
      return {
        matchScore: 50,
        relevancySummary: 'AI scoring disabled - manual review required',
        whyRelevant: 'AI scoring unavailable for internal deployment',
        pastPerformanceMatch: 'None',
        capabilityMatch: [],
        requirements: [],
        discriminatorsStrengths: [],
        discriminatorsWeaknesses: [],
        tags: [],
        aiCategory: 'Unclassified',
      };
    }

    try {
      // Get capability documents for context
      const capDocs = await dbPool.query(`
        SELECT title, extracted_text FROM idiq_capability_docs 
        WHERE is_active = true 
        LIMIT 5
      `);
      
      const capabilityContext = capDocs.rows
        .map(doc => `${doc.title}:\n${doc.extracted_text?.substring(0, 2000) || 'No text available'}`)
        .join('\n\n---\n\n');

      // Get feedback preferences for learning (only those with weight >= 2)
      const feedbackPrefs = await dbPool.query(`
        SELECT preference_type, reason, weight
        FROM idiq_feedback_preferences
        WHERE weight >= 2
        ORDER BY weight DESC
        LIMIT 15
      `);

      const positiveSignals = feedbackPrefs.rows
        .filter(r => r.preference_type === 'upvote')
        .map(r => `- "${r.reason}" (mentioned ${r.weight} times)`)
        .join('\n');

      const negativeSignals = feedbackPrefs.rows
        .filter(r => r.preference_type === 'downvote')
        .map(r => `- "${r.reason}" (mentioned ${r.weight} times)`)
        .join('\n');

      const feedbackContext = (positiveSignals || negativeSignals) ? `

USER FEEDBACK PREFERENCES (learned from team input):
${positiveSignals ? `POSITIVE SIGNALS (opportunities like these should score HIGHER):\n${positiveSignals}` : ''}
${negativeSignals ? `NEGATIVE SIGNALS (opportunities like these should score LOWER):\n${negativeSignals}` : ''}
` : '';
      
      // Structured business vertical profiles for comparative matching (similar to news vertical tagging)
      const businessVerticalProfiles = `
BUSINESS VERTICALS - Compare the opportunity against ALL THREE profiles and select the BEST match:

DEFENSE VERTICAL
Companies: TAS (Tactical Aircraft Solutions), IOMAX, Unmanned Systems Inc (USI)
Summary: Delivers warfighter-relevant products and services in multi-security environments. Capabilities include tactical aircraft solutions, manned and unmanned aviation operations, ISR platforms, ground sensors and surveillance systems, contract logistics support, aircraft maintenance and modifications, and classified infrastructure services.
Keywords: tactical aircraft, ISR, intelligence surveillance reconnaissance, UAS, unmanned aerial systems, drone, aviation maintenance, MRO, flight test, sensor integration, weapons systems, border security, counterterrorism, military aviation, DOD, NAVAIR, Air Force, Army, Navy, Marine Corps, fixed wing, rotary wing, helicopter, aircraft modification, ground sensors, surveillance, classified, security clearance, Apache, Chinook, Black Hawk, sustainment
NAICS Codes: 336411 (Aircraft Manufacturing), 336413 (Other Aircraft Parts), 334511 (Navigation/Guidance Instruments), 336412 (Aircraft Engines), 336414 (Guided Missile/Space Vehicle), 488190 (Air Transportation Support/MRO), 541330 (Engineering Services), 541715 (Defense R&D), 541512 (Computer Systems Design), 541519 (AI/ML/Autonomous Systems), 541614 (Logistics Consulting), 541690 (Technical Consulting), 541990 (Technical Services)
Focus Areas: Military aviation contracts, ISR aircraft awards, UAS procurements, Sensor technology contracts, Border security programs, DOD maintenance contracts, Flight test services, Tactical aircraft modifications, Counter-UAS systems

INDUSTRIALS VERTICAL
Companies: GCS (Garrett Container Systems), ICC (Impact Case and Container), API (Advanced Packaging Inc), Heritage Aviation, Albers Metal Finishing (AMF)
Summary: Provides full-spectrum aerospace manufacturing with AS9100D and NADCAP certifications. Includes precision machining, sheet metal fabrication, container solutions for defense applications, chemical processing and metal finishing, and FAA Part 145 repair station services.
Keywords: manufacturing, precision machining, CNC, sheet metal, fabrication, containers, shipping containers, aluminum containers, JMIC, aerospace parts, aircraft components, AS9100, NADCAP, FAA 145, repair station, metal finishing, anodizing, chemical processing, wiring harness, cable assembly, weapons containers, engine containers
NAICS Codes: 336413 (Aircraft Parts), 332510 (Hardware Manufacturing), 332312 (Fabricated Structural Metal), 332710 (Machine Shops), 332999 (Miscellaneous Fabricated Metal), 332439 (Metal Container Manufacturing), 332812 (Metal Coating/Engraving), 325510 (Paint/Coating Manufacturing), 541380 (Testing Laboratories), 488190 (FAA 145 Repair Station)
Focus Areas: Aerospace manufacturing contracts, Container procurement awards, Weapons storage solutions, Engine container contracts, FAA repair station work, Metal finishing contracts, DOD manufacturing awards, Supply chain opportunities

ADVANCED PROGRAMS VERTICAL
Companies: DRA (Defense Research Associates), Onepath, Onepath Systems
Summary: The warfighter's trusted partner for emerging defense and aerospace technologies delivered at the speed of need. Includes MBSE and digital engineering, AI/ML applications, armaments integration, R&D partnerships, classified IT infrastructure, and defense research.
Keywords: MBSE, model based systems engineering, digital engineering, AI, artificial intelligence, machine learning, ML, autonomy, R&D, research, SBIR, STTR, innovation, emerging technology, armaments, weapons integration, radar, sensors, electronic warfare, cyber, IT infrastructure, classified networks, DO-178, software certification, AFRL, DARPA
NAICS Codes: 541715 (R&D Physical/Engineering/Life Sciences), 541330 (Engineering Services/MBSE), 541511 (Custom Computer Programming), 541512 (Computer Systems Design), 541513 (Computer Facilities Management), 541618 (Management Consulting), 334511 (Radar/Sensor Technology), 334515 (Test Instruments), 541712 (Life Sciences R&D)
Focus Areas: SBIR/STTR awards, MBSE contracts, AI/ML defense programs, Digital engineering initiatives, AFRL research contracts, DARPA programs, Emerging technology R&D, Armaments integration contracts, Classified IT infrastructure, Electronic warfare programs
`;

      const albersContext = `
Albers Aerospace is a defense contractor with three distinct business verticals:

${businessVerticalProfiles}

GENERAL COMPANY CONTEXT:
- Small Business (8a certified)
- DOD/Army/Navy/Air Force contract experience
- SATCOM integration and tactical communications expertise
- Avionics upgrades and installations

${capabilityContext ? `Additional Capabilities from uploaded documents:\n${capabilityContext}` : ''}
${feedbackContext}
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an expert government contracting analyst evaluating IDIQ opportunities for Albers Aerospace.

CRITICAL: Determine which of the THREE business verticals this opportunity BEST matches:
1. DEFENSE - Military aviation, ISR, UAS, sustainment, maintenance, tactical aircraft
2. INDUSTRIALS - Manufacturing, machining, fabrication, containers, metal finishing, repair station
3. ADVANCED_PROGRAMS - R&D, SBIR/STTR, AI/ML, digital engineering, emerging tech, DARPA, AFRL

The AI should compare the opportunity against ALL THREE vertical profiles provided and choose the SINGLE best match. Use low-temperature, deterministic logic - similar opportunities should be classified consistently.

Score this opportunity based on:
1. Relevance to Albers' core capabilities (NOT just NAICS or keywords)
2. Alignment with past performance areas in the matching vertical
3. Strategic fit with company focus areas
4. User feedback preferences (if provided - these reflect what the team actually finds valuable)

Scoring Guidelines:
- 85-100: Excellent fit - strong past performance, held contract vehicle, known customer
- 70-84: Good fit - relevant capabilities, some past performance, achievable
- 60-69: Potential fit - partial alignment, would require teaming or stretch
- 40-59: Weak fit - limited alignment, significant gaps
- 0-39: Poor fit - outside core competencies, do not pursue

Return a JSON object with:
- matchScore: 0-100 based on scoring guidelines above
- relevancySummary: One sentence explaining relevance
- whyRelevant: SPECIFIC and DETAILED explanation (3-5 sentences) that MUST include: (1) the specific Albers capability or past performance that matches, (2) the exact requirement text or keywords from the opportunity that triggered the match, (3) specific customer/agency alignment if any, and (4) why the selected vertical is the best fit. Reference actual contract types, platforms (Apache, Black Hawk, F-35), or specific technical requirements. AVOID generic statements like "potential relevance" - be concrete.
- pastPerformanceMatch: "Direct" | "Indirect" | "None"
- capabilityMatch: Array of matched capability areas from the selected vertical
- requirements: Array of key requirements extracted from the opportunity
- strengths: Array of factors that make us competitive for this opportunity
- weaknesses: Array of gaps or challenges we would face
- tags: Array of keywords for filtering (include vertical-specific keywords like "Army", "Aviation", "SBIR", "Manufacturing")
- businessVertical: EXACTLY ONE of: "Defense" | "Industrials" | "Advanced Programs"
- category: Specific capability category within the vertical (e.g., "ISR Aircraft", "Container Solutions", "AI/ML Research")

Be honest and analytical. Don't inflate scores. Choose ONE vertical definitively - if ambiguous, pick the strongest match.`
          },
          {
            role: "user",
            content: `Evaluate this opportunity for Albers Aerospace:

Albers Context:
${albersContext}

Opportunity:
Title: ${opportunity.title}
Description: ${opportunity.description || 'Not provided'}
Agency: ${opportunity.agency || 'Not specified'}
Contract Vehicle: ${opportunity.contractVehicle || 'Not specified'}
NAICS: ${opportunity.naicsCode || 'Not specified'}
Value: ${opportunity.estimatedValue || 'Not specified'}
Location: ${opportunity.placeOfPerformance || 'Not specified'}
${opportunity.rawContent ? `\nAdditional Content:\n${opportunity.rawContent.substring(0, 3000)}` : ''}

Provide your comprehensive analysis as JSON.`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });
      
      const content = response.choices[0]?.message?.content || '{}';
      const result = JSON.parse(content);
      
      // Ensure businessVertical is included in tags for consistent filtering
      const tags = result.tags || [];
      const businessVertical = result.businessVertical || 'Defense';
      if (businessVertical && !tags.includes(businessVertical)) {
        tags.push(businessVertical);
      }
      
      return {
        matchScore: result.matchScore || 50,
        relevancySummary: result.relevancySummary || 'Analysis pending',
        whyRelevant: result.whyRelevant || 'Detailed analysis not available',
        pastPerformanceMatch: result.pastPerformanceMatch || 'None',
        capabilityMatch: result.capabilityMatch || [],
        requirements: result.requirements || [],
        discriminatorsStrengths: result.strengths || [],
        discriminatorsWeaknesses: result.weaknesses || [],
        tags: tags,
        aiCategory: `${businessVertical} - ${result.category || 'General'}`,
      };
    } catch (error) {
      console.error('Error scoring opportunity with AI:', error);
      return {
        matchScore: 50,
        relevancySummary: 'Scoring pending - manual review recommended',
        whyRelevant: 'AI scoring unavailable',
        pastPerformanceMatch: 'None',
        capabilityMatch: [],
        requirements: [],
        discriminatorsStrengths: [],
        discriminatorsWeaknesses: [],
        tags: [],
        aiCategory: 'Unclassified',
      };
    }
  }

  // ============ IDIQ User Feedback Routes ============

  // Submit feedback (upvote/downvote) on an opportunity
  app.post("/api/idiq/opportunities/:id/feedback", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId;
      const { feedbackType, reason } = req.body;

      if (!['upvote', 'downvote'].includes(feedbackType)) {
        return res.status(400).json({ error: "Invalid feedback type" });
      }

      // Check for existing feedback
      const existing = await dbPool.query(`
        SELECT id, feedback_type FROM idiq_user_feedback 
        WHERE user_id = $1 AND opportunity_id = $2
      `, [userId, id]);

      if (existing.rows.length > 0) {
        // Update existing feedback
        await dbPool.query(`
          UPDATE idiq_user_feedback 
          SET feedback_type = $1, reason = $2, created_at = NOW()
          WHERE user_id = $3 AND opportunity_id = $4
        `, [feedbackType, reason || null, userId, id]);
      } else {
        // Insert new feedback
        await dbPool.query(`
          INSERT INTO idiq_user_feedback (user_id, opportunity_id, feedback_type, reason)
          VALUES ($1, $2, $3, $4)
        `, [userId, id, feedbackType, reason || null]);
      }

      // Update feedback preferences (aggregated learning)
      if (reason && reason.trim()) {
        const normalizedReason = reason.trim().toLowerCase();
        
        // Check if this reason already exists
        const existingPref = await dbPool.query(`
          SELECT id, weight FROM idiq_feedback_preferences
          WHERE preference_type = $1 AND LOWER(reason) = $2
        `, [feedbackType, normalizedReason]);

        if (existingPref.rows.length > 0) {
          // Increment weight
          await dbPool.query(`
            UPDATE idiq_feedback_preferences
            SET weight = weight + 1, updated_at = NOW()
            WHERE id = $1
          `, [existingPref.rows[0].id]);
        } else {
          // Create new preference
          await dbPool.query(`
            INSERT INTO idiq_feedback_preferences (preference_type, reason, weight)
            VALUES ($1, $2, 1)
          `, [feedbackType, reason.trim()]);
        }
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error submitting feedback:", error);
      res.status(500).json({ error: "Failed to submit feedback" });
    }
  });

  // Get user's feedback on an opportunity
  app.get("/api/idiq/opportunities/:id/feedback", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId;

      const result = await dbPool.query(`
        SELECT feedback_type, reason, created_at
        FROM idiq_user_feedback
        WHERE user_id = $1 AND opportunity_id = $2
      `, [userId, id]);

      if (result.rows.length > 0) {
        res.json({
          feedbackType: result.rows[0].feedback_type,
          reason: result.rows[0].reason,
          createdAt: result.rows[0].created_at,
        });
      } else {
        res.json(null);
      }
    } catch (error) {
      console.error("Error fetching feedback:", error);
      res.status(500).json({ error: "Failed to fetch feedback" });
    }
  });

  // Delete user's feedback on an opportunity
  app.delete("/api/idiq/opportunities/:id/feedback", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId;

      await dbPool.query(`
        DELETE FROM idiq_user_feedback
        WHERE user_id = $1 AND opportunity_id = $2
      `, [userId, id]);

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting feedback:", error);
      res.status(500).json({ error: "Failed to delete feedback" });
    }
  });

  // Get feedback counts for an opportunity
  app.get("/api/idiq/opportunities/:id/feedback-counts", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;

      const result = await dbPool.query(`
        SELECT 
          COUNT(*) FILTER (WHERE feedback_type = 'upvote') as upvotes,
          COUNT(*) FILTER (WHERE feedback_type = 'downvote') as downvotes
        FROM idiq_user_feedback
        WHERE opportunity_id = $1
      `, [id]);

      res.json({
        upvotes: parseInt(result.rows[0]?.upvotes) || 0,
        downvotes: parseInt(result.rows[0]?.downvotes) || 0,
      });
    } catch (error) {
      console.error("Error fetching feedback counts:", error);
      res.status(500).json({ error: "Failed to fetch feedback counts" });
    }
  });

  // ============ IDIQ User Read Tracking Routes ============

  // Mark opportunity as read for current user
  app.post("/api/idiq/opportunities/:id/read", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId;

      // Upsert read record
      await dbPool.query(`
        INSERT INTO idiq_user_reads (user_id, opportunity_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, opportunity_id) DO UPDATE SET read_at = NOW()
      `, [userId, id]);

      res.json({ success: true });
    } catch (error) {
      console.error("Error marking as read:", error);
      res.status(500).json({ error: "Failed to mark as read" });
    }
  });

  // Get user's read status for opportunities
  app.get("/api/idiq/read-status", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;

      const result = await dbPool.query(`
        SELECT opportunity_id, read_at
        FROM idiq_user_reads
        WHERE user_id = $1
      `, [userId]);

      // Return as a map of opportunity_id -> read_at
      const readStatus: Record<string, string> = {};
      result.rows.forEach(row => {
        readStatus[row.opportunity_id] = row.read_at;
      });

      res.json(readStatus);
    } catch (error) {
      console.error("Error fetching read status:", error);
      res.status(500).json({ error: "Failed to fetch read status" });
    }
  });

  // Mark all opportunities as read
  app.post("/api/idiq/mark-all-read", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;

      // Get all opportunity IDs
      const opps = await dbPool.query(`SELECT id FROM idiq_opportunities WHERE status != 'archived'`);

      // Insert read records for all
      for (const opp of opps.rows) {
        await dbPool.query(`
          INSERT INTO idiq_user_reads (user_id, opportunity_id)
          VALUES ($1, $2)
          ON CONFLICT (user_id, opportunity_id) DO UPDATE SET read_at = NOW()
        `, [userId, opp.id]);
      }

      res.json({ success: true, count: opps.rows.length });
    } catch (error) {
      console.error("Error marking all as read:", error);
      res.status(500).json({ error: "Failed to mark all as read" });
    }
  });

  // Re-score all opportunities with updated capability documents
  app.post("/api/idiq/rescore-all", isAuthenticated, async (req, res) => {
    try {
      // Get all non-archived opportunities
      const opps = await dbPool.query(`
        SELECT id, title, description, agency, contract_vehicle, naics_code, estimated_value, 
               place_of_performance, raw_content
        FROM idiq_opportunities 
        WHERE status != 'archived'
      `);

      let rescored = 0;
      
      for (const opp of opps.rows) {
        try {
          const opportunity = {
            title: opp.title,
            description: opp.description,
            agency: opp.agency,
            contractVehicle: opp.contract_vehicle,
            naicsCode: opp.naics_code,
            estimatedValue: opp.estimated_value,
            placeOfPerformance: opp.place_of_performance,
            rawContent: opp.raw_content,
          };
          
          const scoring = await scoreOpportunityWithAI(opportunity);
          
          await dbPool.query(`
            UPDATE idiq_opportunities 
            SET match_score = $1, relevancy_summary = $2, why_relevant = $3,
                past_performance_match = $4, capability_match = $5, requirements = $6,
                discriminators_strengths = $7, discriminators_weaknesses = $8,
                tags = $9, ai_category = $10
            WHERE id = $11
          `, [
            scoring.matchScore,
            scoring.relevancySummary,
            scoring.whyRelevant,
            scoring.pastPerformanceMatch,
            scoring.capabilityMatch,
            scoring.requirements,
            scoring.discriminatorsStrengths,
            scoring.discriminatorsWeaknesses,
            scoring.tags,
            scoring.aiCategory,
            opp.id
          ]);
          
          rescored++;
        } catch (err) {
          console.error(`Error re-scoring opportunity ${opp.id}:`, err);
        }
      }

      res.json({ success: true, rescored, total: opps.rows.length });
    } catch (error) {
      console.error("Error re-scoring opportunities:", error);
      res.status(500).json({ error: "Failed to re-score opportunities" });
    }
  });

  // ============ IDIQ User Notes Routes ============

  // Get notes for an opportunity
  app.get("/api/idiq/opportunities/:id/notes", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId;

      const result = await dbPool.query(`
        SELECT n.id, n.note_text, n.created_at, n.updated_at, u.first_name, u.last_name
        FROM idiq_user_notes n
        JOIN users u ON n.user_id = u.id
        WHERE n.user_id = $1 AND n.opportunity_id = $2
        ORDER BY n.created_at DESC
      `, [userId, id]);

      res.json(result.rows.map(row => ({
        id: row.id,
        noteText: row.note_text,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        authorName: row.first_name && row.last_name 
          ? `${row.first_name} ${row.last_name}` 
          : row.first_name || row.last_name || 'Unknown',
      })));
    } catch (error) {
      console.error("Error fetching notes:", error);
      res.status(500).json({ error: "Failed to fetch notes" });
    }
  });

  // Add a note to an opportunity
  app.post("/api/idiq/opportunities/:id/notes", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId;
      const { noteText } = req.body;

      if (!noteText || !noteText.trim()) {
        return res.status(400).json({ error: "Note text is required" });
      }

      const result = await dbPool.query(`
        INSERT INTO idiq_user_notes (user_id, opportunity_id, note_text)
        VALUES ($1, $2, $3)
        RETURNING id, note_text, created_at, updated_at
      `, [userId, id, noteText.trim()]);

      const row = result.rows[0];
      res.json({
        id: row.id,
        noteText: row.note_text,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      });
    } catch (error) {
      console.error("Error adding note:", error);
      res.status(500).json({ error: "Failed to add note" });
    }
  });

  // Update a note
  app.patch("/api/idiq/opportunities/:opportunityId/notes/:noteId", isAuthenticated, async (req, res) => {
    try {
      const { opportunityId, noteId } = req.params;
      const userId = req.session.userId;
      const { noteText } = req.body;

      if (!noteText || !noteText.trim()) {
        return res.status(400).json({ error: "Note text is required" });
      }

      const result = await dbPool.query(`
        UPDATE idiq_user_notes
        SET note_text = $1, updated_at = NOW()
        WHERE id = $2 AND user_id = $3 AND opportunity_id = $4
        RETURNING id, note_text, created_at, updated_at
      `, [noteText.trim(), noteId, userId, opportunityId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Note not found" });
      }

      const row = result.rows[0];
      res.json({
        id: row.id,
        noteText: row.note_text,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      });
    } catch (error) {
      console.error("Error updating note:", error);
      res.status(500).json({ error: "Failed to update note" });
    }
  });

  // Delete a note
  app.delete("/api/idiq/opportunities/:opportunityId/notes/:noteId", isAuthenticated, async (req, res) => {
    try {
      const { opportunityId, noteId } = req.params;
      const userId = req.session.userId;

      await dbPool.query(`
        DELETE FROM idiq_user_notes
        WHERE id = $1 AND user_id = $2 AND opportunity_id = $3
      `, [noteId, userId, opportunityId]);

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting note:", error);
      res.status(500).json({ error: "Failed to delete note" });
    }
  });

  // ============ IDIQ Social Comments Routes ============

  // Get all comments for an opportunity (public)
  app.get("/api/idiq/opportunities/:id/comments", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId;

      const result = await dbPool.query(`
        SELECT 
          c.id, c.user_id, c.opportunity_id, c.parent_id, c.content, c.mentions, c.created_at, c.updated_at,
          u.first_name, u.last_name,
          (SELECT COUNT(*) FROM idiq_comment_likes WHERE comment_id = c.id) as like_count,
          EXISTS(SELECT 1 FROM idiq_comment_likes WHERE comment_id = c.id AND user_id = $2) as liked_by_me
        FROM idiq_comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.opportunity_id = $1
        ORDER BY c.created_at ASC
      `, [id, userId]);

      const comments = result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        opportunityId: row.opportunity_id,
        parentId: row.parent_id,
        content: row.content,
        mentions: row.mentions || [],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        authorName: row.first_name && row.last_name 
          ? `${row.first_name} ${row.last_name}` 
          : row.first_name || row.last_name || 'Unknown',
        authorFirstName: row.first_name,
        authorLastName: row.last_name,
        likeCount: parseInt(row.like_count) || 0,
        likedByMe: row.liked_by_me,
        isOwner: row.user_id === userId,
      }));

      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  // Get users for @mention autocomplete
  app.get("/api/idiq/users/search", isAuthenticated, async (req, res) => {
    try {
      const { q } = req.query;
      const searchTerm = q ? `%${q}%` : '%';

      const result = await dbPool.query(`
        SELECT id, first_name, last_name, email
        FROM users
        WHERE (first_name ILIKE $1 OR last_name ILIKE $1 OR email ILIKE $1)
        AND email_verified = true
        ORDER BY first_name, last_name
        LIMIT 10
      `, [searchTerm]);

      res.json(result.rows.map(row => ({
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        displayName: row.first_name && row.last_name 
          ? `${row.first_name} ${row.last_name}` 
          : row.first_name || row.last_name || row.email,
      })));
    } catch (error) {
      console.error("Error searching users:", error);
      res.status(500).json({ error: "Failed to search users" });
    }
  });

  // Add a comment to an opportunity
  app.post("/api/idiq/opportunities/:id/comments", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId;
      const { content, parentId, mentions } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({ error: "Comment content is required" });
      }

      const result = await dbPool.query(`
        INSERT INTO idiq_comments (user_id, opportunity_id, parent_id, content, mentions)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, user_id, opportunity_id, parent_id, content, mentions, created_at, updated_at
      `, [userId, id, parentId || null, content.trim(), mentions || []]);

      // Fetch author info
      const userResult = await dbPool.query(`
        SELECT first_name, last_name FROM users WHERE id = $1
      `, [userId]);
      const userData = userResult.rows[0];

      const row = result.rows[0];
      
      // Send email notifications to mentioned users (async, don't wait)
      if (mentions && mentions.length > 0) {
        // Get opportunity info for the email
        const opportunityResult = await dbPool.query(`
          SELECT title FROM idiq_opportunities WHERE id = $1
        `, [id]);
        const opportunityTitle = opportunityResult.rows[0]?.title || 'IDIQ Opportunity';
        
        // Get mentioned users' info
        const mentionedUsersResult = await dbPool.query(`
          SELECT id, email, first_name, last_name FROM users WHERE id = ANY($1::varchar[])
        `, [mentions]);
        
        const mentionerName = userData?.first_name && userData?.last_name 
          ? `${userData.first_name} ${userData.last_name}` 
          : userData?.first_name || userData?.last_name || 'Someone';
        
        // Get base URL from environment or construct it
        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.headers.host;
        const intranetUrl = `${protocol}://${host}`;
        
        // Send emails to each mentioned user (don't block the response)
        for (const mentionedUser of mentionedUsersResult.rows) {
          // Note: Self-mentions allowed for testing purposes
          // To disable self-notifications in production, uncomment:
          // if (mentionedUser.id === userId) continue;
          
          const mentionedName = mentionedUser.first_name && mentionedUser.last_name
            ? `${mentionedUser.first_name} ${mentionedUser.last_name}`
            : mentionedUser.first_name || mentionedUser.last_name || 'Team Member';
          
          sendIdiqMentionEmail(
            mentionedUser.email,
            mentionedName,
            mentionerName,
            opportunityTitle,
            id,
            content.trim(),
            intranetUrl
          ).catch(err => console.error('Failed to send IDIQ mention email:', err));
        }
      }
      
      res.json({
        id: row.id,
        userId: row.user_id,
        opportunityId: row.opportunity_id,
        parentId: row.parent_id,
        content: row.content,
        mentions: row.mentions || [],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        authorName: userData?.first_name && userData?.last_name 
          ? `${userData.first_name} ${userData.last_name}` 
          : userData?.first_name || userData?.last_name || 'Unknown',
        authorFirstName: userData?.first_name,
        authorLastName: userData?.last_name,
        likeCount: 0,
        likedByMe: false,
        isOwner: true,
      });
    } catch (error) {
      console.error("Error adding comment:", error);
      res.status(500).json({ error: "Failed to add comment" });
    }
  });

  // Update a comment
  app.patch("/api/idiq/opportunities/:opportunityId/comments/:commentId", isAuthenticated, async (req, res) => {
    try {
      const { opportunityId, commentId } = req.params;
      const userId = req.session.userId;
      const { content, mentions } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({ error: "Comment content is required" });
      }

      const result = await dbPool.query(`
        UPDATE idiq_comments
        SET content = $1, mentions = $2, updated_at = NOW()
        WHERE id = $3 AND user_id = $4 AND opportunity_id = $5
        RETURNING id, content, mentions, created_at, updated_at
      `, [content.trim(), mentions || [], commentId, userId, opportunityId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Comment not found or not authorized" });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error updating comment:", error);
      res.status(500).json({ error: "Failed to update comment" });
    }
  });

  // Delete a comment
  app.delete("/api/idiq/opportunities/:opportunityId/comments/:commentId", isAuthenticated, async (req, res) => {
    try {
      const { opportunityId, commentId } = req.params;
      const userId = req.session.userId;

      await dbPool.query(`
        DELETE FROM idiq_comments
        WHERE id = $1 AND user_id = $2 AND opportunity_id = $3
      `, [commentId, userId, opportunityId]);

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting comment:", error);
      res.status(500).json({ error: "Failed to delete comment" });
    }
  });

  // Like a comment
  app.post("/api/idiq/comments/:commentId/like", isAuthenticated, async (req, res) => {
    try {
      const { commentId } = req.params;
      const userId = req.session.userId;

      await dbPool.query(`
        INSERT INTO idiq_comment_likes (user_id, comment_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, comment_id) DO NOTHING
      `, [userId, commentId]);

      // Get updated like count
      const countResult = await dbPool.query(`
        SELECT COUNT(*) as count FROM idiq_comment_likes WHERE comment_id = $1
      `, [commentId]);

      res.json({ 
        success: true, 
        likeCount: parseInt(countResult.rows[0]?.count) || 0,
        likedByMe: true 
      });
    } catch (error) {
      console.error("Error liking comment:", error);
      res.status(500).json({ error: "Failed to like comment" });
    }
  });

  // Unlike a comment
  app.delete("/api/idiq/comments/:commentId/like", isAuthenticated, async (req, res) => {
    try {
      const { commentId } = req.params;
      const userId = req.session.userId;

      await dbPool.query(`
        DELETE FROM idiq_comment_likes
        WHERE user_id = $1 AND comment_id = $2
      `, [userId, commentId]);

      // Get updated like count
      const countResult = await dbPool.query(`
        SELECT COUNT(*) as count FROM idiq_comment_likes WHERE comment_id = $1
      `, [commentId]);

      res.json({ 
        success: true, 
        likeCount: parseInt(countResult.rows[0]?.count) || 0,
        likedByMe: false 
      });
    } catch (error) {
      console.error("Error unliking comment:", error);
      res.status(500).json({ error: "Failed to unlike comment" });
    }
  });

  // ============ IDIQ Analytics Routes ============

  // Get IDIQ analytics dashboard data
  app.get("/api/idiq/analytics", isAuthenticated, async (req, res) => {
    try {
      // Total opportunities
      const totalResult = await dbPool.query(`SELECT COUNT(*) FROM idiq_opportunities`);
      const total = parseInt(totalResult.rows[0]?.count) || 0;

      // Score distribution
      const scoreDistResult = await dbPool.query(`
        SELECT 
          COUNT(*) FILTER (WHERE match_score >= 85) as high_match,
          COUNT(*) FILTER (WHERE match_score >= 60 AND match_score < 85) as medium_match,
          COUNT(*) FILTER (WHERE match_score < 60 OR match_score IS NULL) as low_match
        FROM idiq_opportunities
      `);
      const scoreDist = scoreDistResult.rows[0];

      // Opportunities by category
      const categoryResult = await dbPool.query(`
        SELECT ai_category, COUNT(*) as count
        FROM idiq_opportunities
        WHERE ai_category IS NOT NULL
        GROUP BY ai_category
        ORDER BY count DESC
        LIMIT 10
      `);

      // Opportunities by source
      const sourceResult = await dbPool.query(`
        SELECT source_type, COUNT(*) as count
        FROM idiq_opportunities
        GROUP BY source_type
      `);

      // Weekly trend (last 8 weeks)
      const trendResult = await dbPool.query(`
        SELECT 
          DATE_TRUNC('week', created_at) as week,
          COUNT(*) as count,
          AVG(match_score) as avg_score
        FROM idiq_opportunities
        WHERE created_at >= NOW() - INTERVAL '8 weeks'
        GROUP BY DATE_TRUNC('week', created_at)
        ORDER BY week
      `);

      // User engagement
      const engagementResult = await dbPool.query(`
        SELECT 
          (SELECT COUNT(*) FROM idiq_user_reads) as total_reads,
          (SELECT COUNT(*) FROM idiq_user_feedback WHERE feedback_type = 'upvote') as total_upvotes,
          (SELECT COUNT(*) FROM idiq_user_feedback WHERE feedback_type = 'downvote') as total_downvotes,
          (SELECT COUNT(*) FROM idiq_user_notes) as total_notes,
          (SELECT COUNT(*) FROM idiq_opportunities WHERE status = 'saved') as total_saved
      `);
      const engagement = engagementResult.rows[0];

      // Top feedback reasons
      const feedbackReasonsResult = await dbPool.query(`
        SELECT preference_type, reason, weight
        FROM idiq_feedback_preferences
        ORDER BY weight DESC
        LIMIT 10
      `);

      res.json({
        total,
        scoreDistribution: {
          highMatch: parseInt(scoreDist?.high_match) || 0,
          mediumMatch: parseInt(scoreDist?.medium_match) || 0,
          lowMatch: parseInt(scoreDist?.low_match) || 0,
        },
        byCategory: categoryResult.rows.map(row => ({
          category: row.ai_category,
          count: parseInt(row.count),
        })),
        bySource: sourceResult.rows.map(row => ({
          source: row.source_type,
          count: parseInt(row.count),
        })),
        weeklyTrend: trendResult.rows.map(row => ({
          week: row.week,
          count: parseInt(row.count),
          avgScore: Math.round(parseFloat(row.avg_score) || 0),
        })),
        engagement: {
          totalReads: parseInt(engagement?.total_reads) || 0,
          totalUpvotes: parseInt(engagement?.total_upvotes) || 0,
          totalDownvotes: parseInt(engagement?.total_downvotes) || 0,
          totalNotes: parseInt(engagement?.total_notes) || 0,
          totalSaved: parseInt(engagement?.total_saved) || 0,
        },
        topFeedbackReasons: feedbackReasonsResult.rows.map(row => ({
          type: row.preference_type,
          reason: row.reason,
          weight: row.weight,
        })),
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // Get feedback preferences (for AI scoring context)
  app.get("/api/idiq/feedback-preferences", isAuthenticated, async (req, res) => {
    try {
      const result = await dbPool.query(`
        SELECT preference_type, reason, weight
        FROM idiq_feedback_preferences
        WHERE weight >= 2
        ORDER BY weight DESC
        LIMIT 20
      `);

      const positive = result.rows
        .filter(r => r.preference_type === 'upvote')
        .map(r => ({ reason: r.reason, weight: r.weight }));

      const negative = result.rows
        .filter(r => r.preference_type === 'downvote')
        .map(r => ({ reason: r.reason, weight: r.weight }));

      res.json({ positive, negative });
    } catch (error) {
      console.error("Error fetching feedback preferences:", error);
      res.status(500).json({ error: "Failed to fetch feedback preferences" });
    }
  });

  // ============ IDIQ User Analytics Routes (Admin Only) ============

  // Get IDIQ user analytics - only accessible by system admin and bd_admin
  app.get("/api/idiq/user-analytics", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      
      // Check if user is system admin or bd_admin
      const userResult = await dbPool.query(
        'SELECT role FROM users WHERE id = $1',
        [userId]
      );
      
      if (userResult.rows.length === 0) {
        return res.status(401).json({ error: "User not found" });
      }
      
      const userRole = userResult.rows[0].role;
      if (userRole !== 'admin' && userRole !== 'bd_admin') {
        return res.status(403).json({ error: "Access denied. Only System Admin and BD Admin can access analytics." });
      }

      // Get users who have engaged with IDIQ (opened opps, given feedback, or made notes)
      const usersResult = await dbPool.query(`
        SELECT 
          u.id,
          u.first_name,
          u.last_name,
          u.email,
          u.role,
          u.business_vertical,
          COALESCE(reads.opp_count, 0) as opportunities_opened,
          COALESCE(feedback.feedback_count, 0) as feedback_given,
          COALESCE(notes.note_count, 0) as notes_created,
          COALESCE(reads.last_read, feedback.last_feedback, notes.last_note) as last_activity
        FROM users u
        LEFT JOIN (
          SELECT user_id, COUNT(*) as opp_count, MAX(read_at) as last_read
          FROM idiq_user_reads 
          GROUP BY user_id
        ) reads ON u.id = reads.user_id
        LEFT JOIN (
          SELECT user_id, COUNT(*) as feedback_count, MAX(created_at) as last_feedback
          FROM idiq_user_feedback 
          GROUP BY user_id
        ) feedback ON u.id = feedback.user_id
        LEFT JOIN (
          SELECT user_id, COUNT(*) as note_count, MAX(updated_at) as last_note
          FROM idiq_user_notes 
          GROUP BY user_id
        ) notes ON u.id = notes.user_id
        WHERE u.email_verified = true
          AND (reads.opp_count > 0 OR feedback.feedback_count > 0 OR notes.note_count > 0)
        ORDER BY GREATEST(reads.last_read, feedback.last_feedback, notes.last_note) DESC NULLS LAST
      `);

      // Get IDIQ-specific summary stats
      const summaryResult = await dbPool.query(`
        SELECT 
          (SELECT COUNT(DISTINCT user_id) FROM idiq_user_reads) as users_opened_opps,
          (SELECT COUNT(DISTINCT user_id) FROM idiq_user_feedback) as users_gave_feedback,
          (SELECT COUNT(*) FROM idiq_user_reads) as total_opportunities_opened,
          (SELECT COUNT(*) FROM idiq_user_feedback) as total_feedback_given,
          (SELECT COUNT(*) FROM idiq_user_feedback WHERE feedback_type = 'upvote') as total_upvotes,
          (SELECT COUNT(*) FROM idiq_user_feedback WHERE feedback_type = 'downvote') as total_downvotes,
          (SELECT COUNT(*) FROM idiq_user_notes) as total_notes_created
      `);

      res.json({
        users: usersResult.rows.map(row => ({
          id: row.id,
          firstName: row.first_name,
          lastName: row.last_name,
          email: row.email,
          role: row.role,
          businessVertical: row.business_vertical,
          opportunitiesOpened: parseInt(row.opportunities_opened) || 0,
          feedbackGiven: parseInt(row.feedback_given) || 0,
          notesCreated: parseInt(row.notes_created) || 0,
          lastActivity: row.last_activity,
        })),
        summary: {
          usersOpenedOpps: parseInt(summaryResult.rows[0].users_opened_opps) || 0,
          usersGaveFeedback: parseInt(summaryResult.rows[0].users_gave_feedback) || 0,
          totalOpportunitiesOpened: parseInt(summaryResult.rows[0].total_opportunities_opened) || 0,
          totalFeedbackGiven: parseInt(summaryResult.rows[0].total_feedback_given) || 0,
          totalUpvotes: parseInt(summaryResult.rows[0].total_upvotes) || 0,
          totalDownvotes: parseInt(summaryResult.rows[0].total_downvotes) || 0,
          totalNotesCreated: parseInt(summaryResult.rows[0].total_notes_created) || 0,
        }
      });
    } catch (error) {
      console.error("Error fetching user analytics:", error);
      res.status(500).json({ error: "Failed to fetch user analytics" });
    }
  });

  // ============ IDIQ Email Ingestion Routes ============

  // Get IDIQ settings for current user
  app.get("/api/idiq/settings", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;

      // Try to get user-specific settings first, then fall back to global
      const result = await dbPool.query(`
        SELECT * FROM idiq_settings 
        WHERE user_id = $1 OR user_id IS NULL
        ORDER BY user_id NULLS LAST
        LIMIT 1
      `, [userId]);

      if (result.rows.length === 0) {
        // Return defaults
        res.json({
          minMatchThreshold: 70,
          emailNotificationsEnabled: false,
          notificationEmail: null,
          notifyOnHighMatch: true,
          highMatchThreshold: 85,
          autoArchiveBelowThreshold: false,
          businessUnitFilter: null,
        });
      } else {
        const row = result.rows[0];
        res.json({
          minMatchThreshold: row.min_match_threshold,
          emailNotificationsEnabled: row.email_notifications_enabled,
          notificationEmail: row.notification_email,
          notifyOnHighMatch: row.notify_on_high_match,
          highMatchThreshold: row.high_match_threshold,
          autoArchiveBelowThreshold: row.auto_archive_below_threshold,
          businessUnitFilter: row.business_unit_filter,
        });
      }
    } catch (error) {
      console.error("Error fetching IDIQ settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  // Update IDIQ settings
  app.patch("/api/idiq/settings", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      const body = req.body;

      // Extract values with explicit checks for key presence
      // If key is present in body, use its value (even if null/undefined for nullable fields)
      // If key is absent, we'll let the database COALESCE handle it
      const minMatchThreshold = 'minMatchThreshold' in body ? body.minMatchThreshold : undefined;
      const emailNotificationsEnabled = 'emailNotificationsEnabled' in body ? body.emailNotificationsEnabled : undefined;
      const notifyOnHighMatch = 'notifyOnHighMatch' in body ? body.notifyOnHighMatch : undefined;
      const highMatchThreshold = 'highMatchThreshold' in body ? body.highMatchThreshold : undefined;
      const autoArchiveBelowThreshold = 'autoArchiveBelowThreshold' in body ? body.autoArchiveBelowThreshold : undefined;
      
      // For nullable fields: if key is present, use value (allows explicit null clearing)
      // If key is absent, preserve existing value
      const notificationEmailPresent = 'notificationEmail' in body;
      const notificationEmail = notificationEmailPresent ? (body.notificationEmail || null) : undefined;
      const businessUnitFilterPresent = 'businessUnitFilter' in body;
      const businessUnitFilter = businessUnitFilterPresent ? (body.businessUnitFilter || null) : undefined;

      // Build dynamic update query based on what fields are present
      // For nullable fields, we need to check if the key was present to allow null clearing
      const result = await dbPool.query(`
        INSERT INTO idiq_settings (user_id, min_match_threshold, email_notifications_enabled, notification_email, notify_on_high_match, high_match_threshold, auto_archive_below_threshold, business_unit_filter)
        VALUES ($1, COALESCE($2, 70), COALESCE($3, false), $7, COALESCE($4, true), COALESCE($5, 85), COALESCE($6, false), $8)
        ON CONFLICT (user_id) DO UPDATE SET
          min_match_threshold = COALESCE($2, idiq_settings.min_match_threshold),
          email_notifications_enabled = COALESCE($3, idiq_settings.email_notifications_enabled),
          notification_email = CASE WHEN $9::boolean THEN $7 ELSE idiq_settings.notification_email END,
          notify_on_high_match = COALESCE($4, idiq_settings.notify_on_high_match),
          high_match_threshold = COALESCE($5, idiq_settings.high_match_threshold),
          auto_archive_below_threshold = COALESCE($6, idiq_settings.auto_archive_below_threshold),
          business_unit_filter = CASE WHEN $10::boolean THEN $8 ELSE idiq_settings.business_unit_filter END,
          updated_at = NOW()
        RETURNING *
      `, [userId, minMatchThreshold, emailNotificationsEnabled, notifyOnHighMatch, highMatchThreshold, autoArchiveBelowThreshold, notificationEmail, businessUnitFilter, notificationEmailPresent, businessUnitFilterPresent]);

      const row = result.rows[0];
      res.json({
        minMatchThreshold: row.min_match_threshold,
        emailNotificationsEnabled: row.email_notifications_enabled,
        notificationEmail: row.notification_email,
        notifyOnHighMatch: row.notify_on_high_match,
        highMatchThreshold: row.high_match_threshold,
        autoArchiveBelowThreshold: row.auto_archive_below_threshold,
        businessUnitFilter: row.business_unit_filter,
      });
    } catch (error) {
      console.error("Error updating IDIQ settings:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  // Get global IDIQ settings (admin only for editing, all users can read)
  app.get("/api/idiq/global-settings", isAuthenticated, async (req, res) => {
    try {
      // Get global settings (user_id IS NULL)
      const result = await dbPool.query(`
        SELECT * FROM idiq_settings WHERE user_id IS NULL LIMIT 1
      `);

      if (result.rows.length === 0) {
        // Return defaults
        res.json({
          minMatchThreshold: 70,
          autoArchiveBelowThreshold: false,
        });
      } else {
        const row = result.rows[0];
        res.json({
          minMatchThreshold: row.min_match_threshold,
          autoArchiveBelowThreshold: row.auto_archive_below_threshold,
        });
      }
    } catch (error) {
      console.error("Error fetching global IDIQ settings:", error);
      res.status(500).json({ error: "Failed to fetch global settings" });
    }
  });

  // Update global IDIQ settings (admin only)
  app.patch("/api/idiq/global-settings", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      
      // Check if user is admin
      const userResult = await dbPool.query('SELECT role FROM users WHERE id = $1', [userId]);
      if (userResult.rows.length === 0 || userResult.rows[0].role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { minMatchThreshold, autoArchiveBelowThreshold } = req.body;

      // Upsert global settings (user_id = NULL)
      const result = await dbPool.query(`
        INSERT INTO idiq_settings (user_id, min_match_threshold, auto_archive_below_threshold)
        VALUES (NULL, COALESCE($1, 70), COALESCE($2, false))
        ON CONFLICT (user_id) WHERE user_id IS NULL DO UPDATE SET
          min_match_threshold = COALESCE($1, idiq_settings.min_match_threshold),
          auto_archive_below_threshold = COALESCE($2, idiq_settings.auto_archive_below_threshold),
          updated_at = NOW()
        RETURNING *
      `, [minMatchThreshold, autoArchiveBelowThreshold]);

      const row = result.rows[0];
      res.json({
        minMatchThreshold: row.min_match_threshold,
        autoArchiveBelowThreshold: row.auto_archive_below_threshold,
      });
    } catch (error) {
      console.error("Error updating global IDIQ settings:", error);
      res.status(500).json({ error: "Failed to update global settings" });
    }
  });

  // Get email ingestion history
  app.get("/api/idiq/email-ingests", isAuthenticated, async (req, res) => {
    try {
      const result = await dbPool.query(`
        SELECT id, from_address, subject, received_at, status, detected_portal,
               opportunities_found, opportunities_above_threshold, error_message, processed_at
        FROM idiq_email_ingests
        ORDER BY received_at DESC
        LIMIT 50
      `);

      res.json(result.rows.map(row => ({
        id: row.id,
        fromAddress: row.from_address,
        subject: row.subject,
        receivedAt: row.received_at,
        status: row.status,
        detectedPortal: row.detected_portal,
        opportunitiesFound: row.opportunities_found,
        opportunitiesAboveThreshold: row.opportunities_above_threshold,
        errorMessage: row.error_message,
        processedAt: row.processed_at,
      })));
    } catch (error) {
      console.error("Error fetching email ingests:", error);
      res.status(500).json({ error: "Failed to fetch email history" });
    }
  });

  // Email webhook endpoint for receiving forwarded emails from AgentMail
  app.post("/api/idiq/email-ingest", async (req, res) => {
    try {
      // Verify AgentMail API key from Authorization header
      const authHeader = req.headers.authorization;
      const expectedKey = process.env.AGENTMAIL_API_KEY;
      
      if (expectedKey && authHeader !== `Bearer ${expectedKey}`) {
        console.log("[Email Ingest] Unauthorized request - invalid API key");
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { from, to, subject, text, html, messageId } = req.body;

      console.log(`[Email Ingest] Received email from: ${from}, subject: ${subject}`);

      // Store the raw email for tracking
      const ingestResult = await dbPool.query(`
        INSERT INTO idiq_email_ingests (from_address, to_address, subject, raw_text, raw_html, status)
        VALUES ($1, $2, $3, $4, $5, 'processing')
        RETURNING id
      `, [from, to, subject, text, html]);

      const ingestId = ingestResult.rows[0].id;

      // Detect the source portal from email content
      const emailContent = text || html || '';
      let detectedPortal = 'unknown';
      
      if (emailContent.toLowerCase().includes('sam.gov') || from?.includes('sam.gov')) {
        detectedPortal = 'sam.gov';
      } else if (emailContent.toLowerCase().includes('dibbs') || emailContent.toLowerCase().includes('dla internet bid board')) {
        detectedPortal = 'dibbs';
      } else if (emailContent.toLowerCase().includes('piee') || emailContent.toLowerCase().includes('procurement integrated enterprise')) {
        detectedPortal = 'piee';
      } else if (emailContent.toLowerCase().includes('govwin') || from?.includes('govwin')) {
        detectedPortal = 'govwin';
      }

      // Parse opportunities from the email
      const opportunities = parseEmailForOpportunities(emailContent, subject || '', detectedPortal);

      // Get settings for threshold
      const settingsResult = await dbPool.query(`SELECT min_match_threshold FROM idiq_settings WHERE user_id IS NULL LIMIT 1`);
      const minThreshold = settingsResult.rows[0]?.min_match_threshold || 70;

      let opportunitiesAboveThreshold = 0;
      const createdOpportunityIds: string[] = [];

      // Score and store each opportunity
      for (const opp of opportunities) {
        try {
          // AI scoring - the function fetches capability docs and feedback internally
          const scoringResult = await scoreOpportunityWithAI(opp);

          // Check if above threshold
          if (scoringResult.matchScore >= minThreshold) {
            opportunitiesAboveThreshold++;

            // Insert the opportunity
            const oppResult = await dbPool.query(`
              INSERT INTO idiq_opportunities (
                source_type, title, description, agency, solicitation_number,
                due_date, estimated_value, place_of_performance, naics_code,
                raw_content, match_score, relevancy_summary, why_relevant,
                past_performance_match, capability_match, requirements,
                discriminators_strengths, discriminators_weaknesses, tags, ai_category,
                scored_at, status
              ) VALUES (
                'email', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), 'new'
              )
              RETURNING id
            `, [
              opp.title || subject || 'Untitled Opportunity',
              opp.description || emailContent.substring(0, 500),
              opp.agency,
              opp.solicitationNumber,
              opp.dueDate,
              opp.estimatedValue,
              opp.placeOfPerformance,
              opp.naicsCode,
              emailContent,
              scoringResult.matchScore,
              scoringResult.relevancySummary,
              scoringResult.whyRelevant,
              scoringResult.pastPerformanceMatch,
              scoringResult.capabilityMatch,
              scoringResult.requirements,
              scoringResult.discriminatorsStrengths,
              scoringResult.discriminatorsWeaknesses,
              scoringResult.tags,
              scoringResult.aiCategory,
            ]);

            createdOpportunityIds.push(oppResult.rows[0].id);
          }
        } catch (scoreError) {
          console.error(`[Email Ingest] Error scoring opportunity:`, scoreError);
        }
      }

      // Update the ingest record
      await dbPool.query(`
        UPDATE idiq_email_ingests SET
          status = 'completed',
          detected_portal = $1,
          opportunities_found = $2,
          opportunities_above_threshold = $3,
          created_opportunity_ids = $4,
          processed_at = NOW()
        WHERE id = $5
      `, [detectedPortal, opportunities.length, opportunitiesAboveThreshold, createdOpportunityIds, ingestId]);

      console.log(`[Email Ingest] Processed ${opportunities.length} opportunities, ${opportunitiesAboveThreshold} above threshold`);

      res.json({
        success: true,
        ingestId,
        opportunitiesFound: opportunities.length,
        opportunitiesAboveThreshold,
        detectedPortal,
      });
    } catch (error) {
      console.error("[Email Ingest] Error processing email:", error);
      res.status(500).json({ error: "Failed to process email" });
    }
  });

  // Helper function to parse opportunities from email content
  function parseEmailForOpportunities(content: string, subject: string, portal: string): Array<{
    title?: string;
    description?: string;
    agency?: string;
    solicitationNumber?: string;
    dueDate?: Date;
    estimatedValue?: string;
    placeOfPerformance?: string;
    naicsCode?: string;
  }> {
    const opportunities: Array<any> = [];

    // Extract common patterns from government email notifications
    // SAM.gov pattern
    const samPatterns = {
      solicitationNumber: /(?:Solicitation|Award)\s*(?:Number|#)?:?\s*([A-Z0-9\-]+)/gi,
      agency: /(?:Agency|Organization):?\s*([^\n\r]+)/gi,
      title: /(?:Title|Subject|Synopsis):?\s*([^\n\r]+)/gi,
      naics: /NAICS(?:\s*Code)?:?\s*(\d{6})/gi,
      dueDate: /(?:Response|Due|Close)\s*(?:Date|Deadline)?:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\w+\s+\d{1,2},?\s+\d{4})/gi,
      value: /(?:Estimated\s*Value|Award\s*Amount|Contract\s*Value):?\s*\$?([\d,]+(?:\.\d{2})?)/gi,
    };

    // Try to extract a single opportunity from the email
    const extractedOpp: any = {};

    // Extract solicitation number
    const solMatch = content.match(samPatterns.solicitationNumber);
    if (solMatch) extractedOpp.solicitationNumber = solMatch[0].replace(/.*:?\s*/, '').trim();

    // Extract agency
    const agencyMatch = content.match(samPatterns.agency);
    if (agencyMatch) extractedOpp.agency = agencyMatch[0].replace(/.*:?\s*/, '').trim();

    // Extract title - use subject if not found in body
    const titleMatch = content.match(samPatterns.title);
    extractedOpp.title = titleMatch ? titleMatch[0].replace(/.*:?\s*/, '').trim() : subject;

    // Extract NAICS
    const naicsMatch = content.match(samPatterns.naics);
    if (naicsMatch) extractedOpp.naicsCode = naicsMatch[0].match(/\d{6}/)?.[0];

    // Extract due date
    const dueDateMatch = content.match(samPatterns.dueDate);
    if (dueDateMatch) {
      try {
        const dateStr = dueDateMatch[0].replace(/.*:?\s*/, '').trim();
        extractedOpp.dueDate = new Date(dateStr);
      } catch (e) {
        // Date parsing failed, skip
      }
    }

    // Extract estimated value
    const valueMatch = content.match(samPatterns.value);
    if (valueMatch) {
      const valueStr = valueMatch[0].match(/[\d,]+(?:\.\d{2})?/)?.[0];
      if (valueStr) extractedOpp.estimatedValue = `$${valueStr}`;
    }

    // Extract description - first few sentences
    extractedOpp.description = content
      .replace(/\s+/g, ' ')
      .substring(0, 500)
      .trim();

    opportunities.push(extractedOpp);

    return opportunities;
  }

  const httpServer = createServer(app);

  return httpServer;
}
