# Albers Aerospace Intranet

## Overview
The Albers Aerospace Intranet is a centralized, company-wide platform designed to be the single source of truth for tools, announcements, and resources across all departments at Albers Aerospace. Its primary purpose is to enhance internal communication and collaboration by providing employee resources, mission-critical announcements, team recognition, and department-specific tools. Key capabilities include specialized modules for Business Development (SOPs, Proposal Training, Bid/No-Bid, Capture Questions), an AI-powered assistant (Albers Bot), and division-specific portals (Defense, Industrials, Advanced Programs). The platform aims to streamline operations and information access for all employees.

## User Preferences
Preferred communication style: Simple, everyday language.

Visual Design: Dark mode set as default. Professional aerospace/defense aesthetic with Albers branding throughout. Login, registration, and home pages feature split-screen layouts with US military equipment imagery (Apache helicopters, F-35/F-22 fighter jets), mission-focused messaging, and Fluent Design System compliance. Browser favicon uses Albers logo. Email domain validation is strictly enforced (@albers.aero, @albersaerospace.com) but domain hints are hidden from UI for security.

Text Color Standards: Application uses high-contrast black text for maximum readability against the light blue-grey background (#D9E4EC). Primary text uses pure black (0 0% 0%) for titles, headings, navigation, and body text. Secondary/muted text uses dark navy (#0E2841, HSL 209 65% 16%) for supporting information. Exception: Text on dark primary color backgrounds (#51142a) remains white for proper contrast.

Branding Elements:
- Page Title (share link): "Albers Aerospace Intranet"
- Sidebar Header: "Albers Aerospace" with "Company Intranet" subtitle
- Home Page Hero: "Welcome to the Albers Aerospace Intranet" with "Your single source of truth for tools, announcements, and resources"

## System Architecture

### Frontend
- **Framework**: React with TypeScript (Vite).
- **UI Component System**: shadcn/ui on Radix UI, adhering to Fluent Design System.
- **Styling**: Tailwind CSS with custom design tokens, HSL color system, Fluent-inspired spacing, Segoe UI typography.
- **State Management**: React Query for server state, React hooks for local state.
- **Routing**: Wouter.
- **Key Design Decisions**: Single-page application, tab-based navigation, context-aware floating Albers Bot, responsive design, optimized information density for desktop.

### Backend
- **Runtime**: Node.js with Express.js (TypeScript, ES modules).
- **API Design**: RESTful with JSON payloads.
- **Key Services**: Chat Service (Albers Bot), Knowledge Base Generator, Email Service, Object Storage Service, SOP Services, Authentication Services, SSO Service.
- **Authentication**: Full email/password system with email verification, domain restriction, session management (`express-session`), and JWT-based SSO.

### Data Architecture
- **Database**: PostgreSQL via `node-postgres`.
- **ORM**: Drizzle ORM for schema definitions; raw SQL for authentication.
- **Schema**: `users` table, `custom_content_blocks`, `team_spotlights`, `newsletters`, `newsletter_views`, `linkedin_posts`, `bou_quick_links`, `bou_hero_assets`, `bou_training_slides`, `bou_training_categories`, `bou_training_views`, `bou_bot_settings`, `bou_training_assignments`, `bou_home_sections`, `idiq_opportunities`, `idiq_upload_batches`, `idiq_capability_docs`, `idiq_user_feedback`, `idiq_feedback_preferences`, `idiq_user_reads`, `idiq_user_notes`, `idiq_comments`, `idiq_comment_likes`, `idiq_email_ingests`, `idiq_settings`.

### Core Features
- **Universal Search**: Command palette for quick access across all content.
- **Albers Bot**: AI-powered assistant with an auto-updating knowledge base.
- **Customizable Content Blocks**: Division-specific editable content areas.
- **Team Spotlights**: Widgets for highlighting achievements.
- **Newsletter System**: Division-specific newsletters with analytics.
- **LinkedIn Post Sync**: Manual synchronization of LinkedIn company posts.
- **BOU Bulletin Board**: Interactive social bulletin board for BOU members with rich media, comments, likes, and @mentions.
- **Modules**: Capture Questions, SOP Library, Training (multi-category viewer with analytics), New Business Opportunity Form, Trip Reports (form-based or PDF upload with AI summarization and search), IDIQ Management (AI-powered opportunity scoring portal with email ingestion, user feedback, private notes, and Team Discussion social commenting with replies and likes).
- **Admin Control Panel**: Features user management, analytics, newsletter management, LinkedIn post sync, and a dedicated BOU Admin system for managing quick links, hero images, training, bot settings, assignments, and page layout.
- **Session Management**: Secure session handling with `express-session`.
- **SSO Integration**: Single Sign-On to Business Intelligence Tool.
- **CUI Warning**: Prominent warnings at file upload locations.
- **Auto-Save System**: Implemented in key forms with draft restoration.

## External Dependencies

### Third-Party APIs
1.  **OpenAI API**: Powers the Albers Bot AI chat assistant (GPT-5-mini) via Replit AI.
2.  **Resend**: For sending transactional emails.

### Cloud Services
1.  **Google Cloud Storage**: For object storage of uploaded documents.
2.  **Neon Database**: Serverless PostgreSQL database.

### UI Component Libraries
1.  **Radix UI**: Headless accessible UI primitives.
2.  **shadcn/ui**: Pre-built components built on Radix UI.

### Document Processing
1.  **Mammoth.js**: Converts .docx files to HTML.

### Form Handling
1.  **React Hook Form**: For robust form state management and validation.