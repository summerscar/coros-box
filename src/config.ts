const isDEV = process.env.NODE_ENV === "development";

const CARD_BG_COLOR = "#080d26";
const FONT_COLOR = "#ffffffcc";
const OUTPUT_DIR = isDEV ? "./coros-card" : "../coros-card";
const MAX_ACTIVITIES = 5;

function formatSportTitle(title: string) {
  if (title.includes("跑步")) {
    return `🏃${title}`;
  }
  if (title.includes("骑行")) {
    return `🚴${title}`;
  }
  if (title.includes("水域") || title.includes("游泳")) {
    return `🏊${title}`;
  }
  if (title.includes("徒步")) {
    return `🚶${title}`;
  }
  switch (title) {
    case "Open Water":
    case "Pool Swim":
      return `🏊${title}`;
    case "Run":
      return `🏃${title}`;
    case "Bike":
      return `🚴${title}`;
    default:
      return title;
  }
}

export {
  isDEV,
  CARD_BG_COLOR,
  FONT_COLOR,
  OUTPUT_DIR,
  MAX_ACTIVITIES,
  formatSportTitle,
};
