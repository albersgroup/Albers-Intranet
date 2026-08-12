export interface Scenario {
  /** Baseline filename stem — also the Playwright snapshot name. */
  name: string;
  /** Path on the Node app (old). */
  oldPath: string;
  /** Path on the Rails app (new). */
  newPath: string;
  /** Whether the Node route requires a logged-in session. */
  requiresAuth: boolean;
  /**
   * CSS selector to screenshot on the Node side instead of the full page.
   * Undefined = full page. Node and Rails wrap content in structurally
   * different chrome (sidebar vs. topbar), so these are independent per
   * side, not a single shared selector — see VISUAL_DIFF_PLAN.md.
   */
  oldContentSelector?: string;
  /** Same idea, for the Rails side. */
  newContentSelector?: string;
  /**
   * Viewport width for the Rails-side comparison. Node's authenticated pages
   * render their content region at 1440 − 288 (sidebar) = 1152px, so their
   * baselines are 1152 wide. Rails has no sidebar — its <main> spans the full
   * viewport — so the compare runs those scenarios at a 1152 viewport instead
   * of baking Node's sidebar width into Rails markup. Undefined = 1440.
   */
  viewportWidth?: number;
}

// Node's authenticated routes are wrapped in AppSidebar, with the actual page
// content inside a <main>. The public corporate home (PublicHome) has no
// sidebar and no <main> tag at all — it's bare content, so "full page" is
// already the right comparison unit there.
//
// Two nested <main> tags exist on these pages: shadcn's SidebarInset
// (App.tsx: className="... overflow-hidden") itself renders as <main>,
// wrapping both the slim header bar and the actual content <main
// className="flex-1 overflow-auto ...">. A plain "main" selector's .first()
// matches the outer one in DOM order, pulling the header bar into the
// screenshot. "main.overflow-auto" targets the inner, content-only one
// unambiguously (SidebarInset is overflow-hidden, never overflow-auto).
const NODE_MAIN_SELECTOR = "main.overflow-auto";

// Rails renders every page (including the public /portal/corporate) through
// the shared layout's topbar + <main class="container">, with no nesting
// ambiguity — topbar and <main> are siblings. Scoping to <main> strips that
// topbar, which Node's public corporate route never had.
const RAILS_MAIN_SELECTOR = "main";

export const scenarios: Scenario[] = [
  {
    name: "corporate",
    oldPath: "/",
    newPath: "/portal/corporate",
    requiresAuth: false,
    // oldContentSelector intentionally omitted: full page on Node is correct
    // here (no chrome to exclude).
    newContentSelector: RAILS_MAIN_SELECTOR,
  },
  {
    name: "defense",
    oldPath: "/defense",
    newPath: "/portal/defense",
    requiresAuth: true,
    oldContentSelector: NODE_MAIN_SELECTOR,
    newContentSelector: RAILS_MAIN_SELECTOR,
    viewportWidth: 1152,
  },
  {
    name: "industrials",
    oldPath: "/industrials",
    newPath: "/portal/industrials",
    requiresAuth: true,
    oldContentSelector: NODE_MAIN_SELECTOR,
    newContentSelector: RAILS_MAIN_SELECTOR,
    viewportWidth: 1152,
  },
  {
    name: "advanced-programs",
    // Node's route is /special-projects; the underlying division key is
    // advanced_programs. Deliberate, not a typo — see VISUAL_DIFF_PLAN.md.
    oldPath: "/special-projects",
    newPath: "/portal/advanced_programs",
    requiresAuth: true,
    oldContentSelector: NODE_MAIN_SELECTOR,
    newContentSelector: RAILS_MAIN_SELECTOR,
    viewportWidth: 1152,
  },
  {
    name: "bou",
    oldPath: "/bou",
    newPath: "/portal/bou",
    requiresAuth: true,
    oldContentSelector: NODE_MAIN_SELECTOR,
    newContentSelector: RAILS_MAIN_SELECTOR,
    viewportWidth: 1152,
  },
];
