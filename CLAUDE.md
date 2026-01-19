# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The Albers Aerospace Intranet is a full-stack TypeScript enterprise application serving as the company-wide platform for tools, announcements, and resources across all departments. It features specialized modules for Business Development, AI-powered assistance (Albers Bot), and division-specific portals.

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
- `DATABASE_URL` - PostgreSQL connection string (Neon serverless)
- `SESSION_SECRET` - Session encryption key
- `AI_INTEGRATIONS_OPENAI_BASE_URL` and `AI_INTEGRATIONS_OPENAI_API_KEY` - OpenAI API via Replit AI
- `GOOGLE_CLOUD_BUCKET_NAME`, `GOOGLE_CLOUD_PROJECT_ID`, `GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY` - GCS for file storage
- `RESEND_API_KEY` - Email service credentials

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
- **Database**: PostgreSQL (Neon serverless) with Drizzle ORM for schema definitions
  - Session storage uses `connect-pg-simple` (stores sessions in database)
  - Authentication queries use raw SQL via `node-postgres` Pool
  - Other queries primarily use raw SQL with occasional Drizzle for type safety
- **Authentication**: Email/password with email verification, password reset, domain restriction (@albers.aero, @albersaerospace.com), express-session with PostgreSQL backing, JWT-based SSO
- **File Uploads**: Multer (memory storage) → Google Cloud Storage via ObjectStorageService
- **AI Integration**: OpenAI API (GPT-5-mini) via Replit AI proxy for Albers Bot
- **Email**: Resend for transactional emails (verification, password reset, notifications)

### Shared Code (shared/)
- `schema.ts` - Drizzle schema definitions, Zod validation schemas, TypeScript types
- Database enums: `division` (corporate, defense, industrials, advanced_programs, bou), `user_role` (admin, division admins, bou_admin, bd_admin, viewer)

### Path Aliases
- `@/*` → `client/src/*`
- `@shared/*` → `shared/*`
- `@assets/*` → `attached_assets/*`

## Key Features & Modules

### Core Infrastructure
- **Universal Search**: Command palette (CommandPalette.tsx) for quick navigation
- **Albers Bot**: AI assistant with auto-updating knowledge base (generates twice daily at 6 AM/6 PM)
- **Session Management**: Secure PostgreSQL-backed sessions with 7-day expiry
- **SSO Integration**: JWT-based single sign-on to external Business Intelligence Tool

### Business Development (BOU) Features
- **Capture Questions Module**: Multi-phase questionnaire system (CaptureQuestionsModule.tsx)
- **Bid/No-Bid Decision Tool**: Color-coded decision matrix (BidNoBidModule.tsx)
- **SOP Library**: Document management with search and version control (SOPLibrary.tsx)
- **Proposal Training**: Multi-category training viewer with analytics and assignments
- **BOU Bulletin Board**: Social board with rich media, comments, likes, @mentions (BOUBulletinBoard.tsx)
- **BOU Admin System**: Dedicated admin interface for managing quick links, hero images, training content, bot settings, assignments, and page layout

### IDIQ Management
- **AI-Powered Opportunity Scoring**: Automated relevance scoring for opportunities
- **Email Ingestion**: Automated parsing of opportunity emails
- **Team Discussion**: Social commenting system with replies and likes
- **User Feedback**: Thumbs up/down feedback system with private notes
- **Analytics**: User read tracking and engagement metrics

### Content Management
- **Customizable Content Blocks**: Division-specific editable areas (EditableContentBlock.tsx)
- **Team Spotlights**: Achievement highlighting widgets (EditableTeamSpotlights.tsx)
- **Newsletter System**: Division-specific newsletters with view analytics
- **LinkedIn Post Sync**: Manual synchronization of company LinkedIn posts
- **Trip Reports**: Form-based or PDF upload with AI summarization and search

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

- Production build outputs to `dist/` (backend) and `dist/public/` (frontend)
- Server serves both API and static files on single port (default 5000)
- Requires proxy configuration with `trust proxy: 1` for secure cookies
- Environment variable `NODE_ENV=production` enables optimizations
- Database migrations not automated - use `db:push` with caution in production
