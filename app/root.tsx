import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  Link,
} from "react-router";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

import type { Route } from "./+types/root";
import { useServiceWorkerUpdate } from "./lib/useServiceWorkerUpdate";
import "./app.css";
import styles from "./root.module.css";

export const links: Route.LinksFunction = () => [
  { rel: "manifest", href: "/manifest.json" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#1db954" />
        <meta name="description" content="Play songs during a timeline-based card game using QR codes" />
        
        {/* iOS PWA Support */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="ChimeLine" />
        <link rel="apple-touch-icon" href="/favicon.ico" />
        
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
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { updateAvailable, handleUpdate } = useServiceWorkerUpdate();

  useEffect(() => {
    // Check if user is logged in (has spotify_token in sessionStorage)
    const token = sessionStorage.getItem("spotify_token");
    setIsLoggedIn(!!token);

    // Handle GitHub Pages 404.html redirect fallback for SPA routing
    const storedRedirect = sessionStorage.getItem("redirect");
    if (storedRedirect && storedRedirect !== location.href) {
      sessionStorage.removeItem("redirect");
      const url = new URL(storedRedirect);
      navigate(url.pathname + url.search + url.hash);
    }
  }, [navigate]);

  const handleLogout = () => {
    try {
      // Clear all Spotify and app storage from both sessionStorage and localStorage
      // sessionStorage keys
      sessionStorage.removeItem("spotify_token");
      sessionStorage.removeItem("spotify_pkce_verifier");
      sessionStorage.removeItem("spotify_oauth_state");
      sessionStorage.removeItem("spotify_user");
      sessionStorage.removeItem("redirect");
      
      // localStorage keys
      localStorage.removeItem("spotify_token");
      localStorage.removeItem("spotify_user");
      localStorage.removeItem("spotify_pkce_verifier");
      localStorage.removeItem("spotify_oauth_state");
      localStorage.removeItem("chimeline_selected_device");
      localStorage.removeItem("auth_redirect_to");
      
      console.log("Logout successful, all storage cleared");
      setIsLoggedIn(false);
      
      // Hard redirect to home (more reliable than React Router navigation on mobile)
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
      alert("Logout failed. Try clearing storage manually.");
    }
  };

  return (
    <div className={styles.root}>
      {updateAvailable && (
        <div style={{
          background: "#1DB954",
          color: "white",
          padding: "1rem",
          textAlign: "center",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          fontSize: "0.95rem",
        }}>
          <span>✨ A new version is available</span>
          <button
            onClick={handleUpdate}
            style={{
              backgroundColor: "white",
              color: "#1DB954",
              border: "none",
              padding: "0.5rem 1rem",
              borderRadius: "4px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Update
          </button>
        </div>
      )}
      <header className={styles.header}>
        <Link to="/" className={styles.headerTitle}>
          <h1>ChimeLine</h1>
        </Link>
        {isLoggedIn && (
          <button onClick={handleLogout} className={styles.logoutButton}>
            Logout
          </button>
        )}
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
        <Link to="/" className={styles.headerTitle}>
          <h1>ChimeLine</h1>
        </Link>
      </header>
      <main className={styles.main}>
        <h2>{message}</h2>
        <p>{details}</p>
      </main>
    </div>
  );
}
