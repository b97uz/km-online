import { prisma } from "@km/db";
import { getSession } from "@/lib/auth";
import { isJsonRequest, locationsRedirect, normalizeLocationName } from "@/lib/locations";
import { NextResponse } from "next/server";

async function updateDistrict(
  req: Request,
  id: string,
  payload: { name?: string; provinceId?: string; tab?: string },
  asJson: boolean,
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return new NextResponse("Forbidden", { status: 403 });

  const district = await prisma.district.findUnique({ where: { id } });
  if (!district) {
    if (asJson) return NextResponse.json({ ok: false, error: "Tuman topilmadi" }, { status: 404 });
    return NextResponse.redirect(locationsRedirect(req, { tab: payload.tab ?? "districts", error: "Tuman topilmadi" }), 303);
  }

  const name = normalizeLocationName(payload.name ?? district.name);
  const provinceId = (payload.provinceId ?? district.provinceId).trim();
  const tab = payload.tab ?? "districts";

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
      id: { not: district.id },
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

  const updated = await prisma.district.update({
    where: { id: district.id },
    data: {
      name,
      provinceId,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: session.userId,
      action: "UPDATE",
      entity: "District",
      entityId: updated.id,
      payload: { name: updated.name, provinceId: updated.provinceId },
    },
  });

  if (asJson) return NextResponse.json({ ok: true, district: updated });
  return NextResponse.redirect(locationsRedirect(req, { tab, provinceId, msg: "Tuman yangilandi" }), 303);
}

async function deleteDistrict(req: Request, id: string, tab: string, provinceId: string | null, asJson: boolean) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return new NextResponse("Forbidden", { status: 403 });

  const district = await prisma.district.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      provinceId: true,
      _count: {
        select: {
          institutions: true,
          students: true,
        },
      },
    },
  });

  if (!district) {
    const message = "Tuman topilmadi";
    if (asJson) return NextResponse.json({ ok: false, error: message }, { status: 404 });
    return NextResponse.redirect(locationsRedirect(req, { tab, provinceId, error: message }), 303);
  }

  if (district._count.institutions > 0) {
    const message = "Avval shu tumandagi muassasalarni o'chiring";
    if (asJson) return NextResponse.json({ ok: false, error: message }, { status: 409 });
    return NextResponse.redirect(locationsRedirect(req, { tab, provinceId: district.provinceId, error: message }), 303);
  }

  if (district._count.students > 0) {
    const message = "Bu tuman studentlarga biriktirilgan. Avval student joylashuvini yangilang";
    if (asJson) return NextResponse.json({ ok: false, error: message }, { status: 409 });
    return NextResponse.redirect(locationsRedirect(req, { tab, provinceId: district.provinceId, error: message }), 303);
  }

  await prisma.district.delete({ where: { id: district.id } });

  await prisma.auditLog.create({
    data: {
      actorId: session.userId,
      action: "DELETE",
      entity: "District",
      entityId: district.id,
      payload: { name: district.name, provinceId: district.provinceId },
    },
  });

  if (asJson) return NextResponse.json({ ok: true });
  return NextResponse.redirect(locationsRedirect(req, { tab, provinceId: district.provinceId, msg: "Tuman o'chirildi" }), 303);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = (await req.json()) as { name?: string; provinceId?: string; tab?: string };
  return updateDistrict(req, id, data, true);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  return deleteDistrict(req, id, url.searchParams.get("tab") ?? "districts", url.searchParams.get("provinceId"), isJsonRequest(req));
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const form = await req.formData();
  const method = String(form.get("_method") ?? "").toUpperCase();
  const tab = String(form.get("tab") ?? "districts");
  const provinceId = String(form.get("provinceId") ?? "").trim() || null;

  if (method === "PATCH") {
    return updateDistrict(
      req,
      id,
      {
        name: String(form.get("name") ?? ""),
        provinceId: String(form.get("provinceId") ?? ""),
        tab,
      },
      false,
    );
  }

  if (method === "DELETE") {
    return deleteDistrict(req, id, tab, provinceId, false);
  }

  return new NextResponse("Method Not Allowed", { status: 405 });
}
