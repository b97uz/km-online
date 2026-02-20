import { prisma } from "@km/db";
import { getSession } from "@/lib/auth";
import {
  isJsonRequest,
  locationsRedirect,
  normalizeLocationName,
  parseInstitutionCatalogType,
} from "@/lib/locations";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return new NextResponse("Forbidden", { status: 403 });

  const url = new URL(req.url);
  const q = normalizeLocationName(url.searchParams.get("q") ?? "");
  const districtId = (url.searchParams.get("districtId") ?? "").trim();
  const type = parseInstitutionCatalogType((url.searchParams.get("type") ?? "").trim());

  const institutions = await prisma.institution.findMany({
    where: {
      ...(districtId ? { districtId } : {}),
      ...(type ? { type } : {}),
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
      district: {
        select: {
          id: true,
          name: true,
          province: {
            select: { id: true, name: true },
          },
        },
      },
    },
    orderBy: [{ district: { province: { name: "asc" } } }, { district: { name: "asc" } }, { name: "asc" }],
    take: 2000,
  });

  return NextResponse.json({ ok: true, institutions });
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
  const districtId = String(data?.districtId ?? form?.get("districtId") ?? "").trim();
  const type = parseInstitutionCatalogType(String(data?.type ?? form?.get("type") ?? "").trim());
  const tab = String(data?.tab ?? form?.get("tab") ?? "schools");
  const provinceId = String(data?.provinceId ?? form?.get("provinceId") ?? "").trim() || null;

  if (!provinceId) {
    const message = "Viloyat tanlanishi shart";
    if (asJson) return NextResponse.json({ ok: false, error: message }, { status: 400 });
    return NextResponse.redirect(locationsRedirect(req, { tab, error: message }), 303);
  }

  if (!districtId) {
    const message = "Tuman tanlanishi shart";
    if (asJson) return NextResponse.json({ ok: false, error: message }, { status: 400 });
    return NextResponse.redirect(locationsRedirect(req, { tab, provinceId, error: message }), 303);
  }

  if (!type) {
    const message = "Muassasa turi noto'g'ri";
    if (asJson) return NextResponse.json({ ok: false, error: message }, { status: 400 });
    return NextResponse.redirect(locationsRedirect(req, { tab, provinceId, districtId, error: message }), 303);
  }

  if (!name) {
    const message = "Muassasa nomi majburiy";
    if (asJson) return NextResponse.json({ ok: false, error: message }, { status: 400 });
    return NextResponse.redirect(locationsRedirect(req, { tab, provinceId, districtId, error: message }), 303);
  }

  const district = await prisma.district.findUnique({ where: { id: districtId }, select: { id: true, provinceId: true } });
  if (!district) {
    const message = "Tuman topilmadi";
    if (asJson) return NextResponse.json({ ok: false, error: message }, { status: 404 });
    return NextResponse.redirect(locationsRedirect(req, { tab, provinceId, error: message }), 303);
  }

  const duplicate = await prisma.institution.findFirst({
    where: {
      districtId,
      type,
      name: { equals: name, mode: "insensitive" },
    },
    select: { id: true },
  });

  if (duplicate) {
    const message = "Bu muassasa allaqachon mavjud";
    if (asJson) return NextResponse.json({ ok: false, error: message }, { status: 409 });
    return NextResponse.redirect(
      locationsRedirect(req, { tab, provinceId: district.provinceId, districtId, error: message }),
      303,
    );
  }

  const institution = await prisma.institution.create({
    data: {
      districtId,
      type,
      name,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: session.userId,
      action: "CREATE",
      entity: "Institution",
      entityId: institution.id,
      payload: { name: institution.name, districtId, type },
    },
  });

  if (asJson) return NextResponse.json({ ok: true, institution });
  return NextResponse.redirect(
    locationsRedirect(req, { tab, provinceId: district.provinceId, districtId, msg: "Muassasa qo'shildi" }),
    303,
  );
}
