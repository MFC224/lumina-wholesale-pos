import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Import L&R — Sistema POS & Inventario",
    short_name: "Import L&R",
    description: "Sistema Interno de Inventario y Terminal Punto de Venta Import L&R",
    start_url: "/",
    display: "standalone",
    background_color: "#061655",
    theme_color: "#081C6C",
    orientation: "landscape-primary",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
