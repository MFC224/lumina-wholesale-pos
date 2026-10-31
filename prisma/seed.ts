import { PrismaClient, Rol, TipoMovimiento } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function hashPin(pin: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(pin, salt);
}

async function main() {
  console.log("🌱 Iniciando seed masivo de 50+ productos para Lumina Wholesale & Liquidation...");

  // 1. Limpieza inicial controlada
  await prisma.movimientoKardex.deleteMany();
  await prisma.detalleVenta.deleteMany();
  await prisma.venta.deleteMany();
  await prisma.sesionCaja.deleteMany();
  await prisma.varianteStock.deleteMany();
  await prisma.producto.deleteMany();
  await prisma.categoria.deleteMany();
  await prisma.usuario.deleteMany();

  // 2. Usuarios con PIN de 4 dígitos
  const adminPin = await hashPin("9999");
  const vendedor1Pin = await hashPin("1234");
  const vendedor2Pin = await hashPin("2345");
  const vendedor3Pin = await hashPin("3456");
  const vendedor4Pin = await hashPin("4321");

  const admin = await prisma.usuario.create({
    data: {
      nombre: "Administrador General",
      pin: adminPin,
      rol: Rol.ADMIN,
      activo: true,
    },
  });

  await prisma.usuario.create({
    data: {
      nombre: "Carlos Mendoza (Caja 1 - Principal)",
      pin: vendedor1Pin,
      rol: Rol.VENDEDOR,
      activo: true,
    },
  });

  await prisma.usuario.create({
    data: {
      nombre: "Ana Gómez (Caja 2 - Mostrador Central)",
      pin: vendedor2Pin,
      rol: Rol.VENDEDOR,
      activo: true,
    },
  });

  await prisma.usuario.create({
    data: {
      nombre: "Luis Paredes (Caja 3 - Almacén y Retiro)",
      pin: vendedor3Pin,
      rol: Rol.VENDEDOR,
      activo: true,
    },
  });

  await prisma.usuario.create({
    data: {
      nombre: "Sofía Quispe (Caja 4 - Liquidaciones)",
      pin: vendedor4Pin,
      rol: Rol.VENDEDOR,
      activo: true,
    },
  });

  console.log("✅ Usuarios creados: Admin (9999), Carlos Mendoza (1234), Ana Gómez (2345), Luis Paredes (3456), Sofía Quispe (4321)");

  console.log("✅ Usuarios creados: Admin (9999), Caja 1 (1234), Caja 2 (4321)");

  // 3. Categorías
  const catHerramientas = await prisma.categoria.create({
    data: { nombre: "Herramientas y Ferretería", descripcion: "Equipos de uso pesado y manuales en remate" },
  });
  const catTextil = await prisma.categoria.create({
    data: { nombre: "Ropa y Textiles", descripcion: "Prendas de vestir por tallas y colores" },
  });
  const catCalzado = await prisma.categoria.create({
    data: { nombre: "Calzado de Seguridad", descripcion: "Botas y calzado industrial dieléctrico y con puntera" },
  });
  const catEpp = await prisma.categoria.create({
    data: { nombre: "Equipos de Protección (EPP)", descripcion: "Seguridad industrial y protección personal" },
  });
  const catElectricidad = await prisma.categoria.create({
    data: { nombre: "Iluminación y Electricidad", descripcion: "Reflectores LED, cables y conexiones" },
  });

  // 4. Catálogo de 52 Productos con Variantes
  interface RawProduct {
    nombre: string;
    descripcion: string;
    sku: string;
    categoriaId: string;
    precioOriginal: number;
    precioLiquidacion: number;
    costo: number;
    variantes: Array<{
      sku: string;
      talla?: string;
      color?: string;
      ubicacion?: string;
      stock: number;
    }>;
  }

  const productsData: RawProduct[] = [
    // --- 1. HERRAMIENTAS Y FERRETERÍA (15 productos) ---
    {
      nombre: "Taladro Percutor Inalámbrico 20V Brushless",
      descripcion: "Motor sin carbones con 2 baterías de litio 4.0Ah y maletín",
      sku: "TLD-20V-01",
      categoriaId: catHerramientas.id,
      precioOriginal: 349.9,
      precioLiquidacion: 179.9,
      costo: 110.0,
      variantes: [
        { sku: "TLD-20V-STD", talla: "Estándar", color: "Amarillo/Negro", ubicacion: "Rack H-1", stock: 15 },
        { sku: "TLD-20V-PRO", talla: "Kit Pro", color: "Azul Petróleo", ubicacion: "Rack H-1", stock: 8 },
      ],
    },
    {
      nombre: "Amoladora Angular 4-1/2 Pulg 850W",
      descripcion: "Velocidad de 11,000 RPM con guarda de ajuste rápido",
      sku: "AMO-850-02",
      categoriaId: catHerramientas.id,
      precioOriginal: 199.9,
      precioLiquidacion: 99.9,
      costo: 58.0,
      variantes: [
        { sku: "AMO-850-110", talla: "4-1/2 pulg", color: "Naranja", ubicacion: "Rack H-2", stock: 20 },
      ],
    },
    {
      nombre: "Juego de Llaves Combinadas Cromo Vanadio (12 Pzs)",
      descripcion: "Medidas de 6mm a 22mm con estuche organizador",
      sku: "LLV-CRV-03",
      categoriaId: catHerramientas.id,
      precioOriginal: 89.9,
      precioLiquidacion: 39.9,
      costo: 22.0,
      variantes: [
        { sku: "LLV-12PZ-MET", talla: "Métrico (12 pzs)", color: "Cromo", ubicacion: "Gaveta B-2", stock: 25 },
        { sku: "LLV-12PZ-PUL", talla: "Pulgadas (12 pzs)", color: "Cromo Satinado", ubicacion: "Gaveta B-2", stock: 18 },
      ],
    },
    {
      nombre: "Sierra Circular de Mano 7-1/4 Pulg 1500W",
      descripcion: "Corte biselado hasta 45 grados con guía láser",
      sku: "SIE-1500-04",
      categoriaId: catHerramientas.id,
      precioOriginal: 289.0,
      precioLiquidacion: 145.0,
      costo: 92.0,
      variantes: [
        { sku: "SIE-714-STD", talla: "7-1/4 pulg", color: "Rojo/Negro", ubicacion: "Rack H-3", stock: 12 },
      ],
    },
    {
      nombre: "Martillo de Uña Curva 16oz Mango Fibra de Vidrio",
      descripcion: "Cabeza de acero forjado antichoque con empuñadura ergonómica",
      sku: "MAR-16OZ-05",
      categoriaId: catHerramientas.id,
      precioOriginal: 45.0,
      precioLiquidacion: 19.9,
      costo: 9.5,
      variantes: [
        { sku: "MAR-16-AZ", talla: "16 oz", color: "Azul", ubicacion: "Gaveta B-1", stock: 40 },
        { sku: "MAR-16-NG", talla: "16 oz", color: "Negro/Gris", ubicacion: "Gaveta B-1", stock: 30 },
      ],
    },
    {
      nombre: "Set de Destornilladores de Precisión Imantados (24 Pzs)",
      descripcion: "Puntas Torx, Phillips, Planas y Triwing en estuche de aluminio",
      sku: "DST-24PZ-06",
      categoriaId: catHerramientas.id,
      precioOriginal: 59.9,
      precioLiquidacion: 25.0,
      costo: 12.0,
      variantes: [
        { sku: "DST-24PZ-ALU", talla: "24 piezas", color: "Gris Titanio", ubicacion: "Gaveta B-3", stock: 35 },
      ],
    },
    {
      nombre: "Nivel Láser Autonivelante de 12 Líneas 3D 360",
      descripcion: "Haz de luz verde ultrabrillante con trípode y control remoto",
      sku: "LSR-12L-07",
      categoriaId: catHerramientas.id,
      precioOriginal: 320.0,
      precioLiquidacion: 159.0,
      costo: 98.0,
      variantes: [
        { sku: "LSR-VERDE-3D", talla: "360 Grados", color: "Verde Neón", ubicacion: "Vitrina V-1", stock: 10 },
      ],
    },
    {
      nombre: "Cinta Métrica de Alta Visibilidad 8 Metros / 26 Pies",
      descripcion: "Cinta recubierta de nylon antimagnética con bloqueo automático",
      sku: "WIN-8M-08",
      categoriaId: catHerramientas.id,
      precioOriginal: 35.0,
      precioLiquidacion: 15.0,
      costo: 6.8,
      variantes: [
        { sku: "WIN-8M-AM", talla: "8 metros", color: "Amarillo", ubicacion: "Gaveta B-4", stock: 50 },
        { sku: "WIN-5M-AM", talla: "5 metros", color: "Amarillo", ubicacion: "Gaveta B-4", stock: 45 },
      ],
    },
    {
      nombre: "Pistola de Calor Eléctrica 2000W 600°C",
      descripcion: "Doble temperatura regulable con 4 boquillas intercambiables",
      sku: "PST-2000-09",
      categoriaId: catHerramientas.id,
      precioOriginal: 140.0,
      precioLiquidacion: 69.9,
      costo: 38.0,
      variantes: [
        { sku: "PST-2000W-RO", talla: "2000 Watts", color: "Rojo", ubicacion: "Rack H-2", stock: 16 },
      ],
    },
    {
      nombre: "Alicate Universal de Fuerza 8 Pulg Aislado 1000V",
      descripcion: "Acero cromo vanadio forjado certificado VDE IEC 60900",
      sku: "ALI-8P-10",
      categoriaId: catHerramientas.id,
      precioOriginal: 55.0,
      precioLiquidacion: 26.5,
      costo: 13.0,
      variantes: [
        { sku: "ALI-8P-VDE", talla: "8 pulg", color: "Rojo/Amarillo", ubicacion: "Gaveta B-1", stock: 28 },
      ],
    },
    {
      nombre: "Remachadora Manual Reforzada 10.5 Pulg",
      descripcion: "Incluye 4 boquillas intercambiables para remaches de 2.4 a 4.8mm",
      sku: "REM-MAN-11",
      categoriaId: catHerramientas.id,
      precioOriginal: 48.0,
      precioLiquidacion: 22.0,
      costo: 10.5,
      variantes: [
        { sku: "REM-105-STD", talla: "10.5 pulg", color: "Amarillo/Negro", ubicacion: "Gaveta B-5", stock: 22 },
      ],
    },
    {
      nombre: "Juego de Brocas para Concreto y Metal (16 Pzs)",
      descripcion: "Puntas de carburo de tungsteno y titanio HSS en estuche rígido",
      sku: "BRO-16PZ-12",
      categoriaId: catHerramientas.id,
      precioOriginal: 65.0,
      precioLiquidacion: 28.0,
      costo: 14.0,
      variantes: [
        { sku: "BRO-16-TIT", talla: "Set 16 pzs", color: "Dorado/Plata", ubicacion: "Gaveta B-3", stock: 30 },
      ],
    },
    {
      nombre: "Caja de Herramientas Plástica de Alto Impacto 19 Pulg",
      descripcion: "Cierres metálicos inoxidables con bandeja extraíble y organizadores",
      sku: "CAJ-19P-13",
      categoriaId: catHerramientas.id,
      precioOriginal: 75.0,
      precioLiquidacion: 35.0,
      costo: 18.0,
      variantes: [
        { sku: "CAJ-19P-NG", talla: "19 pulg", color: "Negro/Naranja", ubicacion: "Piso Almacén", stock: 18 },
      ],
    },
    {
      nombre: "Soldadora Inverter Portátil 200A MMA / TIG LIFT",
      descripcion: "Tecnología IGBT ultra ligera 3.2kg con cables y careta básica",
      sku: "SOL-200A-14",
      categoriaId: catHerramientas.id,
      precioOriginal: 450.0,
      precioLiquidacion: 229.0,
      costo: 145.0,
      variantes: [
        { sku: "SOL-200-IGBT", talla: "200 Amperios", color: "Rojo Fuego", ubicacion: "Vitrina V-1", stock: 6 },
      ],
    },
    {
      nombre: "Tornillo de Banco Giratorio de Acero 4 Pulg",
      descripcion: "Base giratoria 360 grados de hierro fundido dúctil 60,000 PSI",
      sku: "TRN-4P-15",
      categoriaId: catHerramientas.id,
      precioOriginal: 160.0,
      precioLiquidacion: 79.0,
      costo: 46.0,
      variantes: [
        { sku: "TRN-4P-AZ", talla: "4 pulg", color: "Azul Marino", ubicacion: "Piso Almacén", stock: 10 },
      ],
    },

    // --- 2. ROPA Y TEXTILES (15 productos) ---
    {
      nombre: "Polo Oversize Heavyweight Cotton 240g",
      descripcion: "Algodón 100% reactivo de alta densidad, cuello rib ancho",
      sku: "POL-HVY-16",
      categoriaId: catTextil.id,
      precioOriginal: 79.9,
      precioLiquidacion: 29.9,
      costo: 14.0,
      variantes: [
        { sku: "POL-HVY-NG-S", talla: "S", color: "Negro", ubicacion: "Rack T-1", stock: 25 },
        { sku: "POL-HVY-NG-M", talla: "M", color: "Negro", ubicacion: "Rack T-1", stock: 35 },
        { sku: "POL-HVY-NG-L", talla: "L", color: "Negro", ubicacion: "Rack T-1", stock: 40 },
        { sku: "POL-HVY-BL-M", talla: "M", color: "Blanco", ubicacion: "Rack T-1", stock: 30 },
        { sku: "POL-HVY-BL-L", talla: "L", color: "Blanco", ubicacion: "Rack T-1", stock: 25 },
      ],
    },
    {
      nombre: "Pantalón Cargo Táctico Militar Ripstop",
      descripcion: "Tela antirasgaduras impermeable con 6 bolsillos reforzados",
      sku: "PAN-CRG-17",
      categoriaId: catTextil.id,
      precioOriginal: 149.0,
      precioLiquidacion: 65.0,
      costo: 33.0,
      variantes: [
        { sku: "PAN-CRG-VG-30", talla: "30", color: "Verde Olivo", ubicacion: "Rack T-2", stock: 18 },
        { sku: "PAN-CRG-VG-32", talla: "32", color: "Verde Olivo", ubicacion: "Rack T-2", stock: 24 },
        { sku: "PAN-CRG-VG-34", talla: "34", color: "Verde Olivo", ubicacion: "Rack T-2", stock: 20 },
        { sku: "PAN-CRG-NG-32", talla: "32", color: "Negro", ubicacion: "Rack T-2", stock: 25 },
        { sku: "PAN-CRG-NG-34", talla: "34", color: "Negro", ubicacion: "Rack T-2", stock: 22 },
      ],
    },
    {
      nombre: "Casaca Cortavientos Térmica Impermeable",
      descripcion: "Forro interior polar microporous con capucha desmontable",
      sku: "CAS-CRV-18",
      categoriaId: catTextil.id,
      precioOriginal: 189.0,
      precioLiquidacion: 79.9,
      costo: 42.0,
      variantes: [
        { sku: "CAS-CRV-AZ-M", talla: "M", color: "Azul Marino", ubicacion: "Rack T-3", stock: 15 },
        { sku: "CAS-CRV-AZ-L", talla: "L", color: "Azul Marino", ubicacion: "Rack T-3", stock: 20 },
        { sku: "CAS-CRV-NG-L", talla: "L", color: "Negro", ubicacion: "Rack T-3", stock: 25 },
        { sku: "CAS-CRV-NG-XL", talla: "XL", color: "Negro", ubicacion: "Rack T-3", stock: 14 },
      ],
    },
    {
      nombre: "Polera Hoodie Básica Unisex Franela Pesada",
      descripcion: "Algodón perchado 320g con bolsillo canguro y cordones ajustables",
      sku: "POL-HOD-19",
      categoriaId: catTextil.id,
      precioOriginal: 119.0,
      precioLiquidacion: 49.9,
      costo: 26.0,
      variantes: [
        { sku: "HOD-PL-M", talla: "M", color: "Plomo Melange", ubicacion: "Rack T-4", stock: 30 },
        { sku: "HOD-PL-L", talla: "L", color: "Plomo Melange", ubicacion: "Rack T-4", stock: 28 },
        { sku: "HOD-NG-L", talla: "L", color: "Negro", ubicacion: "Rack T-4", stock: 35 },
      ],
    },
    {
      nombre: "Chaleco Reflectivo de Alta Visibilidad 4 Cintas",
      descripcion: "Malla fluorescente con cierre frontal conforme norma ANSI/ISEA 107",
      sku: "CHA-REF-20",
      categoriaId: catTextil.id,
      precioOriginal: 25.0,
      precioLiquidacion: 9.9,
      costo: 4.2,
      variantes: [
        { sku: "CHA-REF-NR-STD", talla: "Estándar", color: "Naranja Neón", ubicacion: "Gaveta T-5", stock: 80 },
        { sku: "CHA-REF-VD-STD", talla: "Estándar", color: "Verde Lima", ubicacion: "Gaveta T-5", stock: 75 },
      ],
    },
    {
      nombre: "Camisa de Trabajo Manga Larga Algodón Drill",
      descripcion: "Drill tecnología antiestática con doble bolsillo con tapeta",
      sku: "CAM-TRB-21",
      categoriaId: catTextil.id,
      precioOriginal: 85.0,
      precioLiquidacion: 38.0,
      costo: 19.5,
      variantes: [
        { sku: "CAM-DRL-AZ-M", talla: "M", color: "Azul Noche", ubicacion: "Rack T-2", stock: 20 },
        { sku: "CAM-DRL-AZ-L", talla: "L", color: "Azul Noche", ubicacion: "Rack T-2", stock: 25 },
        { sku: "CAM-DRL-BG-L", talla: "L", color: "Beige", ubicacion: "Rack T-2", stock: 18 },
      ],
    },
    {
      nombre: "Jean Denim Clásico 14oz Costuras Reforzadas",
      descripcion: "Mezclilla rígida 100% algodón ideal para trabajo pesado o diario",
      sku: "JEA-DNM-22",
      categoriaId: catTextil.id,
      precioOriginal: 120.0,
      precioLiquidacion: 49.0,
      costo: 25.0,
      variantes: [
        { sku: "JEA-14-30", talla: "30", color: "Azul Índigo", ubicacion: "Rack T-3", stock: 22 },
        { sku: "JEA-14-32", talla: "32", color: "Azul Índigo", ubicacion: "Rack T-3", stock: 30 },
        { sku: "JEA-14-34", talla: "34", color: "Azul Índigo", ubicacion: "Rack T-3", stock: 25 },
      ],
    },
    {
      nombre: "Gorra Táctica con Velcro para Parches",
      descripcion: "Ripstop transpirable con banda interna antitranspirante",
      sku: "GOR-TAC-23",
      categoriaId: catTextil.id,
      precioOriginal: 39.0,
      precioLiquidacion: 15.0,
      costo: 6.0,
      variantes: [
        { sku: "GOR-TAC-NG", talla: "Ajustable", color: "Negro", ubicacion: "Gaveta T-6", stock: 40 },
        { sku: "GOR-TAC-CY", talla: "Ajustable", color: "Coyote Tan", ubicacion: "Gaveta T-6", stock: 35 },
      ],
    },
    {
      nombre: "Pack 3 Pares de Calcetines Térmicos de Trabajo",
      descripcion: "Talón y punta acolchados con soporte elástico en arco",
      sku: "CAL-TRB-24",
      categoriaId: catTextil.id,
      precioOriginal: 35.0,
      precioLiquidacion: 14.9,
      costo: 6.5,
      variantes: [
        { sku: "CAL-P3-STD", talla: "39-43", color: "Gris/Negro", ubicacion: "Gaveta T-6", stock: 50 },
      ],
    },
    {
      nombre: "Overol Industrial Manga Larga Drill 100% Algodón",
      descripcion: "Cierre de doble vía con elástico en cintura y bolsillos porta-herramientas",
      sku: "OVE-IND-25",
      categoriaId: catTextil.id,
      precioOriginal: 160.0,
      precioLiquidacion: 69.0,
      costo: 35.0,
      variantes: [
        { sku: "OVE-DRL-M", talla: "M", color: "Azul Marino", ubicacion: "Rack T-5", stock: 15 },
        { sku: "OVE-DRL-L", talla: "L", color: "Azul Marino", ubicacion: "Rack T-5", stock: 20 },
        { sku: "OVE-DRL-XL", talla: "XL", color: "Azul Marino", ubicacion: "Rack T-5", stock: 12 },
      ],
    },
    {
      nombre: "Short Deportivo Secado Rápido con Bolsillo Cierre",
      descripcion: "Poliéster elastano stretch con malla interna y reflectivos",
      sku: "SHT-DEP-26",
      categoriaId: catTextil.id,
      precioOriginal: 59.0,
      precioLiquidacion: 22.0,
      costo: 10.0,
      variantes: [
        { sku: "SHT-NG-M", talla: "M", color: "Negro", ubicacion: "Rack T-4", stock: 25 },
        { sku: "SHT-NG-L", talla: "L", color: "Negro", ubicacion: "Rack T-4", stock: 30 },
      ],
    },
    {
      nombre: "Polo Camisero Piqué Algodón Mercerizado",
      descripcion: "Tejido piqué peinado suave, cuello tejido con botones de pasta",
      sku: "POL-PIQ-27",
      categoriaId: catTextil.id,
      precioOriginal: 89.0,
      precioLiquidacion: 35.0,
      costo: 16.5,
      variantes: [
        { sku: "PIQ-BL-M", talla: "M", color: "Blanco", ubicacion: "Rack T-1", stock: 20 },
        { sku: "PIQ-AZ-L", talla: "L", color: "Azul Royal", ubicacion: "Rack T-1", stock: 25 },
        { sku: "PIQ-NG-L", talla: "L", color: "Negro", ubicacion: "Rack T-1", stock: 22 },
      ],
    },
    {
      nombre: "Chompa de Hilo Cuello Redondo Clásica",
      descripcion: "Fibra acrílica suave de alta retención térmica anti-pilling",
      sku: "CHO-HIL-28",
      categoriaId: catTextil.id,
      precioOriginal: 99.0,
      precioLiquidacion: 39.0,
      costo: 18.0,
      variantes: [
        { sku: "CHO-VNO-M", talla: "M", color: "Vino", ubicacion: "Rack T-4", stock: 16 },
        { sku: "CHO-AZ-L", talla: "L", color: "Azul Marino", ubicacion: "Rack T-4", stock: 20 },
      ],
    },
    {
      nombre: "Faja Lumbar Ortopédica para Carga Pesada",
      descripcion: "Varillas flexibles de soporte con tirantes elásticos regulables",
      sku: "FAJ-LUM-29",
      categoriaId: catTextil.id,
      precioOriginal: 55.0,
      precioLiquidacion: 24.0,
      costo: 11.0,
      variantes: [
        { sku: "FAJ-M", talla: "M", color: "Negro/Naranja", ubicacion: "Gaveta T-6", stock: 25 },
        { sku: "FAJ-L", talla: "L", color: "Negro/Naranja", ubicacion: "Gaveta T-6", stock: 30 },
        { sku: "FAJ-XL", talla: "XL", color: "Negro/Naranja", ubicacion: "Gaveta T-6", stock: 18 },
      ],
    },
    {
      nombre: "Bandana Tubular Multifuncional Anti-UV",
      descripcion: "Microfibra sin costuras transpirable contra polvo y sol",
      sku: "BAN-TUB-30",
      categoriaId: catTextil.id,
      precioOriginal: 18.0,
      precioLiquidacion: 6.5,
      costo: 2.2,
      variantes: [
        { sku: "BAN-NG", talla: "Única", color: "Negro Sólido", ubicacion: "Gaveta T-6", stock: 60 },
        { sku: "BAN-CAM", talla: "Única", color: "Camuflado Gris", ubicacion: "Gaveta T-6", stock: 45 },
      ],
    },

    // --- 3. CALZADO DE SEGURIDAD (8 productos) ---
    {
      nombre: "Bota de Seguridad Cuero Puntera de Acero ASTM F2413",
      descripcion: "Suela de poliuretano inyectado resistente a hidrocarburos",
      sku: "BOT-ACR-31",
      categoriaId: catCalzado.id,
      precioOriginal: 199.0,
      precioLiquidacion: 89.9,
      costo: 48.0,
      variantes: [
        { sku: "BOT-ACR-39", talla: "39", color: "Café Oscuro", ubicacion: "Rack C-1", stock: 12 },
        { sku: "BOT-ACR-40", talla: "40", color: "Café Oscuro", ubicacion: "Rack C-1", stock: 18 },
        { sku: "BOT-ACR-41", talla: "41", color: "Café Oscuro", ubicacion: "Rack C-1", stock: 20 },
        { sku: "BOT-ACR-42", talla: "42", color: "Café Oscuro", ubicacion: "Rack C-1", stock: 15 },
      ],
    },
    {
      nombre: "Botín Dieléctrico Puntera Composite 18kV",
      descripcion: "100% no metálico ultraligero con plantilla antiperforante Kevlar",
      sku: "BOT-DIE-32",
      categoriaId: catCalzado.id,
      precioOriginal: 249.0,
      precioLiquidacion: 119.0,
      costo: 65.0,
      variantes: [
        { sku: "BOT-DIE-40", talla: "40", color: "Negro/Amarillo", ubicacion: "Rack C-2", stock: 14 },
        { sku: "BOT-DIE-41", talla: "41", color: "Negro/Amarillo", ubicacion: "Rack C-2", stock: 16 },
        { sku: "BOT-DIE-42", talla: "42", color: "Negro/Amarillo", ubicacion: "Rack C-2", stock: 12 },
      ],
    },
    {
      nombre: "Zapatilla Industrial con Puntera de Fibra de Vidrio",
      descripcion: "Diseño ergonómico deportivo transpirable con suela antideslizante SRC",
      sku: "ZAP-IND-33",
      categoriaId: catCalzado.id,
      precioOriginal: 179.0,
      precioLiquidacion: 79.0,
      costo: 41.0,
      variantes: [
        { sku: "ZAP-40-NG", talla: "40", color: "Negro/Gris", ubicacion: "Rack C-3", stock: 15 },
        { sku: "ZAP-41-NG", talla: "41", color: "Negro/Gris", ubicacion: "Rack C-3", stock: 20 },
        { sku: "ZAP-42-NG", talla: "42", color: "Negro/Gris", ubicacion: "Rack C-3", stock: 18 },
      ],
    },
    {
      nombre: "Bota de Jebe Impermeable Caña Alta Blanca",
      descripcion: "PVC virgen resistente a grasas animales y ácidos, uso agroalimentario",
      sku: "BOT-JEB-34",
      categoriaId: catCalzado.id,
      precioOriginal: 65.0,
      precioLiquidacion: 28.0,
      costo: 13.5,
      variantes: [
        { sku: "JEB-BL-40", talla: "40", color: "Blanco", ubicacion: "Rack C-4", stock: 25 },
        { sku: "JEB-BL-41", talla: "41", color: "Blanco", ubicacion: "Rack C-4", stock: 30 },
        { sku: "JEB-BL-42", talla: "42", color: "Blanco", ubicacion: "Rack C-4", stock: 22 },
      ],
    },
    {
      nombre: "Plantilla Ortopédica de Gel Anti-Fatiga Recortable",
      descripcion: "Amortiguación de impactos para jornadas de pie de más de 8 horas",
      sku: "PLA-GEL-35",
      categoriaId: catCalzado.id,
      precioOriginal: 45.0,
      precioLiquidacion: 18.0,
      costo: 7.5,
      variantes: [
        { sku: "PLA-GEL-S", talla: "36-40", color: "Azul/Rojo", ubicacion: "Gaveta C-5", stock: 35 },
        { sku: "PLA-GEL-L", talla: "41-45", color: "Azul/Rojo", ubicacion: "Gaveta C-5", stock: 45 },
      ],
    },
    {
      nombre: "Pasadores Redondos Reforzados Kevlar 140cm",
      descripcion: "Resistentes al roce continuo y calor extremo para botas industriales",
      sku: "PAS-KEV-36",
      categoriaId: catCalzado.id,
      precioOriginal: 18.0,
      precioLiquidacion: 6.9,
      costo: 2.5,
      variantes: [
        { sku: "PAS-140-NG", talla: "140 cm", color: "Negro/Amarillo", ubicacion: "Gaveta C-5", stock: 60 },
      ],
    },
    {
      nombre: "Bota Soldador Cuero Cromo con Polaina de Protección",
      descripcion: "Sin pasadores con cierre de velcro rápido para evitar chispas",
      sku: "BOT-SLD-37",
      categoriaId: catCalzado.id,
      precioOriginal: 210.0,
      precioLiquidacion: 99.0,
      costo: 52.0,
      variantes: [
        { sku: "SLD-41-NG", talla: "41", color: "Negro", ubicacion: "Rack C-1", stock: 12 },
        { sku: "SLD-42-NG", talla: "42", color: "Negro", ubicacion: "Rack C-1", stock: 14 },
      ],
    },
    {
      nombre: "Grasa Abrillantadora Hidrófuga para Calzado de Cuero 200ml",
      descripcion: "Cera de abeja natural que nutre y sella contra barro y humedad",
      sku: "GRA-CUE-38",
      categoriaId: catCalzado.id,
      precioOriginal: 25.0,
      precioLiquidacion: 9.9,
      costo: 4.0,
      variantes: [
        { sku: "GRA-200-TR", talla: "200 ml", color: "Neutro / Incoloro", ubicacion: "Gaveta C-5", stock: 30 },
      ],
    },

    // --- 4. EQUIPOS DE PROTECCIÓN PERSONAL (EPP) (8 productos) ---
    {
      nombre: "Lentes de Seguridad Luna Clara Anti-Empañante ANSI Z87+",
      descripcion: "Policarbonato de alta resistencia contra impactos y filtro UV 99.9%",
      sku: "LEN-SEG-39",
      categoriaId: catEpp.id,
      precioOriginal: 22.0,
      precioLiquidacion: 7.9,
      costo: 3.0,
      variantes: [
        { sku: "LEN-CLR-STD", talla: "Estándar", color: "Transparente", ubicacion: "Gaveta E-1", stock: 100 },
        { sku: "LEN-OSC-STD", talla: "Estándar", color: "Humo / Oscuro", ubicacion: "Gaveta E-1", stock: 80 },
      ],
    },
    {
      nombre: "Guantes de Nitrilo Negro Extra Resistente (Caja 100 Uds)",
      descripcion: "Grosor 6 mil libres de polvo para mecánica y limpieza pesada",
      sku: "GUA-NIT-40",
      categoriaId: catEpp.id,
      precioOriginal: 48.0,
      precioLiquidacion: 22.0,
      costo: 11.5,
      variantes: [
        { sku: "NIT-M-100", talla: "M", color: "Negro", ubicacion: "Rack E-2", stock: 40 },
        { sku: "NIT-L-100", talla: "L", color: "Negro", ubicacion: "Rack E-2", stock: 50 },
      ],
    },
    {
      nombre: "Casco de Seguridad Tipo Jockey con Tafilete Ratchet",
      descripcion: "Polietileno de alta densidad ranurado para orejeras Clase E 20kV",
      sku: "CAS-SEG-41",
      categoriaId: catEpp.id,
      precioOriginal: 38.0,
      precioLiquidacion: 16.5,
      costo: 7.0,
      variantes: [
        { sku: "CAS-BL-RAT", talla: "Regulable", color: "Blanco", ubicacion: "Rack E-3", stock: 35 },
        { sku: "CAS-AM-RAT", talla: "Regulable", color: "Amarillo", ubicacion: "Rack E-3", stock: 40 },
        { sku: "CAS-AZ-RAT", talla: "Regulable", color: "Azul", ubicacion: "Rack E-3", stock: 25 },
      ],
    },
    {
      nombre: "Respirador de Media Cara Silicona Doble Filtro",
      descripcion: "Compatible con cartuchos 3M serie 6000 para vapores orgánicos y polvo",
      sku: "RES-MED-42",
      categoriaId: catEpp.id,
      precioOriginal: 95.0,
      precioLiquidacion: 45.0,
      costo: 21.0,
      variantes: [
        { sku: "RES-M-GRS", talla: "M", color: "Gris", ubicacion: "Gaveta E-4", stock: 25 },
      ],
    },
    {
      nombre: "Orejeras Antirruido de Copa Regulable 28dB NRR",
      descripcion: "Almohadillas rellenas de gel líquido acolchadas para talleres ruidosos",
      sku: "ORE-ANT-43",
      categoriaId: catEpp.id,
      precioOriginal: 42.0,
      precioLiquidacion: 18.0,
      costo: 8.0,
      variantes: [
        { sku: "ORE-28-RO", talla: "Ajustable", color: "Rojo/Negro", ubicacion: "Gaveta E-4", stock: 30 },
      ],
    },
    {
      nombre: "Guantes de Cuero Badana para Chofer / Mecánico",
      descripcion: "Cuero suave de res primera selección con costuras de nylon",
      sku: "GUA-BAD-44",
      categoriaId: catEpp.id,
      precioOriginal: 28.0,
      precioLiquidacion: 12.0,
      costo: 5.5,
      variantes: [
        { sku: "BAD-9-AM", talla: "Talla 9", color: "Amarillo Mostaza", ubicacion: "Gaveta E-2", stock: 50 },
      ],
    },
    {
      nombre: "Arnés de Seguridad de Cuerpo Entero 4 Anillos Dieléctrico",
      descripcion: "Capacidad 140kg con soporte lumbar acolchado y perneras regulables",
      sku: "ARN-SEG-45",
      categoriaId: catEpp.id,
      precioOriginal: 195.0,
      precioLiquidacion: 89.0,
      costo: 45.0,
      variantes: [
        { sku: "ARN-4A-STD", talla: "Estándar", color: "Amarillo/Negro", ubicacion: "Rack E-3", stock: 15 },
      ],
    },
    {
      nombre: "Tapones de Oído Reutilizables de Silicona con Cordón",
      descripcion: "Diseño de 3 membranas cónicas en estuche plástico de bolsillo NRR 25dB",
      sku: "TAP-OIDO-46",
      categoriaId: catEpp.id,
      precioOriginal: 8.0,
      precioLiquidacion: 2.5,
      costo: 0.8,
      variantes: [
        { sku: "TAP-SIL-OR", talla: "Única", color: "Naranja Neón", ubicacion: "Gaveta E-1", stock: 150 },
      ],
    },

    // --- 5. ILUMINACIÓN Y ELECTRICIDAD (6 productos) ---
    {
      nombre: "Reflector LED Exterior Ultra Slim 100W IP66",
      descripcion: "Luz blanca fría 6500K 10,000 lúmenes con carcasa de aluminio fundido",
      sku: "REF-100W-47",
      categoriaId: catElectricidad.id,
      precioOriginal: 85.0,
      precioLiquidacion: 39.9,
      costo: 21.0,
      variantes: [
        { sku: "REF-100-BF", talla: "100W", color: "Luz Fría (6500K)", ubicacion: "Rack L-1", stock: 30 },
        { sku: "REF-100-BC", talla: "100W", color: "Luz Cálida (3000K)", ubicacion: "Rack L-1", stock: 18 },
      ],
    },
    {
      nombre: "Extensión Eléctrica de Uso Rudo Vulcanizada 20 Metros",
      descripcion: "Cable 3x14 AWG con enchufe y triple toma trifásica con tierra",
      sku: "EXT-20M-48",
      categoriaId: catElectricidad.id,
      precioOriginal: 99.0,
      precioLiquidacion: 48.0,
      costo: 27.0,
      variantes: [
        { sku: "EXT-20M-NR", talla: "20 metros", color: "Naranja Industrial", ubicacion: "Rack L-2", stock: 25 },
        { sku: "EXT-10M-NR", talla: "10 metros", color: "Naranja Industrial", ubicacion: "Rack L-2", stock: 35 },
      ],
    },
    {
      nombre: "Linterna Frontal de Cabeza LED Recargable USB 1000LM",
      descripcion: "Sensor de movimiento infrarrojo con 5 modos de luz y batería litio 1200mAh",
      sku: "LIN-CAB-49",
      categoriaId: catElectricidad.id,
      precioOriginal: 45.0,
      precioLiquidacion: 19.5,
      costo: 8.5,
      variantes: [
        { sku: "LIN-USB-NG", talla: "Ajustable", color: "Negro", ubicacion: "Gaveta L-3", stock: 40 },
      ],
    },
    {
      nombre: "Foco LED Alta Potencia T-Bulb 50W Rosca E27",
      descripcion: "Flujo luminoso 4500 lúmenes de bajo consumo y larga vida útil 25,000h",
      sku: "FOC-50W-50",
      categoriaId: catElectricidad.id,
      precioOriginal: 35.0,
      precioLiquidacion: 14.0,
      costo: 6.2,
      variantes: [
        { sku: "FOC-50W-BL", talla: "50 Watts", color: "Blanco Frío", ubicacion: "Rack L-1", stock: 45 },
      ],
    },
    {
      nombre: "Multímetro Digital Automático True RMS con Medición NCV",
      descripcion: "Medición de voltaje AC/DC, corriente, resistencia, capacitancia y temperatura",
      sku: "MUL-RMS-51",
      categoriaId: catElectricidad.id,
      precioOriginal: 110.0,
      precioLiquidacion: 54.0,
      costo: 28.0,
      variantes: [
        { sku: "MUL-RMS-STD", talla: "Estándar", color: "Negro/Naranja", ubicacion: "Vitrina V-1", stock: 15 },
      ],
    },
    {
      nombre: "Cinta Aislante Profesional de PVC 20 Metros (Pack x 5)",
      descripcion: "Retardante de llama certificado hasta 600V y 80°C conforme UL 510",
      sku: "CIN-AIS-52",
      categoriaId: catElectricidad.id,
      precioOriginal: 22.0,
      precioLiquidacion: 8.9,
      costo: 3.5,
      variantes: [
        { sku: "CIN-P5-NG", talla: "Pack 5 uds", color: "Negro", ubicacion: "Gaveta L-3", stock: 60 },
      ],
    },
  ];

  console.log(`📦 Creando ${productsData.length} productos y variantes...`);

  let totalVariantes = 0;
  let totalStock = 0;

  for (const p of productsData) {
    const createdProduct = await prisma.producto.create({
      data: {
        nombre: p.nombre,
        descripcion: p.descripcion,
        codigoSku: p.sku,
        categoriaId: p.categoriaId,
        precioOriginal: p.precioOriginal,
        precioLiquidacion: p.precioLiquidacion,
        costo: p.costo,
        activo: true,
      },
    });

    for (const v of p.variantes) {
      const createdVariant = await prisma.varianteStock.create({
        data: {
          productoId: createdProduct.id,
          sku: v.sku,
          talla: v.talla || null,
          color: v.color || null,
          ubicacion: v.ubicacion || "Almacén General",
          stockInicial: v.stock,
          stockActual: v.stock,
          stockMinimoAlerta: 3,
        },
      });

      // Crear movimiento inicial en Kardex
      await prisma.movimientoKardex.create({
        data: {
          varianteId: createdVariant.id,
          tipo: TipoMovimiento.INGRESO,
          cantidad: v.stock,
          stockAnterior: 0,
          stockNuevo: v.stock,
          motivo: "Inventario Inicial de Remate Masivo (Seed)",
          usuarioId: admin.id,
        },
      });

      totalVariantes++;
      totalStock += v.stock;
    }
  }

  console.log(`\n=================================================`);
  console.log(`🎉 SEED MASIVO COMPLETADO EXITOSAMENTE`);
  console.log(`   - Total Productos Creados: ${productsData.length}`);
  console.log(`   - Total Variantes Creadas: ${totalVariantes}`);
  console.log(`   - Total Unidades de Stock: ${totalStock}`);
  console.log(`=================================================\n`);
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
