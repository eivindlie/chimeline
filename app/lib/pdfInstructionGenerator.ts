import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import logoFullLightSvg from '../assets/logo-full-light.svg';

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

// Always render at the specified pixel dimensions, ignoring the image's natural size.
// SVGs with explicit width/height attributes return small naturalWidth/naturalHeight,
// which would cause pixelation when scaled up in the PDF.
async function imageToDataUrl(imagePath: string, w: number, h: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas 2D context'));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error(`Failed to load image: ${imagePath}`));
    img.src = imagePath;
  });
}

interface Step {
  text: string;
  subItems?: string[];
}

const CONTENT: Record<'nb' | 'en', { heading: string; steps: Step[] }> = {
  nb: {
    heading: 'Slik spiller du',
    steps: [
      { text: 'Åpne chimeline.prograd.no for å scanne' },
      { text: 'Sørg for å ha et sett bonuskort og minst ett sett QR-kort' },
      { text: 'Alle starter med 3 bonuskort' },
      { text: 'Skann QR-koden på kortet' },
      { text: 'Hør sangen og gjett utgivelsesår' },
      {
        text: 'Gjett riktig tittel og artist for å få et bonuskort. Bonuskortene kan brukes til å:',
        subItems: ['Utfordre andres plassering', 'Hoppe over en sang du ikke greier'],
      },
      { text: 'Plasser kortet på tidslinjen' },
      { text: 'Første til 10 kort vinner!' },
    ],
  },
  en: {
    heading: 'How to play',
    steps: [
      { text: 'Open chimeline.prograd.no to scan' },
      { text: 'Make sure to have a set of bonus cards, and at least one set of QR cards' },
      { text: 'Everyone starts with 3 bonus cards' },
      { text: 'Scan the QR code on the card' },
      { text: 'Listen and guess the release year' },
      {
        text: 'Guess title and artist correctly to earn a bonus card. Bonus cards can be used to:',
        subItems: ['Challenge another player\'s placement', 'Skip a song you can\'t figure out'],
      },
      { text: 'Place the card on the timeline' },
      { text: 'First to 10 cards wins!' },
    ],
  },
};

const PAD = 20;

// buildCell must be called fresh for each table position.
// pdfmake must not see the same object reference in multiple cells —
// shared references are only rendered once and skipped elsewhere.
function buildCell(lang: 'nb' | 'en', logoDataUrl: string) {
  const { heading, steps } = CONTENT[lang];
  return {
    stack: [
      // Full logo (icon + wordmark already included in the SVG)
      {
        image: logoDataUrl,
        fit: [250, 100],
        margin: [PAD, 16, PAD, 12],
      },
      {
        text: heading,
        fontSize: 12,
        bold: true,
        color: '#111111',
        margin: [PAD, 0, PAD, 10],
      },
      ...steps.flatMap((step, i) => {
        const items: object[] = [
          {
            text: `${i + 1}.  ${step.text}`,
            fontSize: 10,
            color: '#111111',
            margin: [PAD, 0, PAD, step.subItems ? 3 : 8],
            lineHeight: 1.3,
          },
        ];
        if (step.subItems) {
          items.push({
            ul: [...step.subItems],
            fontSize: 9,
            color: '#444444',
            margin: [PAD + 12, 0, PAD, 8],
            lineHeight: 1.3,
          });
        }
        return items;
      }),
    ],
    border: [true, true, true, true],
    borderColor: '#bbbbbb',
  };
}

/**
 * Generate a duplex-ready instruction sheet PDF.
 * A4 portrait with a 2×2 grid of A6 cards (4 inserts per sheet).
 * Page 1: Norwegian. Page 2: English (columns reversed for long-edge flip).
 * Print duplex, cut horizontally and vertically to get 4 insert cards.
 */
export async function generateInstructionPDF(): Promise<void> {
  // Render SVG at 4× resolution so it stays crisp at print quality (300dpi).
  // 250pt at 300dpi ≈ 1042px; 2400×800 gives ample headroom.
  const logoDataUrl = await imageToDataUrl(logoFullLightSvg, 2400, 800);

  // A4 height 841.89pt. Two rows of 400pt = 800pt, leaving ~42pt buffer.
  // A4 height 841.89pt — two rows of 410pt = 820pt, leaving ~22pt buffer.
  const ROW_HEIGHT = 410;

  // Each call to buildCell() returns an independent object tree — no shared refs.
  const frontBody = [
    [buildCell('nb', logoDataUrl), buildCell('nb', logoDataUrl)],
    [buildCell('nb', logoDataUrl), buildCell('nb', logoDataUrl)],
  ];

  // Reverse columns so each English card aligns with its Norwegian front after long-edge flip
  const backBody = [
    [buildCell('en', logoDataUrl), buildCell('en', logoDataUrl)],
    [buildCell('en', logoDataUrl), buildCell('en', logoDataUrl)],
  ].map((row) => [...row].reverse());

  const makeTable = (body: any[][]) => ({
    table: {
      widths: ['*', '*'],
      heights: [ROW_HEIGHT, ROW_HEIGHT],
      body,
      headerRows: 0,
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => '#bbbbbb',
      vLineColor: () => '#bbbbbb',
    },
  });

  const docDef: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [0, 0, 0, 0],
    content: [
      makeTable(frontBody),
      { ...makeTable(backBody), pageBreak: 'before' },
    ],
  };

  const pdf = (pdfMake as any).createPdf(docDef);
  pdf.download('chimeline-instructions.pdf');
}
