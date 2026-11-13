/**
 * Raise Your Hands merch preview (shop "coming soon"): the real models from EZ Design
 * (ez-project/raise-your-hands/merch), shown without price, purchase button or form.
 * Images: public/ryh/loja/<piece>-<colour>-<view>-{500,1000}.webp, 4:5, caption cropped,
 * no metadata (cwebp -metadata none). Names, colours and descriptions live in
 * translations (ryh.shop.merch), so PT and EN stay together.
 */

export const MERCH_PIECES = ["camiseta", "moletom"] as const;
export const MERCH_COLOURS = ["areia", "grafite"] as const;
export const MERCH_VIEWS = ["frente", "costas"] as const;

export type MerchPiece = (typeof MERCH_PIECES)[number];
export type MerchColour = (typeof MERCH_COLOURS)[number];
export type MerchView = (typeof MERCH_VIEWS)[number];

/** Fabric reference colours from the production note (screen references, not the final swatch card) */
export const MERCH_SWATCH: Record<MerchColour, string> = {
  areia: "#E4D8C2",
  grafite: "#34312D",
};

/** Image size: 4:5 at 1000 and 500 px wide */
export const MERCH_IMAGE = { w: 1000, h: 1250, widths: [500, 1000] as const };

export const merchBase = (piece: MerchPiece, colour: MerchColour, view: MerchView) => `/ryh/loja/${piece}-${colour}-${view}`;

export const merchSrcSet = (piece: MerchPiece, colour: MerchColour, view: MerchView) =>
  MERCH_IMAGE.widths.map((w) => `${merchBase(piece, colour, view)}-${w}.webp ${w}w`).join(", ");

export const merchSrc = (piece: MerchPiece, colour: MerchColour, view: MerchView) => `${merchBase(piece, colour, view)}-1000.webp`;

/** Default state of every card */
export const MERCH_DEFAULT = { colour: "areia" as MerchColour, view: "frente" as MerchView };

export interface MerchTexts {
  pieces: Record<MerchPiece, string>;
  /** Piece names as they read inside the alt sentence ("kangaroo-pocket hoodie") */
  altPieces: Record<MerchPiece, string>;
  colours: Record<MerchColour, string>;
  /** "{{piece}} {{colour}}, frente, com o logo Raise Your Hands no peito" */
  altFront: string;
  altBack: string;
}

/** Descriptive alt text, e.g. "T-shirt areia, frente, com o logo Raise Your Hands no peito" */
export function merchAlt(texts: MerchTexts, piece: MerchPiece, colour: MerchColour, view: MerchView): string {
  const template = view === "frente" ? texts.altFront : texts.altBack;
  const text = template.replace("{{piece}}", texts.altPieces[piece]).replace("{{colour}}", texts.colours[colour].toLowerCase());
  // EN starts with the colour ("Sand T-shirt…"): keep the sentence capitalised
  return text.charAt(0).toUpperCase() + text.slice(1);
}
