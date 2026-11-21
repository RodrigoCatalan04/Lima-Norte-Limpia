import QRCode from "qrcode";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// HU08: descarga el QR de la mascota. RLS: solo el dueño obtiene la fila.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("No encontrado", { status: 404 });
  const supabase = await createClient();
  const { data: pet } = await supabase.from("pets").select("code").eq("id", id).maybeSingle();
  if (!pet) return new NextResponse("No encontrado", { status: 404 });

  const origin = new URL(request.url).origin;
  const png = await QRCode.toBuffer(`${origin}/mascota/${pet.code}`, { width: 512, margin: 2, errorCorrectionLevel: "M" });
  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="qr-${pet.code}.png"`,
      "Cache-Control": "private, no-store",
    },
  });
}
