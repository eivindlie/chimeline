import html2pdf from 'html2pdf.js';
import type { CardData } from './schemas';
import { generateQRCodeBlob } from './qrGenerator';

export interface PDFGenerationOptions {
  filename?: string;
  margin?: number;
  playlistName?: string;
}

/**
 * Generate a PDF of card grid with proper A4 formatting directly from track data
 * Each card is 65×65mm in a 3×4 grid (12 cards per page)
 */
export async function generateCardsPDFFromTracks(
  tracks: CardData[],
  options: PDFGenerationOptions = {}
): Promise<void> {
  const {
    filename = `chimeline-cards-${new Date().toISOString().split('T')[0]}.pdf`,
    margin = 10,
    playlistName = 'ChimeLine',
  } = options;

  try {
    // Create a temporary container for the cards
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.width = '210mm';
    document.body.appendChild(container);

    // Generate all QR codes first
    const trackQRs = new Map<string, string>();
    for (const track of tracks) {
      const qrBlob = await generateQRCodeBlob(track);
      const url = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(qrBlob);
      });
      trackQRs.set(`${track.spotifyUri}-${track.title}`, url);
    }

    // Build the HTML for the PDF
    let html = `
      <div style="
        width: 210mm;
        height: 297mm;
        margin: 0;
        padding: ${margin}mm;
        background: white;
        font-family: Arial, sans-serif;
        box-sizing: border-box;
      ">
        <div style="
          padding: 10mm;
          border-bottom: 1px solid #f0f0f0;
          text-align: center;
          font-size: 8pt;
          color: #999;
          line-height: 1.3;
          margin-bottom: 10mm;
        ">
          PRINTING & CUTTING GUIDE: Print this PDF. Stack pages. Use a guillotine 
          or ruler to cut vertically at crop marks (3 cuts), then horizontally (4 cuts).
        </div>
        
        <div style="
          display: grid;
          grid-template-columns: repeat(3, 65mm);
          gap: 5mm;
          margin: 0;
          padding: 0;
        ">
    `;

    // Add cards to HTML
    for (const track of tracks) {
      const qrUrl = trackQRs.get(`${track.spotifyUri}-${track.title}`);
      const year = track.releaseDate.substring(0, 4);
      const date = new Date(track.releaseDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      html += `
        <div style="
          width: 65mm;
          height: 65mm;
          border: 1px solid #eee;
          border-radius: 2px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
          padding: 3mm;
          box-sizing: border-box;
          position: relative;
          page-break-inside: avoid;
        ">
          ${
            qrUrl
              ? `<img src="${qrUrl}" alt="QR for ${track.title}" style="
                  max-width: 100%;
                  max-height: 100%;
                  border-radius: 2px;
                " />`
              : ''
          }
        </div>
      `;
    }

    html += `
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Generate PDF from the temporary container
    const pdfOptions = {
      margin: margin,
      filename,
      image: { type: 'png', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, allowTaint: true },
      jsPDF: {
        format: 'a4',
        orientation: 'portrait',
        unit: 'mm',
      },
      pagebreak: { mode: 'avoid-all' },
    };

    await html2pdf().set(pdfOptions).from(container).save();

    // Cleanup
    document.body.removeChild(container);
  } catch (error) {
    console.error('PDF generation failed:', error);
    throw new Error(
      `Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Generate a PDF from an existing DOM element
 */
export async function generateCardsPDF(
  htmlElement: HTMLElement,
  tracks: CardData[],
  options: PDFGenerationOptions = {}
): Promise<void> {
  const {
    filename = `chimeline-cards-${new Date().toISOString().split('T')[0]}.pdf`,
    margin = 10,
  } = options;

  const pdfOptions = {
    margin: margin,
    filename,
    image: { type: 'png', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, allowTaint: true },
    jsPDF: {
      format: 'a4',
      orientation: 'portrait',
      unit: 'mm',
    },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
  };

  try {
    await html2pdf().set(pdfOptions).from(htmlElement).save();
  } catch (error) {
    console.error('PDF generation failed:', error);
    throw new Error(
      `Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Calculate layout info for cards to fit on A4 pages
 */
export const CARD_DIMENSIONS = {
  WIDTH_MM: 65,
  HEIGHT_MM: 65,
  CARDS_PER_ROW: 3,
  CARDS_PER_COL: 4,
  CARDS_PER_PAGE: 12,
} as const;

export const PAGE_DIMENSIONS = {
  WIDTH_MM: 210,
  HEIGHT_MM: 297,
  MARGINS_MM: 10,
} as const;

export function calculateCardsPerPage(tracks: CardData[]): number[] {
  const pagesNeeded = Math.ceil(tracks.length / CARD_DIMENSIONS.CARDS_PER_PAGE);
  const pages: number[] = [];

  for (let i = 0; i < pagesNeeded; i++) {
    const start = i * CARD_DIMENSIONS.CARDS_PER_PAGE;
    const end = Math.min(start + CARD_DIMENSIONS.CARDS_PER_PAGE, tracks.length);
    pages.push(end - start);
  }

  return pages;
}
