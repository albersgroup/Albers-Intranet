export const ROLE_DIVISION_MAP: Record<string, string | null> = {
  admin: null, // System Admin has access to all divisions
  corporate_admin: "corporate",
  defense_admin: "defense",
  industrials_admin: "industrials",
  advanced_admin: "advanced_programs",
  bou_admin: "bou",
  bd_admin: "bd",
  viewer: null, // Viewers have no editing access
};

export const DIVISION_NAMES: Record<string, string> = {
  corporate: "Albers Corporate",
  defense: "Albers Defense",
  industrials: "Albers Industrials",
  advanced_programs: "Albers Advanced Programs",
  bou: "Business Operations Unit",
};

export function canEditDivision(role: string | undefined, divisionId: string): boolean {
  if (!role) return false;
  
  // System Admin can edit everything
  if (role === "admin") return true;
  
  // Check if the role has access to the specific division
  const allowedDivision = ROLE_DIVISION_MAP[role];
  return allowedDivision === divisionId;
}

export function canAccessAdminPanel(role: string | undefined): boolean {
  if (!role) return false;
  return role === "admin";
}

export function canEditNews(role: string | undefined, division?: string): boolean {
  if (!role) return false;
  // System Admin can manage all news
  if (role === "admin") return true;
  // Division admins can manage news in their division
  if (division) {
    return canEditDivision(role, division);
  }
  // If no division specified, check if user is any admin
  return isAnyAdmin(role);
}

export function canEditNewsletters(role: string | undefined): boolean {
  if (!role) return false;
  // Only System Admin can manage newsletters (for now)
  return role === "admin";
}

export function canEditLinkedIn(role: string | undefined): boolean {
  if (!role) return false;
  // System Admin or Corporate Admin can manage LinkedIn posts
  return role === "admin" || role === "corporate_admin";
}

export function isAnyAdmin(role: string | undefined): boolean {
  if (!role) return false;
  return role.endsWith("_admin") || role === "admin";
}

export function getDivisionForRole(role: string | undefined): string | null {
  if (!role) return null;
  return ROLE_DIVISION_MAP[role] || null;
}

export function getRoleDisplayName(role: string): string {
  const roleNames: Record<string, string> = {
    admin: "System Admin",
    corporate_admin: "Corporate Admin",
    defense_admin: "Defense Admin",
    industrials_admin: "Industrials Admin",
    advanced_admin: "Advanced Programs Admin",
    bou_admin: "BOU Admin",
    bd_admin: "BD Admin",
    viewer: "Viewer",
  };
  return roleNames[role] || "Viewer";
}

export function canEditBouAdmin(role: string | undefined): boolean {
  if (!role) return false;
  // System Admin or BOU Admin can manage BOU admin content
  return role === "admin" || role === "bou_admin";
}

export function isBouAdmin(role: string | undefined): boolean {
  return role === "admin" || role === "bou_admin";
}

export function canEditBdAdmin(role: string | undefined): boolean {
  if (!role) return false;
  // System Admin or BD Admin can manage BD admin content
  return role === "admin" || role === "bd_admin";
}

export function isBdAdmin(role: string | undefined): boolean {
  return role === "admin" || role === "bd_admin";
}
