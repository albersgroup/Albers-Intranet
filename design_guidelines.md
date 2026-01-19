# BOU Internal Training Agent - Design Guidelines

## Design Approach

**System Selected:** Fluent Design System (Microsoft)

**Rationale:** This internal enterprise training application prioritizes efficiency, learnability, and information density. Fluent Design System excels in productivity-focused applications with its emphasis on clarity, structured information hierarchy, and professional aesthetics. The system's component library aligns perfectly with chat interfaces, document viewers, and tabbed navigation patterns essential for this training tool.

**Core Design Principles:**
- **Clarity First:** Every element serves the user's learning journey
- **Efficient Navigation:** Quick access between chat, documents, and reference materials
- **Professional Polish:** Enterprise-grade aesthetics that instill confidence
- **Cognitive Ease:** Reduce mental load through consistent patterns and clear hierarchy

---

## Typography System

**Font Stack:** Segoe UI (primary), system-ui, sans-serif

**Type Scale:**
- **Display (Chat Responses):** 16px, line-height 1.5, weight 400
- **Headings (Section Titles):** 20px, line-height 1.4, weight 600
- **Subheadings (Module Labels):** 14px, line-height 1.3, weight 600, uppercase tracking
- **Body (Documents/SOPs):** 15px, line-height 1.6, weight 400
- **Labels (Form Fields):** 13px, line-height 1.4, weight 500
- **Meta (Timestamps):** 12px, line-height 1.3, weight 400

**Hierarchy Rules:**
- Section titles use sentence case for approachability
- Chat messages maintain conversational weight
- Document headings follow strict hierarchy (H1→H6)
- Monospace font (Consolas, 14px) for code snippets or technical references

---

## Layout System

**Spacing Primitives:** Tailwind units of 2, 4, 6, 8, 12, 16

**Grid Structure:**
- **Sidebar Navigation:** Fixed 280px width (collapsible to 64px icon-only)
- **Main Content Area:** Flexible, max-width 1400px
- **Chat Panel:** 60% of main area on desktop, full-width on mobile
- **Reference Panel (Documents):** 40% on desktop, toggleable drawer on mobile

**Component Spacing:**
- Section padding: p-8 (desktop), p-4 (mobile)
- Card/panel padding: p-6
- List item spacing: gap-4 vertically
- Form field groups: gap-6
- Chat message bubbles: gap-3

**Responsive Breakpoints:**
- Mobile: < 768px (single column, bottom tab bar)
- Tablet: 768px - 1024px (condensed sidebar, stacked panels)
- Desktop: > 1024px (full layout with side-by-side panels)

---

## Component Library

### Navigation Components

**Sidebar (Primary Navigation):**
- Vertical navigation with icon + label
- Expandable sections for sub-modules
- Active state: subtle background fill, accent border-left
- Icons: 20px, consistent visual weight
- Sections: Chat Interface, Capture Questions, Document Library, SOPs, Resources

**Tab System (Module Switcher):**
- Horizontal tabs below header
- Underline indicator for active tab
- Equal-width tabs with 16px vertical padding
- Hover: subtle background change
- Examples: "Analysis Phase" | "Intel Phase" | "Solution Phase"

### Chat Interface Components

**Chat Container:**
- Full-height scrollable area with padding
- Messages align left (agent) and right (user)
- Maximum message width: 680px for readability
- Sticky input field at bottom

**Message Bubbles:**
- Agent messages: Rounded corners (8px), subtle background
- User messages: Rounded corners (8px), accent background
- Padding: 12px 16px
- Timestamp below each message (subtle, 11px)
- Avatar icons (32px circle) for visual distinction

**Input Field:**
- Multi-line textarea with dynamic height (min 48px, max 200px)
- Rounded container with border
- Send button (icon or text) aligned right
- File attachment button for uploading documents/screenshots
- Character count indicator (subtle, bottom-right)

**Suggested Actions:**
- Chip-style buttons below chat input
- Examples: "Show me Gate 1 requirements" | "Explain Capture Phase"
- Rounded full, 8px padding horizontal
- Hover state with subtle lift

### Document Viewer Components

**Document Panel:**
- Header with document title and close/minimize controls
- Scrollable content area with proper line length (max 65ch)
- Table of contents sidebar for long documents
- Syntax highlighting for any procedural steps
- Breadcrumb navigation for nested documents

**PDF/Document Renderer:**
- Embedded viewer with zoom controls
- Page navigation (prev/next, jump to page)
- Search within document functionality
- Download and print options

### Data Display Components

**Capture Questions Module:**
- Accordion-style expandable sections
- Question cards with:
  - Question text (bold, 15px)
  - Example/Note section (italic, muted)
  - Response field (expandable textarea)
  - Save/Edit states with clear indicators
- Progress indicator showing completion percentage
- Filter/search bar to find specific questions

**Tables (for structured data):**
- Striped rows for readability
- Sortable column headers
- Responsive: Stack to cards on mobile
- Action buttons right-aligned in rows

### Form Components

**Input Fields:**
- Label above input (13px, weight 500)
- Border radius: 4px
- Height: 40px for single-line, auto for textarea
- Focus state: accent border, subtle shadow
- Error state: error border, helper text below

**Buttons:**
- Primary: Filled accent, white text, 40px height
- Secondary: Outlined, accent border
- Tertiary: Text-only with hover background
- Border radius: 4px
- Padding: 12px 24px
- Icon + text combinations when appropriate

**Dropdowns/Selects:**
- Match input field styling
- Chevron icon right-aligned
- Dropdown menu with subtle shadow
- Hover states on options

### Feedback Components

**Loading States:**
- Skeleton loaders for chat messages
- Spinner (24px) for inline loading
- Progress bar for document uploads

**Notifications/Alerts:**
- Toast notifications (top-right corner)
- Info, success, warning, error variants
- Auto-dismiss after 5 seconds
- Close button available

**Empty States:**
- Centered icon + message
- Suggested actions below
- Example: "No chat history yet. Ask your first question to get started."

---

## Interactions & Animations

**Use Sparingly - Functional Only:**

**Chat Message Appearance:**
- Fade in from 0.9 to 1 opacity, 150ms ease
- Subtle slide-up (4px) for new messages

**Panel Transitions:**
- Sidebar collapse: 200ms ease-in-out
- Document drawer open: 250ms ease-out
- Tab switching: Crossfade content, 150ms

**Hover States:**
- Buttons: Subtle background darkening, no scale
- Cards: Border accent change, no elevation
- Links: Underline on hover

**No Animations:**
- Page navigation
- Form submissions (use loading indicators instead)
- Scrolling effects

---

## Images

**No Hero Images:** This is a utility application - no marketing-style hero sections.

**Functional Images Only:**
- **User Avatars:** 32px circles for chat, 40px for profiles
- **Document Thumbnails:** 48x48px squares for document list previews
- **Uploaded Screenshots:** Full-width within chat or reference panel, with lightbox expand
- **Iconography:** Consistent 20px icons throughout (Fluent UI System Icons)
- **Diagrams/Process Flows:** Full-width in document viewer for SOP visualization

**Placeholder Approach:**
- Use icon placeholders for missing avatars
- Document icons for files without thumbnails
- Subtle background pattern for empty states

---

## Special Considerations

**Accessibility:**
- ARIA labels for all interactive elements
- Keyboard navigation throughout (Tab, Enter, Esc)
- Focus indicators clearly visible
- Screen reader-friendly chat updates
- Minimum contrast ratios: 4.5:1 for text, 3:1 for UI components

**Document Upload Flow:**
- Drag-and-drop zone in chat input
- File type validation (PDF, DOCX, PNG, JPG)
- Upload progress indicator
- Preview before sending
- File size limit messaging

**Search Functionality:**
- Global search (top-right of header)
- Search within current module
- Highlighted results in documents
- Recent searches suggested

**Session Persistence:**
- Chat history saved and retrievable
- Draft responses auto-saved
- Return to last viewed document
- Filter/sort preferences remembered