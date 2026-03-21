import { useNavigate, Link } from "react-router";
import { useEffect } from "react";
import type { Route } from "./+types/_index";
import styles from "./_index.module.css";
import LogoFull from "../assets/logo-full-dark.svg";
import { clearSelectedDeviceId } from "../lib/spotifyDevices";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "ChimeLine - QR Code Song Player" },
    { name: "description", content: "Play songs via QR codes" },
  ];
}

export default function Home() {
  const navigate = useNavigate();

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
          🎵 Start playing
        </button>

        <Link to="/generator" className={styles.generatorLink}>
          Generate QR codes
        </Link>
      </div>
    </div>
  );
}
