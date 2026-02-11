import { redirect } from "next/navigation";
import { requireRole } from "@/lib/require-role";

export default async function CuratorPaymentsPage() {
  await requireRole("CURATOR");
  redirect("/curator");
}
