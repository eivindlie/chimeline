import i18next from './i18n';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import type { CardData } from './schemas';
import { generateQRCodeBlob } from './qrGenerator';
import type { TDocumentDefinitions, Content, Table } from 'pdfmake/interfaces';
import watermarkPng from '../assets/logo-icon-watermark.png';

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

// Convert image path/URL to data URL for pdfmake compatibility
async function imageToDataUrl(imagePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas 2D context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    
    img.onerror = () => {
      reject(new Error(`Failed to load image: ${imagePath}`));
    };
    
    img.src = imagePath;
  });
}

let watermarkDataUrl: string | null = null;

export interface PDFGenerationOptions {
  filename?: string;
  playlistName?: string;
  seriesMark?: string; // Short series identifier (2-3 chars) shown in bottom-right of title cards
}

// --- Title card layout helpers ---
// Cell content area: 185pt row height − 5pt top − 5pt bottom cell margin = 175pt
const CELL_CONTENT_PT = 175;
const TITLE_LINE_PT = 13;   // 11pt bold font line height
const ARTIST_LINE_PT = 10;  // 8pt font line height
const CENTER_BLOCK_PT = 50; // date line (10pt + 2pt margin) + year line (38pt)
const TITLE_CHARS_PER_LINE = 28;
const ARTIST_CHARS_PER_LINE = 40;
const MAX_TITLE_LINES = 4;
const MAX_ARTIST_LINES = 2;

function estimateLines(text: string, charsPerLine: number): number {
  const words = text.split(/\s+/);
  let lines = 1;
  let lineLen = 0;
  for (const word of words) {
    if (lineLen === 0) {
      lineLen = word.length;
    } else if (lineLen + 1 + word.length > charsPerLine) {
      lines++;
      lineLen = word.length;
    } else {
      lineLen += 1 + word.length;
    }
  }
  return lines;
}

function clampToLines(text: string, charsPerLine: number, maxLines: number): string {
  const words = text.split(/\s+/);
  let lines = 1;
  let lineLen = 0;
  const kept: string[] = [];
  for (const word of words) {
    if (kept.length === 0) {
      kept.push(word);
      lineLen = word.length;
    } else if (lineLen + 1 + word.length > charsPerLine) {
      if (lines >= maxLines) {
        kept[kept.length - 1] += '…';
        break;
      }
      lines++;
      kept.push(word);
      lineLen = word.length;
    } else {
      kept.push(word);
      lineLen += 1 + word.length;
    }
  }
  return kept.join(' ');
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
    seriesMark,
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

    // Convert watermark to data URL
    if (!watermarkDataUrl) {
      watermarkDataUrl = await imageToDataUrl(watermarkPng);
    }

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
            stack: [
              {
                image: watermarkDataUrl || '',
                width: 170,
                height: 170,
                alignment: 'center',
                opacity: 1,
                margin: [0, -10, 0, -160],
              },
              {
                image: qrUrl || '',
                fit: [140, 140],
                alignment: 'center',
                verticalAlignment: 'middle',
              },
            ],
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
          const dateLocale = i18next.language === 'nb' ? 'nb-NO' : 'en-GB';
          const formattedDate = new Date(track.releaseDate).toLocaleDateString(dateLocale, {
            day: 'numeric',
            month: 'short',
          });
          const displayTitle = clampToLines(track.title, TITLE_CHARS_PER_LINE, MAX_TITLE_LINES);
          const displayArtist = clampToLines(track.artist, ARTIST_CHARS_PER_LINE, MAX_ARTIST_LINES);
          const seriesMarkPt = seriesMark ? 11 : 0; // ~7pt text + 4pt top margin
          const usedPt =
            estimateLines(displayTitle, TITLE_CHARS_PER_LINE) * TITLE_LINE_PT +
            CENTER_BLOCK_PT +
            estimateLines(displayArtist, ARTIST_CHARS_PER_LINE) * ARTIST_LINE_PT +
            seriesMarkPt;
          const gap = Math.max(2, Math.floor((CELL_CONTENT_PT - usedPt) / 2));

          return {
            stack: [
              {
                image: watermarkDataUrl || '',
                width: 170,
                height: 170,
                alignment: 'center',
                opacity: 1,
                margin: [0, -10, 0, -160],
              },
              {
                stack: [
                  {
                    text: displayTitle,
                    fontSize: 11,
                    bold: true,
                    alignment: 'center',
                    margin: [0, 0, 0, gap],
                  },
                  {
                    text: formattedDate,
                    fontSize: 8,
                    alignment: 'center',
                    margin: [0, 0, 0, 2],
                  },
                  {
                    text: year.toString(),
                    fontSize: 32,
                    bold: true,
                    alignment: 'center',
                    margin: [0, 0, 0, 0],
                  },
                  {
                    text: displayArtist,
                    fontSize: 8,
                    alignment: 'center',
                    margin: [0, gap, 0, 0],
                  },
                  ...(seriesMark ? [{
                    text: seriesMark.toUpperCase(),
                    fontSize: 7,
                    color: '#aaaaaa',
                    alignment: 'right' as const,
                    margin: [0, 4, 2, 0],
                  }] : []),
                ],
                verticalAlignment: 'middle',
              },
            ],
            verticalAlignment: 'middle',
            margin: [5, 5, 5, 5],
          };
        });

        // Pad with empty cells
        while (cells.length < 3) {
          cells.push({ text: '' });
        }

        titleTableBody.push(cells);
      }

      // Reverse columns for long-edge flip alignment
      const reversedTitleBody = titleTableBody.map((row) => [...row].reverse());

      // Add QR page — always pageBreak: 'after' so the title page starts clean
      pages.push({
        stack: [
          {
            text: pageIndex === 0 ? 'PAGE 1: QR CODES (Print First)' : `QR CODES - Page ${pageIndex * 2 + 1}`,
            fontSize: 10,
            color: '#666',
            alignment: 'center',
            margin: [0, 0, 0, 3],
          },
          {
            text: pageIndex === 0
              ? 'Use automatic duplex printing (double-sided) with long-edge flip. Printer will automatically flip and print song titles on the back. Then cut all cards.'
              : 'Continue with automatic duplex printing. Printer will handle the flip.',
            fontSize: 8,
            color: '#999',
            alignment: 'center',
            margin: [0, 0, 0, 10],
          },
          {
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
          },
        ],
        pageBreak: 'after',
      });

      // Add title page — no explicit pageBreak needed; QR stack's 'after' already advanced the page
      pages.push({
        stack: [
          {
            text: `SONG TITLES - Page ${pageIndex * 2 + 2}`,
            fontSize: 10,
            color: '#666',
            alignment: 'center',
            margin: [0, 0, 0, 3],
          },
          {
            text: pageIndex === pageCount - 1
              ? 'Duplex printing complete! Simply cut all cards. Each card has QR code on front and song title on back.'
              : 'Duplex printing will continue automatically.',
            fontSize: 8,
            color: '#999',
            alignment: 'center',
            margin: [0, 0, 0, 10],
          },
          {
            table: {
              widths: ['*', '*', '*'],
              heights: new Array(reversedTitleBody.length).fill(185),
              body: reversedTitleBody,
              headerRows: 0,
            },
            layout: {
              hLineWidth: () => 0,
              vLineWidth: () => 0,
            },
          },
        ],
        pageBreak: pageIndex < pageCount - 1 ? 'after' : undefined,
      });
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
