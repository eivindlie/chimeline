import { useEffect, useState } from "react";

/**
 * Register service worker and detect updates
 * Checks version.json for buildHash changes (not just SW file changes)
 */
export function useServiceWorkerUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

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
    // Use the hash baked into this bundle at build time as the "current" version.
    // This means we detect updates even when both the old and new version.json
    // would return the same server hash on the same request.
    let currentBuildHash: string = __BUILD_HASH__;

    const registerSW = async () => {
      try {
        registration = await navigator.serviceWorker.register("/service-worker.js", {
          scope: "/",
        });
        console.log("Service Worker registered, bundle hash:", currentBuildHash);

        // Check for updates by comparing buildHash in version.json
        const checkForUpdates = async () => {
          try {
            const response = await fetch("/version.json", {
              cache: "no-store", // Force fresh fetch every time
              headers: { "Pragma": "no-cache", "Cache-Control": "no-cache" },
            });
            const data = await response.json();
            const newBuildHash = data.buildHash;

            if (newBuildHash && newBuildHash !== currentBuildHash) {
              console.log("🆕 New version available! Hash changed:", currentBuildHash, "→", newBuildHash);
              currentBuildHash = newBuildHash; // Update for next comparison
              setUpdateAvailable(true);
            }
          } catch (err) {
            console.warn("Failed to check for version updates:", err);
          }
        };

        // Check immediately on page load
        await checkForUpdates();

        // Check every 5 minutes (faster detection on mobile)
        checkInterval = setInterval(checkForUpdates, 5 * 60 * 1000);

        // Listen for new SW installations (backup detection method)
        registration.addEventListener("updatefound", () => {
          const newWorker = registration!.installing;
          console.log("📦 New service worker installing...");
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                console.log("🆕 New service worker ready (updatefound)");
                setUpdateAvailable(true);
              }
            });
          }
        });
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
    setIsUpdating(true);
    console.log("Update button clicked - handling update");

    if (!navigator.serviceWorker.controller) {
      // No active SW, just reload
      console.log("No active SW controller, reloading immediately");
      window.location.reload();
      return;
    }

    // Set up listener BEFORE sending SKIP_WAITING to catch the event
    let refreshing = false;
    const handleControllerChange = () => {
      if (!refreshing) {
        refreshing = true;
        console.log("✓ New service worker activated - reloading page");
        window.location.reload();
      }
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    // Fallback: if controllerchange doesn't fire in 3 seconds, reload anyway
    const timeoutId = setTimeout(() => {
      if (!refreshing) {
        console.warn("controllerchange didn't fire within 3s, reloading as fallback");
        refreshing = true;
        window.location.reload();
      }
    }, 3000);

    // Tell the waiting SW to skip waiting and take control immediately
    // Post to all SWs (should be only one)
    const allControllers = navigator.serviceWorker;
    if (allControllers.controller) {
      console.log("Sending SKIP_WAITING to service worker");
      allControllers.controller.postMessage({ type: "SKIP_WAITING" });
    } else {
      console.warn("No controller available for SKIP_WAITING");
      clearTimeout(timeoutId);
      window.location.reload();
    }
  };

  return { updateAvailable, handleUpdate, isUpdating };
}
