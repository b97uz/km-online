import { prisma } from "@km/db";
import { getSession } from "@/lib/auth";
import { isJsonRequest, locationsRedirect, normalizeLocationName } from "@/lib/locations";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return new NextResponse("Forbidden", { status: 403 });

  const url = new URL(req.url);
  const q = normalizeLocationName(url.searchParams.get("q") ?? "");

  const provinces = await prisma.province.findMany({
    where: q
      ? {
          name: {
            contains: q,
            mode: "insensitive",
          },
        }
      : undefined,
    orderBy: { name: "asc" },
    take: 500,
  });

  return NextResponse.json({ ok: true, provinces });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return new NextResponse("Forbidden", { status: 403 });

  const asJson = isJsonRequest(req);
  const data = (req.headers.get("content-type") ?? "").includes("application/json")
    ? ((await req.json()) as Record<string, unknown>)
    : null;
  const form = data ? null : await req.formData();

  const name = normalizeLocationName(String(data?.name ?? form?.get("name") ?? ""));
  const tab = String(data?.tab ?? form?.get("tab") ?? "provinces");

  if (!name) {
    if (asJson) return NextResponse.json({ ok: false, error: "Viloyat nomi majburiy" }, { status: 400 });
    return NextResponse.redirect(locationsRedirect(req, { tab, error: "Viloyat nomi majburiy" }), 303);
  }

  const existing = await prisma.province.findFirst({
    where: {
      name: {
        equals: name,
        mode: "insensitive",
      },
    },
    select: { id: true },
  });

  if (existing) {
    if (asJson) return NextResponse.json({ ok: false, error: "Bu viloyat allaqachon mavjud" }, { status: 409 });
    return NextResponse.redirect(locationsRedirect(req, { tab, error: "Bu viloyat allaqachon mavjud" }), 303);
  }

  const province = await prisma.province.create({ data: { name } });

  await prisma.auditLog.create({
    data: {
      actorId: session.userId,
      action: "CREATE",
      entity: "Province",
      entityId: province.id,
      payload: { name: province.name },
    },
  });

  if (asJson) return NextResponse.json({ ok: true, province });
  return NextResponse.redirect(locationsRedirect(req, { tab, msg: "Viloyat qo'shildi" }), 303);
}
