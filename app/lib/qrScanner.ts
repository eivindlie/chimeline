import { Html5Qrcode } from "html5-qrcode";
import { decodeQRPayload } from "./qrDecoder";

/**
 * Scan for a QR code and return the track ID
 * Scanner automatically closes after first valid QR detection
 */
export async function scanQRCode(
  videoElementId: string
): Promise<string> {
  const scanner = new Html5Qrcode(videoElementId);

  try {
    console.debug("Starting QR scanner...");

    const trackId = await new Promise<string>((resolve, reject) => {
      scanner
        .start(
          { facingMode: "environment" }, // Use rear camera on mobile
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            // Non-async callback for html5-qrcode
            try {
              console.debug("QR code detected:", decodedText);
              const trackId = decodeQRPayload(decodedText.trim());

              // Stop scanner synchronously
              scanner.stop().catch((err) => {
                console.warn("Error stopping scanner:", err);
              });

              resolve(trackId);
            } catch (error) {
              const errorMsg =
                error instanceof Error ? error.message : String(error);
              console.warn("QR decode error, continuing scan:", errorMsg);
              // Don't reject, just continue scanning
            }
          },
          (errorMessage) => {
            // Scanning errors (e.g., "No QR code found") - ignore these
          }
        )
        .catch((error) => {
          reject(
            new Error(
              `Failed to start scanner: ${error instanceof Error ? error.message : String(error)}`
            )
          );
        });
    });

    return trackId;
  } catch (error) {
    console.error("Scanner error:", error);
    throw error;
  } finally {
    // Clean up scanner
    try {
      await scanner.clear();
    } catch (error) {
      console.warn("Error clearing scanner:", error);
    }
  }
}

/**
 * Stop QR code scanning and clean up resources
 */
export async function stopScanning(): Promise<void> {
  // Note: Scanner is now cleaned up internally by scanQRCode()
  // This function kept for backwards compatibility if needed
}
