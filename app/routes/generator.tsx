import { useState, useEffect } from "react";
import type { Route } from "./+types/generator";
import { getToken } from "../lib/spotifyAuth";
import { useAuthRedirect } from "../lib/useAuthRedirect";
import { parseSpotifyTrackId, fetchTrackById } from "../lib/spotifySearch";
import { generateQRCode } from "../lib/qrGenerator";
import { toMinimalCardData, type CardData } from "../lib/schemas";
import styles from "./generator.module.css";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "ChimeLine - QR Generator" },
    { name: "description", content: "Generate QR codes from Spotify tracks" },
  ];
}

export default function GeneratorPage() {
  const [trackUrl, setTrackUrl] = useState("");
  const [cardData, setCardData] = useState<CardData | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Check auth and redirect to login if needed
  const isAuthed = useAuthRedirect("/generator");

  // Initialize token once authenticated
  useEffect(() => {
    if (isAuthed) {
      const t = getToken();
      setToken(t);
    }
  }, [isAuthed]);

  const handleGenerateQR = async () => {
    setError(null);
    setIsLoading(true);

    try {
      // Get token from session
      const token = getToken();
      if (!token) {
        throw new Error("Not authenticated with Spotify");
      }

      // Parse track ID from URL/URI
      const trackId = parseSpotifyTrackId(trackUrl);
      if (!trackId) {
        throw new Error(
          "Invalid Spotify track URL. Please use:\n- spotify:track:XXXX\n- https://open.spotify.com/track/XXXX\n- Track ID (22 chars)"
        );
      }

      // Fetch track data
      const track = await fetchTrackById(trackId, token);
      setCardData(track);

      // Generate QR code
      const qrUrl = await generateQRCode(track);
      setQrDataUrl(qrUrl);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      setCardData(null);
      setQrDataUrl(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!qrDataUrl || !cardData) return;

    try {
      const response = await fetch(qrDataUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${cardData.title}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to download QR code"
      );
    }
  };

  if (!isAuthed) {
    return (
      <div className={styles.container}>
        <h1>QR Code Generator</h1>
        <p>Redirecting to Spotify login...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1>QR Code Generator</h1>
      <p>Generate a QR code from a single Spotify track</p>

      <div className={styles.formSection}>
        <div className={styles.inputGroup}>
          <label htmlFor="trackUrl">Spotify Track URL or URI:</label>
          <input
            id="trackUrl"
            type="text"
            placeholder="paste spotify:track:XXXX or https://open.spotify.com/track/XXXX"
            value={trackUrl}
            onChange={(e) => setTrackUrl(e.target.value)}
            disabled={isLoading}
            className={styles.input}
          />
          <small>
            Supports: spotify:track:ID, open.spotify.com URL, or track ID
          </small>
        </div>

        <button
          onClick={handleGenerateQR}
          disabled={isLoading || !trackUrl.trim()}
          className={styles.button}
        >
          {isLoading ? "Generating..." : "Generate QR Code"}
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {cardData && (
        <div className={styles.resultsSection}>
          <h2>Track Information</h2>
          <div className={styles.trackInfo}>
            <p>
              <strong>Title:</strong> {cardData.title}
            </p>
            <p>
              <strong>Artist:</strong> {cardData.artist}
            </p>
            <p>
              <strong>Release Date:</strong> {cardData.releaseDate}
            </p>
            <p>
              <strong>Spotify URI:</strong> <code>{cardData.spotifyUri}</code>
            </p>
          </div>

          {qrDataUrl && (
            <div className={styles.qrSection}>
              <h2>Generated QR Code</h2>
              <img
                src={qrDataUrl}
                alt="Generated QR code"
                className={styles.qrImage}
              />
              <button onClick={handleDownload} className={styles.downloadButton}>
                Download QR Code
              </button>
            </div>
          )}

          <h2>JSON Payload</h2>
          <pre className={styles.jsonPayload}>
            {JSON.stringify(toMinimalCardData(cardData), null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
