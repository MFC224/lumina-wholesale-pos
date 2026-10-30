export type DateRangePreset = "HOY" | "AYER" | "7_DIAS" | "MES" | "TODO";
export type DatePreset = DateRangePreset;

export interface DateRangeBounds {
  startDate: Date;
  endDate: Date;
  label: string;
  preset: DateRangePreset;
}

/**
 * Calcula los límites de fecha (inicio y fin) para filtrado de reportes contables y arqueos.
 * Maneja zona horaria local de Perú (America/Lima).
 */
export function getDateRangeBounds(
  preset: DateRangePreset = "HOY",
  customDesde?: string | null,
  customHasta?: string | null
): DateRangeBounds {
  const now = new Date();

  if (customDesde) {
    const cleanStart = customDesde.includes("T") ? customDesde : `${customDesde}T00:00:00`;
    const cleanEnd = customHasta
      ? customHasta.includes("T")
        ? customHasta
        : `${customHasta}T23:59:59`
      : null;
    const start = new Date(cleanStart);
    const end = cleanEnd ? new Date(cleanEnd) : new Date(now);
    if (!cleanEnd) end.setHours(23, 59, 59, 999);
    return {
      startDate: start,
      endDate: end,
      label: `Personalizado (${customDesde} al ${customHasta || "hoy"})`,
      preset: "TODO",
    };
  }

  if (preset === "HOY") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { startDate: start, endDate: end, label: "Turno de Hoy", preset: "HOY" };
  }

  if (preset === "AYER") {
    const start = new Date(now);
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    return { startDate: start, endDate: end, label: "Ayer", preset: "AYER" };
  }

  if (preset === "7_DIAS") {
    const start = new Date(now);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { startDate: start, endDate: end, label: "Últimos 7 días", preset: "7_DIAS" };
  }

  if (preset === "MES") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { startDate: start, endDate: end, label: "Este Mes", preset: "MES" };
  }

  return {
    startDate: new Date("2024-01-01T00:00:00Z"),
    endDate: new Date("2030-12-31T23:59:59Z"),
    label: "Histórico Total",
    preset: "TODO",
  };
}
