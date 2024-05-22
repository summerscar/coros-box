import fs from "fs";
import data from "./data.json";
import { Card } from "./template/card";
import { OUTPUT_DIR } from "./config";
import path from "path";

console.log("data: \n", data);
const summaryData = {
  avgHeartRate: 166,
  count: 6,
  distance: 56632.99,
  duration: 22326,
  sportType: 65535,
  trainingLoad: 1439,
};

(async () => {
  const card = new Card();
  await card.drawActivities(data);
  await card.drawSummary(summaryData);
  const output_path = path.resolve(OUTPUT_DIR, "card.svg");
  !fs.existsSync(OUTPUT_DIR) && fs.mkdirSync(OUTPUT_DIR);
  fs.writeFileSync(output_path, card.toString());
})();
