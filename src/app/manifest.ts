import type { MetadataRoute } from "next";
import { assistant } from "@/config/assistant";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: assistant.name,
    short_name: assistant.shortName,
    description: assistant.tagline,
    lang: "de",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#05080f",
    theme_color: "#05080f",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
