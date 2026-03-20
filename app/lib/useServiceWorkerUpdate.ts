import { useEffect, useState } from "react";

/**
 * Register service worker and detect updates
 * When a new version is available, notify the user
 */
export function useServiceWorkerUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [newWorker, setNewWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    // Only register service worker if supported
    if (!("serviceWorker" in navigator)) {
      console.log("Service Worker not supported");
      return;
    }

    let registration: ServiceWorkerRegistration | null = null;
    let checkInterval: NodeJS.Timeout | null = null;

    const registerSW = async () => {
      try {
        registration = await navigator.serviceWorker.register("/service-worker.js", {
          scope: "/",
        });
        console.log("Service Worker registered");

        // Check for updates immediately and periodically (every 1 hour)
        const checkForUpdates = async () => {
          try {
            await registration?.update();
            console.log("Checked for Service Worker updates");
          } catch (err) {
            console.warn("Failed to check for updates:", err);
          }
        };

        checkForUpdates();
        checkInterval = setInterval(checkForUpdates, 60 * 60 * 1000);

        // Listen for new worker ready
        registration.addEventListener("updatefound", () => {
          const newWorkerRef = registration!.installing;
          if (!newWorkerRef) return;

          newWorkerRef.addEventListener("statechange", () => {
            if (newWorkerRef.state === "installed" && navigator.serviceWorker.controller) {
              // New version available
              console.log("New version available - prompting user");
              setUpdateAvailable(true);
              setNewWorker(newWorkerRef);
            }
          });
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
    if (newWorker) {
      // Tell service worker to skip waiting
      newWorker.postMessage({ type: "SKIP_WAITING" });

      // Reload page to activate new version
      window.location.reload();
    }
  };

  return { updateAvailable, handleUpdate };
}
