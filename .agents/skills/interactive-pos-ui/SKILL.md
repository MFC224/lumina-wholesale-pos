---
name: interactive-pos-ui
description: Diseño e implementación de interfaces interactivas de Punto de Venta (POS) ultrarrápidas, diseño Lumina Wholesale & Liquidation, navegación 100% por teclado, búsqueda difusa en memoria (0ms) y sincronización WebSockets.
---

# Interactive POS UI Skill (Lumina Design System)

Guía para la construcción de interfaces de venta ultrarrápidas y responsivas optimizadas para laptops de caja y almacén.

## 1. Tokens de Diseño: Lumina Wholesale & Liquidation
- **Primario (Navy Institucional)**: `#081C6C` (Headers, acciones principales, foco).
- **Secundario (Verde Esmeralda)**: `#10B981` (Cobro de venta, badge en stock, pulso de disponibilidad).
- **Alerta / Agotado**: `#EF4444` (Pocas unidades, sin stock).
- **Fondos**: Superficie `#F8FAFC`, tarjetas `#FFFFFF`, bordes `rgba(226, 232, 240, 0.8)`.
- **Tipografía**: Fuente **Inter** con alineación tabular obligatoria (`font-variant-numeric: tabular-nums`) para montos en Soles (`S/. 0.00`).
- **Contornos**: Tarjetas `rounded-2xl` (16px), micro-pills `rounded-full`.

## 2. Experiencia de Teclado (Keyboard-First POS)
El cajero no debe perder tiempo con el mouse:
- `F2` o `/`: Enfocar buscador universal.
- `Flecha Abajo / Arriba` + `Enter`: Seleccionar y agregar producto al carrito.
- `F4` o `Espacio`: Abrir modal de cobro directo.
- `Esc`: Limpiar búsqueda o cancelar modal.

## 3. Búsqueda Difusa en Memoria (0ms Latencia)
- Almacenar el catálogo activo en memoria local del cliente (Zustand / TanStack Query cache).
- Búsqueda en memoria sobre: `[nombre, marca, codigoSku, talla, color, ubicacion]`.
- Normalización contra tildes (`normalize("NFD").replace(/[\u0300-\u036f]/g, "")`) e insensibilidad a mayúsculas.

## 4. Sincronización en Tiempo Real vía WebSockets
- Suscripción a canal Supabase Realtime:
  ```typescript
  supabase
    .channel('stock-channel')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'VarianteStock' }, (payload) => {
      actualizarStockEnCache(payload.new.id, payload.new.stockActual);
    })
    .subscribe();
  ```
