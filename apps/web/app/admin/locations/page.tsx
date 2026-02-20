import Link from "next/link";
import { InstitutionCatalogType } from "@prisma/client";
import { prisma } from "@km/db";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { isLocationTableMissingError } from "@/lib/location-table";

type LocationsPageParams = {
  tab?: string;
  provinceId?: string;
  districtId?: string;
  q?: string;
  msg?: string;
  error?: string;
};

type LocationTab = "provinces" | "districts" | "schools" | "lyceums";

const tabs: { id: LocationTab; label: string }[] = [
  { id: "provinces", label: "Viloyatlar" },
  { id: "districts", label: "Tumanlar" },
  { id: "schools", label: "Maktablar" },
  { id: "lyceums", label: "Litsey/Kollejlar" },
];

const importTemplate = `{
  "provinces": [
    {
      "name": "Toshkent",
      "districts": [
        {
          "name": "Chilonzor",
          "schools": ["1-maktab", "2-maktab"],
          "lyceums": ["A litsey", "B kollej"]
        }
      ]
    }
  ]
}`;

function parseTab(value: string | undefined): LocationTab {
  if (value === "districts") return "districts";
  if (value === "schools") return "schools";
  if (value === "lyceums") return "lyceums";
  return "provinces";
}

function withQuery(
  tab: LocationTab,
  params: {
    provinceId?: string;
    districtId?: string;
    q?: string;
  },
) {
  const search = new URLSearchParams();
  search.set("tab", tab);
  if (params.provinceId) search.set("provinceId", params.provinceId);
  if (params.districtId) search.set("districtId", params.districtId);
  if (params.q) search.set("q", params.q);

  const query = search.toString();
  return query ? `/admin/locations?${query}` : "/admin/locations";
}

export default async function AdminLocationsPage({
  searchParams,
}: {
  searchParams: Promise<LocationsPageParams>;
}) {
  const params = await searchParams;
  const tab = parseTab(params.tab);
  const provinceId = (params.provinceId ?? "").trim();
  const districtId = (params.districtId ?? "").trim();
  const q = (params.q ?? "").trim();
  let provinces: Awaited<ReturnType<typeof prisma.province.findMany>> = [];
  let provinceDistricts: Awaited<ReturnType<typeof prisma.district.findMany>> = [];
  let provinceRows: Awaited<
    ReturnType<
      typeof prisma.province.findMany<{
        include: { _count: { select: { districts: true; students: true } } };
      }>
    >
  > = [];
  let districtRows: Awaited<
    ReturnType<
      typeof prisma.district.findMany<{
        include: {
          province: { select: { id: true; name: true } };
          _count: { select: { institutions: true; students: true } };
        };
      }>
    >
  > = [];
  let schoolRows: Awaited<
    ReturnType<
      typeof prisma.institution.findMany<{
        include: {
          district: {
            select: {
              id: true;
              name: true;
              province: { select: { id: true; name: true } };
            };
          };
          _count: { select: { students: true } };
        };
      }>
    >
  > = [];
  let lyceumRows = schoolRows;
  let locationTableMissing = false;

  try {
    provinces = await prisma.province.findMany({
      orderBy: { name: "asc" },
      take: 500,
    });

    provinceDistricts = provinceId
      ? await prisma.district.findMany({
          where: { provinceId },
          orderBy: { name: "asc" },
          take: 1000,
        })
      : [];

    [provinceRows, districtRows, schoolRows, lyceumRows] = await Promise.all([
      tab === "provinces"
        ? prisma.province.findMany({
            where: q
              ? {
                  name: { contains: q, mode: "insensitive" },
                }
              : undefined,
            include: {
              _count: {
                select: {
                  districts: true,
                  students: true,
                },
              },
            },
            orderBy: { name: "asc" },
            take: 500,
          })
        : Promise.resolve([]),
      tab === "districts"
        ? prisma.district.findMany({
            where: {
              ...(provinceId ? { provinceId } : { provinceId: "__none__" }),
              ...(q
                ? {
                    name: { contains: q, mode: "insensitive" },
                  }
                : {}),
            },
            include: {
              province: {
                select: { id: true, name: true },
              },
              _count: {
                select: {
                  institutions: true,
                  students: true,
                },
              },
            },
            orderBy: [{ province: { name: "asc" } }, { name: "asc" }],
            take: 2000,
          })
        : Promise.resolve([]),
      tab === "schools"
        ? prisma.institution.findMany({
            where: {
              type: InstitutionCatalogType.SCHOOL,
              ...(provinceId ? { district: { provinceId } } : { districtId: "__none__" }),
              ...(districtId ? { districtId } : {}),
              ...(q
                ? {
                    name: { contains: q, mode: "insensitive" },
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
              _count: {
                select: {
                  students: true,
                },
              },
            },
            orderBy: [{ district: { province: { name: "asc" } } }, { district: { name: "asc" } }, { name: "asc" }],
            take: 3000,
          })
        : Promise.resolve([]),
      tab === "lyceums"
        ? prisma.institution.findMany({
            where: {
              type: InstitutionCatalogType.LYCEUM_COLLEGE,
              ...(provinceId ? { district: { provinceId } } : { districtId: "__none__" }),
              ...(districtId ? { districtId } : {}),
              ...(q
                ? {
                    name: { contains: q, mode: "insensitive" },
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
              _count: {
                select: {
                  students: true,
                },
              },
            },
            orderBy: [{ district: { province: { name: "asc" } } }, { district: { name: "asc" } }, { name: "asc" }],
            take: 3000,
          })
        : Promise.resolve([]),
    ]);
  } catch (error) {
    if (isLocationTableMissingError(error)) {
      locationTableMissing = true;
    } else {
      throw error;
    }
  }

  const institutionType = tab === "schools" ? "SCHOOL" : "LYCEUM_COLLEGE";

  return (
    <main className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Hududlar (Locations)</h1>
        <Link
          href="/admin/locations/excel-import"
          className="rounded bg-slate-800 px-3 py-2 text-sm text-white"
        >
          Excel Import
        </Link>
      </div>

      {params?.msg ? (
        <p className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">{params.msg}</p>
      ) : null}
      {params?.error ? (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{params.error}</p>
      ) : null}
      {locationTableMissing ? (
        <p className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          Location jadvallari DBda hali yaratilmagan. Terminalda migratsiyani ishga tushiring:
          <br />
          <code>cd "/Users/sevinchkomiljonova/Documents/New project"</code>
          <br />
          <code>pnpm --filter @km/db exec prisma migrate dev --name add_locations_catalog</code>
        </p>
      ) : null}

      <section className="rounded bg-white p-4 shadow">
        <div className="mb-4 flex flex-wrap gap-2">
          {tabs.map((item) => (
            <Link
              key={item.id}
              href={withQuery(item.id, { provinceId, districtId, q: "" })}
              className={`rounded px-3 py-2 text-sm ${
                tab === item.id ? "bg-slate-800 text-white" : "border text-slate-700"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {tab === "provinces" ? (
          <div className="space-y-4">
            <form action="/admin/locations" method="get" className="grid gap-2 md:grid-cols-[1fr_auto]">
              <input type="hidden" name="tab" value="provinces" />
              <input name="q" defaultValue={q} className="rounded border p-2" placeholder="Viloyat qidirish..." />
              <button className="rounded bg-slate-800 px-4 py-2 text-white">Qidirish</button>
            </form>

            <form action="/api/admin/locations/provinces" method="post" className="grid gap-2 md:grid-cols-[1fr_auto]">
              <input type="hidden" name="tab" value="provinces" />
              <input name="name" className="rounded border p-2" placeholder="Yangi viloyat nomi" required />
              <button className="rounded bg-blue-600 px-4 py-2 text-white">+ Add</button>
            </form>

            <details className="rounded border p-3">
              <summary className="cursor-pointer text-sm font-semibold text-slate-700">Import JSON</summary>
              <form action="/api/admin/locations/import" method="post" className="mt-3 grid gap-2">
                <textarea name="payload" defaultValue={importTemplate} className="min-h-56 rounded border p-2 font-mono text-xs" required />
                <button className="rounded bg-slate-800 px-4 py-2 text-white">Import qilish</button>
              </form>
            </details>

            <div className="overflow-auto">
              <table className="min-w-full border text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="border p-2 text-left">Viloyat</th>
                    <th className="border p-2 text-left">Tumanlar</th>
                    <th className="border p-2 text-left">Studentlar</th>
                    <th className="border p-2 text-left">Amal</th>
                  </tr>
                </thead>
                <tbody>
                  {provinceRows.map((province) => (
                    <tr key={province.id}>
                      <td className="border p-2">
                        <form action={`/api/admin/locations/provinces/${province.id}`} method="post" className="flex gap-2">
                          <input type="hidden" name="_method" value="PATCH" />
                          <input type="hidden" name="tab" value="provinces" />
                          <input name="name" defaultValue={province.name} className="w-full rounded border p-2" required />
                          <button className="rounded bg-slate-800 px-3 py-2 text-white">Saqlash</button>
                        </form>
                      </td>
                      <td className="border p-2">{province._count.districts}</td>
                      <td className="border p-2">{province._count.students}</td>
                      <td className="border p-2">
                        <form action={`/api/admin/locations/provinces/${province.id}`} method="post">
                          <input type="hidden" name="_method" value="DELETE" />
                          <input type="hidden" name="tab" value="provinces" />
                          <ConfirmSubmitButton
                            label="O'chirish"
                            message="Bu viloyatni o'chirishni tasdiqlaysizmi?"
                            className="rounded bg-red-600 px-3 py-2 text-white"
                          />
                        </form>
                      </td>
                    </tr>
                  ))}
                  {provinceRows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="border p-3 text-slate-500">
                        Ma'lumot topilmadi.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {tab === "districts" ? (
          <div className="space-y-4">
            <form action="/admin/locations" method="get" className="grid gap-2 md:grid-cols-[220px_1fr_auto]">
              <input type="hidden" name="tab" value="districts" />
              <select name="provinceId" className="rounded border p-2" defaultValue={provinceId} required>
                <option value="">Viloyat tanlang</option>
                {provinces.map((province) => (
                  <option key={province.id} value={province.id}>
                    {province.name}
                  </option>
                ))}
              </select>
              <input name="q" defaultValue={q} className="rounded border p-2" placeholder="Tuman qidirish..." />
              <button className="rounded bg-slate-800 px-4 py-2 text-white">Qidirish</button>
            </form>

            <form action="/api/admin/locations/districts" method="post" className="grid gap-2 md:grid-cols-[220px_1fr_auto]">
              <input type="hidden" name="tab" value="districts" />
              <select name="provinceId" className="rounded border p-2" defaultValue={provinceId} required>
                <option value="">Viloyat tanlang</option>
                {provinces.map((province) => (
                  <option key={province.id} value={province.id}>
                    {province.name}
                  </option>
                ))}
              </select>
              <input name="name" className="rounded border p-2" placeholder="Yangi tuman nomi" required />
              <button className="rounded bg-blue-600 px-4 py-2 text-white">+ Add</button>
            </form>

            {!provinceId ? (
              <p className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                Avval viloyat tanlang, keyin tumanlar ro'yxati chiqadi.
              </p>
            ) : null}

            <div className="overflow-auto">
              <table className="min-w-full border text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="border p-2 text-left">Viloyat</th>
                    <th className="border p-2 text-left">Tuman</th>
                    <th className="border p-2 text-left">Muassasa</th>
                    <th className="border p-2 text-left">Student</th>
                    <th className="border p-2 text-left">Amal</th>
                  </tr>
                </thead>
                <tbody>
                  {districtRows.map((district) => (
                    <tr key={district.id}>
                      <td className="border p-2">
                        <form action={`/api/admin/locations/districts/${district.id}`} method="post" className="space-y-2">
                          <input type="hidden" name="_method" value="PATCH" />
                          <input type="hidden" name="tab" value="districts" />
                          <select name="provinceId" defaultValue={district.provinceId} className="w-full rounded border p-2" required>
                            {provinces.map((province) => (
                              <option key={province.id} value={province.id}>
                                {province.name}
                              </option>
                            ))}
                          </select>
                          <input name="name" defaultValue={district.name} className="w-full rounded border p-2" required />
                          <button className="rounded bg-slate-800 px-3 py-2 text-white">Saqlash</button>
                        </form>
                      </td>
                      <td className="border p-2">{district.name}</td>
                      <td className="border p-2">{district._count.institutions}</td>
                      <td className="border p-2">{district._count.students}</td>
                      <td className="border p-2">
                        <form action={`/api/admin/locations/districts/${district.id}`} method="post">
                          <input type="hidden" name="_method" value="DELETE" />
                          <input type="hidden" name="tab" value="districts" />
                          <input type="hidden" name="provinceId" value={district.provinceId} />
                          <ConfirmSubmitButton
                            label="O'chirish"
                            message="Bu tumanni o'chirishni tasdiqlaysizmi?"
                            className="rounded bg-red-600 px-3 py-2 text-white"
                          />
                        </form>
                      </td>
                    </tr>
                  ))}
                  {districtRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="border p-3 text-slate-500">
                        Ma'lumot topilmadi.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {tab === "schools" || tab === "lyceums" ? (
          <div className="space-y-4">
            <form action="/admin/locations" method="get" className="grid gap-2 md:grid-cols-[220px_220px_1fr_auto]">
              <input type="hidden" name="tab" value={tab} />
              <select name="provinceId" defaultValue={provinceId} className="rounded border p-2" required>
                <option value="">Viloyat tanlang</option>
                {provinces.map((province) => (
                  <option key={province.id} value={province.id}>
                    {province.name}
                  </option>
                ))}
              </select>
              <select name="districtId" defaultValue={districtId} className="rounded border p-2">
                <option value="">Barcha tumanlar</option>
                {provinceDistricts.map((district) => (
                  <option key={district.id} value={district.id}>
                    {district.name}
                  </option>
                ))}
              </select>
              <input name="q" defaultValue={q} className="rounded border p-2" placeholder="Muassasa qidirish..." />
              <button className="rounded bg-slate-800 px-4 py-2 text-white">Qidirish</button>
            </form>

            <form action="/api/admin/locations/institutions" method="post" className="grid gap-2 md:grid-cols-[220px_220px_1fr_auto]">
              <input type="hidden" name="tab" value={tab} />
              <input type="hidden" name="type" value={institutionType} />
              <select name="provinceId" defaultValue={provinceId} className="rounded border p-2" required>
                <option value="">Viloyat tanlang</option>
                {provinces.map((province) => (
                  <option key={province.id} value={province.id}>
                    {province.name}
                  </option>
                ))}
              </select>
              <select name="districtId" defaultValue={districtId} className="rounded border p-2" required>
                <option value="">Tuman tanlang</option>
                {provinceDistricts.map((district) => (
                  <option key={district.id} value={district.id}>
                    {district.name}
                  </option>
                ))}
              </select>
              <input
                name="name"
                className="rounded border p-2"
                placeholder={tab === "schools" ? "Yangi maktab nomi" : "Yangi litsey/kollej nomi"}
                required
              />
              <button className="rounded bg-blue-600 px-4 py-2 text-white">+ Add</button>
            </form>

            {!provinceId ? (
              <p className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                Avval viloyat tanlang, keyin tuman va muassasa ro'yxati chiqadi.
              </p>
            ) : null}

            <div className="overflow-auto">
              <table className="min-w-full border text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="border p-2 text-left">Viloyat</th>
                    <th className="border p-2 text-left">Tuman</th>
                    <th className="border p-2 text-left">Nomi</th>
                    <th className="border p-2 text-left">Student</th>
                    <th className="border p-2 text-left">Amal</th>
                  </tr>
                </thead>
                <tbody>
                  {(tab === "schools" ? schoolRows : lyceumRows).map((institution) => (
                    <tr key={institution.id}>
                      <td className="border p-2">{institution.district.province.name}</td>
                      <td className="border p-2">{institution.district.name}</td>
                      <td className="border p-2">
                        <form action={`/api/admin/locations/institutions/${institution.id}`} method="post" className="flex gap-2">
                          <input type="hidden" name="_method" value="PATCH" />
                          <input type="hidden" name="tab" value={tab} />
                          <input type="hidden" name="provinceId" value={institution.district.province.id} />
                          <input type="hidden" name="districtId" value={institution.districtId} />
                          <input type="hidden" name="type" value={institution.type} />
                          <input name="name" defaultValue={institution.name} className="w-full rounded border p-2" required />
                          <button className="rounded bg-slate-800 px-3 py-2 text-white">Saqlash</button>
                        </form>
                      </td>
                      <td className="border p-2">{institution._count.students}</td>
                      <td className="border p-2">
                        <form action={`/api/admin/locations/institutions/${institution.id}`} method="post">
                          <input type="hidden" name="_method" value="DELETE" />
                          <input type="hidden" name="tab" value={tab} />
                          <input type="hidden" name="provinceId" value={institution.district.province.id} />
                          <input type="hidden" name="districtId" value={institution.districtId} />
                          <ConfirmSubmitButton
                            label="O'chirish"
                            message="Bu muassasani o'chirishni tasdiqlaysizmi?"
                            className="rounded bg-red-600 px-3 py-2 text-white"
                          />
                        </form>
                      </td>
                    </tr>
                  ))}
                  {(tab === "schools" ? schoolRows : lyceumRows).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="border p-3 text-slate-500">
                        Ma'lumot topilmadi.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
