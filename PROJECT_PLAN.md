# Plan Maestro del Proyecto: Lumina Wholesale & Liquidation POS (Fase 2 de Auditoría & Escalabilidad)

> **Sistema de Inventario Interno y Remate de Liquidación**  
> Diseñado para operar simultáneamente en múltiples laptops en almacén/local.  
> Moneda: **Soles (S/.)** | Roles: **Vendedor** y **Administrador** | Estilo: **Lumina Precision Minimalist**

---

## 1. Estado de Ejecución de Sprints de Segunda Fase

### 🏁 SPRINT 1: Auditoría UI/UX y Catálogo Masivo (COMPLETADO ✅)
- **Navbar Limpia en Una Sola Línea**: Eliminado badge "En vivo", eliminada pestaña obsoleta "Estado & RBAC", oculto botón "Importar Excel" y unificado botón "Reportes" en una sola fila sin desbordamientos.
- **Isotipo & Marca Lumina**: Nuevo gradiente esmeralda-azul y tipografía institucional moderna con badge de producción.
- **Modal Unificado de Reportes (`UnifiedReportsModal.tsx`)**:
  - Pestaña 1: Arqueo y Cierre Diario de Caja en PDF con acta oficial y firmas.
  - Pestaña 2: Libro Contable e Inventario Valorizado en Excel (.xlsx) con fórmulas dinámicas `=SUM()`.
- **Descuento Dual en Caja**: Selector directo de % o S/. monto fijo con botones rápidos y valor libre.
- **Desglose de Efectivo**: Visualización de Dinero Recibido y Vuelto Entregado en venta exitosa.
- **Catálogo Masivo en Supabase**: 52 productos reales en 5 categorías, 101 variantes y 3,013 unidades de stock con auditoría Kardex.
- **Resultados**: 128 tests automatizados en verde.

---

### 🖨️ SPRINT 2: Automatización de Caja & Hardware POS (COMPLETADO ✅)
- **Motor de Impresión Térmica de Tickets (80mm / 58mm)**:
  - Generador `generateThermalReceiptHtml` con CSS optimizado para tiqueteras térmicas Epson/Bixolon/Xprinter sin márgenes externos.
  - Incluye encabezado de marca, RUC 20608945123, N° de ticket, fecha/hora, cajero, detalle con tallas/colores, desglose de Efectivo Recibido/Vuelto y leyenda legal obligatoria: `"VENTA FINAL DE LIQUIDACIÓN — SIN CAMBIOS NI DEVOLUCIONES"`.
  - Disparador directo `printThermalReceipt` con ventana emergente de impresión automática.
- **Atajos de Impresión Rápida en Terminal**:
  - Botón **"Imprimir Ticket Térmico (F11 / P)"** en modal de venta exitosa.
  - Atajos de teclado <kbd>F11</kbd> o <kbd>P</kbd> para imprimir el comprobante sin tocar el mouse.
- **Reimpresión Térmica en Historial de Tickets (`SalesHistoryModal.tsx`)**:
  - Botón "Reimprimir" en cada fila del historial para emitir duplicados térmicos instantáneos de cualquier venta del día.
- **Soporte Nativo para Pistola Lectora de Códigos de Barras (Scanner Láser USB/Bluetooth)**:
  - Detección inteligente de ráfagas de caracteres y tecla <kbd>Enter</kbd>.
  - Búsqueda exacta de SKU o producto filtrado con adición automática al carrito.
  - Feedback sonoro sutil (Web Audio API 880Hz Beep) y limpieza inmediata del input para escaneo continuo de productos.
  - Si el producto ya existe en el carrito, incrementa automáticamente la cantidad en +1 unidad.
- **Identificación Rápida de Cliente (Opcional)**:
  - Campos de DNI / RUC y Nombre / Razón Social para clientes mayoristas.
  - Impresión automática del cliente en el ticket térmico.
- **Pruebas Automatizadas TDD**:
  - Nueva suite `tests/unit/pos/thermal-receipt.test.ts` con 8 tests nuevos.
  - Cobertura total: **15 suites y 136 tests en verde (100% pasando)**.

---

### 🔄 SPRINT 3: Devoluciones Parciales, Filtros Temporales & Alertas de Stock (COMPLETADO ✅)
- **Filtros Temporales Dinámicos en Reportes**:
  - Filtro por rangos predefinidos: `HOY`, `AYER`, `7_DIAS`, `MES`, `TODO` y personalizados en arqueos PDF y exportaciones Excel (.xlsx).
- **Módulo de Devoluciones Parciales por Ítem**:
  - Desglose de artículos comprados en el historial de tickets.
  - Botón "Devolver Ítem" exclusivo para Administradores (`POST /api/sales/refund`).
  - Cálculo proporcional exacto del reembolso considerando descuentos aplicados a la venta.
  - Restauración atómica de existencias y generación de movimiento inmutable de `INGRESO` en Kardex.
  - Emisión de Comprobante Térmico de Devolución / Nota de Crédito en 80mm o 58mm.
- **Alertas Acústicas y Visuales de Stock Crítico**:
  - Alerta sonora (Web Audio API) al escanear o agregar artículos con stock `<= 3`.
  - Badges animados de stock crítico en el catálogo y en el carrito del POS.
- **Resultados**: 17 suites y 146 tests automatizados en verde (100% pasando).

---

### 📈 SPRINT 4: Inteligencia de Liquidación, Escalas Mayoristas & Auditoría de Kardex en Vivo (COMPLETADO ✅)
- **Escala de Descuentos Automática por Volumen Mayorista (`wholesale-tiers.ts`)**:
  - Detección en tiempo real de unidades en el ticket:
    - 3 a 5 unidades &rarr; **5% Descuento por Lote**.
    - 6 a 11 unidades &rarr; **10% Descuento Media Docena**.
    - 12+ unidades &rarr; **15% Descuento Fardo Mayorista (Docena)**.
  - Banner inteligente en el terminal POS con visualización del ahorro en Soles y botón de 1-clic para aplicar la escala.
- **Dashboard de Métricas & Velocidad de Desplome (`LiquidationDashboardModal.tsx` & `/api/reports/kpis`)**:
  - Cálculo de la tasa de liquidación global (% de stock liquidado) y por categoría.
  - Recaudación total en Soles dividida por método de pago (`EFECTIVO`, `YAPE`, `PLIN`, `TARJETA`, `TRANSFERENCIA`).
  - Top 5 productos de mayor desplome (más vendidos en unidades y en S/.).
  - Top 5 productos de menor rotación ("Huesos" de liquidación) con sugerencias automáticas de remate para acelerar salida.
- **Auditoría de Kardex & Ajustes de Inventario Físico (`KardexAuditModal.tsx` & `/api/catalog/kardex/adjust`)**:
  - Bitácora completa e inmutable de movimientos físicos (`VENTA`, `INGRESO`, `AJUSTE`, `ANULACION`) con usuario y fecha.
  - Formulario de ajuste manual de existencias para administradores con motivo obligatorio y bloqueo pesimista contra stock negativo.
  - Sincronización inmediata con el terminal POS y catálogo en memoria.
- **Resultados**: **20 suites y 162 tests automatizados en verde (100% pasando)**.
- **Build de Producción**: Compilación Next.js 15 limpia con 15 rutas API y componentes optimizados.

---

### 🛡️ SPRINT 5: Resiliencia Offline, Cierre Z Térmico & Entrega Final (COMPLETADO ✅)
- **Resiliencia y Persistencia de Carrito en Almacén (`cart-persistence.ts`)**:
  - Mecanismo isomórfico de auto-guardado en `localStorage` con expiración automática de seguridad (12 horas).
  - Recuperación y rehidratación inmediata del carrito ante cierres accidentales de pestaña, fallos de red o reinicios de laptop.
  - Limpieza atómica tras completar la transacción o al pulsar <kbd>Esc</kbd>.
- **Instalabilidad PWA Standalone (`manifest.ts`)**:
  - Web App Manifest configurado con visualización `standalone`, orientación horizontal (POS landscape), colores Lumina (`#081C6C` y `#020B2D`).
  - Capacidad de instalación nativa en laptops de caja sin barra de navegador para experiencia de terminal industrial.
- **Acta de Cierre Z en Ticket Térmico de 80mm y 58mm (`thermal-receipt.ts`)**:
  - Generador `generateThermalCashClosingHtml` y función `printThermalCashClosing`.
  - Estándar peruano de Arqueo y Corte Z: Fondo Inicial, Recaudación en Efectivo, Pagos Digitales (Yape/Plin/Tarjeta), Efectivo Físico Arqueado, Descuadre de Caja (Sobrante/Faltante) y sección formal para firmas del Cajero y Supervisor de Turno.
  - Botón integrado "Cierre Z Térmico" en el panel unificado de reportes.
- **Exportación Contable de Kardex a Excel (.xlsx) (`kardex-excel.ts` & `/api/reports/kardex-excel`)**:
  - Exportación con `exceljs` de la bitácora inmutable completa de movimientos físicos con formato corporativo Lumina.
  - Columnas: Fecha, Movimiento, SKU, Producto, Detalle, Cantidad, Stock Previo, Stock Resultante, Operador y Motivo.
  - Botón de descarga "Exportar Excel" directamente en el modal de Auditoría de Kardex.
- **Resultados de Certificación**:
  - **23 suites de pruebas automatizadas y 173 tests en verde (100% pasando, 0 fallos)**.
  - Compilación Next.js 15 en modo producción con 19 rutas empaquetadas sin errores.
  - Despliegue continuo en producción en Vercel con base de datos Supabase en São Paulo (`sa-east-1`).
