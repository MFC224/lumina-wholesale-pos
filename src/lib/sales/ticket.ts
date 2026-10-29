/**
 * Generador de correlativo único para tickets de venta Lumina POS.
 * Formato: TICK-YYYYMMDD-XXXXXX
 */
let memorySequence = 0;

export function generateTicketNumber(prefix = "TICK"): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  memorySequence = (memorySequence + 1) % 100000;
  const seq = String(memorySequence).padStart(4, "0");
  const randomSuffix = Math.floor(100 + Math.random() * 900); // 3 dígitos aleatorios para evitar colisión

  return `${prefix}-${year}${month}${day}-${seq}${randomSuffix}`;
}
