import jwt from "jsonwebtoken";
import { createHash, randomBytes } from "crypto";

const ACCESS_TOKEN_TTL = "1h";
const REFRESH_TOKEN_BYTES = 48;

export interface AccessTokenPayload {
  userId: string;
  email: string;
  deviceId: string;
}

function requireSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not configured");
  return secret;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, requireSecret(), { expiresIn: ACCESS_TOKEN_TTL });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, requireSecret()) as AccessTokenPayload;
}

export function createRefreshToken(): string {
  return randomBytes(REFRESH_TOKEN_BYTES).toString("base64url");
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
