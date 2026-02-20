import { prisma } from "@km/db";
import { getSession } from "@/lib/auth";
import { isJsonRequest, locationsRedirect, normalizeLocationName } from "@/lib/locations";
import { NextResponse } from "next/server";

async function updateProvince(
  req: Request,
  id: string,
  payload: { name?: string; tab?: string },
  asJson: boolean,
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return new NextResponse("Forbidden", { status: 403 });

  const province = await prisma.province.findUnique({ where: { id } });
  if (!province) {
    if (asJson) return NextResponse.json({ ok: false, error: "Viloyat topilmadi" }, { status: 404 });
    return NextResponse.redirect(locationsRedirect(req, { tab: payload.tab ?? "provinces", error: "Viloyat topilmadi" }), 303);
  }

  const name = normalizeLocationName(payload.name ?? "");
  if (!name) {
    if (asJson) return NextResponse.json({ ok: false, error: "Viloyat nomi majburiy" }, { status: 400 });
    return NextResponse.redirect(locationsRedirect(req, { tab: payload.tab ?? "provinces", error: "Viloyat nomi majburiy" }), 303);
  }

  const duplicate = await prisma.province.findFirst({
    where: {
      id: { not: province.id },
      name: { equals: name, mode: "insensitive" },
    },
    select: { id: true },
  });

  if (duplicate) {
    if (asJson) return NextResponse.json({ ok: false, error: "Bu viloyat allaqachon mavjud" }, { status: 409 });
    return NextResponse.redirect(locationsRedirect(req, { tab: payload.tab ?? "provinces", error: "Bu viloyat allaqachon mavjud" }), 303);
  }

  const updated = await prisma.province.update({
    where: { id: province.id },
    data: { name },
  });

  await prisma.auditLog.create({
    data: {
      actorId: session.userId,
      action: "UPDATE",
      entity: "Province",
      entityId: updated.id,
      payload: { name: updated.name },
    },
  });

  if (asJson) return NextResponse.json({ ok: true, province: updated });
  return NextResponse.redirect(locationsRedirect(req, { tab: payload.tab ?? "provinces", msg: "Viloyat yangilandi" }), 303);
}

async function deleteProvince(req: Request, id: string, tab: string, asJson: boolean) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return new NextResponse("Forbidden", { status: 403 });

  const province = await prisma.province.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          districts: true,
          students: true,
        },
      },
    },
  });

  if (!province) {
    if (asJson) return NextResponse.json({ ok: false, error: "Viloyat topilmadi" }, { status: 404 });
    return NextResponse.redirect(locationsRedirect(req, { tab, error: "Viloyat topilmadi" }), 303);
  }

  if (province._count.districts > 0) {
    const message = "Avval shu viloyatga bog'langan tumanlarni o'chiring";
    if (asJson) return NextResponse.json({ ok: false, error: message }, { status: 409 });
    return NextResponse.redirect(locationsRedirect(req, { tab, error: message }), 303);
  }

  if (province._count.students > 0) {
    const message = "Bu viloyat studentlarga biriktirilgan. Avval student joylashuvini yangilang";
    if (asJson) return NextResponse.json({ ok: false, error: message }, { status: 409 });
    return NextResponse.redirect(locationsRedirect(req, { tab, error: message }), 303);
  }

  await prisma.province.delete({ where: { id: province.id } });

  await prisma.auditLog.create({
    data: {
      actorId: session.userId,
      action: "DELETE",
      entity: "Province",
      entityId: province.id,
      payload: { name: province.name },
    },
  });

  if (asJson) return NextResponse.json({ ok: true });
  return NextResponse.redirect(locationsRedirect(req, { tab, msg: "Viloyat o'chirildi" }), 303);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = (await req.json()) as { name?: string; tab?: string };
  return updateProvince(req, id, data, true);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  return deleteProvince(req, id, url.searchParams.get("tab") ?? "provinces", isJsonRequest(req));
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const form = await req.formData();
  const method = String(form.get("_method") ?? "").toUpperCase();
  const tab = String(form.get("tab") ?? "provinces");

  if (method === "PATCH") {
    return updateProvince(
      req,
      id,
      {
        name: String(form.get("name") ?? ""),
        tab,
      },
      false,
    );
  }

  if (method === "DELETE") {
    return deleteProvince(req, id, tab, false);
  }

  return new NextResponse("Method Not Allowed", { status: 405 });
}
