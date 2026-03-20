import { Link } from "react-router";
import type { Route } from "./+types/_index";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "ChimeLine - QR Code Song Player" },
    { name: "description", content: "Play songs via QR codes" },
  ];
}

export default function Home() {
  return (
    <div style={{ textAlign: "center", padding: "2rem" }}>
      <h1>ChimeLine</h1>
      <p>Play songs during a timeline-based card game using QR codes.</p>

      <div style={{ marginTop: "2rem", display: "flex", gap: "1rem", justifyContent: "center" }}>
        <Link to="/scanner" style={{
          padding: "1rem 2rem",
          fontSize: "1.1rem",
          backgroundColor: "#1DB954",
          color: "white",
          textDecoration: "none",
          borderRadius: "8px",
        }}>
          📱 Scan QR Codes
        </Link>
        <Link to="/generator" style={{
          padding: "1rem 2rem",
          fontSize: "1.1rem",
          backgroundColor: "#191414",
          color: "white",
          textDecoration: "none",
          borderRadius: "8px",
          border: "2px solid #1DB954",
        }}>
          ✨ Generate QR Codes
        </Link>
      </div>
    </div>
  );
}
