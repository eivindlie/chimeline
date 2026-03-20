import { Html5Qrcode } from "html5-qrcode";
import { parseTrackIdentifier, type FullCardData } from "./schemas";
import { fetchTrackById } from "./spotifySearch";

/**
 * Start QR code scanning from a video element
 * Calls onScan callback with decoded FullCardData when valid QR is detected
 * Fetches full metadata from Spotify API for each scanned track ID
 */
export async function startScanning(
  videoElementId: string,
  onScan: (cardData: FullCardData) => void,
  getToken: () => string | null
): Promise<Html5Qrcode> {
  const scanner = new Html5Qrcode(videoElementId);

  try {
    await scanner.start(
      { facingMode: "environment" }, // Use rear camera on mobile
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
      },
      async (decodedText) => {
        // Try to parse the QR payload as TrackIdentifier
        try {
          const qrString = decodedText.trim();
          console.debug("QR decoded text:", qrString);
          const trackId = parseTrackIdentifier(qrString);
          
          // Fetch full track metadata from Spotify
          const token = getToken();
          if (!token) {
            console.warn("No Spotify token available for track fetching");
            return;
          }
          
          const fullData = await fetchTrackById(trackId.id, token);
          onScan(fullData);
        } catch (error) {
          // Invalid QR format or API error, ignore and continue scanning
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.warn("QR scanning error:", errorMsg);
          console.debug("Raw QR text:", decodedText);
        }
      },
      (errorMessage) => {
        // Scanning error - usually "No QR code found" which is fine
        // Don't spam errors, just continue scanning
      }
    );

    return scanner;
  } catch (error) {
    throw new Error(
      `Failed to start QR scanner: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Stop QR code scanning and clean up resources
 */
export async function stopScanning(scanner: Html5Qrcode): Promise<void> {
  try {
    await scanner.stop();
    await scanner.clear();
  } catch (error) {
    console.error(
      `Error stopping scanner: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
