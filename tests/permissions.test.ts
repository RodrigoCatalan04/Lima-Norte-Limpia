import { describe, expect, it } from "vitest";
import { canAccess, isProtected, isRole } from "@/lib/roles";
import { canCreateReport } from "@/lib/ratelimit";

describe("canAccess (permisos por rol)", () => {
  it("deja las rutas públicas abiertas", () => {
    expect(canAccess(null, "/")).toBe(true);
    expect(canAccess(null, "/mapa")).toBe(true);
    expect(canAccess(null, "/login")).toBe(true);
  });
  it("exige sesión en las rutas protegidas", () => {
    expect(canAccess(null, "/reportes")).toBe(false);
    expect(canAccess(null, "/mascotas/nueva")).toBe(false);
  });
  it("un vecino no entra a inspector ni a admin", () => {
    expect(canAccess("vecino", "/reportes/nuevo")).toBe(true);
    expect(canAccess("vecino", "/inspector")).toBe(false);
    expect(canAccess("vecino", "/admin/roles")).toBe(false);
  });
  it("un inspector entra a su bandeja pero no a admin", () => {
    expect(canAccess("inspector", "/inspector/abc")).toBe(true);
    expect(canAccess("inspector", "/admin")).toBe(false);
  });
  it("el administrador accede a todo", () => {
    expect(canAccess("admin", "/admin/roles")).toBe(true);
    expect(canAccess("admin", "/inspector")).toBe(true);
  });
  it("no confunde prefijos parecidos", () => {
    expect(isProtected("/administrador-falso")).toBe(false);
    expect(isProtected("/admin")).toBe(true);
  });
  it("isRole solo acepta los tres roles", () => {
    expect(isRole("admin")).toBe(true);
    expect(isRole("superusuario")).toBe(false);
  });
});

describe("canCreateReport (límite de reportes por hora)", () => {
  const now = new Date("2026-11-21T12:00:00Z");
  const minutesAgo = (m: number) => new Date(now.getTime() - m * 60 * 1000);
  it("permite crear con menos de 5 reportes en la última hora", () => {
    expect(canCreateReport([minutesAgo(5), minutesAgo(10)], now)).toBe(true);
  });
  it("bloquea al llegar a 5 reportes en la última hora", () => {
    expect(canCreateReport([1, 2, 3, 4, 5].map(minutesAgo), now)).toBe(false);
  });
  it("ignora los reportes de hace más de una hora", () => {
    expect(canCreateReport([1, 2, 3, 4].map(minutesAgo).concat(minutesAgo(61), minutesAgo(90)), now)).toBe(true);
  });
});

describe("Sprint 4: rutas públicas y dashboard", () => {
  it("la ficha pública de mascota (/mascota/CODIGO) es accesible sin sesión", async () => {
    const { canAccess } = await import("@/lib/roles");
    expect(canAccess(null, "/mascota/LNL-0001")).toBe(true);
  });
  it("el dashboard solo es para administradores", async () => {
    const { canAccess } = await import("@/lib/roles");
    expect(canAccess("admin", "/admin/dashboard")).toBe(true);
    expect(canAccess("inspector", "/admin/dashboard")).toBe(false);
    expect(canAccess("vecino", "/admin/dashboard")).toBe(false);
  });
  it("el mapa de calor es público", async () => {
    const { canAccess } = await import("@/lib/roles");
    expect(canAccess(null, "/mapa")).toBe(true);
  });
});
