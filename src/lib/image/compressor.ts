/**
 * Compresor de imágenes en navegador a formato WebP optimizado (< 80 KB).
 * Diseñado para catálogo de liquidación y sincronización rápida en red local de almacén.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  targetMaxBytes?: number; // 80 KB = 80 * 1024 = 81,920 bytes
}

export interface CompressionResult {
  blob: Blob;
  dataUrl: string;
  sizeBytes: number;
  sizeKB: number;
  width: number;
  height: number;
}

const DEFAULT_TARGET_MAX_BYTES = 80 * 1024; // 80 KB
const DEFAULT_MAX_DIMENSION = 800;

/**
 * Redimensiona y comprime una imagen local a formato WebP optimizado para red móvil / Wi-Fi de almacén.
 */
export async function compressImageToWebP(
  file: File | Blob,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const maxWidth = options.maxWidth || DEFAULT_MAX_DIMENSION;
  const maxHeight = options.maxHeight || DEFAULT_MAX_DIMENSION;
  const targetMaxBytes = options.targetMaxBytes || DEFAULT_TARGET_MAX_BYTES;
  let quality = options.quality !== undefined ? options.quality : 0.82;

  // Cargar imagen en memoria
  const imageBitmap = await createImageBitmap(file);
  let { width, height } = imageBitmap;

  // Calcular escala manteniendo aspect ratio
  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  // Renderizar en Canvas
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("No se pudo inicializar el contexto 2D del Canvas para compresión");
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(imageBitmap, 0, 0, width, height);

  // Función helper para exportar Blob con cierta calidad
  const canvasToBlob = (q: number): Promise<Blob> =>
    new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Error al convertir canvas a Blob WebP"));
        },
        "image/webp",
        q
      );
    });

  let blob = await canvasToBlob(quality);

  // Reducción adaptativa si excede el peso objetivo de 80 KB
  let attempts = 0;
  while (blob.size > targetMaxBytes && quality > 0.4 && attempts < 5) {
    quality -= 0.1;
    attempts++;
    blob = await canvasToBlob(quality);
  }

  // Convertir a DataURL para preview instantáneo
  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });

  const sizeBytes = blob.size;
  const sizeKB = Math.round((sizeBytes / 1024) * 100) / 100;

  return {
    blob,
    dataUrl,
    sizeBytes,
    sizeKB,
    width,
    height,
  };
}

/**
 * Valida si un archivo es una imagen permitida antes de procesarla.
 */
export function isValidImageFile(file: File): { valid: boolean; error?: string } {
  const validTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"];
  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: "Formato no compatible. Solo se permiten imágenes JPG, PNG o WebP.",
    };
  }

  // Límite inicial de subida de 15 MB antes de compresión
  if (file.size > 15 * 1024 * 1024) {
    return {
      valid: false,
      error: "La imagen original no debe superar los 15 MB.",
    };
  }

  return { valid: true };
}
