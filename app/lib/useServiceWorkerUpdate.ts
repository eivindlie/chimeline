import { useEffect, useState } from "react";

/**
 * Register service worker and detect updates
 * Checks version.json for buildHash changes (not just SW file changes)
 */
export function useServiceWorkerUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    // Skip service worker in development mode (allows fresh code on every refresh)
    if (import.meta.env.DEV) {
      console.log("Service Worker disabled in development mode");
      return;
    }

    // Only register service worker if supported
    if (!("serviceWorker" in navigator)) {
      console.log("Service Worker not supported");
      return;
    }

    let registration: ServiceWorkerRegistration | null = null;
    let checkInterval: NodeJS.Timeout | null = null;
    let currentBuildHash: string | null = null;

    const registerSW = async () => {
      try {
        registration = await navigator.serviceWorker.register("/service-worker.js", {
          scope: "/",
        });
        console.log("Service Worker registered");

        // Get initial build hash
        const getInitialHash = async () => {
          try {
            const response = await fetch("/version.json?t=" + Date.now());
            const data = await response.json();
            currentBuildHash = data.buildHash;
            console.log("Current build hash:", currentBuildHash);
          } catch (err) {
            console.warn("Failed to get initial build hash:", err);
          }
        };

        await getInitialHash();

        // Check for updates by comparing buildHash in version.json
        const checkForUpdates = async () => {
          try {
            const response = await fetch("/version.json?t=" + Date.now());
            const data = await response.json();
            const newBuildHash = data.buildHash;

            if (newBuildHash && newBuildHash !== currentBuildHash) {
              console.log("New version available! Hash changed:", currentBuildHash, "→", newBuildHash);
              setUpdateAvailable(true);
            }
          } catch (err) {
            console.warn("Failed to check for version updates:", err);
          }
        };

        checkForUpdates();
        // Check every 10 minutes for faster update detection
        checkInterval = setInterval(checkForUpdates, 10 * 60 * 1000);
      } catch (err) {
        console.error("Service Worker registration failed:", err);
      }
    };

    registerSW();

    return () => {
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    };
  }, []);

  const handleUpdate = () => {
    // Full page reload to get fresh service worker
    window.location.reload();
  };

  return { updateAvailable, handleUpdate };
}
