import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth/session";
import {
  parseCsvText,
  parseExcelBuffer,
  validateAndGroupImportRows,
  sanitizeImportReportForRole,
} from "@/lib/catalog/importer";
import { persistImportedProducts } from "@/lib/catalog/service";
import { Role } from "@/types/auth";

export async function POST(request: NextRequest) {
  try {
    const token =
      request.cookies.get("lumina_session")?.value ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const session = await verifySessionToken(token);
    if (!session || session.rol !== "ADMIN") {
      return NextResponse.json(
        { error: "Acceso denegado: Se requiere rol ADMINISTRADOR para importar inventario" },
        { status: 403 }
      );
    }

    const contentType = request.headers.get("content-type") || "";
    let rawRows: ReturnType<typeof parseCsvText> = [];
    let persist = false;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      persist = formData.get("persist") === "true";

      if (!file) {
        return NextResponse.json({ error: "No se proporcionó ningún archivo" }, { status: 400 });
      }

      const fileName = file.name.toLowerCase();
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (fileName.endsWith(".xlsx")) {
        rawRows = await parseExcelBuffer(buffer);
      } else {
        const text = buffer.toString("utf-8");
        rawRows = parseCsvText(text);
      }
    } else {
      const body = await request.json();
      persist = Boolean(body.persist);

      if (body.csvText) {
        rawRows = parseCsvText(body.csvText);
      } else if (Array.isArray(body.rows)) {
        rawRows = body.rows;
      } else {
        return NextResponse.json(
          { error: "Debe enviar 'csvText' o un arreglo 'rows'" },
          { status: 400 }
        );
      }
    }

    if (rawRows.length === 0) {
      return NextResponse.json(
        { error: "No se encontraron filas de datos para procesar" },
        { status: 400 }
      );
    }

    // 1. Validar y agrupar en matriz de variantes
    const report = validateAndGroupImportRows(rawRows);

    // 2. Persistir en base de datos si se solicitó y hay productos válidos
    let guardados = 0;
    if (persist && report.productosAgrupados.length > 0) {
      const persisted = await persistImportedProducts(
        report.productosAgrupados,
        session.userId
      );
      guardados = persisted.length;
    }

    // 3. Sanitizar reporte para el rol solicitante
    const safeReport = sanitizeImportReportForRole(report, session.rol as Role);

    return NextResponse.json({
      success: true,
      persisted: persist,
      guardados,
      report: safeReport,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Error procesando importación masiva",
        detail: error instanceof Error ? error.message : "Desconocido",
      },
      { status: 500 }
    );
  }
}
