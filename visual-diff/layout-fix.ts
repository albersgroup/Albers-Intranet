import type { Page } from "@playwright/test";

// Node's sidebar shell is a fixed-height flex layout: <div className="flex
// h-screen w-full"> > SidebarInset (overflow-hidden) > <main
// className="flex-1 overflow-auto ...">. A locator screenshot of <main>
// captures its laid-out box (constrained to viewport height), not its full
// scrollable content — anything below the fold gets silently cut off.
//
// This neutralizes that: h-screen becomes a min-height (can still grow),
// and the overflow-hidden/overflow-auto ancestors become visible, so the
// page's natural document flow expands to fit everything and a subsequent
// locator screenshot captures the real full height. It's a no-op on pages
// that don't use these patterns (Rails' plain document flow), so it's safe
// to call unconditionally before any content-region screenshot on either
// app.
export async function unclipScrollContainers(page: Page) {
  await page.addStyleTag({
    content: `
      .h-screen { height: auto !important; min-height: 100vh !important; }
      .overflow-hidden, .overflow-auto { overflow: visible !important; }
    `,
  });
}
