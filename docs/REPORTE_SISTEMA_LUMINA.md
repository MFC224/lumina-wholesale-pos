# 🛍️ Reporte Ejecutivo del Sistema: Lumina Wholesale & Liquidation POS

> **Resumen oficial de funcionalidades, arquitectura y módulos operativos del sistema hasta la fecha.**  
> Diseñado para tiendas mayoristas y remates de liquidación con alta afluencia, operación simultánea en múltiples laptops y transacciones en Soles (S/.).

---

## 🎯 1. ¿Qué es Lumina POS y qué problema resuelve?

**Lumina Wholesale & Liquidation POS** es una plataforma integral de **Punto de Venta (POS) e Inventario Inteligente** concebida específicamente para negocios de remates masivos y comercio mayorista.

### Problemas que elimina de raíz:
1. **Cero Sobreventa en Liquidaciones:** Si dos cajeros intentan cobrar la última unidad disponible al mismo segundo, el motor transaccional pesimista (`SELECT FOR UPDATE`) asegura que solo uno complete la venta y el otro sea notificado en <100ms, evitando conflictos con clientes.
2. **Aislamiento Total de Costos (Zero-Trust):** Los vendedores cobran con agilidad extrema pero **nunca** ven los costos de importación ni márgenes de ganancia.
3. **Velocidad Extrema (0 ms):** Búsqueda difusa de miles de productos en memoria RAM de laptop sin tiempos de carga ni recargas de página.
4. **Resiliencia Operativa:** Persistencia automática de carritos en memoria local ante cortes de energía o cierres involuntarios.

---

## 🔑 2. Control de Acceso por PIN de 4 Dígitos

El inicio de sesión elimina contraseñas largas y lentas en favor de un **PIN Pad numérico táctil y físico** de 4 dígitos con encriptación `bcryptjs`:

![Inicio de Turno con PIN Pad](img/01-login-pin.png)

- **Rol VENDEDOR (PINs 1234, 2345, etc.):** Enfocado en cobrar con rapidez, buscar mercadería, añadir ítems y consultar existencias.
- **Rol ADMIN (PIN 9999):** Acceso total a márgenes brutos, importación masiva de lotes, auditoría de Kardex, ajustes de stock y anulación/devolución de ventas.

---

## ⚡ 3. Terminal POS Ultrarrápido y Escala Mayorista

La interfaz principal de venta está pensada para ser operada **100% con el teclado o lector láser de código de barras**, reduciendo el tiempo de atención por cliente a segundos:

![Terminal de Venta POS Lumina](img/02-pos-terminal.png)

### Características del Terminal:
- **Búsqueda Instantánea (<kbd>F1</kbd>):** Encuentra productos por código SKU, nombre o palabras clave abreviadas (ej. `pol hvy m` ubica el polo heavyweight talla M).
- **Soporte Nativo de Pistola Láser:** Escaneo continuo que añade productos o incrementa cantidades (+1) con confirmación auditiva sutil.
- **Escala Mayorista Automática:** El sistema detecta el volumen total de prendas o artículos y ofrece descuentos automáticos por tramos:
  - **3 a 5 unidades:** 5% Descuento por Lote.
  - **6 a 11 unidades:** 10% Descuento Media Docena.
  - **12 o más unidades:** 15% Descuento Fardo Mayorista.

![Carrito con Descuento Mayorista](img/03-pos-cart-wholesale.png)

---

## 💵 4. Módulo de Cobro y Cálculo de Vuelto

El módulo de pago está adaptado a la realidad comercial peruana con cálculo en céntimos para evitar discrepancias por redondeo:

![Modal de Cobro en Efectivo](img/04-modal-cobro.png)

- **Billetes Peruanos en 1 Clic:** Atajos para denominaciones de `S/. 10`, `S/. 20`, `S/. 50`, `S/. 100` y `S/. 200`.
- **Pantalla Gigante de Vuelto:** Visualización nítida y destacada del vuelto a devolver al cliente para evitar equivocaciones de caja.
- **Medios de Pago Múltiples:** Efectivo (<kbd>F9</kbd>), Yape / Plin / Transferencias (<kbd>F10</kbd>) y Tarjetas.
- **Identificación Mayorista:** Opción de registrar DNI/RUC y Razón Social del comprador en el comprobante.

---

## 🖨️ 5. Comprobantes Térmicos y Reimpresión (80mm y 58mm)

El sistema incluye un motor propio de impresión térmica para tiqueteras estándar (Epson, Bixolon, Xprinter):
- **Ticket de Venta:** Cabecera institucional, RUC, detalle de variantes (tallas/colores), desglose de Efectivo/Vuelto y leyenda legal obligatoria de remate:  
  `"VENTA FINAL DE LIQUIDACIÓN — SIN CAMBIOS NI DEVOLUCIONES"`.
- **Atajo Rápido (<kbd>F11</kbd> o <kbd>P</kbd>):** Impresión inmediata tras confirmar la venta.
- **Reimpresión:** Cualquier comprobante del día puede reimprimirse como duplicado desde el Historial de Ventas.
- **Devoluciones Parciales con Nota de Crédito:** Los administradores pueden procesar devoluciones por ítem específico, reintegrando el producto al inventario y emitiendo el ticket térmico correspondiente.

---

## 📊 6. Dashboard de Inteligencia de Liquidación

Permite a los dueños y supervisores monitorear la salud comercial del remate en tiempo real:

![Dashboard de Liquidación y Métricas](img/05-dashboard-metricas.png)

- **Tasa de Liquidación Global:** Porcentaje total de mercadería rematada vs inventario inicial.
- **Velocidad de Desplome:** Análisis de los productos que vuelan primero (Top 5 más vendidos).
- **Detección de "Huesos" (Baja Rotación):** Identificación automática de productos estancados con recomendaciones para liquidarlos mediante promociones agresivas.
- **Desglose de Ingresos:** Gráficos de distribución de recaudación por medio de pago.

---

## 📋 7. Arqueo de Caja y Reportes Contables

Al terminar el turno de atención, el cajero realiza la conciliación diaria para asegurar la transparencia del dinero:

![Acta Oficial de Arqueo y Cierre Diario](img/06-reportes-arqueo-caja.png)

- **Cierre Z en Ticket Térmico:** Impresión del corte de caja con fondos iniciales, recaudación en efectivo, ventas digitales, descuadre (faltante/sobrante) y espacio para firmas de cajero y supervisor.
- **Acta Oficial en PDF:** Formato formal imprimible con desglose de billetes y monedas.
- **Libro Contable e Inventario Valorizado en Excel (.xlsx):** Generado con fórmulas matemáticas dinámicas (`=SUM(...)`), estilos ejecutivos y detalle completo por variantes:

![Exportación Contable en Excel](img/07-reportes-excel.png)

---

## 📦 8. Auditoría de Kardex y Trazabilidad Total

Cada unidad que entra o sale del almacén queda registrada en una bitácora inmutable:

![Auditoría de Kardex en Vivo](img/08-kardex-auditoria.png)

- **Tipos de Movimientos:** `VENTA`, `INGRESO`, `AJUSTE` manual y `ANULACION`.
- **Ajustes de Inventario Físico:** Permite al administrador corregir mermas, roturas o ingresos extraordinarios con motivo justificado obligatorio.
- **Exportación de Kardex a Excel (.xlsx):** Descarga en un clic de todo el historial de movimientos valorizados para auditorías externas.

---

## ⚡ 9. Sincronización WebSockets en Tiempo Real

- Sincronización bidireccional en menos de 100 milisegundos mediante WebSockets.
- Alertas acústicas y visuales automáticas cuando el stock de cualquier producto cae a **$\le 3$ unidades** o se agota en cualquier terminal del local.
- **Resiliencia Offline / PWA:** Puede instalarse como aplicación de escritorio nativa en laptops de almacén y caja, recuperando carritos activos ante reinicios imprevistos.

---

## 📈 Resumen Numérico de Calidad y Desarrollo

| Métrica | Valor Actual |
| :--- | :--- |
| **Pruebas Automatizadas (Vitest)** | **173 tests pasando al 100% (0 errores)** |
| **Suites de Pruebas** | 23 suites unitarias, de integración y de concurrencia |
| **Rutas API de Producción** | 15 endpoints optimizados |
| **Catálogo Pre-cargado** | 52 productos curados con fotos reales, 101 variantes y >3,000 unidades |
| **Moneda Base** | Soles Peruanos (S/.) con aritmética decimal exacta |
