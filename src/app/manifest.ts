import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lumina Wholesale & Liquidation POS",
    short_name: "Lumina POS",
    description: "Sistema Interno de Inventario y Terminal de Remate de Liquidación",
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
