// Lightweight signed-cookie session for this demo app.
// Not a production auth system — good enough to gate admin-only routes
// without needing a Node-only DB driver inside Edge middleware.

export const SESSION_COOKIE = "zeni_session";

export type SessionPayload = {
  userId: string;
  role: "ADMIN" | "USER";
};

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return secret;
}

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(
    value.length + ((4 - (value.length % 4)) % 4),
    "="
  );
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmac(data: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return toBase64Url(new Uint8Array(signature));
}

export async function encodeSession(payload: SessionPayload): Promise<string> {
  const json = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await hmac(json);
  return `${json}.${signature}`;
}

export async function decodeSession(value: string | undefined): Promise<SessionPayload | null> {
  if (!value) return null;
  const [json, signature] = value.split(".");
  if (!json || !signature) return null;
  const expected = await hmac(json);
  if (expected !== signature) return null;
  try {
    const decoded = JSON.parse(new TextDecoder().decode(fromBase64Url(json)));
    if (typeof decoded?.userId !== "string" || (decoded.role !== "ADMIN" && decoded.role !== "USER")) {
      return null;
    }
    return decoded as SessionPayload;
  } catch {
    return null;
  }
}
