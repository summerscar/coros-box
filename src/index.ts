import dayjs from "dayjs";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import md5 from "js-md5";
require("dotenv").config();
import relativeTime from "dayjs/plugin/relativeTime";
import duration from "dayjs/plugin/duration";
import { Card } from "./template/card";
import { OUTPUT_DIR, isDEV } from "./config";
import { Activities, Summary } from "./global";

// require('dayjs/locale/zh-cn')

// dayjs.locale('zh-cn')
dayjs.extend(relativeTime);
dayjs.extend(duration);

const RANGE = 7; // 最近7天
const RANGE_TIME = 1000 * 60 * 60 * 24 * RANGE;
const RECENT_DATA_LENGTH = 5;
const MARKDOWN_FILE = "README.md";
const EMAIL = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;

if (!EMAIL || !PASSWORD) throw Error("set EMAIL/PASSWORD env first!");
(async () => {
  fetch("https://teamcnapi.coros.com/account/login", {
    headers: {
      accept: "application/json, text/plain, */*",
      "accept-language": "zh-CN,zh;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/json;charset=UTF-8",
      pragma: "no-cache",
      "sec-ch-ua":
        '" Not A;Brand";v="99", "Chromium";v="98", "Google Chrome";v="98"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"macOS"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      Referer: "https://trainingcn.coros.com/",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    },
    body:
      '{"account":"' +
      EMAIL +
      '","accountType":2,"pwd":"' +
      md5(PASSWORD) +
      '"}',
    method: "POST",
  })
    .then((response) => response.json())
    .then((res) => res.data.accessToken)
    .then((token) => {
      const fetchParams = {
        headers: {
          accept: "application/json, text/plain, */*",
          "accept-language": "zh-CN,zh;q=0.9",
          accesstoken: token,
          "cache-control": "no-cache",
          pragma: "no-cache",
          "sec-ch-ua":
            '" Not A;Brand";v="99", "Chromium";v="98", "Google Chrome";v="98"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"macOS"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site",
          Referer: "https://trainingcn.coros.com/",
          "Referrer-Policy": "strict-origin-when-cross-origin",
        },
        body: undefined,
        method: "GET",
      };
      return Promise.all([
        fetch(
          "https://teamcnapi.coros.com/activity/query?size=20&pageNumber=1&modeList=",
          fetchParams
        ),
        fetch("https://teamcnapi.coros.com/analyse/query", fetchParams),
      ]);
    })
    .then(([activityResponse, analyseResponse]) =>
      Promise.all([activityResponse.json(), analyseResponse.json()])
    )
    .then(
      (
        allData: [
          {
            data: {
              dataList: {
                startTime: number;
                name: string;
                distance: number;
                avgSpeed: number;
                totalTime: number;
                device: string;
                imageUrl: string;
              }[];
            };
          },
          {
            data: {
              sportStatistic: {
                avgHeartRate: number;
                count: number;
                distance: number;
                duration: number;
                sportType: number;
                trainingLoad: number;
              }[];
            };
          }
        ]
      ) => {
        const [
          {
            data: { dataList: activityList },
          },
          {
            data: { sportStatistic: analyseList },
          },
        ] = allData;

        const data = activityList.map((item) => ({
          time: item.startTime * 1000,
          title: item.name, // 标题
          formattedTitle: formatTitle(item.name), // 标题
          distance: (item.distance / 1000).toFixed(1) + "km", // 距离
          pace: dayjs(item.avgSpeed * 1000).format("mm'ss''"), // 配速
          totalTime: dayjs.duration(item.totalTime * 1000).format("HH:mm:ss"), // 时长
          device: item.device, // 设备
          imageUrl: item.imageUrl, // 图片
        }));

        const recentData = data
          .filter(
            // 暂时不过滤
            ({ time }) => new Date().getTime() - time < RANGE_TIME || true
          )
          .map((data) => ({
            ...data,
            relativeTime: dayjs().from(dayjs(data.time)),
          }))
          .slice(0, RECENT_DATA_LENGTH);

        const analyseData = analyseList.find((_) => _.sportType === 65535);

        console.log("data: \n", recentData, "\n analyseData: \n", analyseData);

        renderCard(recentData, analyseData);
        // renderMarkdown(recentData);
      }
    );
})();

async function renderCard(activities: Activities, summaryData?: Summary) {
  if (!summaryData) return;
  const card = new Card();
  await card.drawActivities(activities);
  await card.drawSummary(summaryData);
  const output_path = path.resolve(OUTPUT_DIR, "card.svg");
  !fs.existsSync(OUTPUT_DIR) && fs.mkdirSync(OUTPUT_DIR);
  fs.writeFileSync(output_path, card.toString());
}
function renderMarkdown(
  data: {
    relativeTime: string;
    time: number;
    title: string;
    formattedTitle: string;
    distance: string;
    pace: string;
    totalTime: string;
    device: string;
    imageUrl: string;
  }[]
) {
  if (isDEV) return;

  const markdownPath = path.resolve(__dirname, "../", "../", MARKDOWN_FILE);
  const markdownContent = fs.readFileSync(markdownPath, "utf-8");
  const markdownContentArray = markdownContent.split("\n");
  const startIndex = markdownContentArray.findIndex((line) =>
    line.startsWith("<!-- coros-box start -->")
  );
  const endIndex = markdownContentArray.findIndex((line) =>
    line.startsWith("<!-- coros-box end -->")
  );

  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    const prepareData = ["🏃最近运动", "```text", "```"];

    data.forEach((item) => {
      prepareData.splice(
        prepareData.length - 1,
        0,
        `${item.formattedTitle
          .replace(" ", " ")
          .padEnd(15, " ")}${item.distance.padEnd(
          12,
          " "
        )}🕘 ${item.totalTime.padEnd(17, " ")}${item.relativeTime} `
      );
    });
    if (prepareData.length === 3) {
      prepareData.splice(2, 0, "这个人有点懒~");
    }
    prepareData.push(
      "<!-- Powered by https://github.com/summerscar/coros-box . -->"
    );

    markdownContentArray.splice(startIndex + 1, endIndex - startIndex - 1);
    markdownContentArray.splice(startIndex + 1, 0, ...prepareData);
    fs.writeFileSync(markdownPath, markdownContentArray.join("\n"), {
      flag: "w",
      encoding: "utf-8",
    });
  }
}

function formatTitle(title: string) {
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
