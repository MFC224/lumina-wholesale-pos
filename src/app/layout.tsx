import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Import L&R — Sistema POS & Inventario",
  description: "Sistema interno de inventario de alta velocidad y punto de venta para Import L&R",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-50 antialiased selection:bg-lumina-emerald selection:text-white">
        {children}
      </body>
    </html>
  );
}
