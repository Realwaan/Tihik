import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const CIPHER = "aes-256-gcm";
const IV_LENGTH = 12;

function getEncryptionKey(): Buffer {
  const secret = process.env.BANK_TOKEN_ENCRYPTION_KEY;

  if (!secret || secret.trim().length < 16) {
    throw new Error("BANK_TOKEN_ENCRYPTION_KEY must be set to a strong secret");
  }

  return createHash("sha256").update(secret).digest();
}

export function encryptBankToken(value: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(CIPHER, key, iv);

  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
}

export function decryptBankToken(payload: string): string {
  const [ivText, tagText, encryptedText] = payload.split(".");

  if (!ivText || !tagText || !encryptedText) {
    throw new Error("Invalid encrypted token payload format");
  }

  const key = getEncryptionKey();
  const iv = Buffer.from(ivText, "base64");
  const tag = Buffer.from(tagText, "base64");
  const encrypted = Buffer.from(encryptedText, "base64");

  const decipher = createDecipheriv(CIPHER, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}
