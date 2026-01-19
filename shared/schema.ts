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
// BOU ADMIN CONFIGURABLE CONTENT
// =====================================================

// Link type enum for BOU quick links
export const bouLinkTypeEnum = pgEnum("bou_link_type", ["internal", "external"]);

// BOU Quick Links - Configurable tool cards and external links on BOU Home
export const bouQuickLinks = pgTable("bou_quick_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  linkType: bouLinkTypeEnum("link_type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull().default("Link"), // Lucide icon name
  url: text("url").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isVisible: boolean("is_visible").notNull().default(true),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBouQuickLinkSchema = createInsertSchema(bouQuickLinks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBouQuickLink = z.infer<typeof insertBouQuickLinkSchema>;
export type BouQuickLink = typeof bouQuickLinks.$inferSelect;

// BOU Hero Assets - Configurable hero images for BOU Home
export const bouHeroAssets = pgTable("bou_hero_assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fileUrl: text("file_url").notNull(),
  fileName: text("file_name").notNull(),
  altText: text("alt_text"),
  isActive: boolean("is_active").notNull().default(false),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBouHeroAssetSchema = createInsertSchema(bouHeroAssets).omit({
  id: true,
  createdAt: true,
});
export type InsertBouHeroAsset = z.infer<typeof insertBouHeroAssetSchema>;
export type BouHeroAsset = typeof bouHeroAssets.$inferSelect;

// BOU Training Slides - Configurable proposal training materials (images, PDFs, videos)
export const bouTrainingSlides = pgTable("bou_training_slides", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  caption: text("caption"),
  fileUrl: text("file_url").notNull(),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull().default("image"), // "image", "pdf", "video"
  sortOrder: integer("sort_order").notNull().default(0),
  isPublished: boolean("is_published").notNull().default(true),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBouTrainingSlideSchema = createInsertSchema(bouTrainingSlides).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBouTrainingSlide = z.infer<typeof insertBouTrainingSlideSchema>;
export type BouTrainingSlide = typeof bouTrainingSlides.$inferSelect;

// BOU Training Module Views - Analytics tracking for module views
export const bouTrainingViews = pgTable("bou_training_views", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slideId: varchar("slide_id").notNull().references(() => bouTrainingSlides.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  viewedAt: timestamp("viewed_at").notNull().defaultNow(),
});

export const insertBouTrainingViewSchema = createInsertSchema(bouTrainingViews).omit({
  id: true,
  viewedAt: true,
});
export type InsertBouTrainingView = z.infer<typeof insertBouTrainingViewSchema>;
export type BouTrainingView = typeof bouTrainingViews.$inferSelect;

// Assignment status enum
export const assignmentStatusEnum = pgEnum("assignment_status", ["assigned", "viewed", "acknowledged"]);

// BOU Training Assignments - Assign modules to users with tracking
export const bouTrainingAssignments = pgTable("bou_training_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slideId: varchar("slide_id").notNull().references(() => bouTrainingSlides.id, { onDelete: "cascade" }),
  assignedToUserId: varchar("assigned_to_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  assignedByUserId: varchar("assigned_by_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  assignedAt: timestamp("assigned_at").notNull().defaultNow(),
  dueAt: timestamp("due_at"),
  notificationSentAt: timestamp("notification_sent_at"),
  firstViewedAt: timestamp("first_viewed_at"),
  status: assignmentStatusEnum("status").notNull().default("assigned"),
});

export const insertBouTrainingAssignmentSchema = createInsertSchema(bouTrainingAssignments).omit({
  id: true,
  assignedAt: true,
});
export type InsertBouTrainingAssignment = z.infer<typeof insertBouTrainingAssignmentSchema>;
export type BouTrainingAssignment = typeof bouTrainingAssignments.$inferSelect;

// Schema for creating assignments in bulk
export const createTrainingAssignmentSchema = z.object({
  slideIds: z.array(z.string()).min(1, "At least one module must be selected"),
  userIds: z.array(z.string()).min(1, "At least one user must be selected"),
  dueAt: z.string().optional(),
  sendNotification: z.boolean().default(true),
});
export type CreateTrainingAssignmentInput = z.infer<typeof createTrainingAssignmentSchema>;

// BOU Bot Settings - Configurable Albers Bot greeting and settings
export const bouBotSettings = pgTable("bou_bot_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  settingKey: text("setting_key").notNull().unique(),
  settingValue: text("setting_value").notNull(),
  updatedBy: varchar("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBouBotSettingSchema = createInsertSchema(bouBotSettings).omit({
  id: true,
  updatedAt: true,
});
export type InsertBouBotSetting = z.infer<typeof insertBouBotSettingSchema>;
export type BouBotSetting = typeof bouBotSettings.$inferSelect;

// BOU Home Layout Sections - Admin-configurable page layout
export const bouHomeSections = pgTable("bou_home_sections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sectionKey: text("section_key").notNull().unique(), // hero, dashboard_cta, news, bulletin, bou_tools, external_systems
  displayName: text("display_name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  columnSpan: integer("column_span").notNull().default(1), // 1 = half width, 2 = full width
  isVisible: boolean("is_visible").notNull().default(true),
  updatedBy: varchar("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBouHomeSectionSchema = createInsertSchema(bouHomeSections).omit({
  id: true,
  updatedAt: true,
});
export type InsertBouHomeSection = z.infer<typeof insertBouHomeSectionSchema>;
export type BouHomeSection = typeof bouHomeSections.$inferSelect;

// Schema for updating layout in bulk
export const updateBouLayoutSchema = z.object({
  sections: z.array(z.object({
    id: z.string(),
    sectionKey: z.string(),
    sortOrder: z.number(),
    columnSpan: z.number().min(1).max(2),
    isVisible: z.boolean(),
  })),
});
export type UpdateBouLayoutInput = z.infer<typeof updateBouLayoutSchema>;

// BOU Dashboard Page Views - Analytics tracking for dashboard visits
export const bouDashboardViews = pgTable("bou_dashboard_views", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  viewedAt: timestamp("viewed_at").notNull().defaultNow(),
});

export const insertBouDashboardViewSchema = createInsertSchema(bouDashboardViews).omit({
  id: true,
  viewedAt: true,
});
export type InsertBouDashboardView = z.infer<typeof insertBouDashboardViewSchema>;
export type BouDashboardView = typeof bouDashboardViews.$inferSelect;

// Knowledge Base Category enum
export const knowledgeCategoryEnum = pgEnum("knowledge_category", [
  "company_info",
  "business_development",
  "processes",
  "policies",
  "training",
  "faq",
  "terminology",
  "contacts",
  "general"
]);

// Knowledge Base Articles - Admin-managed knowledge for Albers Bot
export const knowledgeArticles = pgTable("knowledge_articles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: knowledgeCategoryEnum("category").notNull().default("general"),
  tags: text("tags"), // Comma-separated tags for searchability
  sourceType: varchar("source_type", { length: 50 }).default("custom"), // custom, sop, newsletter, training
  sourceId: varchar("source_id", { length: 255 }), // Original source identifier
  isActive: boolean("is_active").notNull().default(true),
  priority: integer("priority").notNull().default(0), // Higher priority = more important
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertKnowledgeArticleSchema = createInsertSchema(knowledgeArticles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertKnowledgeArticle = z.infer<typeof insertKnowledgeArticleSchema>;
export type KnowledgeArticle = typeof knowledgeArticles.$inferSelect;

// Knowledge Base Update Log - Tracks when knowledge base is regenerated
export const knowledgeUpdateLogs = pgTable("knowledge_update_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  updateType: text("update_type").notNull(), // "scheduled", "manual", "content_change"
  sourcesIncluded: text("sources_included").notNull(), // JSON array of sources processed
  articlesCount: integer("articles_count").notNull().default(0),
  sopsCount: integer("sops_count").notNull().default(0),
  newsCount: integer("news_count").notNull().default(0),
  bulletinsCount: integer("bulletins_count").notNull().default(0),
  newslettersCount: integer("newsletters_count").notNull().default(0),
  status: text("status").notNull().default("success"), // "success", "partial", "failed"
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertKnowledgeUpdateLogSchema = createInsertSchema(knowledgeUpdateLogs).omit({
  id: true,
  createdAt: true,
});
export type InsertKnowledgeUpdateLog = z.infer<typeof insertKnowledgeUpdateLogSchema>;
export type KnowledgeUpdateLog = typeof knowledgeUpdateLogs.$inferSelect;

// Bot Question Tracking - Logs questions asked to identify knowledge gaps
export const botQuestionLogs = pgTable("bot_question_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  question: text("question").notNull(),
  pageContext: text("page_context"), // Which page the user was on
  userId: varchar("user_id").references(() => users.id),
  wasHelpful: boolean("was_helpful"), // Future: user feedback
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBotQuestionLogSchema = createInsertSchema(botQuestionLogs).omit({
  id: true,
  createdAt: true,
});
export type InsertBotQuestionLog = z.infer<typeof insertBotQuestionLogSchema>;
export type BotQuestionLog = typeof botQuestionLogs.$inferSelect;

// =====================================================
// IDIQ OPPORTUNITY INTELLIGENCE PORTAL
// =====================================================

// Source type enum for IDIQ opportunities
export const idiqSourceTypeEnum = pgEnum("idiq_source_type", [
  "upload",      // Bulk Task Order list upload
  "email",       // Forwarded email from gov alerts
  "portal"       // Direct API/integration from gov portals
]);

// Status enum for IDIQ opportunities
export const idiqStatusEnum = pgEnum("idiq_status", [
  "new",         // Just imported, not yet reviewed
  "reviewed",    // User has viewed
  "saved",       // User flagged for action
  "archived"     // User dismissed or no longer relevant
]);

// IDIQ Capability Documents - Reference documents for AI scoring context
export const idiqCapabilityDocs = pgTable("idiq_capability_docs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  fileUrl: text("file_url").notNull(),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(), // pdf, docx, xlsx, etc.
  extractedText: text("extracted_text"), // Plain text for AI context
  isActive: boolean("is_active").notNull().default(true),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertIdiqCapabilityDocSchema = createInsertSchema(idiqCapabilityDocs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertIdiqCapabilityDoc = z.infer<typeof insertIdiqCapabilityDocSchema>;
export type IdiqCapabilityDoc = typeof idiqCapabilityDocs.$inferSelect;

// IDIQ Upload Batches - Tracks bulk uploads of Task Order lists
export const idiqUploadBatches = pgTable("idiq_upload_batches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  fileType: text("file_type").notNull(), // csv, xlsx, pdf, docx
  totalOpportunities: integer("total_opportunities").notNull().default(0),
  processedOpportunities: integer("processed_opportunities").notNull().default(0),
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  errorMessage: text("error_message"),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertIdiqUploadBatchSchema = createInsertSchema(idiqUploadBatches).omit({
  id: true,
  createdAt: true,
});
export type InsertIdiqUploadBatch = z.infer<typeof insertIdiqUploadBatchSchema>;
export type IdiqUploadBatch = typeof idiqUploadBatches.$inferSelect;

// IDIQ Opportunities - Main table for Task Order opportunities
export const idiqOpportunities = pgTable("idiq_opportunities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // Source tracking
  sourceType: idiqSourceTypeEnum("source_type").notNull(),
  uploadBatchId: varchar("upload_batch_id").references(() => idiqUploadBatches.id, { onDelete: 'set null' }),
  externalId: text("external_id"), // External reference ID if from gov portal
  // Opportunity details
  title: text("title").notNull(),
  description: text("description"),
  contractVehicle: text("contract_vehicle"), // IDIQ vehicle name
  opportunityType: text("opportunity_type"), // e.g., Solicitation, Sources Sought/RFI, Advance Notice/Draft
  agency: text("agency"), // Issuing agency
  postedDate: timestamp("posted_date"),
  dueDate: timestamp("due_date"),
  naicsCode: text("naics_code"),
  setAsideType: text("set_aside_type"),
  estimatedValue: text("estimated_value"),
  placeOfPerformance: text("place_of_performance"),
  solicitationNumber: text("solicitation_number"),
  originalUrl: text("original_url"), // Link to source
  rawContent: text("raw_content"), // Original text for re-processing
  // AI Scoring Results
  matchScore: integer("match_score"), // 0-100 percentage
  relevancySummary: text("relevancy_summary"), // One-line AI explanation
  whyRelevant: text("why_relevant"), // Detailed explanation
  pastPerformanceMatch: text("past_performance_match"), // Direct/Indirect/None
  capabilityMatch: text("capability_match").array(), // Array of matched capabilities
  // Enhanced AI fields
  requirements: text("requirements").array(), // Key requirements extracted
  discriminatorsStrengths: text("discriminators_strengths").array(), // What makes us competitive
  discriminatorsWeaknesses: text("discriminators_weaknesses").array(), // Gaps or challenges
  tags: text("tags").array(), // Keywords for filtering
  aiCategory: text("ai_category"), // Which capability area this matches
  scoredAt: timestamp("scored_at"),
  // Status tracking
  status: idiqStatusEnum("status").notNull().default("new"),
  savedBy: varchar("saved_by").references(() => users.id),
  savedAt: timestamp("saved_at"),
  viewedBy: text("viewed_by").array(), // Array of user IDs who viewed
  viewCount: integer("view_count").notNull().default(0),
  // Metadata
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertIdiqOpportunitySchema = createInsertSchema(idiqOpportunities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertIdiqOpportunity = z.infer<typeof insertIdiqOpportunitySchema>;
export type IdiqOpportunity = typeof idiqOpportunities.$inferSelect;

// Schema for uploading Task Order list
export const uploadIdiqListSchema = z.object({
  fileName: z.string().min(1, "File name is required"),
  fileUrl: z.string().min(1, "File URL is required"),
  fileType: z.string().min(1, "File type is required"),
});
export type UploadIdiqListInput = z.infer<typeof uploadIdiqListSchema>;

// Schema for updating opportunity status
export const updateIdiqStatusSchema = z.object({
  status: z.enum(["new", "reviewed", "saved", "archived"]),
});
export type UpdateIdiqStatusInput = z.infer<typeof updateIdiqStatusSchema>;

// Feedback type enum for user feedback
export const idiqFeedbackTypeEnum = pgEnum("idiq_feedback_type", ["upvote", "downvote"]);

// IDIQ Feedback Preferences - Aggregated feedback that feeds into AI scoring
export const idiqFeedbackPreferences = pgTable("idiq_feedback_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  preferenceType: idiqFeedbackTypeEnum("preference_type").notNull(), // positive or negative
  reason: text("reason").notNull(), // The actual feedback reason
  weight: integer("weight").notNull().default(1), // How many times this has been given
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertIdiqFeedbackPreferenceSchema = createInsertSchema(idiqFeedbackPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertIdiqFeedbackPreference = z.infer<typeof insertIdiqFeedbackPreferenceSchema>;
export type IdiqFeedbackPreference = typeof idiqFeedbackPreferences.$inferSelect;

// IDIQ User Feedback - Individual user upvote/downvote on opportunities
export const idiqUserFeedback = pgTable("idiq_user_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  opportunityId: varchar("opportunity_id").references(() => idiqOpportunities.id, { onDelete: 'cascade' }).notNull(),
  feedbackType: idiqFeedbackTypeEnum("feedback_type").notNull(),
  reason: text("reason"), // Optional reason for the feedback
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertIdiqUserFeedbackSchema = createInsertSchema(idiqUserFeedback).omit({
  id: true,
  createdAt: true,
});
export type InsertIdiqUserFeedback = z.infer<typeof insertIdiqUserFeedbackSchema>;
export type IdiqUserFeedback = typeof idiqUserFeedback.$inferSelect;

// IDIQ User Reads - Track which opportunities each user has viewed
export const idiqUserReads = pgTable("idiq_user_reads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  opportunityId: varchar("opportunity_id").references(() => idiqOpportunities.id, { onDelete: 'cascade' }).notNull(),
  readAt: timestamp("read_at").notNull().defaultNow(),
});

export const insertIdiqUserReadSchema = createInsertSchema(idiqUserReads).omit({
  id: true,
  readAt: true,
});
export type InsertIdiqUserRead = z.infer<typeof insertIdiqUserReadSchema>;
export type IdiqUserRead = typeof idiqUserReads.$inferSelect;

// IDIQ User Notes - Private notes on opportunities
export const idiqUserNotes = pgTable("idiq_user_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  opportunityId: varchar("opportunity_id").references(() => idiqOpportunities.id, { onDelete: 'cascade' }).notNull(),
  noteText: text("note_text").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertIdiqUserNoteSchema = createInsertSchema(idiqUserNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertIdiqUserNote = z.infer<typeof insertIdiqUserNoteSchema>;
export type IdiqUserNote = typeof idiqUserNotes.$inferSelect;

// Schema for submitting user feedback
export const submitIdiqFeedbackSchema = z.object({
  feedbackType: z.enum(["upvote", "downvote"]),
  reason: z.string().optional(),
});
export type SubmitIdiqFeedbackInput = z.infer<typeof submitIdiqFeedbackSchema>;

// Schema for user notes
export const idiqNoteSchema = z.object({
  noteText: z.string().min(1, "Note cannot be empty"),
});
export type IdiqNoteInput = z.infer<typeof idiqNoteSchema>;

// IDIQ Comments - Public comments on opportunities (social-style)
export const idiqComments = pgTable("idiq_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  opportunityId: varchar("opportunity_id").references(() => idiqOpportunities.id, { onDelete: 'cascade' }).notNull(),
  parentId: varchar("parent_id"), // For replies - references another comment
  content: text("content").notNull(),
  mentions: text("mentions").array(), // Array of user IDs mentioned
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertIdiqCommentSchema = createInsertSchema(idiqComments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertIdiqComment = z.infer<typeof insertIdiqCommentSchema>;
export type IdiqComment = typeof idiqComments.$inferSelect;

// IDIQ Comment Likes - Track likes on comments
export const idiqCommentLikes = pgTable("idiq_comment_likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  commentId: varchar("comment_id").references(() => idiqComments.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertIdiqCommentLikeSchema = createInsertSchema(idiqCommentLikes).omit({
  id: true,
  createdAt: true,
});
export type InsertIdiqCommentLike = z.infer<typeof insertIdiqCommentLikeSchema>;
export type IdiqCommentLike = typeof idiqCommentLikes.$inferSelect;

// Schema for submitting comments
export const idiqCommentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty"),
  parentId: z.string().optional(),
  mentions: z.array(z.string()).optional(),
});
export type IdiqCommentInput = z.infer<typeof idiqCommentSchema>;

// IDIQ Email Ingestion - Tracks incoming email processing
export const idiqEmailIngests = pgTable("idiq_email_ingests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // Email metadata
  fromAddress: text("from_address").notNull(),
  toAddress: text("to_address"),
  subject: text("subject"),
  receivedAt: timestamp("received_at").notNull().defaultNow(),
  // Raw content for replay/debugging
  rawEmailContent: text("raw_email_content"),
  rawHtml: text("raw_html"),
  rawText: text("raw_text"),
  // Processing status
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed, filtered
  errorMessage: text("error_message"),
  // Parsing results
  detectedPortal: text("detected_portal"), // sam.gov, dibbs, piee, etc.
  opportunitiesFound: integer("opportunities_found").notNull().default(0),
  opportunitiesAboveThreshold: integer("opportunities_above_threshold").notNull().default(0),
  // Linked opportunities created from this email
  createdOpportunityIds: text("created_opportunity_ids").array(),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertIdiqEmailIngestSchema = createInsertSchema(idiqEmailIngests).omit({
  id: true,
  createdAt: true,
});
export type InsertIdiqEmailIngest = z.infer<typeof insertIdiqEmailIngestSchema>;
export type IdiqEmailIngest = typeof idiqEmailIngests.$inferSelect;

// IDIQ Settings - Team/user settings for the IDIQ portal
export const idiqSettings = pgTable("idiq_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // Setting scope (null = global default)
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }),
  // Threshold settings
  minMatchThreshold: integer("min_match_threshold").notNull().default(70), // 0-100
  // Email notification settings
  emailNotificationsEnabled: boolean("email_notifications_enabled").notNull().default(false),
  notificationEmail: text("notification_email"), // Email address to receive notifications
  notifyOnHighMatch: boolean("notify_on_high_match").notNull().default(true),
  highMatchThreshold: integer("high_match_threshold").notNull().default(85),
  // Filtering preferences
  autoArchiveBelowThreshold: boolean("auto_archive_below_threshold").notNull().default(false),
  businessUnitFilter: text("business_unit_filter"), // Filter opportunities by business unit
  // Metadata
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertIdiqSettingsSchema = createInsertSchema(idiqSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertIdiqSettings = z.infer<typeof insertIdiqSettingsSchema>;
export type IdiqSettings = typeof idiqSettings.$inferSelect;

// Schema for updating IDIQ settings
export const updateIdiqSettingsSchema = z.object({
  minMatchThreshold: z.number().min(0).max(100).optional(),
  emailNotificationsEnabled: z.boolean().optional(),
  notificationEmail: z.string().email().nullable().optional(),
  notifyOnHighMatch: z.boolean().optional(),
  highMatchThreshold: z.number().min(0).max(100).optional(),
  autoArchiveBelowThreshold: z.boolean().optional(),
  businessUnitFilter: z.string().nullable().optional(),
});
export type UpdateIdiqSettingsInput = z.infer<typeof updateIdiqSettingsSchema>;

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
