import bcrypt from "bcryptjs";

const PIN_REGEX = /^\d{4}$/;

/**
 * Valida si un PIN cumple estrictamente con el formato de 4 dígitos numéricos.
 */
export function validatePinFormat(pin: string): { valid: boolean; error?: string } {
  if (typeof pin !== "string") {
    return { valid: false, error: "El PIN debe ser una cadena de texto." };
  }

  if (pin.length !== 4) {
    return { valid: false, error: "El PIN debe tener exactamente 4 dígitos." };
  }

  if (!PIN_REGEX.test(pin)) {
    return { valid: false, error: "El PIN solo puede contener dígitos numéricos (0-9)." };
  }

  return { valid: true };
}

/**
 * Encripta un PIN de 4 dígitos usando bcrypt con un costo de 10 salt rounds.
 */
export async function hashPin(pin: string): Promise<string> {
  const validation = validatePinFormat(pin);
  if (!validation.valid) {
    throw new Error(validation.error || "Formato de PIN inválido");
  }

  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(pin, salt);
}

/**
 * Compara un PIN en texto plano contra su hash encriptado.
 */
export async function verifyPin(pin: string, hashedPin: string): Promise<boolean> {
  if (!pin || !hashedPin) {
    return false;
  }

  const validation = validatePinFormat(pin);
  if (!validation.valid) {
    return false;
  }

  return bcrypt.compare(pin, hashedPin);
}
