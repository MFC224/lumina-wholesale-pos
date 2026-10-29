import { prisma } from "@/lib/prisma";
import { validatePinFormat, verifyPin } from "./pin";
import { sanitizeUser, hasPermission } from "./rbac";
import { createSessionToken } from "./session";
import { AuthResult, SessionPayload } from "@/types/auth";

export interface LoginResult extends AuthResult {
  token?: string;
}

/**
 * Servicio de autenticación por PIN para terminales de venta.
 * Permite a cajeros y administradores ingresar rápidamente mediante su PIN de 4 dígitos.
 */
export async function authenticateByPin(pin: string): Promise<LoginResult> {
  // 1. Validar formato estricto (4 dígitos numéricos)
  const validation = validatePinFormat(pin);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
      code: "INVALID_FORMAT",
    };
  }

  try {
    // 2. Buscar usuarios activos en la base de datos
    const users = await prisma.usuario.findMany({
      where: { activo: true },
    });

    if (users.length === 0) {
      return {
        success: false,
        error: "No existen usuarios activos registrados en el sistema.",
        code: "USER_NOT_FOUND",
      };
    }

    // 3. Comparar PIN contra los hashes
    for (const user of users) {
      const match = await verifyPin(pin, user.pin);
      if (match) {
        if (!user.activo) {
          return {
            success: false,
            error: "El usuario se encuentra inactivo.",
            code: "USER_INACTIVE",
          };
        }

        const safeUser = sanitizeUser(user);
        const sessionPayload: SessionPayload = {
          userId: user.id,
          nombre: user.nombre,
          rol: user.rol,
        };

        const token = await createSessionToken(sessionPayload);

        return {
          success: true,
          user: safeUser,
          token,
        };
      }
    }

    return {
      success: false,
      error: "PIN incorrecto. Verifique sus credenciales.",
      code: "INVALID_PIN",
    };
  } catch (error) {
    return {
      success: false,
      error: "Error interno al procesar autenticación: " + (error instanceof Error ? error.message : "Desconocido"),
      code: "INTERNAL_ERROR",
    };
  }
}
