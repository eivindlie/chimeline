import { Link } from "react-router";
import type { Route } from "./+types/_index";
import styles from "./_index.module.css";
import LogoFull from "../assets/logo-full-dark.svg";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "ChimeLine - QR Code Song Player" },
    { name: "description", content: "Play songs via QR codes" },
  ];
}

export default function Home() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <img src={LogoFull} alt="ChimeLine" className={styles.logo} />
        
        <Link to="/setup" className={styles.mainButton}>
          🎵 Start playing
        </Link>

        <Link to="/generator" className={styles.generatorLink}>
          Generate QR codes
        </Link>
      </div>
    </div>
  );
}
