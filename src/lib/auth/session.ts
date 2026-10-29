import { SignJWT, jwtVerify } from "jose";
import { SessionPayload } from "@/types/auth";

const JWT_SECRET = process.env.JWT_SECRET || "lumina-pos-default-dev-secret-key-32chars!!";
const secretKey = new TextEncoder().encode(JWT_SECRET);

/**
 * Genera un token JWT de sesión para el usuario autenticado con PIN.
 * Duración predeterminada: 12 horas (jornada de venta completa).
 */
export async function createSessionToken(
  payload: Omit<SessionPayload, "iat" | "exp">,
  expiresIn: string = "12h"
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey);
}

/**
 * Valida y extrae el payload de un token JWT de sesión.
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return {
      userId: payload.userId as string,
      nombre: payload.nombre as string,
      rol: payload.rol as SessionPayload["rol"],
      exp: payload.exp,
      iat: payload.iat,
    };
  } catch {
    return null;
  }
}
