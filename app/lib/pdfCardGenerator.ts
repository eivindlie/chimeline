import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import type { CardData } from './schemas';
import { generateQRCodeBlob } from './qrGenerator';
import type { TDocumentDefinitions, Content, Table } from 'pdfmake/interfaces';

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

    // Group tracks into pages (12 cards per page = 4 rows of 3)
    const CARDS_PER_PAGE = 12;
    const pageCount = Math.ceil(tracks.length / CARDS_PER_PAGE);
    const pages: Record<string, unknown>[] = [];

    // Build alternating QR and title pages
    for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
      const pageStart = pageIndex * CARDS_PER_PAGE;
      const pageEnd = Math.min(pageStart + CARDS_PER_PAGE, tracks.length);
      const pageTracks = tracks.slice(pageStart, pageEnd);

      // Build QR table for this page
      const qrTableBody: any[] = [];
      for (let i = 0; i < pageTracks.length; i += 3) {
        const rowTracks = pageTracks.slice(i, i + 3);
        const cells: Record<string, unknown>[] = rowTracks.map((track) => {
          const qrUrl = trackQRs.get(`${track.spotifyUri}-${track.title}`);
          return {
            image: qrUrl || '',
            fit: [140, 140],
            alignment: 'center',
            verticalAlignment: 'middle',
            border: [1, 1, 1, 1],
            borderColor: '#e0e0e0',
            margin: [0, 0, 0, 0],
          };
        });

        // Pad with empty cells if row has fewer than 3 items
        while (cells.length < 3) {
          cells.push({
            text: '',
            border: [1, 1, 1, 1] as [number, number, number, number],
            borderColor: '#e0e0e0',
          });
        }

        qrTableBody.push(cells);
      }

      // Build title table for this page (reversed for flip)
      const titleTableBody: any[] = [];
      for (let i = 0; i < pageTracks.length; i += 3) {
        const rowTracks = pageTracks.slice(i, i + 3);
        const cells: Record<string, unknown>[] = rowTracks.map((track) => {
          const year = new Date(track.releaseDate).getFullYear();
          const formattedDate = new Date(track.releaseDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          });
          return {
            stack: [
              {
                text: track.title,
                fontSize: 9,
                bold: true,
                alignment: 'center',
                margin: [0, 0, 0, 45],
              },
              {
                text: formattedDate,
                fontSize: 7,
                alignment: 'center',
                margin: [0, 0, 0, 2],
              },
              {
                text: year.toString(),
                fontSize: 20,
                bold: true,
                alignment: 'center',
                margin: [0, 0, 0, 0],
              },
              {
                text: track.artist,
                fontSize: 7,
                alignment: 'center',
                margin: [0, 45, 0, 0],
              },
            ],
            verticalAlignment: 'middle',
            border: [1, 1, 1, 1],
            borderColor: '#e0e0e0',
            margin: [5, 5, 5, 5],
          };
        });

        // Pad with empty cells
        while (cells.length < 3) {
          cells.push({
            text: '',
            border: [1, 1, 1, 1] as [number, number, number, number],
            borderColor: '#e0e0e0',
          });
        }

        titleTableBody.push(cells);
      }

      // Reverse columns for long-edge flip alignment
      const reversedTitleBody = titleTableBody.map((row) => [...row].reverse());

      // Add QR page
      pages.push({
        text: pageIndex === 0 ? 'PAGE 1: QR CODES (Print First)' : `QR CODES - Page ${pageIndex * 2 + 1}`,
        fontSize: 10,
        color: '#666',
        alignment: 'center',
        margin: [0, 0, 0, 3],
      });
      pages.push({
        text: pageIndex === 0
          ? 'Use automatic duplex printing (double-sided) with long-edge flip. Printer will automatically flip and print song titles on the back. Then cut all cards.'
          : 'Continue with automatic duplex printing. Printer will handle the flip.',
        fontSize: 8,
        color: '#999',
        alignment: 'center',
        margin: [0, 0, 0, 10],
      });
      pages.push({
        table: {
          widths: ['*', '*', '*'],
          heights: new Array(qrTableBody.length).fill(185),
          body: qrTableBody,
          headerRows: 0,
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => '#d0d0d0',
          vLineColor: () => '#d0d0d0',
        },
      });
      pages.push({
        text: '',
        pageBreak: 'after',
      });

      // Add title page
      pages.push({
        text: `SONG TITLES - Page ${pageIndex * 2 + 2}`,
        fontSize: 10,
        color: '#666',
        alignment: 'center',
        margin: [0, 0, 0, 3],
      });
      pages.push({
        text: pageIndex === pageCount - 1
          ? 'Duplex printing complete! Cut the same way as the QR codes. Glue back-to-back to create finished cards.'
          : 'Duplex printing will continue automatically.',
        fontSize: 8,
        color: '#999',
        alignment: 'center',
        margin: [0, 0, 0, 10],
      });
      pages.push({
        table: {
          widths: ['*', '*', '*'],
          heights: new Array(reversedTitleBody.length).fill(185),
          body: reversedTitleBody,
          headerRows: 0,
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => '#d0d0d0',
          vLineColor: () => '#d0d0d0',
        },
      });
      if (pageIndex < pageCount - 1) {
        pages.push({
          text: '',
          pageBreak: 'after',
        });
      }
    }

    // Create the document definition with dynamically generated pages
    const docDef: TDocumentDefinitions = {
      pageSize: 'A4',
      pageMargins: [12, 10, 12, 10], // left, top, right, bottom - balanced margins
      content: pages as any,
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
