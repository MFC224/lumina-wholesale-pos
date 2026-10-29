# Plan Maestro del Proyecto: Lumina Wholesale & Liquidation POS

> **Sistema de Inventario Interno y Remate de Liquidación**  
> Diseñado para operar simultáneamente en múltiples laptops en almacén/local.  
> Moneda: **Soles (S/.)** | Roles: **Vendedor** y **Administrador** | Estilo: **Lumina Precision Minimalist**

---

## 1. Stack Tecnológico y Arquitectura
- **Frontend & Backend**: Next.js 15 (React 19, TypeScript, Tailwind CSS, Lucide Icons, Shadcn UI).
- **ORM & Transacciones**: Prisma ORM con PostgreSQL.
- **Control Concurrente**: `SELECT ... FOR UPDATE` en transacciones ACID (Garantía matemática de cero sobreventa).
- **Tiempo Real**: Supabase Realtime (WebSockets CDC) para actualización de stock en vivo (<100ms) sin recargar página.
- **Búsqueda**: Motor difuso en memoria de navegador (0ms de latencia).
- **Reportes**: `exceljs` para libros `.xlsx` dinámicos con fórmulas y generación de PDF para Arqueo de Caja diario.
- **Diseño**: Basado en la guía de estilo *Lumina Wholesale & Liquidation* (`#081C6C` Navy institucional, `#10B981` Verde esmeralda, fuente Inter con `tabular-nums`).

---

## 2. Skills Instaladas en el Proyecto (`.agents/skills/`)
1. `smart-inventory-pos`: Transacciones atómicas, prevención de sobreventa, auditoría Kardex y fórmulas de % liquidado.
2. `interactive-pos-ui`: Interfaz de alta velocidad, atajos de teclado (`F2`, `Enter`, `F4`), tokens de diseño Lumina y búsqueda en 0ms.
3. `inventory-report-engine`: Generación de libros Excel (.xlsx) contables y PDFs de cierre de caja en Soles.

---

## 3. Roadmap Estratégico de 6 Fases (Calibrado para 64k Tokens)

Cada fase está diseñada para escribirse de forma completa, sin código recortado, sin marcadores de posición (`// TODO`), con sus tests TDD ejecutados y pasando antes de avanzar a la siguiente:

### FASE 1: Fundaciones, Base de Datos PostgreSQL y Autenticación por PIN
- **Módulos**: Inicialización Next.js 15, configuración Prisma, modelos DB, seed inicial y autenticación con PIN de 4 dígitos.
- **TDD (10 Tests)**: `tests/unit/auth/rbac.test.ts` (HU-05: roles Vendedor/Admin, PIN, ocultamiento de costos).

### FASE 2: Catálogo, Matriz de Variantes y Módulo de Importación Masiva (Excel/Word)
- **Módulos**: CRUD de productos y variantes (ropa por tallas/colores vs herramientas simples), compresor WebP en navegador (<80 KB) e importador masivo Excel/CSV.
- **TDD (20 Tests)**: `tests/unit/catalog/variants.test.ts` (HU-06) y `tests/unit/catalog/importer.test.ts` (HU-07).

### FASE 3: Motor Transaccional Atómico, Prevención de Sobreventa y Auditoría Kardex
- **Módulos**: Cobro transaccional `$transaction` con bloqueo pesimista `SELECT ... FOR UPDATE`, registro Kardex inmutable y anulación de ventas para Admin.
- **TDD (20 Tests)**: `tests/integration/concurrency.test.ts` (HU-01: estrés concurrente de 10 peticiones) y `tests/integration/void-sale.test.ts` (HU-08).

### FASE 4: Motor Financiero en Soles (`S/.`) y Punto de Venta Interactivo (Lumina POS UI)
- **Módulos**: Motor de cálculo en Soles con descuentos rápidos (5%, 10%, 15%, 20%, fijo), vuelto exacto, layout de laptop Lumina (Navy/Emerald), búsqueda en memoria en 0ms y atajos de teclado (`F2`, `Enter`, `F4`, `Esc`).
- **TDD (20 Tests)**: `tests/unit/pos/calculations.test.ts` (HU-03) y `tests/unit/pos/search.test.ts` (HU-02).

### FASE 5: Sincronización en Tiempo Real entre Laptops vía WebSockets (<100ms)
- **Módulos**: Conexión a Supabase Realtime (CDC), actualización automática de badges de stock en vivo, alertas críticas (≤ 3 unidades) y reconexión transparente por WiFi.
- **TDD (10 Tests)**: `tests/integration/realtime.test.ts` (HU-04).

### FASE 6: Motores de Reportes Ejecutivos (Excel .xlsx y PDF Arqueo de Caja) y Despliegue
- **Módulos**: Generador con `exceljs` de libros contables con fórmulas dinámicas `=SUM(...)` en Soles, PDF de Arqueo Diario de Caja imprimible con firmas, y verificación de los 100 tests.
- **TDD (20 Tests)**: `tests/unit/reports/excel.test.ts` (HU-09) y `tests/unit/reports/cash-closing.test.ts` (HU-10).

---

## 4. Matriz de Cobertura Total

| Fase | Foco Principal | Tests TDD | Historias Cubiertas |
| :--- | :--- | :---: | :--- |
| **Fase 1** | Base, Prisma DB & Roles PIN | **10 tests** | HU-05 (Seguridad y RBAC con PIN) |
| **Fase 2** | Catálogo, Variantes & Excel Importer | **20 tests** | HU-06 (Variantes) + HU-07 (Importador) |
| **Fase 3** | Backend Atómico & Anti-Sobreventa | **20 tests** | HU-01 (Concurrencia) + HU-08 (Kardex/Anulación) |
| **Fase 4** | Motor Soles & POS UI Lumina | **20 tests** | HU-02 (Búsqueda 0ms) + HU-03 (Cálculos en S/.) |
| **Fase 5** | WebSockets & Tiempo Real <100ms | **10 tests** | HU-04 (Sincronización Realtime) |
| **Fase 6** | Reportes Excel/PDF & Despliegue | **20 tests** | HU-09 (Excel .xlsx) + HU-10 (PDF Arqueo) |
| **TOTAL** | **Sistema Completo Listo para Producción** | **100 tests** | **10 Historias de Usuario (100% en Verde)** |
