import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const COOKIE_NAME = "km_session";

export type SessionPayload = {
  userId: string;
  role: "ADMIN" | "CURATOR";
};

export function signSession(payload: SessionPayload) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET topilmadi");
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}

export function verifySession(token: string): SessionPayload {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET topilmadi");
  return jwt.verify(token, secret) as SessionPayload;
}

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

export async function getSession() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    return verifySession(token);
  } catch {
    return null;
  }
}

export async function clearSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
