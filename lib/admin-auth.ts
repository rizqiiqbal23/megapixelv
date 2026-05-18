import { createHmac, createHash, timingSafeEqual } from "crypto";

const USERNAME = "megapixelv";
const PASSWORD = "megapixelv123";
const SESSION_COOKIE = "mpv_admin_session";
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || "mpv-admin-session-secret";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

const USERNAME_HASH = hashValue(USERNAME);
const PASSWORD_HASH = hashValue(PASSWORD);

function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function signValue(value: string): string {
  return createHmac("sha256", SESSION_SECRET).update(value).digest("base64url");
}

export function verifyCredentials(username: string, password: string): boolean {
  const usernameOk = safeCompare(hashValue(username), USERNAME_HASH);
  const passwordOk = safeCompare(hashValue(password), PASSWORD_HASH);
  return usernameOk && passwordOk;
}

export function createSessionToken(): string {
  const payload = JSON.stringify({
    user: USERNAME,
    exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  });
  const encoded = Buffer.from(payload).toString("base64url");
  const signature = signValue(encoded);
  return `${encoded}.${signature}`;
}

export function verifySessionToken(token: string): boolean {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return false;

  const expectedSignature = signValue(encoded);
  if (!safeCompare(signature, expectedSignature)) return false;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as {
      user?: string;
      exp?: number;
    };
    return payload.user === USERNAME && typeof payload.exp === "number" && payload.exp > Date.now();
  } catch {
    return false;
  }
}

export function getSessionCookieName(): string {
  return SESSION_COOKIE;
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

function safeCompare(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
