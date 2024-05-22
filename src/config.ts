const isDEV = process.env.NODE_ENV === "development";

const CARD_BG_COLOR = "#080d26";
const FONT_COLOR = "#ffffffcc";
const OUTPUT_DIR = isDEV ? "./coros-card" : "../coros-card";
const MAX_ACTIVITIES = 5;
export { isDEV, CARD_BG_COLOR, FONT_COLOR, OUTPUT_DIR, MAX_ACTIVITIES };
