# Referencia de API REST — Lumina Wholesale POS

> **Especificación Técnica de los Endpoints del Sistema**  
> **Proyecto:** Lumina Wholesale & Liquidation POS  
> **Base URL:** `http://localhost:3000/api` (Local) / `https://<dominio-vercel>/api` (Producción)

---

## 🔐 1. Módulo de Autenticación & Sesión

### 1.1. Iniciar Sesión por PIN
Valida el PIN de 4 dígitos numéricos, emite un token JWT firmado y establece una cookie `lumina_session` con banderas `HttpOnly; SameSite=Lax`.

- **Método:** `POST`
- **Ruta:** `/api/auth/login`
- **Autorización:** Pública
- **Request Body:**
```json
{
  "pin": "1234"
}
```
- **Respuestas:**
  - `200 OK` (Autenticación exitosa):
    ```json
    {
      "success": true,
      "user": {
        "id": "usr_cajero_01",
        "nombre": "Rosa Flores",
        "rol": "VENDEDOR",
        "activo": true
      },
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
    ```
  - `400 Bad Request` (`INVALID_FORMAT`): Formato de PIN incorrecto.
  - `401 Unauthorized` (`INVALID_PIN` / `USER_NOT_FOUND`): Credenciales incorrectas.

---

### 1.2. Cerrar Sesión
Invalida la sesión activa y elimina la cookie `lumina_session`.

- **Método:** `POST`
- **Ruta:** `/api/auth/logout`
- **Autorización:** Autenticado
- **Respuesta:**
  - `200 OK`:
    ```json
    { "success": true, "message": "Sesión cerrada correctamente" }
    ```

---

### 1.3. Consultar Perfil Actual
Retorna los datos del usuario en sesión a partir de la cookie JWT o el encabezado `Authorization: Bearer <token>`.

- **Método:** `GET`
- **Ruta:** `/api/auth/me`
- **Autorización:** Autenticado
- **Respuesta:**
  - `200 OK`:
    ```json
    {
      "success": true,
      "user": {
        "userId": "usr_cajero_01",
        "nombre": "Rosa Flores",
        "rol": "VENDEDOR"
      }
    }
    ```
  - `401 Unauthorized`: Token ausente, alterado o expirado.

---

## 📦 2. Módulo de Catálogo & Variantes

### 2.1. Listar Catálogo e Inventario
Obtiene los productos con sus variantes agrupadas. **Aislamiento de Costos:** Si el usuario autenticado tiene rol `VENDEDOR`, los campos `costo` son omitidos.

- **Método:** `GET`
- **Ruta:** `/api/catalog`
- **Autorización:** Autenticado (`VENDEDOR` o `ADMIN`)
- **Query Parameters:**
  - `q` *(opcional)*: Término de búsqueda difusa.
  - `categoria` *(opcional)*: ID de categoría para filtrar.
- **Respuesta:**
  - `200 OK`:
    ```json
    {
      "success": true,
      "productos": [
        {
          "id": "prod_polo_01",
          "nombre": "Polo Oversize Heavyweight 240g",
          "codigoSku": "POLO-HVY",
          "categoriaNombre": "Textil",
          "precioOriginal": 45.0,
          "precioLiquidacion": 28.0,
          "variantes": [
            {
              "id": "var_01",
              "sku": "POLO-HVY-NG-M",
              "talla": "M",
              "color": "Negro",
              "stockActual": 18,
              "ubicacion": "Rack A-1"
            }
          ]
        }
      ]
    }
    ```

---

### 2.2. Importación Masiva de Inventario
Carga un archivo Excel (`.xlsx`) o CSV con productos y variantes, ejecutando validación sintética y deduplicación.

- **Método:** `POST`
- **Ruta:** `/api/catalog/import`
- **Autorización:** Exclusiva para rol **`ADMIN`**
- **Content-Type:** `multipart/form-data` o `application/json`
- **Parámetros Form-Data:**
  - `file`: Archivo binario `.xlsx` o texto plano `.csv`.
  - `persist`: `"true"` para guardar en base de datos; `"false"` para modo simulación/previsualización.
- **Respuesta:**
  - `200 OK`:
    ```json
    {
      "success": true,
      "reporte": {
        "totalFilas": 150,
        "filasValidas": 150,
        "filasFallidas": 0,
        "productosAgrupados": [ ... ],
        "errores": []
      }
    }
    ```
  - `403 Forbidden`: Si el usuario no tiene rol `ADMIN`.

---

## 💳 3. Módulo de Ventas & Transacciones ACID

### 3.1. Procesar Cobro de Venta (Bloqueo Pesimista)
Registra una venta de forma atómica aplicando bloqueo exclusivo `SELECT ... FOR UPDATE` sobre cada variante y descontando el inventario.

- **Método:** `POST`
- **Ruta:** `/api/sales`
- **Autorización:** `VENDEDOR` o `ADMIN`
- **Request Body:**
```json
{
  "items": [
    {
      "varianteId": "var_01",
      "cantidad": 2,
      "precioUnitario": 28.0
    }
  ],
  "metodoPago": "EFECTIVO",
  "montoRecibido": 100.0,
  "tipoDescuento": "PORCENTAJE",
  "descuento": 10
}
```
- **Respuestas:**
  - `201 Created`:
    ```json
    {
      "success": true,
      "venta": {
        "id": "sale_1730164800000_abc12",
        "numeroTicket": "B001-000042",
        "subtotal": 56.0,
        "descuento": 5.6,
        "total": 50.4,
        "metodoPago": "EFECTIVO",
        "montoRecibido": 100.0,
        "vuelto": 49.6,
        "estado": "COMPLETADA",
        "createdAt": "2026-10-29T06:00:00.000Z"
      }
    }
    ```
  - `409 Conflict` (`STOCK_INSUFICIENTE`): Stock insuficiente para uno o más ítems. Retorna array `stockFaltante` con disponibilidad real.
  - `400 Bad Request` (`CANTIDAD_INVALIDA` / `MONTO_INSUFICIENTE`): Parámetros fuera de rango.

---

### 3.2. Anular Venta y Restaurar Kardex
Anula una venta completada, devolviendo el stock de forma atómica al inventario y registrando una entrada de tipo `ANULACION` en el Kardex.

- **Método:** `POST`
- **Ruta:** `/api/sales/void`
- **Autorización:** Exclusiva para rol **`ADMIN`**
- **Request Body:**
```json
{
  "ventaId": "sale_1730164800000_abc12",
  "motivo": "Devolución autorizada por error en digitación de comprobante"
}
```
- **Respuestas:**
  - `200 OK`:
    ```json
    {
      "success": true,
      "mensaje": "Venta anulada e inventario restituido exitosamente",
      "venta": { "id": "sale_1730164800000_abc12", "estado": "ANULADA" }
    }
    ```
  - `403 Forbidden`: Intento de anulación ejecutado por rol distinto a `ADMIN`.
  - `400 Bad Request` (`MOTIVO_REQUERIDO` / `VENTA_YA_ANULADA`).

---

## 📊 4. Módulo de Reportes Contables & Cierre

### 4.1. Descargar Informe Ejecutivo en Excel (.xlsx)
Genera y transmite en *streaming* binario un libro de cálculo oficial en formato `.xlsx` con 3 hojas, KPIs y fórmulas contables nativas `=SUM(...)`.

- **Método:** `GET`
- **Ruta:** `/api/reports/excel`
- **Autorización:** Exclusiva para rol **`ADMIN`**
- **Headers de Respuesta:**
  - `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
  - `Content-Disposition: attachment; filename="Reporte_Ejecutivo_Lumina_YYYYMMDD.xlsx"`

---

### 4.2. Registrar Acta Oficial de Arqueo y Cierre Diario
Concilia el monto inicial de apertura, ventas en efectivo y ventas digitales registradas en el turno vs el dinero contado físicamente.

- **Método:** `POST`
- **Ruta:** `/api/reports/cash-closing`
- **Autorización:** Autenticado (`VENDEDOR` o `ADMIN`)
- **Request Body:**
```json
{
  "montoApertura": 150.0,
  "efectivoContadoFisico": 980.0,
  "observaciones": "Turno mañana sin novedades operativas"
}
```
- **Respuesta:**
  - `200 OK`:
    ```json
    {
      "success": true,
      "documento": {
        "id": "ACTA-20261029-0001",
        "cajeroNombre": "Rosa Flores",
        "calculos": {
          "montoApertura": 150.0,
          "ventasEfectivoTotal": 850.0,
          "efectivoEsperado": 1000.0,
          "efectivoContadoFisico": 980.0,
          "diferencia": -20.0,
          "estadoDiferencia": "FALTANTE",
          "ventasDigitalesTotal": 1200.0,
          "totalVentasGlobal": 2050.0
        },
        "leyendaLegal": "Venta Final de Liquidación - Sin Devolución"
      },
      "htmlImprimible": "<!DOCTYPE html><html>...</html>"
    }
    ```
