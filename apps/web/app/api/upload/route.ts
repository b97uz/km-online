import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";
import { writeFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return new NextResponse("Forbidden", { status: 403 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return new NextResponse("No file", { status: 400 });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const fileName = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
  const relativePath = `/uploads/${fileName}`;
  const outputPath = path.join(process.cwd(), "public", relativePath);

  await writeFile(outputPath, buffer);

  return NextResponse.json({ url: relativePath });
}
