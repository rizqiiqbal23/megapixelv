import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";

const SESSION_COOKIE = "mpv_admin_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

type AdminCredentialBundle = {
  username: string;
  password: string;
};

let credentialBundleCache: AdminCredentialBundle | null = null;

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} belum di-set.`);
  }
  return value;
}

function deriveKey(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

function encryptValue(value: string, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(secret), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

function decryptValue(token: string, secret: string): string {
  const [ivRaw, tagRaw, ciphertextRaw] = token.split(".");
  if (!ivRaw || !tagRaw || !ciphertextRaw) {
    throw new Error("Format credential terenkripsi tidak valid.");
  }

  const iv = Buffer.from(ivRaw, "base64url");
  const tag = Buffer.from(tagRaw, "base64url");
  const ciphertext = Buffer.from(ciphertextRaw, "base64url");
  const decipher = createDecipheriv("aes-256-gcm", deriveKey(secret), iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}

function normalizeCredential(value: string): string {
  return value.trim();
}

function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function safeCompare(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function loadCredentialBundle(): AdminCredentialBundle {
  if (credentialBundleCache) return credentialBundleCache;

  const secret = requireEnv("ADMIN_CREDENTIAL_SECRET");
  const usernameEncrypted = requireEnv("ADMIN_USERNAME_ENC");
  const passwordEncrypted = requireEnv("ADMIN_PASSWORD_ENC");

  const username = decryptValue(usernameEncrypted, secret);
  const password = decryptValue(passwordEncrypted, secret);

  credentialBundleCache = {
    username: normalizeCredential(username),
    password: normalizeCredential(password),
  };

  return credentialBundleCache;
}

function signValue(value: string): string {
  const sessionSecret = requireEnv("ADMIN_SESSION_SECRET");
  return createHmac("sha256", sessionSecret).update(value).digest("base64url");
}

export function verifyCredentials(username: string, password: string): boolean {
  const bundle = loadCredentialBundle();
  const usernameOk = safeCompare(hashValue(normalizeCredential(username)), hashValue(bundle.username));
  const passwordOk = safeCompare(hashValue(normalizeCredential(password)), hashValue(bundle.password));
  return usernameOk && passwordOk;
}

export function createSessionToken(): string {
  const bundle = loadCredentialBundle();
  const payload = JSON.stringify({
    user: bundle.username,
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
    const bundle = loadCredentialBundle();
    return payload.user === bundle.username && typeof payload.exp === "number" && payload.exp > Date.now();
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

export function encryptAdminCredential(value: string, secret: string): string {
  return encryptValue(value, secret);
}
