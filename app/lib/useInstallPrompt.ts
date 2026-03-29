import { useEffect, useState } from 'react';

const DISMISSED_KEY = 'chimeline_install_dismissed';

interface InstallPromptState {
  show: boolean;
  isIOS: boolean;
  handleInstall: () => void;
  handleDismiss: () => void;
}

export function useInstallPrompt(): InstallPromptState {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Already installed or previously dismissed
    if (
      localStorage.getItem(DISMISSED_KEY) ||
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    ) {
      return;
    }

    // iOS: no beforeinstallprompt — show manual instructions instead
    const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (ios) {
      setIsIOS(true);
      setShow(true);
      return;
    }

    // Android / Chrome: capture the deferred prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShow(false);
    if (outcome === 'dismissed') {
      localStorage.setItem(DISMISSED_KEY, '1');
    }
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem(DISMISSED_KEY, '1');
  };

  return { show, isIOS, handleInstall, handleDismiss };
}
