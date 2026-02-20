import { prisma } from "@km/db";
import { getSession } from "@/lib/auth";
import { isJsonRequest, locationsRedirect, normalizeLocationName } from "@/lib/locations";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return new NextResponse("Forbidden", { status: 403 });

  const url = new URL(req.url);
  const q = normalizeLocationName(url.searchParams.get("q") ?? "");
  const provinceId = (url.searchParams.get("provinceId") ?? "").trim();

  const districts = await prisma.district.findMany({
    where: {
      ...(provinceId ? { provinceId } : {}),
      ...(q
        ? {
            name: {
              contains: q,
              mode: "insensitive",
            },
          }
        : {}),
    },
    include: {
      province: {
        select: { id: true, name: true },
      },
    },
    orderBy: [{ province: { name: "asc" } }, { name: "asc" }],
    take: 1000,
  });

  return NextResponse.json({ ok: true, districts });
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
  const provinceId = String(data?.provinceId ?? form?.get("provinceId") ?? "").trim();
  const tab = String(data?.tab ?? form?.get("tab") ?? "districts");

  if (!provinceId) {
    const message = "Viloyat tanlanishi shart";
    if (asJson) return NextResponse.json({ ok: false, error: message }, { status: 400 });
    return NextResponse.redirect(locationsRedirect(req, { tab, error: message }), 303);
  }

  if (!name) {
    const message = "Tuman nomi majburiy";
    if (asJson) return NextResponse.json({ ok: false, error: message }, { status: 400 });
    return NextResponse.redirect(locationsRedirect(req, { tab, provinceId, error: message }), 303);
  }

  const province = await prisma.province.findUnique({ where: { id: provinceId }, select: { id: true } });
  if (!province) {
    const message = "Viloyat topilmadi";
    if (asJson) return NextResponse.json({ ok: false, error: message }, { status: 404 });
    return NextResponse.redirect(locationsRedirect(req, { tab, error: message }), 303);
  }

  const duplicate = await prisma.district.findFirst({
    where: {
      provinceId,
      name: { equals: name, mode: "insensitive" },
    },
    select: { id: true },
  });

  if (duplicate) {
    const message = "Bu tuman allaqachon mavjud";
    if (asJson) return NextResponse.json({ ok: false, error: message }, { status: 409 });
    return NextResponse.redirect(locationsRedirect(req, { tab, provinceId, error: message }), 303);
  }

  const district = await prisma.district.create({
    data: {
      provinceId,
      name,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: session.userId,
      action: "CREATE",
      entity: "District",
      entityId: district.id,
      payload: { name: district.name, provinceId },
    },
  });

  if (asJson) return NextResponse.json({ ok: true, district });
  return NextResponse.redirect(locationsRedirect(req, { tab, provinceId, msg: "Tuman qo'shildi" }), 303);
}
