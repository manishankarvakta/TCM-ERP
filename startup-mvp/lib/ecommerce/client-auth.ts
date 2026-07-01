import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import type { Client } from "@prisma/client";

const JWT_SECRET = process.env.ECOMMERCE_JWT_SECRET;

// Helper to check for JWT secret at runtime
function getJwtSecret(): string {
  if (!JWT_SECRET) {
    throw new Error("ECOMMERCE_JWT_SECRET environment variable is missing. Please configure it in your environment.");
  }
  return JWT_SECRET;
}

// 1. Hash Client Password
export async function hashClientPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

// 2. Verify Client Password
export async function verifyClientPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Helper: Base64Url Encoding
function base64UrlEncode(str: string): string {
  return Buffer.from(str).toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

// Helper: Base64Url Decoding
function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString("utf8");
}

// 3. Sign Client JWT Token (30 days expiry)
export function signClientToken(client: { id: string; phone?: string | null; name?: string | null }): string {
  const secret = getJwtSecret();
  const header = { alg: "HS256", typ: "JWT" };
  
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 30 * 24 * 60 * 60; // 30 days
  
  const payload = {
    clientId: client.id,
    phone: client.phone || null,
    name: client.name || null,
    type: "ECOM_CLIENT",
    iat: now,
    exp: exp,
  };
  
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto.createHmac("sha256", secret)
    .update(signatureInput)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
    
  return `${signatureInput}.${signature}`;
}

// 4. Verify Client JWT Token
export function verifyClientToken(token: string): { clientId: string; phone?: string | null } | null {
  try {
    const secret = getJwtSecret();
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    
    const [encodedHeader, encodedPayload, signature] = parts;
    const signatureInput = `${encodedHeader}.${encodedPayload}`;
    const expectedSignature = crypto.createHmac("sha256", secret)
      .update(signatureInput)
      .digest("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
      
    if (signature !== expectedSignature) return null;
    
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    
    // Verify type
    if (payload.type !== "ECOM_CLIENT") return null;
    
    // Verify expiration
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return null;
    }
    
    return {
      clientId: payload.clientId,
      phone: payload.phone,
    };
  } catch (error) {
    console.error("JWT verification error:", error);
    return null;
  }
}

// 5. Get Client From Request (using authorization header or fallback cookie)
export async function getClientFromRequest(req: Request): Promise<Client | null> {
  try {
    let token: string | null = null;
    
    // 1. Try Authorization header (Bearer <token>)
    const authHeader = req.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }
    
    // 2. Try fallback cookie ecom_client_token
    if (!token) {
      const cookieHeader = req.headers.get("cookie") || "";
      const match = cookieHeader.match(/ecom_client_token=([^;]+)/);
      if (match) {
        token = decodeURIComponent(match[1]);
      }
    }
    
    if (!token) return null;
    
    const verified = verifyClientToken(token);
    if (!verified) return null;
    
    // Retrieve client record from database
    const client = await prisma.client.findUnique({
      where: { id: verified.clientId },
    });
    
    if (!client || !client.isLoginEnabled || client.status !== "active") {
      return null;
    }
    
    return client;
  } catch (error) {
    console.error("getClientFromRequest error:", error);
    return null;
  }
}

// 6. Sanitize Client object for API responses
export function sanitizeClient(client: Client): object {
  const {
    passwordHash,
    resetPasswordToken,
    resetPasswordExpiresAt,
    chartOfAccountId,
    createdBy,
    ...sanitized
  } = client as any;
  
  return sanitized;
}
