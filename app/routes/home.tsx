import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "ChimeLine - QR Code Song Player" },
    { name: "description", content: "Play songs via QR codes" },
  ];
}

export default function Home() {
  return (
    <div>
      <h1>Welcome to ChimeLine</h1>
      <p>A timeline-based card game with QR code song playback.</p>
      <p>Scanner and Generator coming soon...</p>
    </div>
  );
}
