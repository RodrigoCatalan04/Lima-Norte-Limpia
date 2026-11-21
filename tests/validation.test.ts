import { describe, expect, it } from "vitest";
import { isInsideLimaNorte, petSchema, reportSchema, signUpSchema, statusUpdateSchema, validatePhoto } from "@/lib/validation";

const validReport = { type: "heces", description: "Frente al parque", lat: -11.97, lng: -77.07, districtId: 1 };

describe("signUpSchema", () => {
  it("acepta datos válidos", () => {
    const r = signUpSchema.safeParse({ email: "vecino@correo.com", password: "12345678", fullName: "Ana Pérez", districtId: 2 });
    expect(r.success).toBe(true);
  });
  it("rechaza contraseñas cortas", () => {
    const r = signUpSchema.safeParse({ email: "vecino@correo.com", password: "1234", fullName: "Ana Pérez", districtId: 2 });
    expect(r.success).toBe(false);
  });
  it("rechaza correos inválidos y distritos inexistentes", () => {
    expect(signUpSchema.safeParse({ email: "no-es-correo", password: "12345678", fullName: "Ana", districtId: 1 }).success).toBe(false);
    expect(signUpSchema.safeParse({ email: "a@b.com", password: "12345678", fullName: "Ana", districtId: 99 }).success).toBe(false);
  });
});

describe("reportSchema", () => {
  it("acepta un reporte dentro de Lima Norte", () => {
    expect(reportSchema.safeParse(validReport).success).toBe(true);
  });
  it("rechaza ubicaciones fuera de los distritos atendidos", () => {
    const r = reportSchema.safeParse({ ...validReport, lat: -12.12, lng: -77.03 }); // Miraflores
    expect(r.success).toBe(false);
  });
  it("rechaza tipos de reporte desconocidos", () => {
    expect(reportSchema.safeParse({ ...validReport, type: "otro" }).success).toBe(false);
  });
  it("rechaza descripciones de más de 500 caracteres", () => {
    expect(reportSchema.safeParse({ ...validReport, description: "x".repeat(501) }).success).toBe(false);
  });
});

describe("isInsideLimaNorte", () => {
  it("reconoce puntos de Comas y descarta puntos de otros distritos", () => {
    expect(isInsideLimaNorte(-11.93, -77.05)).toBe(true);
    expect(isInsideLimaNorte(-12.05, -77.04)).toBe(false);
  });
});

describe("validatePhoto", () => {
  it("acepta JPG y PNG de hasta 5 MB", () => {
    expect(validatePhoto({ type: "image/jpeg", size: 1024 })).toBeNull();
    expect(validatePhoto({ type: "image/png", size: 5 * 1024 * 1024 })).toBeNull();
  });
  it("rechaza otros tipos y archivos pesados", () => {
    expect(validatePhoto({ type: "application/pdf", size: 1024 })).not.toBeNull();
    expect(validatePhoto({ type: "image/png", size: 5 * 1024 * 1024 + 1 })).not.toBeNull();
  });
});

describe("statusUpdateSchema", () => {
  const id = "3f2b8a1e-5d0c-4a47-9a1e-0c9a5d7f1b22";
  it("exige comentario para marcar un reporte como Atendido", () => {
    expect(statusUpdateSchema.safeParse({ reportId: id, status: "atendido" }).success).toBe(false);
    expect(statusUpdateSchema.safeParse({ reportId: id, status: "atendido", comment: "Se limpió la vereda" }).success).toBe(true);
  });
  it("permite pasar a En revisión sin comentario", () => {
    expect(statusUpdateSchema.safeParse({ reportId: id, status: "en_revision" }).success).toBe(true);
  });
});

describe("petSchema", () => {
  it("acepta una mascota válida y rechaza una sin nombre", () => {
    expect(petSchema.safeParse({ name: "Firulais", species: "perro", sex: "macho", vaccinated: "true", districtId: 3 }).success).toBe(true);
    expect(petSchema.safeParse({ name: "", species: "perro", sex: "macho", districtId: 3 }).success).toBe(false);
  });
});

describe("Sprint 2: mascotas (HU06/HU07)", () => {
  it("acepta una mascota válida y la marca no vacunada por defecto", async () => {
    const { petSchema } = await import("@/lib/validation");
    const r = petSchema.safeParse({ name: "Firulais", species: "perro", sex: "macho", districtId: "1" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.vaccinated).toBe(false);
  });
  it("rechaza una mascota sin nombre", async () => {
    const { petSchema } = await import("@/lib/validation");
    const r = petSchema.safeParse({ name: "  ", species: "perro", sex: "macho", districtId: "1" });
    expect(r.success).toBe(false);
  });
  it("rechaza especie desconocida", async () => {
    const { petSchema } = await import("@/lib/validation");
    expect(petSchema.safeParse({ name: "X", species: "dragon", sex: "macho", districtId: "1" }).success).toBe(false);
  });
});
