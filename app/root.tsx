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

import type { Route } from "./+types/root";
import "./app.css";
import styles from "./root.module.css";

export const links: Route.LinksFunction = () => [];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
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
      <header className={styles.header}>
        <h1>ChimeLine</h1>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
      <footer className={styles.footer}>
        <p>&copy; 2026 ChimeLine</p>
      </footer>
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
      <header className={styles.header}>
        <h1>ChimeLine</h1>
      </header>
      <main className={styles.main}>
        <h2>{message}</h2>
        <p>{details}</p>
      </main>
    </div>
  );
}
