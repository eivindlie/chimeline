import { Html5Qrcode } from "html5-qrcode";
import { parseMinimalCardData, toFullCardData, type FullCardData } from "./schemas";

/**
 * Start QR code scanning from a video element
 * Calls onScan callback with decoded FullCardData when valid QR is detected
 */
export async function startScanning(
  videoElementId: string,
  onScan: (cardData: FullCardData) => void
): Promise<Html5Qrcode> {
  const scanner = new Html5Qrcode(videoElementId);

  try {
    await scanner.start(
      { facingMode: "environment" }, // Use rear camera on mobile
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
      },
      (decodedText) => {
        // Try to parse the QR payload as MinimalCardData
        try {
          const qrString = decodedText.trim();
          console.debug("QR decoded text:", qrString);
          const minimalData = parseMinimalCardData(qrString);
          const fullData = toFullCardData(minimalData);
          onScan(fullData);
        } catch (error) {
          // Invalid QR format, ignore and continue scanning
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.warn("Invalid QR format - decoding error:", errorMsg);
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
