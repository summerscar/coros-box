/* https://github.com/vn7n24fzkq/github-profile-summary-cards/blob/main/src/const/theme.ts */

import * as d3 from "d3";
import { JSDOM } from "jsdom";
import { CARD_BG_COLOR, FONT_COLOR, MAX_ACTIVITIES } from "../config";
import { COROS_ICON } from "./icon";
import { Activities, Activity, Summary } from "../global";
import duration from "dayjs/plugin/duration";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import dayjs from "dayjs";

dayjs.extend(duration);
dayjs.extend(timezone);
dayjs.extend(utc);

export class Card {
  title: string;
  width: number;
  height: number;
  xPadding: number;
  yPadding: number;
  body: d3.Selection<d3.ContainerElement, any, null, undefined>;
  svg: d3.Selection<SVGSVGElement, any, null, undefined>;
  constructor(
    title = "COROS",
    width = 700,
    height = 400,
    xPadding = 30,
    yPadding = 40
  ) {
    this.title = title;
    this.width = width;
    this.height = height;
    this.xPadding = xPadding;
    this.yPadding = yPadding;
    // use fake dom let us can get html element
    const fakeDom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
    this.body = d3.select(fakeDom.window.document).select("body");
    this.svg = this.body
      .append("div")
      .attr("class", "container")
      .append("svg")
      .attr("xmlns", "http://www.w3.org/2000/svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${this.width} ${this.height}`);
    this.svg.append("style").html(
      `* {
          font-family: 'Segoe UI', Ubuntu, "Helvetica Neue", Sans-Serif
        }`
    );
    const strokeWidth = 1;
    this.svg
      .append("rect")
      .attr("x", 1)
      .attr("y", 1)
      .attr("rx", 10)
      .attr("ry", 10)
      // 100% - 2px to show borderline
      .attr("height", `${((height - 2 * strokeWidth) / height) * 100}%`)
      // 100% - 2px to show borderline
      .attr("width", `${((width - 2 * strokeWidth) / width) * 100}%`)
      .attr("stroke", "1px solid")
      .attr("stroke-width", strokeWidth)
      .attr("fill", CARD_BG_COLOR)
      .attr("stroke-opacity", "0.5");

    this.svg
      .append("text")
      .attr("x", 450)
      .attr("y", this.yPadding + 16)
      .style("font-size", `12px`)
      .style("fill", FONT_COLOR)
      .text(
        "Last Updated on " +
          dayjs().tz("Asia/Shanghai").format("YYYY-MM-DD HH:mm:ss")
      );

    const isEmptyTitle = this.title == "";
    if (!isEmptyTitle) {
      this.svg
        .append("text")
        .attr("x", this.xPadding + 50)
        .attr("y", this.yPadding + 16)
        .style("font-size", `22px`)
        .style("fill", FONT_COLOR)
        .text(this.title);
    }

    // draw icon
    const panel = this.svg.append("g").attr("transform", `translate(20,20)`);
    panel.append("g").attr("transform", `scale(0.05)`).html(COROS_ICON);
  }

  async drawActivities(activities: Activities) {
    activities = activities.slice(0, MAX_ACTIVITIES);
    const labelHeight = 16;
    const lineHeightOffset = 3.7;
    for (let active of activities) {
      if (active.imageUrl) {
        // fetch image from url and convert to base64
        const response = await fetch(active.imageUrl);
        const blob = await response.blob();
        const { type: fileType } = blob;

        const arrayBuffer = await blob.arrayBuffer();
        const myBuffer = Buffer.from(arrayBuffer);
        const base64 = myBuffer.toString("base64");
        const base64DataURL = `data:${fileType};base64,${base64}`;

        active.imageData = base64DataURL;
      }
    }

    // map image
    const mapG = this.svg.append<SVGSVGElement>("g");
    mapG
      .attr("transform", "translate(0, 100)")
      .selectAll(null)
      .data(activities)
      .enter()
      .append("image")
      .attr("clip-path", (_, index) => `url(#clip${index})`)
      .attr("xlink:href", (d) => {
        return d.imageData || "";
      })
      .attr("x", this.xPadding)
      .attr("y", (_, index) => {
        mapG
          .append("defs")
          .attr("xmlns", "http://www.w3.org/2000/svg")
          .html(
            `<rect id="rect${index}" x="${this.xPadding}" y="${
              labelHeight * index * lineHeightOffset
            }" width="38.4" height="38.4" rx="4" ry="4"/><clipPath id="clip${index}"><use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#rect${index}"/></clipPath>`
          );

        return labelHeight * index * lineHeightOffset;
      })
      .attr("width", labelHeight * 2.4)
      .attr("height", labelHeight * 2.4);

    // title
    const titleKeyArray: { key: keyof Activity; offset: number }[] = [
      { key: "formattedTitle", offset: 0 },
      { key: "distance", offset: 80 },
      { key: "totalTime", offset: 160 },
      { key: "time", offset: 250 },
    ];

    titleKeyArray.forEach((keyItemConfig) => {
      this.svg
        .append<SVGSVGElement>("g")
        .attr("transform", `translate(${75 + keyItemConfig.offset}, 125)`)
        .selectAll(null)
        .data(activities)
        .enter()
        .append("text")
        .text((d) => {
          if (keyItemConfig.key === "time")
            return dayjs(d[keyItemConfig.key]).format("YYYY-MM-DD");
          return d[keyItemConfig.key] || "";
        })
        .attr("x", 0)
        .attr("y", (d, index) => labelHeight * index * lineHeightOffset)
        .style("fill", FONT_COLOR)
        .style("font-size", `${labelHeight}px`);
    });
  }

  drawSummary(summary: Summary) {
    const titleLabelHeight = 14;
    const labelHeight = 25;
    const unitLabelHeight = 12;

    const createText = (
      g: d3.Selection<SVGGElement, any, null, undefined>,
      text: string,
      x: number,
      y: number,
      font_size: number,
      fill: string
    ) => {
      g.append("text")
        .text(text)
        .attr("x", x)
        .attr("y", y)
        .style("fill", fill)
        .style("font-size", `${font_size}px`);
    };

    const summaryG = this.svg
      .append("g")
      .attr("transform", `translate(450, 165)`);

    createText(summaryG, "训练概要（4周）", 0, -42, 12, FONT_COLOR);
    // 总距离
    createText(summaryG, "总距离", 0, 0, titleLabelHeight, "#00b3ff");
    createText(
      summaryG,
      `${(summary.distance / 1000).toFixed(2)}`,
      0,
      40,
      labelHeight,
      FONT_COLOR
    );
    createText(summaryG, "km", 0, 56, unitLabelHeight, FONT_COLOR);

    // 总时长
    createText(summaryG, "总时长", 100, 0, titleLabelHeight, "#09d7e3");
    createText(
      summaryG,
      `${dayjs.duration(summary.duration * 1000).format("HH:mm:ss")}`,
      100,
      40,
      labelHeight,
      FONT_COLOR
    );
    createText(summaryG, "h:m:s", 100, 56, unitLabelHeight, FONT_COLOR);

    // 总次数
    createText(summaryG, "总次数", 0, 120, titleLabelHeight, "#11b765");
    createText(summaryG, `${summary.count}`, 0, 160, labelHeight, FONT_COLOR);
    createText(summaryG, "次", 0, 176, unitLabelHeight, FONT_COLOR);

    // 心率
    createText(summaryG, "平均心率", 100, 120, titleLabelHeight, "#ff5562");
    createText(
      summaryG,
      `${summary.avgHeartRate}`,
      100,
      160,
      labelHeight,
      FONT_COLOR
    );
    createText(summaryG, "bpm", 100, 176, unitLabelHeight, FONT_COLOR);
  }

  getSVG() {
    return this.svg;
  }

  toString() {
    return this.body.select(".container").html();
  }
}
