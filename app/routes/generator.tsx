import { useState, useEffect } from "react";
import type { Route } from "./+types/generator";
import { getToken } from "../lib/spotifyAuth";
import { useAuthRedirect } from "../lib/useAuthRedirect";
import { generateQRCodeBlob } from "../lib/qrGenerator";
import { type CardData } from "../lib/schemas";
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
            Supports: spotify:playlist:ID, open.spotify.com URL, or playlist ID.
            The playlist must be owned by you or followed in your Spotify account — editorial and third-party playlists you don't follow cannot be fetched.
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
          {isLoading ? "Fetching tracks..." : "Fetch Playlist"}
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

          <button
            onClick={handleGeneratePDF}
            disabled={isLoading}
            className={styles.button}
          >
            {isLoading ? "Generating PDF..." : "📥 Download PDF"}
          </button>
        </div>
      )}
    </div>
  );
}
