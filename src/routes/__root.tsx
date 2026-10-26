import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import appCss from "../styles.css?url";

const APP_NAME = "Cubix Arena 3x3";
const APP_URL = "https://cuborubikgame.vercel.app";
const APP_DESCRIPTION = "Juega al clásico Cubo de Rubik 3x3x3 en 3D directamente en tu navegador. Gira las piezas con el dedo, personaliza tu cubo y resuélvelo en tiempo récord. ¡Sin descargas!";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" },
      { name: "theme-color", content: "#07060d" },

      // --- Verificación de Google Search Console ---
      { name: "google-site-verification", content: "xRImWB36n4cetSWfSfIgP-2oqJcJFhIFDdia3jlOaVA" },
      
      // --- SEO Básico ---
      { title: APP_NAME },
      { name: "description", content: APP_DESCRIPTION },
      { name: "keywords", content: "cubo rubik, rubik 3x3, juego cubo rubik, cubo rubik 3d, resolver cubo rubik, rompecabezas 3d, cubix arena" },
      { name: "author", content: "Cubix Arena" },
      { name: "robots", content: "index, follow" }, // Permite a Google indexar y seguir enlaces

      // --- Open Graph (Facebook, WhatsApp, Discord, etc.) ---
      { property: "og:type", content: "website" },
      { property: "og:url", content: APP_URL },
      { property: "og:title", content: APP_NAME },
      { property: "og:description", content: APP_DESCRIPTION },
      { property: "og:image", content: `${APP_URL}/og.jpg` }, // Usamos tu imagen og.jpg
      { property: "og:image:width", content: "1200" }, // Ajusta si tu imagen tiene otras medidas
      { property: "og:image:height", content: "630" },
      { property: "og:site_name", content: APP_NAME },
      { property: "og:locale", content: "es_ES" },

      // --- Twitter Card ---
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: APP_NAME },
      { name: "twitter:description", content: APP_DESCRIPTION },
      { name: "twitter:image", content: `${APP_URL}/og.jpg` }, // Usamos tu imagen og.jpg
    ],
    links: [
      // --- Favicons ---
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "icon", type: "image/png", sizes: "96x96", href: "/favicon-96x96.png" },
      { rel: "shortcut icon", href: "/favicon.ico" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      
      // --- Manifest y Estilos ---
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "stylesheet", href: appCss },
      
      // --- Canonical (Evita contenido duplicado) ---
      { rel: "canonical", href: APP_URL },
    ],
  }),
  component: () => (
    <html lang="es" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <PreviewHostBridge />
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});