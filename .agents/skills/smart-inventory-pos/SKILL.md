---
name: smart-inventory-pos
description: Arquitectura y desarrollo de sistemas de inventario inteligente, liquidación de stock, transacciones atómicas con control de concurrencia (cero sobreventa), auditoría de movimientos (Kardex) y métricas de velocidad de remate.
---

# Smart Inventory & Liquidation POS Skill

Esta skill proporciona las directrices y estándares para construir sistemas de inventario inteligente y liquidación acelerada en entornos de alto tráfico concurrente.

## 1. Principios de Concurrencia y Cero Sobreventa
- **Bloqueo a Nivel de Fila (Pessimistic Locking)**:
  En transacciones críticas de venta, consultar el stock con `SELECT ... FOR UPDATE` para evitar condiciones de carrera (*race conditions*):
  ```typescript
  await prisma.$transaction(async (tx) => {
    const stock = await tx.$queryRaw`
      SELECT id, "stockActual" FROM "VarianteStock" 
      WHERE id = ${varianteId} FOR UPDATE
    `;
    if (stock[0].stockActual < cantidad) {
      throw new Error("STOCK_INSUFICIENTE");
    }
    await tx.varianteStock.update({
      where: { id: varianteId },
      data: { stockActual: { decrement: cantidad } }
    });
  });
  ```
- **Transaccionalidad Atómica**:
  Si una venta incluye múltiples productos y uno de ellos se agota en el proceso, la transacción completa debe ejecutar `ROLLBACK` de inmediato.

## 2. Métricas Inteligentes de Liquidación
- **Velocidad de Desplome (% Liquidado)**:
  $$\text{Porcentaje Liquidado} = \left(\frac{\text{Stock Inicial} - \text{Stock Actual}}{\text{Stock Inicial}}\right) \times 100$$
- **Alertas de Stock Crítico**:
  - `stockActual > 5`: Normal / En Stock.
  - `1 <= stockActual <= 3`: Stock Crítico (Alerta visual roja con pulso).
  - `stockActual == 0`: Agotado (Bloqueo de venta).

## 3. Descuentos Dinámicos por Volumen (Clearance Markdowns)
- Implementar botones rápidos de descuento en caja:
  - 5% adicional por pronto pago / volumen.
  - 10% adicional por lote.
  - 15% o 20% para remate final.
  - Descuento fijo en Soles con validación de no exceder el total.
