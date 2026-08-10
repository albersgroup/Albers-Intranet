import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, pgEnum, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Division enum for organizing content across the company
export const divisionEnum = pgEnum("division", [
  "corporate",
  "defense", 
  "industrials",
  "advanced_programs",
  "bou"
]);

// User role enum for permissions
// admin = System Admin (full access)
// corporate_admin, defense_admin, industrials_admin, advanced_admin = Division-specific admins
// bou_admin = BOU Admin (manages Business Operations Unit content)
// viewer = Read-only access
export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "corporate_admin", 
  "defense_admin",
  "industrials_admin",
  "advanced_admin",
  "bou_admin",
  "bd_admin",
  "viewer"
]);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  verificationCode: text("verification_code"),
  verificationCodeExpiresAt: timestamp("verification_code_expires_at"),
  emailVerified: boolean("email_verified").notNull().default(false),
  resetPasswordToken: text("reset_password_token"),
  resetPasswordTokenExpiresAt: timestamp("reset_password_token_expires_at"),
  role: userRoleEnum("role").notNull().default("viewer"),
  // For vertical_admin role: which divisions they can manage (comma-separated)
  managedDivisions: text("managed_divisions"),
  // User's assigned business vertical (for future email notifications)
  businessVertical: divisionEnum("business_vertical"),
  // Account creation timestamp
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  // Login count for tracking engagement
  loginCount: integer("login_count").notNull().default(0),
  // Last login timestamp
  lastLoginAt: timestamp("last_login_at"),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string()
    .email("Invalid email address")
    .toLowerCase()
    .refine(
      (email) => email.endsWith("@albers.aero") || email.endsWith("@albersaerospace.com"),
      "Email must be from @albers.aero or @albersaerospace.com domain"
    ),
  password: z.string().min(8, "Password must be at least 8 characters"),
  businessVertical: z.enum(["corporate", "defense", "industrials", "advanced_programs", "bou"], {
    required_error: "Please select your business vertical"
  }),
});

export const verifyEmailSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase(),
  code: z.string().length(6, "Verification code must be 6 digits"),
});

export const forgotPasswordSchema = z.object({
  email: z.string()
    .email("Invalid email address")
    .toLowerCase()
    .refine(
      (email) => email.endsWith("@albers.aero") || email.endsWith("@albersaerospace.com"),
      "Email must be from @albers.aero or @albersaerospace.com domain"
    ),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// News Articles table for Latest News/Bulletin sections
export const newsArticles = pgTable("news_articles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  division: divisionEnum("division").notNull().default("corporate"),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  content: text("content").notNull(),
  attachmentUrl: text("attachment_url"),
  attachmentName: text("attachment_name"),
  attachmentType: text("attachment_type"),
  publishedAt: timestamp("published_at").notNull().defaultNow(),
  isArchived: boolean("is_archived").notNull().default(false),
  isPinned: boolean("is_pinned").notNull().default(false),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertNewsArticleSchema = createInsertSchema(newsArticles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertNewsArticle = z.infer<typeof insertNewsArticleSchema>;
export type NewsArticle = typeof newsArticles.$inferSelect;

// Newsletters table for VP newsletter uploads
export const newsletters = pgTable("newsletters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  division: divisionEnum("division").notNull().default("corporate"),
  title: text("title").notNull(),
  description: text("description"),
  fileUrl: text("file_url").notNull(),
  fileName: text("file_name").notNull(),
  publishedAt: timestamp("published_at").notNull().defaultNow(),
  isCurrent: boolean("is_current").notNull().default(true),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertNewsletterSchema = createInsertSchema(newsletters).omit({
  id: true,
  createdAt: true,
});

export type InsertNewsletter = z.infer<typeof insertNewsletterSchema>;
export type Newsletter = typeof newsletters.$inferSelect;

// Newsletter views tracking table
export const newsletterViews = pgTable("newsletter_views", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  newsletterId: varchar("newsletter_id").notNull().references(() => newsletters.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  userDivision: divisionEnum("user_division"),
  viewedAt: timestamp("viewed_at").notNull().defaultNow(),
});

export const insertNewsletterViewSchema = createInsertSchema(newsletterViews).omit({
  id: true,
  viewedAt: true,
});

export type InsertNewsletterView = z.infer<typeof insertNewsletterViewSchema>;
export type NewsletterView = typeof newsletterViews.$inferSelect;

// Custom content blocks for homepage customization (e.g., Strategic Plan section)
export const customContentBlocks = pgTable("custom_content_blocks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  division: divisionEnum("division").notNull(),
  blockType: text("block_type").notNull().default("strategic_plan"), // Type of content block
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  content: text("content").notNull(), // Rich text HTML content
  imageUrl: text("image_url"), // Optional image URL
  imageName: text("image_name"), // Original filename
  badges: text("badges"), // Comma-separated badge labels
  isActive: boolean("is_active").notNull().default(true),
  updatedBy: varchar("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCustomContentBlockSchema = createInsertSchema(customContentBlocks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCustomContentBlock = z.infer<typeof insertCustomContentBlockSchema>;
export type CustomContentBlock = typeof customContentBlocks.$inferSelect;

// Team Spotlights for homepage customization
export const teamSpotlights = pgTable("team_spotlights", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  division: divisionEnum("division").notNull(),
  displayOrder: text("display_order").notNull().default("1"), // 1, 2, or 3
  spotlightType: text("spotlight_type").notNull(), // New Hire, Promotion, Achievement
  name: text("name").notNull(),
  role: text("role").notNull(), // Job title or achievement name
  department: text("department"), // BOU, Corporate, etc.
  context: text("context").notNull(), // Description text
  imageUrl: text("image_url"), // Circular profile image URL
  imageName: text("image_name"), // Original filename
  updatedBy: varchar("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTeamSpotlightSchema = createInsertSchema(teamSpotlights).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTeamSpotlight = z.infer<typeof insertTeamSpotlightSchema>;
export type TeamSpotlight = typeof teamSpotlights.$inferSelect;

// Division type for frontend use
export const divisionValues = ["corporate", "defense", "industrials", "advanced_programs", "bou"] as const;
export type Division = typeof divisionValues[number];

// Division display names
export const divisionDisplayNames: Record<Division, string> = {
  corporate: "Albers Corporate",
  defense: "Albers Defense",
  industrials: "Albers Industrials",
  advanced_programs: "Albers Advanced Programs",
  bou: "Business Operations Unit"
};

// New Opportunity Form Schema
export const newOpportunityFormSchema = z.object({
  oppName: z.string().min(1, "Opportunity name is required"),
  captureManager: z.string().min(1, "Capture manager is required"),
  solicitationNumber: z.string().optional(),
  opportunityType: z.enum(["New Business", "Re-compete"], {
    required_error: "Opportunity type is required"
  }),
  govWinId: z.string().optional(),
  businessVertical: z.enum(["Defense", "Industrials", "Advanced Programs"], {
    required_error: "Business vertical is required"
  }),
  businessUnit: z.enum([
    "Accident/Amarillo",
    "Technologies",
    "Aviation Services",
    "Balitmore",
    "Connectivity Solutions",
    "Engineering Solutions",
    "Fort Worth",
    "Grand Prairie",
    "Hayden",
    "Lasers",
    "Munitions",
    "Tactical Aircraft Solutions",
    "Tucson"
  ], {
    required_error: "Business unit is required"
  }),
  primeSub: z.enum(["Prime", "Subcontractor"], {
    required_error: "Prime/Sub is required"
  }),
  primeContractorName: z.string().optional(),
  opportunitySummary: z.string().min(1, "Opportunity summary is required"),
  discoverDate: z.string().min(1, "Discover date is required"),
  customerName: z.string().min(1, "Customer name is required"),
  pursuitPhase: z.enum(["Discover", "Target", "Capture", "Proposal", "Awaiting Award", "Execution"], {
    required_error: "Pursuit phase is required"
  }),
  approxValue: z.string().optional(),
  naicsCodes: z.string().min(1, "NAICS code(s) are required"),
  pricingStructure: z.enum(["FFP", "CPFF", "T&M", "IDIQ", "UNK"], {
    required_error: "Pricing structure is required"
  }),
  finalRfpIssueDate: z.string().optional(),
  finalRfpIsEstimated: z.boolean().optional(),
  programDuration: z.string().optional(),
  marketplaceSector: z.enum([
    "Aerospace",
    "Air Force",
    "Army",
    "Comm DoD",
    "Comm Int'l",
    "Federal",
    "FMS",
    "Local",
    "Medical",
    "NAVAIR",
    "NAVY",
    "Space",
    "UAS Manned/Unmanned"
  ]).optional(),
  solicitationLink: z.string().optional(),
  complianceClause: z.enum(["FAR 245.204-7012 (USG)", "FAR 252.204-7020 (CUI)", "UNK"]).optional(),
}).refine((data) => {
  // If primeSub is "Subcontractor", primeContractorName must be provided
  if (data.primeSub === "Subcontractor" && (!data.primeContractorName || data.primeContractorName.trim() === "")) {
    return false;
  }
  return true;
}, {
  message: "Prime contractor name is required when opportunity is as Subcontractor",
  path: ["primeContractorName"], // This will show the error on the primeContractorName field
});

export type NewOpportunityFormData = z.infer<typeof newOpportunityFormSchema>;

// Site content for editable sections (like Monthly Activity Report)
export const siteContent = pgTable("site_content", {
  id: varchar("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  lastUpdatedBy: varchar("last_updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSiteContentSchema = createInsertSchema(siteContent);
export type InsertSiteContent = z.infer<typeof insertSiteContentSchema>;
export type SiteContent = typeof siteContent.$inferSelect;

// LinkedIn posts for manual sync display on homepage
export const linkedinPosts = pgTable("linkedin_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  content: text("content").notNull(),
  postUrl: text("post_url"),
  imageUrl: text("image_url"),
  postedAt: timestamp("posted_at"),
  syncedBy: varchar("synced_by").references(() => users.id),
  syncedAt: timestamp("synced_at").notNull().defaultNow(),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertLinkedinPostSchema = createInsertSchema(linkedinPosts).omit({
  id: true,
  syncedAt: true,
});

export type InsertLinkedinPost = z.infer<typeof insertLinkedinPostSchema>;
export type LinkedinPost = typeof linkedinPosts.$inferSelect;

// ===== BOU BULLETIN BOARD SYSTEM =====

// BOU Members - tracks users who can interact with the BOU bulletin board
export const bouMembers = pgTable("bou_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  memberTag: text("member_tag").notNull(), // e.g., "greg.james" for @mentions
  displayName: text("display_name").notNull(), // e.g., "Greg James"
  isLead: boolean("is_lead").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBouMemberSchema = createInsertSchema(bouMembers).omit({
  id: true,
  createdAt: true,
});
export type InsertBouMember = z.infer<typeof insertBouMemberSchema>;
export type BouMember = typeof bouMembers.$inferSelect;

// BOU Posts - main posts in the bulletin board
export const bouPosts = pgTable("bou_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  authorId: varchar("author_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  postType: text("post_type").notNull().default('text'), // 'text', 'image', 'video', 'document', 'link'
  // Media fields (for image, video, document posts)
  mediaUrl: text("media_url"),
  mediaName: text("media_name"),
  mediaMimeType: text("media_mime_type"),
  // Link preview fields (for link posts)
  linkUrl: text("link_url"),
  linkTitle: text("link_title"),
  linkDescription: text("link_description"),
  linkImage: text("link_image"),
  // Legacy fields
  attachmentUrl: text("attachment_url"),
  attachmentName: text("attachment_name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBouPostSchema = createInsertSchema(bouPosts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBouPost = z.infer<typeof insertBouPostSchema>;
export type BouPost = typeof bouPosts.$inferSelect;

// BOU Comments - comments on posts
export const bouComments = pgTable("bou_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").references(() => bouPosts.id, { onDelete: 'cascade' }).notNull(),
  authorId: varchar("author_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBouCommentSchema = createInsertSchema(bouComments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBouComment = z.infer<typeof insertBouCommentSchema>;
export type BouComment = typeof bouComments.$inferSelect;

// BOU Post Likes
export const bouPostLikes = pgTable("bou_post_likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").references(() => bouPosts.id, { onDelete: 'cascade' }).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type BouPostLike = typeof bouPostLikes.$inferSelect;

// BOU Comment Likes  
export const bouCommentLikes = pgTable("bou_comment_likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  commentId: varchar("comment_id").references(() => bouComments.id, { onDelete: 'cascade' }).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type BouCommentLike = typeof bouCommentLikes.$inferSelect;

// BOU Post Shares
export const bouPostShares = pgTable("bou_post_shares", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").references(() => bouPosts.id, { onDelete: 'cascade' }).notNull(),
  sharerId: varchar("sharer_id").references(() => users.id).notNull(),
  shareNote: text("share_note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type BouPostShare = typeof bouPostShares.$inferSelect;

// BOU Post Mentions - tracks @mentions in posts for notifications
export const bouPostMentions = pgTable("bou_post_mentions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").references(() => bouPosts.id, { onDelete: 'cascade' }).notNull(),
  mentionedUserId: varchar("mentioned_user_id").references(() => users.id).notNull(),
  notificationSent: boolean("notification_sent").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type BouPostMention = typeof bouPostMentions.$inferSelect;

// BOU Comment Mentions - tracks @mentions in comments for notifications
export const bouCommentMentions = pgTable("bou_comment_mentions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  commentId: varchar("comment_id").references(() => bouComments.id, { onDelete: 'cascade' }).notNull(),
  mentionedUserId: varchar("mentioned_user_id").references(() => users.id).notNull(),
  notificationSent: boolean("notification_sent").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type BouCommentMention = typeof bouCommentMentions.$inferSelect;

// Schema for creating a new BOU post with validation
export const createBouPostSchema = z.object({
  content: z.string().min(1, "Post content is required").max(5000, "Post content too long"),
  attachmentUrl: z.string().optional(),
  attachmentName: z.string().optional(),
});

export type CreateBouPostInput = z.infer<typeof createBouPostSchema>;

// Schema for creating a new BOU comment with validation  
export const createBouCommentSchema = z.object({
  postId: z.string().min(1, "Post ID is required"),
  content: z.string().min(1, "Comment content is required").max(2000, "Comment too long"),
});

export type CreateBouCommentInput = z.infer<typeof createBouCommentSchema>;

// Source type for trip reports
export const tripReportSourceEnum = pgEnum("trip_report_source", ["form", "document"]);

// Trip Reports - Post-Event Forms for Business Development
export const tripReports = pgTable("trip_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // Source tracking for document-based reports
  sourceType: tripReportSourceEnum("source_type").notNull().default("form"),
  originalFileUrl: text("original_file_url"), // URL to uploaded document
  originalFileName: text("original_file_name"), // Original document name
  cleanedHtml: text("cleaned_html"), // Sanitized HTML for display
  extractedPlaintext: text("extracted_plaintext"), // Plain text for AI search
  // Metadata fields (now optional for document-based reports)
  eventName: text("event_name"),
  dateStart: timestamp("date_start"),
  dateEnd: timestamp("date_end"),
  location: text("location"),
  albersPoc: text("albers_poc"),
  otherAttendees: text("other_attendees"),
  justification: text("justification"),
  isAttendee: boolean("is_attendee").notNull().default(false),
  isSponsor: boolean("is_sponsor").notNull().default(false),
  isPanelist: boolean("is_panelist").notNull().default(false),
  importanceSummary: text("importance_summary"),
  meetingsSummary: text("meetings_summary"),
  sponsorshipSummary: text("sponsorship_summary"),
  marketingNeeds: text("marketing_needs"),
  recommendations: text("recommendations"),
  shouldReturn: boolean("should_return").notNull().default(true),
  returnType: text("return_type"),
  aiSummary: text("ai_summary"), // AI-generated 3-4 sentence overview
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTripReportSchema = createInsertSchema(tripReports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertTripReport = z.infer<typeof insertTripReportSchema>;
export type TripReport = typeof tripReports.$inferSelect;

// Trip Report Photos
export const tripReportPhotos = pgTable("trip_report_photos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tripReportId: varchar("trip_report_id").references(() => tripReports.id, { onDelete: 'cascade' }).notNull(),
  fileUrl: text("file_url").notNull(),
  fileName: text("file_name").notNull(),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
});

export type TripReportPhoto = typeof tripReportPhotos.$inferSelect;

// Schema for creating a form-based trip report with validation
export const createTripReportSchema = z.object({
  sourceType: z.enum(["form", "document"]).default("form"),
  eventName: z.string().optional(),
  dateStart: z.string().optional(),
  dateEnd: z.string().optional(),
  location: z.string().optional(),
  albersPoc: z.string().optional(),
  otherAttendees: z.string().optional(),
  justification: z.string().optional(),
  isAttendee: z.boolean().default(false),
  isSponsor: z.boolean().default(false),
  isPanelist: z.boolean().default(false),
  importanceSummary: z.string().optional(),
  meetingsSummary: z.string().optional(),
  sponsorshipSummary: z.string().optional(),
  marketingNeeds: z.string().optional(),
  recommendations: z.string().optional(),
  shouldReturn: z.boolean().default(true),
  returnType: z.string().optional(),
  photoUrls: z.array(z.string()).optional(),
  // Document-based fields
  originalFileUrl: z.string().optional(),
  originalFileName: z.string().optional(),
  cleanedHtml: z.string().optional(),
  extractedPlaintext: z.string().optional(),
});

export type CreateTripReportInput = z.infer<typeof createTripReportSchema>;

// =====================================================
// INDUSTRY EVENTS - Shows, Conferences, Trade Events
// =====================================================

export const industryEvents = pgTable("industry_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  showName: text("show_name").notNull(),
  vertical: text("vertical"), // Defense, Industrials, Advanced Programs, Munitions, etc.
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  location: text("location"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertIndustryEventSchema = createInsertSchema(industryEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertIndustryEvent = z.infer<typeof insertIndustryEventSchema>;
export type IndustryEvent = typeof industryEvents.$inferSelect;
