export const ROLE_DIVISION_MAP: Record<string, string | null> = {
  admin: null, // System Admin has access to all divisions
  corporate_admin: "corporate",
  defense_admin: "defense",
  industrials_admin: "industrials",
  advanced_admin: "advanced_programs",
  bou_admin: "bou",
  viewer: null, // Viewers have no editing access
};

export function canEditDivision(role: string | undefined, divisionId: string): boolean {
  if (!role) return false;
  
  // System Admin can edit everything
  if (role === "admin") return true;
  
  // Check if the role has access to the specific division
  const allowedDivision = ROLE_DIVISION_MAP[role];
  return allowedDivision === divisionId;
}

export function canEditBouAdmin(role: string | undefined): boolean {
  if (!role) return false;
  // System Admin or BOU Admin can manage BOU admin content
  return role === "admin" || role === "bou_admin";
}

export function isAnyAdmin(role: string | undefined): boolean {
  if (!role) return false;
  return role.endsWith("_admin") || role === "admin";
}

export function isSystemAdmin(role: string | undefined): boolean {
  return role === "admin";
}

export function isBouAdmin(role: string | undefined): boolean {
  return role === "admin" || role === "bou_admin";
}
