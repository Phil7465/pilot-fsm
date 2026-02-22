import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pilot Field Service Pro",
    short_name: "Pilot FSM",
    description: "Field service management platform for small teams",
    start_url: "/mobile",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1b76e5",
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
