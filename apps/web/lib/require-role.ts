import { redirect } from "next/navigation";
import { getSession } from "./auth";

export async function requireRole(role: "ADMIN" | "CURATOR") {
  const session = await getSession();
  if (!session || session.role !== role) {
    redirect("/login");
  }
  return session;
}
