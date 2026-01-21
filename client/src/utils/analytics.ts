/**
 * Analytics utilities for Goatcounter event tracking.
 *
 * Use this to programmatically track clicks and custom events that can't be
 * tracked with the HTML data-goatcounter-click attribute.
 */

/**
 * Track a custom event (click, form submission, etc.) with Goatcounter.
 *
 * @param eventName - Name of the event (cannot start with '/'), e.g., 'button-submit', 'download-sop'
 * @param title - Optional description of the event (max 200 chars), defaults to eventName
 *
 * @example
 * // Track a button click
 * trackEvent('button-submit-form', 'User submitted contact form');
 *
 * @example
 * // Track a file download
 * trackEvent('download-sop', 'Downloaded: Proposal Template.pdf');
 *
 * @example
 * // Track a custom user action
 * trackEvent('search-executed', 'Search query: aerospace parts');
 */
export function trackEvent(eventName: string, title?: string): void {
  // Ensure eventName doesn't start with '/' (Goatcounter requirement for events)
  if (eventName.startsWith('/')) {
    console.warn(
      `[Analytics] Event names cannot start with '/'. Removing leading slash from: ${eventName}`
    );
    eventName = eventName.substring(1);
  }

  // Check if Goatcounter is loaded
  if (window.goatcounter && typeof window.goatcounter.count === 'function') {
    window.goatcounter.count({
      path: eventName,
      title: title || eventName,
      event: true, // Mark as event, not page view
    });
  } else {
    // Goatcounter not loaded yet - could be ad blocker or script hasn't loaded
    console.debug('[Analytics] Goatcounter not available. Event not tracked:', eventName);
  }
}

/**
 * Track a file download event.
 *
 * @param fileName - Name of the file being downloaded
 * @param fileType - Optional file type/category (e.g., 'sop', 'training', 'report')
 *
 * @example
 * trackFileDownload('Proposal_Template.pdf', 'sop');
 */
export function trackFileDownload(fileName: string, fileType?: string): void {
  const eventName = fileType ? `download-${fileType}` : 'download-file';
  trackEvent(eventName, `Downloaded: ${fileName}`);
}

/**
 * Track a search query.
 *
 * @param query - The search query string
 * @param resultCount - Optional number of results returned
 *
 * @example
 * trackSearch('aerospace parts', 15);
 */
export function trackSearch(query: string, resultCount?: number): void {
  const title = resultCount !== undefined
    ? `Search: "${query}" (${resultCount} results)`
    : `Search: "${query}"`;
  trackEvent('search', title);
}

/**
 * Track a form submission.
 *
 * @param formName - Name/identifier of the form
 * @param success - Whether the submission was successful
 *
 * @example
 * trackFormSubmission('contact-form', true);
 */
export function trackFormSubmission(formName: string, success: boolean = true): void {
  const eventName = `form-${formName}`;
  const title = success ? `Form submitted: ${formName}` : `Form failed: ${formName}`;
  trackEvent(eventName, title);
}
