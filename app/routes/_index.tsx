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

      <div style={{ marginTop: "3rem" }}>
        <Link to="/setup" style={{
          display: "inline-block",
          padding: "1.5rem 3rem",
          fontSize: "1.3rem",
          fontWeight: "600",
          backgroundColor: "#1DB954",
          color: "white",
          textDecoration: "none",
          borderRadius: "32px",
          transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1ed760")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#1DB954")}
        >
          🎵 Start Playing!
        </Link>
      </div>

      <div style={{ marginTop: "2rem", fontSize: "0.9rem", color: "#666" }}>
        <p>Device setup is quick and happens only once.</p>
      </div>
    </div>
  );
}
