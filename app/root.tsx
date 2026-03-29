import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";

import type { Route } from "./+types/root";
import { useServiceWorkerUpdate } from "./lib/useServiceWorkerUpdate";
import "./lib/i18n";
import "./app.css";
import styles from "./root.module.css";

export const links: Route.LinksFunction = () => [
  { rel: "manifest", href: "/manifest.json" },
  { rel: "icon", href: "/logo-icon-app.svg", type: "image/svg+xml" },
  { rel: "icon", href: "/logo-icon-app.png", type: "image/png" },
  { rel: "apple-touch-icon", href: "/logo-icon-app.png" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nb">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#00bfff" />
        <meta name="description" content="Play songs during a timeline-based card game using QR codes" />
        
        {/* iOS PWA Support */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="ChimeLine" />
        
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const navigate = useNavigate();
  const { updateAvailable, handleUpdate, isUpdating } = useServiceWorkerUpdate();
  const { t, i18n } = useTranslation();

  // Keep <html lang> in sync with active language
  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  useEffect(() => {
    // Handle GitHub Pages 404.html redirect fallback for SPA routing
    const storedRedirect = sessionStorage.getItem("redirect");
    if (storedRedirect && storedRedirect !== location.href) {
      sessionStorage.removeItem("redirect");
      const url = new URL(storedRedirect);
      navigate(url.pathname + url.search + url.hash);
    }
  }, [navigate]);

  return (
    <div className={styles.root}>
      {updateAvailable && (
        <div className={styles.updateBanner}>
          <span>✨ {t('common.updateAvailable')}</span>
          <button
            onClick={handleUpdate}
            disabled={isUpdating}
            className={styles.updateButton}
          >
            {isUpdating ? <span className={styles.updateSpinner} /> : t('common.update')}
          </button>
        </div>
      )}
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
  }

  return (
    <div className={styles.root}>
      <main className={styles.main}>
        <h2>{message}</h2>
        <p>{details}</p>
      </main>
    </div>
  );
}
