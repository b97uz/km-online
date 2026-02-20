import { prisma } from "@km/db";
import { getSession } from "@/lib/auth";
import {
  isJsonRequest,
  locationsRedirect,
  normalizeLocationName,
  parseInstitutionCatalogType,
} from "@/lib/locations";
import { NextResponse } from "next/server";

async function updateInstitution(
  req: Request,
  id: string,
  payload: { name?: string; districtId?: string; type?: string; tab?: string; provinceId?: string },
  asJson: boolean,
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return new NextResponse("Forbidden", { status: 403 });

  const institution = await prisma.institution.findUnique({ where: { id } });
  if (!institution) {
    const message = "Muassasa topilmadi";
    if (asJson) return NextResponse.json({ ok: false, error: message }, { status: 404 });
    return NextResponse.redirect(locationsRedirect(req, { tab: payload.tab ?? "schools", error: message }), 303);
  }

  const name = normalizeLocationName(payload.name ?? institution.name);
  const districtId = (payload.districtId ?? institution.districtId).trim();
  const type = parseInstitutionCatalogType(payload.type ?? institution.type);
  const tab = payload.tab ?? (institution.type === "SCHOOL" ? "schools" : "lyceums");

  if (!districtId) {
    const message = "Tuman tanlanishi shart";
    if (asJson) return NextResponse.json({ ok: false, error: message }, { status: 400 });
    return NextResponse.redirect(locationsRedirect(req, { tab, provinceId: payload.provinceId, error: message }), 303);
  }

  if (!type) {
    const message = "Muassasa turi noto'g'ri";
    if (asJson) return NextResponse.json({ ok: false, error: message }, { status: 400 });
    return NextResponse.redirect(locationsRedirect(req, { tab, provinceId: payload.provinceId, districtId, error: message }), 303);
  }

  if (!name) {
    const message = "Muassasa nomi majburiy";
    if (asJson) return NextResponse.json({ ok: false, error: message }, { status: 400 });
    return NextResponse.redirect(locationsRedirect(req, { tab, provinceId: payload.provinceId, districtId, error: message }), 303);
  }

  const district = await prisma.district.findUnique({ where: { id: districtId }, select: { id: true, provinceId: true } });
  if (!district) {
    const message = "Tuman topilmadi";
    if (asJson) return NextResponse.json({ ok: false, error: message }, { status: 404 });
    return NextResponse.redirect(locationsRedirect(req, { tab, provinceId: payload.provinceId, error: message }), 303);
  }

  const duplicate = await prisma.institution.findFirst({
    where: {
      id: { not: institution.id },
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

  const updated = await prisma.institution.update({
    where: { id: institution.id },
    data: { name, districtId, type },
  });

  await prisma.auditLog.create({
    data: {
      actorId: session.userId,
      action: "UPDATE",
      entity: "Institution",
      entityId: updated.id,
      payload: { name: updated.name, districtId: updated.districtId, type: updated.type },
    },
  });

  if (asJson) return NextResponse.json({ ok: true, institution: updated });
  return NextResponse.redirect(
    locationsRedirect(req, { tab, provinceId: district.provinceId, districtId, msg: "Muassasa yangilandi" }),
    303,
  );
}

async function deleteInstitution(
  req: Request,
  id: string,
  payload: { tab?: string; provinceId?: string; districtId?: string },
  asJson: boolean,
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return new NextResponse("Forbidden", { status: 403 });

  const institution = await prisma.institution.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      type: true,
      districtId: true,
      district: {
        select: {
          provinceId: true,
        },
      },
      _count: {
        select: {
          students: true,
        },
      },
    },
  });

  if (!institution) {
    const message = "Muassasa topilmadi";
    if (asJson) return NextResponse.json({ ok: false, error: message }, { status: 404 });
    return NextResponse.redirect(locationsRedirect(req, { tab: payload.tab ?? "schools", error: message }), 303);
  }

  if (institution._count.students > 0) {
    const message = "Bu muassasa studentlarga biriktirilgan. Avval student ma'lumotlarini yangilang";
    if (asJson) return NextResponse.json({ ok: false, error: message }, { status: 409 });
    return NextResponse.redirect(
      locationsRedirect(req, {
        tab: payload.tab ?? (institution.type === "SCHOOL" ? "schools" : "lyceums"),
        provinceId: institution.district.provinceId,
        districtId: institution.districtId,
        error: message,
      }),
      303,
    );
  }

  await prisma.institution.delete({ where: { id: institution.id } });

  await prisma.auditLog.create({
    data: {
      actorId: session.userId,
      action: "DELETE",
      entity: "Institution",
      entityId: institution.id,
      payload: { name: institution.name, districtId: institution.districtId, type: institution.type },
    },
  });

  if (asJson) return NextResponse.json({ ok: true });
  return NextResponse.redirect(
    locationsRedirect(req, {
      tab: payload.tab ?? (institution.type === "SCHOOL" ? "schools" : "lyceums"),
      provinceId: institution.district.provinceId,
      districtId: institution.districtId,
      msg: "Muassasa o'chirildi",
    }),
    303,
  );
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = (await req.json()) as {
    name?: string;
    districtId?: string;
    type?: string;
    tab?: string;
    provinceId?: string;
  };
  return updateInstitution(req, id, data, true);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  return deleteInstitution(
    req,
    id,
    {
      tab: url.searchParams.get("tab") ?? undefined,
      provinceId: url.searchParams.get("provinceId") ?? undefined,
      districtId: url.searchParams.get("districtId") ?? undefined,
    },
    isJsonRequest(req),
  );
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const form = await req.formData();
  const method = String(form.get("_method") ?? "").toUpperCase();

  const tab = String(form.get("tab") ?? "schools");
  const provinceId = String(form.get("provinceId") ?? "").trim() || undefined;
  const districtId = String(form.get("districtId") ?? "").trim() || undefined;

  if (method === "PATCH") {
    return updateInstitution(
      req,
      id,
      {
        name: String(form.get("name") ?? ""),
        districtId,
        type: String(form.get("type") ?? ""),
        tab,
        provinceId,
      },
      false,
    );
  }

  if (method === "DELETE") {
    return deleteInstitution(
      req,
      id,
      {
        tab,
        provinceId,
        districtId,
      },
      false,
    );
  }

  return new NextResponse("Method Not Allowed", { status: 405 });
}
