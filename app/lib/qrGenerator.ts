import QRCode from "qrcode";
import type { CardData } from "./types";

const QR_CONFIG = {
  ERROR_CORRECTION: "H", // High error correction (40% redundancy)
  TYPE0_MODULE: 2, // Size multiplier
} as const;

/**
 * Generate QR code as data URL (PNG)
 */
export async function generateQRCode(cardData: CardData): Promise<string> {
  const jsonString = JSON.stringify(cardData);

  try {
    const qrDataUrl = await QRCode.toDataURL(jsonString, {
      errorCorrectionLevel: QR_CONFIG.ERROR_CORRECTION,
      type: "image/png",
      width: 400, // 400px × 400px
      margin: 2, // Small margin around QR code
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });

    return qrDataUrl;
  } catch (error) {
    throw new Error(
      `Failed to generate QR code: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Generate QR code to canvas element
 */
export async function generateQRCodeCanvas(
  cardData: CardData
): Promise<HTMLCanvasElement> {
  const jsonString = JSON.stringify(cardData);
  const canvas = document.createElement("canvas");

  try {
    await QRCode.toCanvas(canvas, jsonString, {
      errorCorrectionLevel: QR_CONFIG.ERROR_CORRECTION,
      width: 400,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });

    return canvas;
  } catch (error) {
    throw new Error(
      `Failed to generate QR code: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Generate QR code as blob for download
 */
export async function generateQRCodeBlob(
  cardData: CardData
): Promise<Blob> {
  const jsonString = JSON.stringify(cardData);
  const canvas = document.createElement("canvas");

  try {
    await QRCode.toCanvas(canvas, jsonString, {
      errorCorrectionLevel: QR_CONFIG.ERROR_CORRECTION,
      width: 400,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to create blob from canvas"));
        }
      }, "image/png");
    });
  } catch (error) {
    throw new Error(
      `Failed to generate QR code: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Download QR code as PNG image
 */
export async function downloadQRCode(
  cardData: CardData,
  filename?: string
): Promise<void> {
  try {
    const blob = await generateQRCodeBlob(cardData);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename || `${cardData.title}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    throw new Error(
      `Failed to download QR code: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
