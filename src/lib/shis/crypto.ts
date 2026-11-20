const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToB64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function b64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function deriveKey(secret: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", encoder.encode(secret), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: 100_000, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export function randomSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}

export async function makeDataKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}

export async function aesEncrypt(key: CryptoKey, plain: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    encoder.encode(plain) as BufferSource,
  );
  return `${bytesToB64(iv)}.${bytesToB64(new Uint8Array(cipher))}`;
}

export async function aesDecrypt(key: CryptoKey, packed: string): Promise<string> {
  const [ivPart, dataPart] = packed.split(".");
  if (!ivPart || !dataPart) throw new Error("Sealed record is damaged");
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64ToBytes(ivPart) as BufferSource },
    key,
    b64ToBytes(dataPart) as BufferSource,
  );
  return decoder.decode(plain);
}

export async function wrapDataKey(wrapper: CryptoKey, dataKey: CryptoKey): Promise<string> {
  const raw = new Uint8Array(await crypto.subtle.exportKey("raw", dataKey));
  return aesEncrypt(wrapper, bytesToB64(raw));
}

export async function unwrapDataKey(wrapper: CryptoKey, wrapped: string): Promise<CryptoKey> {
  const raw = b64ToBytes(await aesDecrypt(wrapper, wrapped));
  return crypto.subtle.importKey("raw", raw as BufferSource, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}
