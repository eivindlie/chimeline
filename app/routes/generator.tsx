import { useState, useEffect } from "react";
import type { Route } from "./+types/generator";
import { getToken } from "../lib/spotifyAuth";
import { useAuthRedirect } from "../lib/useAuthRedirect";
import { generateQRFromTrackUrl } from "../lib/generateQRFromTrackUrl";
import { downloadQRFromDataUrl, generateQRCodeBlob } from "../lib/qrGenerator";
import { toTrackIdentifier, type CardData } from "../lib/schemas";
import { parsePlaylistUrl, fetchPlaylistTracks } from "../lib/spotifyPlaylist";
import { generateCardsPDFFromTracks } from "../lib/pdfCardGenerator";
import styles from "./generator.module.css";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "ChimeLine - QR Generator" },
    { name: "description", content: "Generate QR codes from Spotify tracks" },
  ];
}

export default function GeneratorPage() {
  // Mode selection
  const [mode, setMode] = useState<"single" | "playlist">("single");

  // Single track state
  const [trackUrl, setTrackUrl] = useState("");
  const [cardData, setCardData] = useState<CardData | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // Playlist state
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [playlistTracks, setPlaylistTracks] = useState<CardData[]>([]);
  const [seriesMark, setSeriesMark] = useState("");

  // Shared state
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
      if (!token) {
        throw new Error("Not authenticated with Spotify");
      }

      if (!trackUrl.trim()) {
        throw new Error("Please enter a Spotify track URL");
      }

      // Generate QR from track URL
      const { cardData: newCardData, qrUrl } = await generateQRFromTrackUrl(
        trackUrl,
        token
      );

      setCardData(newCardData);
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

  const handleGeneratePlaylistQRs = async () => {
    setError(null);
    setIsLoading(true);

    try {
      if (!token) {
        throw new Error("Not authenticated with Spotify");
      }

      if (!playlistUrl.trim()) {
        throw new Error("Please enter a Spotify playlist URL");
      }

      // Parse playlist ID from URL
      const playlistId = parsePlaylistUrl(playlistUrl);
      if (!playlistId) {
        throw new Error(
          "Invalid Spotify playlist URL. Expected spotify:playlist:ID, https://open.spotify.com/playlist/ID, or just the ID."
        );
      }

      // Fetch all tracks from playlist
      const tracks = await fetchPlaylistTracks(playlistId, token);
      setPlaylistTracks(tracks);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      setPlaylistTracks([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!qrDataUrl || !cardData) return;

    setError(null);

    try {
      const filename = `${cardData.title}.png`;
      await downloadQRFromDataUrl(qrDataUrl, filename);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Download error:", message);
      setError(message);
    }
  };

  const handleGeneratePDF = async () => {
    setError(null);
    setIsLoading(true);

    try {
      if (playlistTracks.length === 0) {
        throw new Error("No tracks to generate PDF from");
      }

      const playlistName = playlistUrl
        .split("/")
        .pop()
        ?.split("?")[0] || "ChimeLine_Playlist";

      await generateCardsPDFFromTracks(playlistTracks, {
        playlistName,
        filename: `${playlistName}_${new Date().toISOString().split('T')[0]}.pdf`,
        seriesMark: seriesMark.trim() || undefined,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setIsLoading(false);
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

      {/* Mode selector */}
      <div className={styles.modeSelector}>
        <button
          className={`${styles.modeButton} ${mode === "single" ? styles.active : ""}`}
          onClick={() => {
            setMode("single");
            setError(null);
            setPlaylistTracks([]);
          }}
        >
          Single Track
        </button>
        <button
          className={`${styles.modeButton} ${mode === "playlist" ? styles.active : ""}`}
          onClick={() => {
            setMode("playlist");
            setError(null);
            setCardData(null);
            setQrDataUrl(null);
          }}
        >
          Playlist
        </button>
      </div>

      {/* Single track mode */}
      {mode === "single" && (
        <>
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
                  <button
                    onClick={() => {
                      if (!qrDataUrl || !cardData) return;
                      const filename = `${cardData.title}.png`;
                      downloadQRFromDataUrl(qrDataUrl, filename);
                    }}
                    className={styles.downloadButton}
                  >
                    Download QR Code
                  </button>
                </div>
              )}

              <h2>JSON Payload</h2>
              <pre className={styles.jsonPayload}>
                {JSON.stringify(toTrackIdentifier(cardData), null, 2)}
              </pre>
            </div>
          )}
        </>
      )}

      {/* Playlist mode */}
      {mode === "playlist" && (
        <>
          <p>Generate printable QR cards from a Spotify playlist</p>

          <div className={styles.formSection}>
            <div className={styles.inputGroup}>
              <label htmlFor="playlistUrl">Spotify Playlist URL or URI:</label>
              <input
                id="playlistUrl"
                type="text"
                placeholder="paste spotify:playlist:XXXX or https://open.spotify.com/playlist/XXXX"
                value={playlistUrl}
                onChange={(e) => setPlaylistUrl(e.target.value)}
                disabled={isLoading}
                className={styles.input}
              />
              <small>
                Supports: spotify:playlist:ID, open.spotify.com URL, or playlist ID
              </small>
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="seriesMark">Series mark (optional, 2–3 letters):</label>
              <input
                id="seriesMark"
                type="text"
                placeholder="e.g. A1"
                value={seriesMark}
                onChange={(e) => setSeriesMark(e.target.value.slice(0, 3))}
                disabled={isLoading}
                className={styles.input}
                style={{ width: "6rem" }}
              />
              <small>Printed in the corner of each title card to identify the series.</small>
            </div>

            <button
              onClick={handleGeneratePlaylistQRs}
              disabled={isLoading || !playlistUrl.trim()}
              className={styles.button}
            >
              {isLoading ? "Fetching tracks..." : "Fetch Playlist & Generate QRs"}
            </button>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          {playlistTracks.length > 0 && (
            <div className={styles.resultsSection}>
              <h2>
                Playlist Tracks ({playlistTracks.length} track
                {playlistTracks.length !== 1 ? "s" : ""})
              </h2>
              <div className={styles.trackList}>
                {playlistTracks.map((track, idx) => (
                  <div key={idx} className={styles.trackListItem}>
                    {idx + 1}. {track.title} – {track.artist} ({track.releaseDate})
                  </div>
                ))}
              </div>

              {playlistTracks.length > 0 && (
                <button
                  onClick={handleGeneratePDF}
                  disabled={isLoading}
                  className={styles.button}
                >
                  {isLoading ? "Generating PDF..." : "📥 Download PDF"}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
