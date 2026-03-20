import { useState, useEffect } from "react";
import type { CardData } from "../../lib/schemas";
import { generateQRCodeBlob } from "../../lib/qrGenerator";
import {
  layoutCardsForPrint,
  getCardLayoutInfo,
  getPageDimensions,
  type CardPage,
} from "../../lib/qrCardPrinter";
import styles from "./CardPreview.module.css";

interface CardPreviewProps {
  tracks: CardData[];
  playlistName?: string;
  onPdfGenerate?: (pdfBlob: Blob) => void;
}

export function CardPreview({
  tracks,
  playlistName = "ChimeLine_Playlist",
  onPdfGenerate,
}: CardPreviewProps) {
  const [cardQRs, setCardQRs] = useState<Map<string, string>>(new Map());
  const [isGeneratingQRs, setIsGeneratingQRs] = useState(false);
  const [pageLayout, setPageLayout] = useState<CardPage[]>(
    layoutCardsForPrint(tracks)
  );

  // Generate QR codes for all tracks
  useEffect(() => {
    const generateAllQRs = async () => {
      setIsGeneratingQRs(true);
      const qrMap = new Map<string, string>();

      try {
        for (const track of tracks) {
          const qrBlob = await generateQRCodeBlob(track);

          // Convert blob to data URL
          const url = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(qrBlob);
          });

          const trackId = `${track.spotifyUri}-${track.title}`;
          qrMap.set(trackId, url);
        }

        setCardQRs(qrMap);
      } finally {
        setIsGeneratingQRs(false);
      }
    };

    generateAllQRs();
  }, [tracks]);

  const layoutInfo = getCardLayoutInfo();
  const pageDims = getPageDimensions();
  const allQRsLoaded = cardQRs.size === tracks.length;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={styles.container}>
      {/* Web Preview Section */}
      <div className={styles.webPreview}>
        <h3>Preview ({allQRsLoaded ? "Ready" : "Loading QRs..."})</h3>
        <p className={styles.previewInfo}>
          {pageLayout.length} page{pageLayout.length !== 1 ? "s" : ""} •{" "}
          {tracks.length} cards • {layoutInfo.cardsPerPage} cards per page
        </p>

        {pageLayout.map((page: CardPage) => (
          <div
            key={page.pageNumber}
            className={styles.pagePreview}
            style={{
              width: `${pageDims.pageWidth}mm`,
              height: `${pageDims.pageHeight}mm`,
              aspectRatio: `${pageDims.pageWidth}/${pageDims.pageHeight}`,
            }}
          >
            {/* Print instructions header (first page only) */}
            {page.pageNumber === 1 && (
              <div className={styles.printHeader}>
                <p className={styles.instructions}>
                  PRINTING & CUTTING GUIDE: Print this PDF. Stack pages. Use a
                  guillotine or ruler to cut vertically at crop marks (3 cuts),
                  then horizontally (4 cuts).
                </p>
              </div>
            )}

            {/* Card grid */}
            <div
              className={styles.cardGrid}
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${layoutInfo.cardsPerRow}, ${layoutInfo.cardSize}mm)`,
                gap: `${layoutInfo.cardMargin}mm`,
                padding: `${pageDims.marginTop - 20}mm ${pageDims.marginLeft}mm`,
                margin: 0,
              }}
            >
              {page.cards.map((card: CardData, idx: number) => {
                const trackId = `${card.spotifyUri}-${card.title}`;
                const qrUrl = cardQRs.get(trackId);

                return (
                  <div key={idx} className={styles.cardContainer}>
                    {/* Front of card - QR Code */}
                    <div className={styles.cardFront}>
                      {qrUrl && (
                        <img
                          src={qrUrl}
                          alt={`QR for ${card.title}`}
                          className={styles.qrImage}
                        />
                      )}

                      {/* Crop marks - tiny crosshairs at corners */}
                      <svg
                        className={styles.cropMarks}
                        viewBox={`0 0 ${layoutInfo.cardSize} ${layoutInfo.cardSize}`}
                        style={{
                          width: `${layoutInfo.cardSize}mm`,
                          height: `${layoutInfo.cardSize}mm`,
                        }}
                      >
                        {/* Corner crop marks */}
                        {[
                          { x: 0, y: 0 },
                          { x: layoutInfo.cardSize, y: 0 },
                          { x: 0, y: layoutInfo.cardSize },
                          {
                            x: layoutInfo.cardSize,
                            y: layoutInfo.cardSize,
                          },
                        ].map((corner, i) => (
                          <g
                            key={i}
                            transform={`translate(${corner.x}, ${corner.y})`}
                          >
                            {/* Horizontal crop line */}
                            <line x1="-3" y1="0" x2="-0.5" y2="0" />
                            <line x1="0.5" y1="0" x2="3" y2="0" />
                            {/* Vertical crop line */}
                            <line x1="0" y1="-3" x2="0" y2="-0.5" />
                            <line x1="0" y1="0.5" x2="0" y2="3" />
                          </g>
                        ))}
                      </svg>
                    </div>

                    {/* Back of card - Track info */}
                    <div className={styles.cardBack}>
                      <div className={styles.cardBackContent}>
                        <div className={styles.title}>{card.title}</div>
                        <div className={styles.artist}>{card.artist}</div>

                        {/* Extract year from date (YYYY-MM-DD) */}
                        <div className={styles.yearBox}>
                          {card.releaseDate.substring(0, 4)}
                        </div>

                        <div className={styles.fullDate}>
                          {new Date(card.releaseDate).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            }
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className={styles.actionButtons}>
        <button
          onClick={handlePrint}
          disabled={isGeneratingQRs || cardQRs.size === 0}
          className={styles.printButton}
        >
          🖨️ Print Cards
        </button>
      </div>
    </div>
  );
}
