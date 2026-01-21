# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The Albers Aerospace Intranet is a full-stack TypeScript enterprise application serving as the company-wide platform for tools, announcements, and resources across all departments. It features specialized modules for Business Development and division-specific portals.

**Deployment**: This application is configured for internal deployment on Dokku with local PostgreSQL database, local file storage, and Outlook Gov SMTP email. OpenAI-powered features (Albers Bot, AI scoring) are disabled in this deployment.

## Development Commands

### Core Development
- `npm run dev` - Start development server (runs tsx on server/index.ts with hot reload)
- `npm run build` - Build both frontend (Vite) and backend (esbuild) for production
- `npm start` - Run production build
- `npm run check` - Run TypeScript type checking across the codebase

### Database Management
- `npm run db:push` - Push Drizzle schema changes to database (use with caution in production)

### Environment Setup
Requires `.env` file with:
- `DATABASE_URL` - PostgreSQL connection string (auto-provided by Dokku)
- `SESSION_SECRET` - Session encryption key
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` - Outlook Gov SMTP credentials
- `STORAGE_DIR` - Local file storage directory (default: /app/storage)
- `BASE_URL` - Application base URL for emails and links
- `NODE_ENV` - Node environment (production recommended)

See `.env.example` for full configuration details.

## Architecture

### Frontend (client/)
- **Framework**: React 18 with TypeScript, bundled via Vite
- **Routing**: Wouter for client-side navigation
- **State Management**:
  - @tanstack/react-query for server state with automatic caching
  - React hooks for local component state
- **UI System**: shadcn/ui components built on Radix UI primitives, styled with Tailwind CSS v4
- **Design System**: Follows Fluent Design System principles (see design_guidelines.md)
- **Key Pages**: Home, Login, Register, VerifyEmail, BusinessDevelopmentHome, IdiqManagement, TripReports, division-specific portals (corporate/, defense/, industrials/, special-projects/), admin control panel

### Backend (server/)
- **Runtime**: Node.js with Express.js, ES modules, TypeScript via tsx
- **Database**: PostgreSQL with Drizzle ORM for schema definitions
  - Session storage uses `connect-pg-simple` (stores sessions in database)
  - Authentication queries use raw SQL via `node-postgres` Pool
  - Other queries primarily use raw SQL with occasional Drizzle for type safety
- **Authentication**: Email/password with email verification, password reset, domain restriction (@albers.aero, @albersaerospace.com), express-session with PostgreSQL backing
- **File Uploads**: Multer (memory storage) → Local file system via LocalFileStorageService
- **Email**: Nodemailer with Outlook Gov SMTP for transactional emails (verification, password reset, notifications)
- **Disabled Features**: OpenAI AI features, ClickUp integration, SSO/JWT, Email ingestion (see Feature Flags section)

### Shared Code (shared/)
- `schema.ts` - Drizzle schema definitions, Zod validation schemas, TypeScript types
- Database enums: `division` (corporate, defense, industrials, advanced_programs, bou), `user_role` (admin, division admins, bou_admin, bd_admin, viewer)

### Path Aliases
- `@/*` → `client/src/*`
- `@shared/*` → `shared/*`
- `@assets/*` → `attached_assets/*`

### Feature Flags
The application uses feature flags to disable certain features for internal deployment:

**client/src/config/features.ts**:
- `ALBERS_BOT`: false - AI chat assistant disabled (no OpenAI API)
- `IDIQ_AI_SCORING`: false - AI opportunity scoring disabled
- `TRIP_REPORT_AI_SUMMARY`: false - AI trip report summarization disabled
- `CLICKUP_INTEGRATION`: false - ClickUp proposal dashboard disabled
- `SSO_BI_TOOL`: false - SSO to Business Intelligence Tool disabled
- `EMAIL_INGESTION`: false - Automated email processing disabled

**server/routes.ts**:
- `OPENAI_ENABLED`: false - Global flag for all OpenAI features

When adding new AI or third-party service features, always check these flags and provide graceful fallbacks.

## Key Features & Modules

### Core Infrastructure
- **Universal Search**: Command palette (CommandPalette.tsx) for quick navigation
- **Session Management**: Secure PostgreSQL-backed sessions with 7-day expiry
- **File Management**: Local file storage with automatic cleanup and serving via /api/files endpoints
- **Email System**: Outlook Gov SMTP for transactional emails

### Business Development (BOU) Features
- **Capture Questions Module**: Multi-phase questionnaire system (CaptureQuestionsModule.tsx)
- **Bid/No-Bid Decision Tool**: Color-coded decision matrix (BidNoBidModule.tsx)
- **SOP Library**: Document management with search and version control (SOPLibrary.tsx)
- **Proposal Training**: Multi-category training viewer with analytics and assignments
- **BOU Bulletin Board**: Social board with rich media, comments, likes, @mentions (BOUBulletinBoard.tsx)
- **BOU Admin System**: Dedicated admin interface for managing quick links, hero images, training content, bot settings, assignments, and page layout

### IDIQ Management
- **Opportunity Tracking**: Manual opportunity entry and management
- **Team Discussion**: Social commenting system with replies and likes
- **User Feedback**: Thumbs up/down feedback system with private notes
- **Analytics**: User read tracking and engagement metrics
- **File Attachments**: Document upload and management for opportunities
- ~~AI-Powered Opportunity Scoring~~ (disabled - no OpenAI API)
- ~~Email Ingestion~~ (disabled - no AgentMail webhook)

### Content Management
- **Customizable Content Blocks**: Division-specific editable areas (EditableContentBlock.tsx)
- **Team Spotlights**: Achievement highlighting widgets (EditableTeamSpotlights.tsx)
- **Newsletter System**: Division-specific newsletters with view analytics
- **LinkedIn Post Sync**: Manual synchronization of company LinkedIn posts
- **Trip Reports**: Form-based or PDF upload with search
- ~~AI Trip Report Summarization~~ (disabled - no OpenAI API)

### Admin Features
- User management, analytics dashboard, newsletter management, BOU admin panel

## Design System & Styling

### Color System (HSL-based)
- **Primary Brand**: `#51142a` (HSL 334 60% 20%) - Deep maroon for headers, buttons, accents
- **Background**: `#D9E4EC` (light blue-grey) for default light mode
- **Text Standards**: Pure black (`0 0% 0%`) for primary text, dark navy (`#0E2841`, HSL 209 65% 16%) for secondary text
- **Dark Mode**: Default theme, professional aerospace aesthetic

### Typography
- Font stack: Segoe UI, system-ui, sans-serif
- Display (chat): 16px, Headings: 20px, Body: 15px, Labels: 13px
- Monospace (Consolas) for code snippets

### Layout Patterns
- Sidebar: Fixed 280px (collapsible to 64px icon-only)
- Main content: Max-width 1400px
- Responsive breakpoints: Mobile <768px, Tablet 768-1024px, Desktop >1024px
- Spacing: Tailwind units (2, 4, 6, 8, 12, 16)

## Important Implementation Details

### Authentication Flow
1. User registers with domain-validated email (@albers.aero or @albersaerospace.com)
2. System generates 6-digit verification code, sends via Resend
3. User verifies email to activate account
4. Login creates express-session stored in PostgreSQL
5. Session cookie persists for 7 days

### Knowledge Base Generation
- Runs automatically on server startup and twice daily (6 AM/6 PM)
- Aggregates content from SOPs, training materials, and system documentation
- Powers Albers Bot's contextual responses
- Manual trigger available via admin interface

### File Upload Pattern
1. Multer captures file in memory (buffer)
2. ObjectStorageService uploads to Google Cloud Storage
3. Returns public URL or signed URL for secure access
4. Database stores metadata (filename, URL, upload date, user)

### Database Connection Patterns
- Use existing `dbPool` from routes.ts (imported via closure)
- Always handle pool errors with `.on('error')` listeners
- Set timeouts: `connectionTimeoutMillis: 10000`, `idleTimeoutMillis: 30000`
- Use prepared statements with parameterized queries to prevent SQL injection

### React Query Usage
- Queries automatically cache and refetch on window focus
- Mutations invalidate relevant query cache keys
- Use `queryClient.invalidateQueries(['key'])` after mutations
- Optimistic updates for better UX in social features (likes, comments)

### Form Handling
- React Hook Form with Zod validation via @hookform/resolvers
- Auto-save implemented in key forms (Capture Questions, Trip Reports, IDIQ notes)
- Draft restoration on page load using localStorage
- CUI warnings at all file upload locations

## Common Patterns

### Adding a New API Endpoint
1. Define Zod schema in `shared/schema.ts` if needed
2. Add route handler in `server/routes.ts`
3. Use `isAuthenticated` middleware for protected routes
4. Return JSON with proper error status codes (400, 401, 404, 500)
5. Create React Query hook in appropriate page/component

### Adding a New Database Table
1. Define table schema in `shared/schema.ts` using Drizzle
2. Run `npm run db:push` to apply changes to database
3. Create Zod insert/update schemas using `createInsertSchema`
4. Add corresponding API routes in `server/routes.ts`
5. Build UI components using shadcn/ui primitives

### Creating a New Page
1. Add page component in `client/src/pages/` (or subdirectory for divisions)
2. Import and add route in `client/src/App.tsx` using Wouter
3. Update sidebar navigation in `client/src/components/AppSidebar.tsx`
4. Add to command palette search in `client/src/components/CommandPalette.tsx`
5. Implement permission checks if division-specific

## Security Considerations

- Domain-restricted registration enforced at both client and server
- All passwords hashed with bcrypt (10 rounds)
- Session cookies: httpOnly, secure in production, sameSite='lax'
- File uploads: 200MB limit, type validation, virus scanning recommended
- SQL injection prevention: Always use parameterized queries
- XSS prevention: DOMPurify for user-generated HTML content
- CUI warnings prominently displayed at upload locations

## Testing & Type Safety

- TypeScript strict mode enabled
- No test framework currently configured
- Type checking via `npm run check` before deployment
- Vite provides runtime error overlay in development

## Deployment Notes

### Dokku Deployment (Internal Server)
This application is configured for internal deployment to Dokku. See `DEPLOYMENT.md` for detailed instructions.

**Key Requirements**:
- PostgreSQL database (auto-provisioned by Dokku postgres plugin)
- Persistent storage volume mounted at `/app/storage` for local file storage
- Outlook Gov SMTP credentials for email
- Environment variables configured via `dokku config:set`

**Build Process**:
- Production build outputs to `dist/` (backend) and `dist/public/` (frontend)
- Server serves both API and static files on single port (default 5000)
- Buildpack: Node.js (specified in `.buildpacks`)
- Process type: web (defined in `Procfile`)

**Configuration**:
- Requires proxy configuration with `trust proxy: 1` for secure cookies
- Environment variable `NODE_ENV=production` enables optimizations
- Database migrations not automated - use `db:push` with caution in production
- File storage persists across deployments via Dokku volume mount

**Disabled Features**:
- No OpenAI API (Albers Bot, AI scoring, AI summarization disabled)
- No Google Cloud Storage (using local file system)
- No ClickUp integration (proposal dashboard disabled)
- No SSO/JWT (BI Tool integration disabled)
- No email ingestion webhook (AgentMail disabled)
- No Resend email service (using Outlook Gov SMTP)

See `.env.example` for all required environment variables.
