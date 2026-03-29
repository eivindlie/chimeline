import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import logoFullLight from '../assets/logo-full-light.svg';

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

async function imageToDataUrl(imagePath: string, renderWidth = 0, renderHeight = 0): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const w = renderWidth || img.naturalWidth || img.width;
      const h = renderHeight || img.naturalHeight || img.height;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Could not get canvas 2D context')); return; }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error(`Failed to load image: ${imagePath}`));
    img.src = imagePath;
  });
}

const ROWS = 4;
const COLS = 3;
const CELL_HEIGHT = 185;

function buildBody(logoDataUrl: string): any[][] {
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({
      image: logoDataUrl,
      fit: [130, 130],
      alignment: 'center',
      verticalAlignment: 'middle',
    }))
  );
}

export async function generateBonusCardsPDF(
  filename = `chimeline-bonus-cards-${new Date().toISOString().split('T')[0]}.pdf`
): Promise<void> {
  const logoDataUrl = await imageToDataUrl(logoFullLight, 600, 600);

  const frontBody = buildBody(logoDataUrl);
  // Reverse columns so cards align correctly after long-edge duplex flip
  const backBody = buildBody(logoDataUrl).map((row) => [...row].reverse());

  const heights = new Array(ROWS).fill(CELL_HEIGHT);

  const docDef: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [12, 10, 12, 10],
    content: [
      {
        table: { widths: ['*', '*', '*'], heights, body: frontBody, headerRows: 0 },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => '#d0d0d0',
          vLineColor: () => '#d0d0d0',
        },
      },
      { text: '', pageBreak: 'after' },
      {
        table: { widths: ['*', '*', '*'], heights, body: backBody, headerRows: 0 },
        layout: {
          hLineWidth: () => 0,
          vLineWidth: () => 0,
        },
      },
    ] as any,
  };

  const pdf = (pdfMake as any).createPdf(docDef);
  pdf.download(filename);
}
