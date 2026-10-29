# Manual de Usuario y Operaciones — Lumina Wholesale POS

> **Guía Oficial de Operación para Personal de Tienda, Almacén y Administración**  
> **Sistema:** Lumina Wholesale & Liquidation POS  
> **Versión:** 1.1.0-production

---

## 🧭 Índice Rápido por Perfiles

1. [Manual del Cajero / Vendedor](#1-manual-del-cajero--vendedor)
   - [Inicio de turno con PIN](#11-inicio-de-turno-con-pin)
   - [Búsqueda y escaneo de productos](#12-búsqueda-y-escaneo-de-productos)
   - [Navegación 100% por teclado](#13-navegación-100-por-teclado)
   - [Aplicación de descuentos rápidos](#14-aplicación-de-descuentos-rápidos)
   - [Cobro en efectivo y cálculo de vuelto](#15-cobro-en-efectivo-y-cálculo-de-vuelto)
   - [Cobro digital (Yape / Plin / Tarjetas)](#16-cobro-digital-yape--plin--tarjetas)
   - [Arqueo y Cierre Diario de Caja](#17-arqueo-y-cierre-diario-de-caja)
2. [Manual del Jefe de Almacén y Recepción](#2-manual-del-jefe-de-almacén-y-recepción)
   - [Carga masiva vía Excel o CSV](#21-carga-masiva-vía-excel-o-csv)
   - [Estructura y columnas obligatorias](#22-estructura-y-columnas-obligatorias)
   - [Compresión de fotos de producto a WebP](#23-compresión-de-fotos-de-producto-a-webp)
   - [Gestión de matriz de variantes y SKUs](#24-gestión-de-matriz-de-variantes-y-skus)
3. [Manual del Supervisor y Administrador General](#3-manual-del-supervisor-y-administrador-general)
   - [Supervisión de alertas de stock crítico en vivo](#31-supervisión-de-alertas-de-stock-crítico-en-vivo)
   - [Anulación justificada de ventas en Kardex](#32-anulación-justificada-de-ventas-en-kardex)
   - [Exportación del Reporte Ejecutivo en Excel (.xlsx)](#33-exportación-del-reporte-ejecutivo-en-excel-xlsx)
   - [Revisión y firma del Acta de Arqueo](#34-revisión-y-firma-del-acta-de-arqueo)

---

## 1. Manual del Cajero / Vendedor

### 1.1. Inicio de turno con PIN
1. En la pantalla de bienvenida, digita tu **PIN numérico de 4 dígitos** asignado por la administración.
2. Puedes usar el teclado numérico de tu laptop o hacer clic en los botones táctiles de la pantalla.
3. El sistema valida instantáneamente tu identidad y habilita el terminal con tu nombre visible en la barra superior.

### 1.2. Búsqueda y escaneo de productos
- **Lector de Código de Barras:** Con la ventana activa, cualquier escaneo láser ubica y añade automáticamente el producto al carrito en 0 milisegundos.
- **Búsqueda Manual Inteligente:** Presiona <kbd>F1</kbd> y escribe palabras clave abreviadas:
  - Ejemplo: `pol hvy m` encuentra *Polo Heavyweight Talla M*.
  - Ejemplo: `tal 650` encuentra *Taladro Industrial 650W*.

### 1.3. Navegación 100% por teclado
Para operar a máxima velocidad sin usar el ratón:
- <kbd>F1</kbd>: Enfocar buscador de catálogo.
- <kbd>F2</kbd>: Modificar la cantidad del producto seleccionado.
- <kbd>F8</kbd>: Abrir panel de descuentos.
- <kbd>F9</kbd>: Cambiar medio de pago a **Efectivo**.
- <kbd>F10</kbd>: Cambiar medio de pago a **Yape / Digital**.
- <kbd>F12</kbd>: Cobrar e imprimir comprobante de venta.
- <kbd>Esc</kbd>: Cancelar modal o vaciar carrito actual.

### 1.4. Aplicación de descuentos rápidos
Presiona <kbd>F8</kbd> para aplicar descuentos de liquidación comercial autorizados:
- **Botones de atajo rápido:** `5%`, `10%`, `15%`, `20%`.
- **Monto fijo:** Digita una rebaja específica en Soles (ejemplo: `S/. 10.00`).
- El sistema recalcula en tiempo real el subtotal, el monto ahorrado y el total final.

### 1.5. Cobro en efectivo y cálculo de vuelto
1. Presiona <kbd>F9</kbd> para activar la modalidad **Efectivo**.
2. Usa los botones rápidos con billetes peruanos: <kbd>S/. 10</kbd>, <kbd>S/. 20</kbd>, <kbd>S/. 50</kbd>, <kbd>S/. 100</kbd> o <kbd>S/. 200</kbd>.
3. El sistema muestra en pantalla gigante con tipografía legible el **Vuelto Exacto a entregar**.
4. Presiona <kbd>F12</kbd> o <kbd>Enter</kbd> para completar la venta.

### 1.6. Cobro digital (Yape / Plin / Tarjetas)
1. Presiona <kbd>F10</kbd> para seleccionar **Yape / Plin**.
2. Verifica en tu celular o pantalla que la transferencia se haya acreditado en cuenta.
3. En pagos digitales, el monto recibido es siempre igual al total exacto (vuelto: S/. 0.00).
4. Presiona <kbd>F12</kbd> para emitir el ticket.

### 1.7. Arqueo y Cierre Diario de Caja
Al finalizar tu turno laboral:
1. Dirígete a la pestaña **Cierre Diario / Arqueo**.
2. Ingresa el **Fondo Inicial de Apertura** (ejemplo: `S/. 100.00`).
3. Cuenta físicamente los billetes y monedas que tienes en la gaveta y digita el total en **Efectivo Contado Físicamente**.
4. El sistema calculará la conciliación:
   - **`CUADRADO` (Verde):** El dinero físico coincide al 100% con las ventas registradas.
   - **`FALTANTE` (Rojo):** Existe una diferencia negativa que debe justificarse en el campo de observaciones.
   - **`SOBRANTE` (Azul):** Hay excedente de dinero en gaveta física.
5. Haz clic en **Emitir Acta Oficial e Imprimir PDF**. Ambos (Cajero y Supervisor) deben firmar el documento físico.

---

## 2. Manual del Jefe de Almacén y Recepción

### 2.1. Carga masiva vía Excel o CSV
1. Inicia sesión con credenciales de **Administrador**.
2. Ingresa a la sección **Catálogo** $\rightarrow$ **Importar Lote de Mercadería**.
3. Arrastra tu archivo `.xlsx` o `.csv`.
4. El sistema previsualiza el resultado antes de guardar:
   - Identifica cuántas filas son válidas.
   - Advierte si existen inconsistencias de formato.
5. Confirma la importación haciendo clic en **Procesar y Guardar en Inventario**.

### 2.2. Estructura y columnas obligatorias
Tu archivo Excel puede tener las siguientes columnas (el orden es indiferente y los nombres de encabezado son flexibles):

| Columna Excel | Variaciones Admitidas | Ejemplo de Valor |
| :--- | :--- | :--- |
| **Producto** | `Nombre`, `Item`, `Descripcion` | *Pantalón Jean Clásico Slim* |
| **SKU Base** | `SKU`, `Codigo`, `Modelo` | *JEAN-SLIM* |
| **Categoría**| `Rubro`, `Categoria` | *Textil / Ropa* |
| **Talla** | `Size`, `Talla` | *30, 32, M, L, Única* |
| **Color** | `Color`, `Tono` | *Azul Marino, Negro* |
| **Precio** | `Liquidacion`, `Precio`, `Venta` | *S/. 49.90* |
| **Costo** | `Costo`, `Compra` | *S/. 20.00* (Confidencial) |
| **Stock** | `Stock`, `Cantidad`, `Inicial` | *25* |
| **Ubicación**| `Rack`, `Estante`, `Pasillo` | *Rack B-4* |

### 2.3. Compresión de fotos de producto a WebP
- Al cargar fotos desde el celular o cámara en la ficha de producto, el sistema activa automáticamente el compresor WebP en tu navegador.
- Imágenes pesadas de 5 MB a 10 MB se reducen a menos de **80 KB** en menos de 1 segundo sin pérdida visible de nitidez, optimizando la velocidad de carga de las laptops de tienda.

### 2.4. Gestión de matriz de variantes y SKUs
- Para productos con tallas y colores, el sistema genera automáticamente el código de barras y SKU estandarizado:  
  `[CATEGORÍA]-[PRODUCTO]-[COLOR]-[TALLA]` (ejemplo: `TEX-POLO-NG-M`).
- Puedes consultar el stock en tiempo real por cada celda de la matriz (ejemplo: Talla M en Color Negro: 15 unidades).

---

## 3. Manual del Supervisor y Administrador General

### 3.1. Supervisión de alertas de stock crítico en vivo
- Las pantallas de las laptops de almacén cuentan con un oyente de WebSockets en tiempo real:
  - 🟢 **Badge Verde:** Stock disponible normal ($> 3$ unidades).
  - 🟡 **Badge Amarillo (CRÍTICO):** Quedan 3, 2 o 1 unidades disponibles. Alerta visual inmediata para prevenir sobreventas.
  - 🔴 **Badge Rojo (AGOTADO):** Stock en 0. El producto queda deshabilitado en caja automáticamente.

### 3.2. Anulación justificada de ventas en Kardex
Si un cliente devuelve mercadería por cambio inmediato o hubo error de digitación:
1. Ingresa a **Historial de Ventas**.
2. Ubica el ticket del cliente (ejemplo: `B001-000042`).
3. Haz clic en **Anular Venta**.
4. **Campo Obligatorio:** Debes ingresar un motivo justificado (ejemplo: *"Cliente solicitó cambio de talla en mostrador"*).
5. El sistema ejecuta una transacción que:
   - Marca la venta como `ANULADA`.
   - Reingresa de inmediato el stock al inventario.
   - Crea un registro de tipo `ANULACION` en el Kardex inmutable para auditorías contables.

### 3.3. Exportación del Reporte Ejecutivo en Excel (.xlsx)
1. Ingresa a la sección **Reportes**.
2. Haz clic en el botón verde **Exportar Reporte Oficial (.xlsx)**.
3. Se descargará un libro Excel con 3 hojas estructuradas:
   - **Hoja 1 (Resumen Ejecutivo):** KPIs de facturación total en Soles, desglose por medio de pago y margen bruto estimado.
   - **Hoja 2 (Detalle de Tickets):** Registro cronológico de todas las ventas con ticket, cajero, subtotal y total.
   - **Hoja 3 (Inventario Valorizado):** Mercadería en existencia valorizada a costo de liquidación y porcentaje liquidado.
4. Las sumatorias en Excel utilizan fórmulas dinámicas nativas `=SUM(E3:E15)`, permitiendo al contador auditar los balances directamente.

### 3.4. Revisión y firma del Acta de Arqueo
- Al final de la jornada comercial, el Administrador debe revisar el Acta Oficial generada por cada cajero.
- El acta incluye la cláusula legal obligatoria de remate:  
  `"VENTA FINAL DE LIQUIDACIÓN - SIN DEVOLUCIÓN"`.
- Estampar la firma física del Supervisor en el recuadro correspondiente y archivar el comprobante contable.
