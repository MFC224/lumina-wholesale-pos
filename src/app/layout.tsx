import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lumina Wholesale & Liquidation POS",
  description: "Sistema de inventario interno de alta velocidad y remate de liquidación para almacén",
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
