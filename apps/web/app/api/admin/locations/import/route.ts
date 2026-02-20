import { InstitutionCatalogType } from "@prisma/client";
import { prisma } from "@km/db";
import { getSession } from "@/lib/auth";
import { isJsonRequest, locationsRedirect, normalizeLocationName } from "@/lib/locations";
import { NextResponse } from "next/server";

type ImportDistrictInput = {
  name?: string;
  schools?: string[];
  lyceums?: string[];
};

type ImportProvinceInput = {
  name?: string;
  districts?: ImportDistrictInput[];
};

type ImportPayload = {
  provinces?: ImportProvinceInput[];
};

function uniqueNormalized(values: unknown[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = normalizeLocationName(String(value ?? ""));
    if (!normalized) continue;
    const key = normalized.toLocaleLowerCase("uz-UZ");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
  }

  return result;
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return new NextResponse("Forbidden", { status: 403 });

  const asJson = isJsonRequest(req);
  const tab = "provinces";

  let payload: ImportPayload;

  try {
    if ((req.headers.get("content-type") ?? "").includes("application/json")) {
      payload = (await req.json()) as ImportPayload;
    } else {
      const form = await req.formData();
      const raw = String(form.get("payload") ?? "{}");
      payload = JSON.parse(raw) as ImportPayload;
    }
  } catch {
    const message = "JSON formati noto'g'ri";
    if (asJson) return NextResponse.json({ ok: false, error: message }, { status: 400 });
    return NextResponse.redirect(locationsRedirect(req, { tab, error: message }), 303);
  }

  const provincesInput = Array.isArray(payload.provinces) ? payload.provinces : [];
  if (provincesInput.length === 0) {
    const message = "Import uchun provinces massivini yuboring";
    if (asJson) return NextResponse.json({ ok: false, error: message }, { status: 400 });
    return NextResponse.redirect(locationsRedirect(req, { tab, error: message }), 303);
  }

  const summary = {
    createdProvinces: 0,
    createdDistricts: 0,
    createdInstitutions: 0,
    skipped: 0,
  };

  await prisma.$transaction(async (tx) => {
    for (const provinceInput of provincesInput) {
      const provinceName = normalizeLocationName(provinceInput?.name ?? "");
      if (!provinceName) {
        summary.skipped += 1;
        continue;
      }

      const foundProvince = await tx.province.findFirst({
        where: {
          name: {
            equals: provinceName,
            mode: "insensitive",
          },
        },
      });

      const province =
        foundProvince ??
        (await tx.province.create({
          data: { name: provinceName },
        }));
      if (!foundProvince) summary.createdProvinces += 1;

      const districtsInput = Array.isArray(provinceInput?.districts) ? provinceInput.districts : [];

      for (const districtInput of districtsInput) {
        const districtName = normalizeLocationName(districtInput?.name ?? "");
        if (!districtName) {
          summary.skipped += 1;
          continue;
        }

        const foundDistrict = await tx.district.findFirst({
          where: {
            provinceId: province.id,
            name: {
              equals: districtName,
              mode: "insensitive",
            },
          },
        });

        const district =
          foundDistrict ??
          (await tx.district.create({
            data: {
              provinceId: province.id,
              name: districtName,
            },
          }));
        if (!foundDistrict) summary.createdDistricts += 1;

        const schools = uniqueNormalized(Array.isArray(districtInput?.schools) ? districtInput.schools : []);
        const lyceums = uniqueNormalized(Array.isArray(districtInput?.lyceums) ? districtInput.lyceums : []);

        const addInstitutions = async (type: InstitutionCatalogType, names: string[]) => {
          for (const name of names) {
            const exists = await tx.institution.findFirst({
              where: {
                districtId: district.id,
                type,
                name: {
                  equals: name,
                  mode: "insensitive",
                },
              },
              select: { id: true },
            });

            if (exists) {
              summary.skipped += 1;
              continue;
            }

            await tx.institution.create({
              data: {
                districtId: district.id,
                type,
                name,
              },
            });
            summary.createdInstitutions += 1;
          }
        };

        await addInstitutions(InstitutionCatalogType.SCHOOL, schools);
        await addInstitutions(InstitutionCatalogType.LYCEUM_COLLEGE, lyceums);
      }
    }
  });

  await prisma.auditLog.create({
    data: {
      actorId: session.userId,
      action: "CREATE",
      entity: "LocationsImport",
      entityId: session.userId,
      payload: summary,
    },
  });

  if (asJson) return NextResponse.json({ ok: true, summary });

  const msg = `Import tugadi: viloyat ${summary.createdProvinces}, tuman ${summary.createdDistricts}, muassasa ${summary.createdInstitutions}, skip ${summary.skipped}`;
  return NextResponse.redirect(locationsRedirect(req, { tab, msg }), 303);
}
