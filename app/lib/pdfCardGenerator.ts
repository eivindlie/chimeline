import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import type { CardData } from './schemas';
import { generateQRCodeBlob } from './qrGenerator';

// Initialize pdfMake with fonts - use dynamic assignment to avoid type issues
if (typeof window !== 'undefined') {
  try {
    const vfsData = (pdfFonts as any)?.pdfMake?.vfs || (pdfFonts as any).vfs;
    if (vfsData) {
      (pdfMake as any).vfs = vfsData;
    }
  } catch (e) {
    console.warn('Could not initialize pdfMake VFS:', e);
  }
}

export interface PDFGenerationOptions {
  filename?: string;
  playlistName?: string;
}

/**
 * Generate a PDF of card grid with proper A4 formatting directly from track data
 * Each card is 65×65mm in a 3×4 grid (12 cards per page)
 * Uses pdfMake for direct PDF generation without canvas rendering issues
 */
export async function generateCardsPDFFromTracks(
  tracks: CardData[],
  options: PDFGenerationOptions = {}
): Promise<void> {
  const {
    filename = `chimeline-cards-${new Date().toISOString().split('T')[0]}.pdf`,
    playlistName = 'ChimeLine',
  } = options;

  try {
    // Generate all QR codes as data URLs
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

    console.log(`[pdfCardGenerator] Generated QR codes for ${trackQRs.size} tracks`);

    // Build QR code table rows: 3 columns per row
    const qrTableBody: any[] = [];
    for (let i = 0; i < tracks.length; i += 3) {
      const rowTracks = tracks.slice(i, i + 3);
      const cells: any[] = rowTracks.map((track) => {
        const qrUrl = trackQRs.get(`${track.spotifyUri}-${track.title}`);
        return {
          image: qrUrl || '',
          fit: [165, 165], // Reduced from 179 to ensure equal margins on both sides
          alignment: 'center' as const,
          valign: 'middle' as const,
          border: [1, 1, 1, 1] as [number, number, number, number],
          borderColor: '#e0e0e0',
          margin: [3, 3, 3, 3] as [number, number, number, number],
        };
      });

      // Pad with empty cells if row has fewer than 3 items (last row)
      while (cells.length < 3) {
        cells.push({
          text: '',
          border: [1, 1, 1, 1] as [number, number, number, number],
          borderColor: '#e0e0e0',
        });
      }

      qrTableBody.push(cells);
    }

    // Build song title table rows: 3 columns per row
    // IMPORTANT: Reverse order for correct double-sided printing (flip on long edge)
    const titleTableBody: any[] = [];
    for (let i = 0; i < tracks.length; i += 3) {
      const rowTracks = tracks.slice(i, i + 3);
      const cells: any[] = rowTracks.map((track) => {
        return {
          text: `${track.title}\n${track.artist}`,
          alignment: 'center' as const,
          valign: 'middle' as const,
          fontSize: 9,
          border: [1, 1, 1, 1] as [number, number, number, number],
          borderColor: '#e0e0e0',
          margin: [3, 3, 3, 3] as [number, number, number, number],
        };
      });

      // Pad with empty cells if row has fewer than 3 items (last row)
      while (cells.length < 3) {
        cells.push({
          text: '',
          border: [1, 1, 1, 1] as [number, number, number, number],
          borderColor: '#e0e0e0',
        });
      }

      titleTableBody.push(cells);
    }

    // Reverse columns only for long-edge flip alignment
    // (flip on the vertical axis - like turning a page in a book)
    const reversedTitleBody = titleTableBody.map((row) => [...row].reverse());

    // Create the document definition with both pages
    const docDef: any = {
      pageSize: 'A4',
      pageMargins: [12, 10, 12, 10], // left, top, right, bottom - balanced margins
      content: [
        {
          text: 'PAGE 1: QR CODES (Print First)',
          fontSize: 10,
          color: '#666',
          alignment: 'center',
          margin: [0, 0, 0, 3],
        },
        {
          text: 'Print this page. After printing, flip the paper on the long edge and load back into printer to print page 2. Then cut all cards.',
          fontSize: 8,
          color: '#999',
          alignment: 'center',
          margin: [0, 0, 0, 10],
        },
        {
          table: {
            widths: ['*', '*', '*'], // 3 equal columns
            heights: new Array(qrTableBody.length).fill(185), // 65mm ≈ 185 points
            body: qrTableBody,
            headerRows: 0,
          },
          layout: {
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => '#d0d0d0',
            vLineColor: () => '#d0d0d0',
          },
        },
        {
          text: '',
          pageBreak: 'after',
        },
        {
          text: 'PAGE 2: SONG TITLES (Print & Cut - Flip Side)',
          fontSize: 10,
          color: '#666',
          alignment: 'center',
          margin: [0, 0, 0, 3],
        },
        {
          text: 'Flip page 1 on the long edge (like turning a page in a book), then print this side. Cut the same way. Glue back-to-back with page 1 cards.',
          fontSize: 8,
          color: '#999',
          alignment: 'center',
          margin: [0, 0, 0, 10],
        },
        {
          table: {
            widths: ['*', '*', '*'], // 3 equal columns
            heights: new Array(reversedTitleBody.length).fill(185), // 65mm ≈ 185 points, same as QR side
            body: reversedTitleBody,
            headerRows: 0,
          },
          layout: {
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => '#d0d0d0',
            vLineColor: () => '#d0d0d0',
          },
        },
      ],
    };

    // Generate and download the PDF
    const pdf = (pdfMake as any).createPdf(docDef);
    pdf.download(filename);

    console.log(`PDF generated successfully: ${filename}`);
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
