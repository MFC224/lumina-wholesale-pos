# Plan Maestro del Proyecto: Lumina Wholesale & Liquidation POS (Auditoría UI/UX Actualizada)

> **Sistema de Inventario Interno y Remate de Liquidación**  
> Diseñado para operar simultáneamente en múltiples laptops en almacén/local.  
> Moneda: **Soles (S/.)** | Roles: **Vendedor** y **Administrador** | Estilo: **Lumina Precision Minimalist**

---

## 1. Ajustes de Auditoría de Usuario Integrados

1. **Barra Superior (Navbar) Limpia en Una Sola Línea**:
   - **Eliminado**: Badge "En vivo (<100ms)".
   - **Eliminado 100%**: Pestaña "Estado & RBAC".
   - **Oculto**: Botón "Importar Excel/CSV" (en pausa hasta recibir el archivo real).
   - **Unificado**: "Arqueo (PDF)" y "Excel (.xlsx)" fusionados en un solo botón: **`Reportes`**.
   - **Alineación**: Botones con `whitespace-nowrap`, formato horizontal estilizado en una sola fila (cero botones de 3 líneas).
   - **Tipografía de Marca**: Logo *Lumina Wholesale & Liquidation* rediseñado con gradiente sutil y peso tipográfico moderno.

2. **Descuento Dual en Caja**:
   - Soporte para aplicar descuento por **Porcentaje (`%`)** (botones rápidos 0%, 5%, 10%, 15%, 20% o valor libre) o por **Monto Numérico Fijo en Soles (`S/.`)** (ej: rebaja directa de S/. 15.00).

3. **Desglose de Efectivo en Venta Exitosa**:
   - En cobros en efectivo, el modal y ticket muestran tanto el **Dinero Recibido (S/.)** como el **Vuelto Entregado (S/.)**.

4. **Catálogo Robusto de Prueba (Seed de 50+ Productos)**:
   - Carga inicial de más de 50 herramientas y prendas de vestir con más de 120 variantes (tallas/colores) para poblar el inventario mientras llega el Excel definitivo.

---

## 2. Sprints de Ejecución Inmediata (Calibrados para 64k Tokens)

- **Sprint A: Rediseño Navbar & Tipografía**:
  - Eliminar "En vivo", "Estado & RBAC", ocultar "Importar Excel".
  - Crear botón único "Reportes" y fijar altura horizontal de una sola línea en todos los botones.
  - Aplicar nuevo isotipo y tipografía a *Lumina Wholesale & Liquidation*.
- **Sprint B: Modal Unificado de Reportes**:
  - Crear `UnifiedReportsModal.tsx` con descarga de Excel (.xlsx) y apertura de Arqueo Diario (PDF).
- **Sprint C: POS Descuento Dual y Dinero Recibido**:
  - Selector de descuento (% o S/.) en `LuminaPosTerminal.tsx`.
  - Desglose de Dinero Recibido y Vuelto Entregado en el modal de éxito.
- **Sprint D: Seed Masivo de 50+ Productos**:
  - Cargar las 50 herramientas y prendas con más de 120 variantes de stock en `prisma/seed.ts`.
- **Sprint E: Verificación y Pruebas**:
  - Ejecución de la suite completa de 128 tests automatizados y compilación de producción con Next.js.
