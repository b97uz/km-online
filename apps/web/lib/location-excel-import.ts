import { InstitutionCatalogType, PrismaClient } from "@prisma/client";
import { normalizeLocationName } from "./locations";

export type LocationImportType = "SCHOOL" | "LYCEUM_COLLEGE";

type ParsedLocationRow = {
  provinceName: string;
  districtName: string;
  institutionName: string;
  rowNumber: number;
};

export type LocationImportSummary = {
  newProvincesCount: number;
  newDistrictsCount: number;
  newInstitutionsCount: number;
  newSchoolsCount: number;
  skippedDuplicatesCount: number;
  totalRows: number;
  processedRows: number;
};

type AnyXlsx = {
  read: (buffer: Buffer, options: { type: "buffer" }) => {
    SheetNames: string[];
    Sheets: Record<string, unknown>;
  };
  utils: {
    sheet_to_json: <T = unknown>(
      sheet: unknown,
      options: { header: 1 | string[]; raw?: boolean; defval?: unknown },
    ) => T[];
  };
};

export class ExcelImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExcelImportError";
  }
}

function loadXlsx(): AnyXlsx {
  try {
    // Avoid static import so build does not fail before dependency install.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const req = eval("require") as (name: string) => AnyXlsx;
    return req("xlsx");
  } catch {
    throw new ExcelImportError(
      "Excel parser topilmadi. Iltimos `pnpm --filter @km/web add xlsx` ni ishga tushiring.",
    );
  }
}

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("uz-UZ")
    .replace(/\s+/g, "")
    .replace(/[_\-\/\\().]/g, "");
}

function rowHasAnyValue(values: unknown[]): boolean {
  return values.some((value) => String(value ?? "").trim() !== "");
}

function getRequiredHeaders(importType: LocationImportType): string[] {
  return importType === "SCHOOL" ? ["viloyat", "tuman", "maktab"] : ["viloyat", "tuman", "litseykollej"];
}

function resolveInstitutionType(importType: LocationImportType): InstitutionCatalogType {
  return importType === "SCHOOL" ? InstitutionCatalogType.SCHOOL : InstitutionCatalogType.LYCEUM_COLLEGE;
}

function lowerKey(value: string): string {
  return normalizeLocationName(value).toLocaleLowerCase("uz-UZ");
}

export function parseLocationExcelBuffer(
  fileBuffer: Buffer,
  importType: LocationImportType,
): ParsedLocationRow[] {
  const XLSX = loadXlsx();
  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new ExcelImportError("Excel fayl bo'sh. Kamida 1 ta sheet bo'lishi kerak.");
  }

  const firstSheet = workbook.Sheets[firstSheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, {
    header: 1,
    raw: false,
    defval: "",
  });

  if (!matrix.length) {
    throw new ExcelImportError("Excel fayl bo'sh.");
  }

  const headerRow = (matrix[0] ?? []).map((cell) => String(cell ?? ""));
  const headerIndex = new Map<string, number>();
  headerRow.forEach((header, index) => {
    headerIndex.set(normalizeHeader(header), index);
  });

  const requiredHeaders = getRequiredHeaders(importType);
  const missingHeaders = requiredHeaders.filter((required) => !headerIndex.has(required));
  if (missingHeaders.length > 0) {
    throw new ExcelImportError(
      `Kerakli ustunlar topilmadi: ${missingHeaders.join(", ")}. Ustunlar: ${requiredHeaders.join(" | ")}`,
    );
  }

  const provinceIndex = headerIndex.get("viloyat")!;
  const districtIndex = headerIndex.get("tuman")!;
  const institutionHeader = importType === "SCHOOL" ? "maktab" : "litseykollej";
  const institutionIndex = headerIndex.get(institutionHeader)!;

  const rows: ParsedLocationRow[] = [];
  for (let i = 1; i < matrix.length; i += 1) {
    const row = matrix[i] ?? [];
    const rowNumber = i + 1;

    if (!rowHasAnyValue(row)) continue;

    const provinceName = normalizeLocationName(String(row[provinceIndex] ?? ""));
    const districtName = normalizeLocationName(String(row[districtIndex] ?? ""));
    const institutionName = normalizeLocationName(String(row[institutionIndex] ?? ""));

    if (!provinceName || !districtName || !institutionName) {
      throw new ExcelImportError(
        `${rowNumber}-qatorda qiymatlar to'liq emas. Kerakli ustunlar: Viloyat, Tuman, ${
          importType === "SCHOOL" ? "Maktab" : "LitseyKollej"
        }.`,
      );
    }

    rows.push({
      provinceName,
      districtName,
      institutionName,
      rowNumber,
    });
  }

  if (rows.length === 0) {
    throw new ExcelImportError("Excel faylda import qilinadigan satr topilmadi.");
  }

  return rows;
}

export async function importLocationRowsFromExcel(
  prisma: PrismaClient,
  actorId: string,
  importType: LocationImportType,
  rows: ParsedLocationRow[],
): Promise<LocationImportSummary> {
  const institutionType = resolveInstitutionType(importType);

  const summary: LocationImportSummary = {
    newProvincesCount: 0,
    newDistrictsCount: 0,
    newInstitutionsCount: 0,
    newSchoolsCount: 0,
    skippedDuplicatesCount: 0,
    totalRows: rows.length,
    processedRows: 0,
  };

  await prisma.$transaction(async (tx) => {
    const provinceCache = new Map<string, string>();
    const districtCache = new Map<string, string>();
    const institutionCache = new Set<string>();

    for (const row of rows) {
      const provinceKey = lowerKey(row.provinceName);
      let provinceId = provinceCache.get(provinceKey);
      if (!provinceId) {
        const existingProvince = await tx.province.findFirst({
          where: {
            name: {
              equals: row.provinceName,
              mode: "insensitive",
            },
          },
          select: { id: true },
        });

        if (existingProvince) {
          provinceId = existingProvince.id;
        } else {
          const createdProvince = await tx.province.create({
            data: { name: row.provinceName },
            select: { id: true },
          });
          provinceId = createdProvince.id;
          summary.newProvincesCount += 1;
        }
        provinceCache.set(provinceKey, provinceId);
      }

      const districtKey = `${provinceId}:${lowerKey(row.districtName)}`;
      let districtId = districtCache.get(districtKey);
      if (!districtId) {
        const existingDistrict = await tx.district.findFirst({
          where: {
            provinceId,
            name: {
              equals: row.districtName,
              mode: "insensitive",
            },
          },
          select: { id: true },
        });

        if (existingDistrict) {
          districtId = existingDistrict.id;
        } else {
          const createdDistrict = await tx.district.create({
            data: {
              provinceId,
              name: row.districtName,
            },
            select: { id: true },
          });
          districtId = createdDistrict.id;
          summary.newDistrictsCount += 1;
        }
        districtCache.set(districtKey, districtId);
      }

      const institutionKey = `${districtId}:${institutionType}:${lowerKey(row.institutionName)}`;
      if (institutionCache.has(institutionKey)) {
        summary.skippedDuplicatesCount += 1;
        continue;
      }

      const existingInstitution = await tx.institution.findFirst({
        where: {
          districtId,
          type: institutionType,
          name: {
            equals: row.institutionName,
            mode: "insensitive",
          },
        },
        select: { id: true },
      });

      if (existingInstitution) {
        summary.skippedDuplicatesCount += 1;
        institutionCache.add(institutionKey);
        continue;
      }

      await tx.institution.create({
        data: {
          districtId,
          type: institutionType,
          name: row.institutionName,
        },
      });

      institutionCache.add(institutionKey);
      summary.newInstitutionsCount += 1;
      summary.newSchoolsCount += 1;
      summary.processedRows += 1;
    }

    await tx.auditLog.create({
      data: {
        actorId,
        action: "CREATE",
        entity: importType === "SCHOOL" ? "ExcelSchoolImport" : "ExcelLyceumImport",
        entityId: actorId,
        payload: summary,
      },
    });
  });

  return summary;
}

