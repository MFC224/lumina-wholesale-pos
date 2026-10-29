---
name: inventory-report-engine
description: Motor de generación de reportes ejecutivos en Excel (.xlsx con exceljs) con fórmulas dinámicas en Soles (S/.) y reportes de Arqueo y Cierre Diario de Caja en PDF imprimible.
---

# Inventory & Financial Report Engine Skill

Guía de desarrollo para reportes financieros y de inventario de liquidación.

## 1. Exportador Excel (.xlsx con exceljs)
- **Estructura de Hojas**:
  1. `Resumen Ejecutivo`: Métricas clave, recaudación total, desglose por método de pago (Efectivo, Yape, Plin, Tarjeta, Transferencia).
  2. `Inventario y Liquidación`: Stock inicial, unidades liquidadas, stock remanente, % liquidado.
  3. `Detalle de Tickets`: N° Ticket, fecha/hora, cajero, ítems, total en Soles.
- **Fórmulas Nativas**:
  Las filas de total deben usar fórmulas dinámicas de Excel (ej: `formula: 'SUM(E2:E50)'`) para que los contadores puedan editar y recalcular directamente en Excel.
- **Formato Numérico**:
  Formato contable en Soles: `numFmt: '"S/." #,##0.00'`.

## 2. Reporte de Arqueo Diario de Caja (PDF)
- Generación de informe A4 limpio con membrete de la empresa.
- Comparativa de Efectivo en Sistema vs Efectivo Contado Físicamente con cálculo de diferencia (Faltante / Sobrante).
- Leyenda obligatoria: *"Venta Final de Liquidación - Sin Devolución"*.
- Espacios para firma de conformidad de Cajero y Administrador.
