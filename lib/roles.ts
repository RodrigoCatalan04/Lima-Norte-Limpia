export type Role = "vecino" | "inspector" | "admin";

const ROUTE_RULES: { prefix: string; roles: Role[] }[] = [
  { prefix: "/admin", roles: ["admin"] },
  { prefix: "/inspector", roles: ["inspector", "admin"] },
  { prefix: "/reportes", roles: ["vecino", "inspector", "admin"] },
  { prefix: "/mascotas", roles: ["vecino", "inspector", "admin"] },
];

export function isRole(value: unknown): value is Role {
  return value === "vecino" || value === "inspector" || value === "admin";
}

/** Devuelve true si el rol puede abrir la ruta. Las rutas sin regla son públicas. */
export function canAccess(role: Role | null, pathname: string): boolean {
  const rule = ROUTE_RULES.find((r) => pathname === r.prefix || pathname.startsWith(r.prefix + "/"));
  if (!rule) return true;
  return role !== null && rule.roles.includes(role);
}

export function isProtected(pathname: string): boolean {
  return ROUTE_RULES.some((r) => pathname === r.prefix || pathname.startsWith(r.prefix + "/"));
}
