/**
 * Feature flags for controlling application features
 *
 * For internal Dokku deployment:
 * - OpenAI features are disabled (no API key)
 * - ClickUp integration disabled
 * - SSO/BI Tool integration disabled
 * - Email ingestion disabled
 */

export const FEATURES = {
  // AI-powered features (require OpenAI API)
  ALBERS_BOT: false,
  IDIQ_AI_SCORING: false,
  TRIP_REPORT_AI_SUMMARY: false,
  EMAIL_AI_CLASSIFICATION: false,

  // Third-party integrations
  CLICKUP_INTEGRATION: false,
  SSO_BI_TOOL: false,
  EMAIL_INGESTION: false,

  // Core features (always enabled)
  AUTHENTICATION: true,
  FILE_UPLOADS: true,
  BUSINESS_DEVELOPMENT: true,
  IDIQ_MANAGEMENT: true,
  TRIP_REPORTS: true,
  NEWSLETTERS: true,
  ADMIN_PANEL: true,
} as const;

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof typeof FEATURES): boolean {
  return FEATURES[feature];
}

/**
 * Get user-friendly message for disabled feature
 */
export function getDisabledFeatureMessage(feature: keyof typeof FEATURES): string {
  const messages: Record<string, string> = {
    ALBERS_BOT: "Albers Bot is currently unavailable in this deployment.",
    IDIQ_AI_SCORING: "AI opportunity scoring is currently unavailable.",
    TRIP_REPORT_AI_SUMMARY: "AI trip report summarization is currently unavailable.",
    EMAIL_AI_CLASSIFICATION: "Automated email processing is currently unavailable.",
    CLICKUP_INTEGRATION: "ClickUp integration is not available in this deployment.",
    SSO_BI_TOOL: "Single sign-on to BI Tool is not available.",
    EMAIL_INGESTION: "Automated email ingestion is not available.",
  };

  return messages[feature] || "This feature is currently unavailable.";
}
