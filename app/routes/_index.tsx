import { useNavigate, Link } from "react-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/_index";
import styles from "./_index.module.css";
import LogoFull from "../assets/logo-full-dark.svg";
import { clearSelectedDeviceId } from "../lib/spotifyDevices";
import { useInstallPrompt } from "../lib/useInstallPrompt";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "ChimeLine - QR Code Song Player" },
    { name: "description", content: "Play songs via QR codes" },
  ];
}

export default function Home() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { show: showInstall, isIOS, handleInstall, handleDismiss } = useInstallPrompt();

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('chimeline_lang', lang);
  };

  const isDesktop = () => {
    return !('ontouchstart' in window) && !navigator.maxTouchPoints;
  };

  // Mobile: clear device ID on home load (ensures fresh setup each session)
  // Desktop: don't clear (SDK handles device automatically)
  useEffect(() => {
    if (!isDesktop()) {
      clearSelectedDeviceId();
    }
  }, []);

  const handleStartPlaying = () => {
    // Desktop: go directly to scanner (SDK auto-manages device)
    // Mobile: go to setup to configure device for REST API
    if (isDesktop()) {
      navigate("/scanner");
    } else {
      navigate("/setup");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <img src={LogoFull} alt="ChimeLine" className={styles.logo} />

        <button onClick={handleStartPlaying} className={styles.mainButton}>
          {t('home.start')}
        </button>

        <Link to="/generator" className={styles.generatorLink}>
          {t('home.generate')}
        </Link>

        <div className={styles.langSwitcher}>
          <button
            onClick={() => changeLanguage('nb')}
            className={i18n.language === 'nb' ? styles.langActive : styles.langBtn}
          >
            nb
          </button>
          {' | '}
          <button
            onClick={() => changeLanguage('en')}
            className={i18n.language === 'en' ? styles.langActive : styles.langBtn}
          >
            en
          </button>
        </div>

        {showInstall && (
          <div className={styles.installPrompt}>
            <p className={styles.installText}>
              {isIOS ? t('home.installHintIOS') : t('home.installHint')}
            </p>
            <div className={styles.installActions}>
              {!isIOS && (
                <button onClick={handleInstall} className={styles.installButton}>
                  {t('home.installButton')}
                </button>
              )}
              <button onClick={handleDismiss} className={styles.installDismiss}>
                {t('home.installDismiss')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
