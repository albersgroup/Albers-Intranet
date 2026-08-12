import DOMPurify from "dompurify";

/**
 * Sanitize a stored/user-authored HTML string before it is injected into the DOM
 * via `dangerouslySetInnerHTML`. Anyone with content-editing rights can otherwise
 * execute script in a viewer's session, so every rich-text render path must pass
 * through here.
 *
 * Usage:
 *   <div dangerouslySetInnerHTML={sanitizeHtml(article.content)} />
 */
export function sanitizeHtml(dirty: string | null | undefined): { __html: string } {
  return { __html: DOMPurify.sanitize(dirty ?? "") };
}
