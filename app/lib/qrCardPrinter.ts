import type { CardData } from "./schemas";

/**
 * Layout configuration for printable cards
 */
const CARD_LAYOUT = {
  cardSize: 65, // mm
  cardsPerRow: 3,
  cardsPerColumn: 4,
  cardMargin: 5, // mm between cards
  pageMargin: 10, // mm page margin
} as const;

export const CARDS_PER_PAGE =
  CARD_LAYOUT.cardsPerRow * CARD_LAYOUT.cardsPerColumn;

/**
 * Card layout information for CSS rendering
 */
export interface CardLayoutInfo {
  cardSize: number; // mm
  cardsPerRow: number;
  cardsPerColumn: number;
  cardMargin: number; // mm
  pageMargin: number; // mm
  cardsPerPage: number;
}

/**
 * A page of cards with both front and back sides
 */
export interface CardPage {
  pageNumber: number;
  cards: CardData[];
}

/**
 * Calculate layout information for CSS
 */
export function getCardLayoutInfo(): CardLayoutInfo {
  return {
    cardSize: CARD_LAYOUT.cardSize,
    cardsPerRow: CARD_LAYOUT.cardsPerRow,
    cardsPerColumn: CARD_LAYOUT.cardsPerColumn,
    cardMargin: CARD_LAYOUT.cardMargin,
    pageMargin: CARD_LAYOUT.pageMargin,
    cardsPerPage: CARDS_PER_PAGE,
  };
}

/**
 * Split an array of cards into pages
 * Each page contains CARDS_PER_PAGE cards (12 for 3x4 grid)
 */
export function layoutCardsForPrint(cards: CardData[]): CardPage[] {
  const pages: CardPage[] = [];

  for (let i = 0; i < cards.length; i += CARDS_PER_PAGE) {
    const pageNumber = pages.length + 1;
    const pageCards = cards.slice(i, i + CARDS_PER_PAGE);

    // Pad the last page to CARDS_PER_PAGE if needed (for consistent grid)
    while (pageCards.length < CARDS_PER_PAGE) {
      pageCards.push(pageCards[pageCards.length - 1]); // Duplicate last card for padding
    }

    pages.push({
      pageNumber,
      cards: pageCards,
    });
  }

  return pages;
}

/**
 * Calculate page dimensions for rendering in CSS
 * A4: 210mm × 297mm
 */
export function getPageDimensions() {
  const a4Width = 210; // mm
  const a4Height = 297; // mm
  const usableWidth = a4Width - 2 * CARD_LAYOUT.pageMargin; // 190mm
  const usableHeight = a4Height - 2 * CARD_LAYOUT.pageMargin; // 277mm

  // Calculate actual space taken by grid
  const gridWidth =
    CARD_LAYOUT.cardsPerRow * CARD_LAYOUT.cardSize +
    (CARD_LAYOUT.cardsPerRow - 1) * CARD_LAYOUT.cardMargin;
  const gridHeight =
    CARD_LAYOUT.cardsPerColumn * CARD_LAYOUT.cardSize +
    (CARD_LAYOUT.cardsPerColumn - 1) * CARD_LAYOUT.cardMargin;

  return {
    pageWidth: a4Width,
    pageHeight: a4Height,
    usableWidth,
    usableHeight,
    gridWidth,
    gridHeight,
    marginLeft: CARD_LAYOUT.pageMargin,
    marginTop: CARD_LAYOUT.pageMargin + 20, // Extra space for print instructions header
  };
}
