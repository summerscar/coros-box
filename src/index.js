const cheerio = require('cheerio')
const dayjs = require('dayjs')
const fs = require('fs')
const path = require('path')
const fetch = require('node-fetch')
const md5 = require('js-md5');
require('dotenv').config()
const relativeTime = require('dayjs/plugin/relativeTime')
// require('dayjs/locale/zh-cn')

// dayjs.locale('zh-cn')
dayjs.extend(relativeTime)

const RANGE = 10  // 最近7天
const RANGE_TIME = 1000 * 60 * 60 * 24 * RANGE
const RECEND_DATA_LENGTH = 5
const LOGIN_URL = 'https://www.coros.com/web/reg/login.html'
const MARKDOWN_FILE = 'README.md';
const EMAIL = process.env.EMAIL
const PASSWORD = process.env.PASSWORD

if (!EMAIL || !PASSWORD) throw Error('set EMAIL/PASSWORD env first!')

;(async () => {
    fetch("https://teamcnapi.coros.com/account/login", {
        "headers": {
            "accept": "application/json, text/plain, */*",
            "accept-language": "zh-CN,zh;q=0.9",
            "cache-control": "no-cache",
            "content-type": "application/json;charset=UTF-8",
            "pragma": "no-cache",
            "sec-ch-ua": "\" Not A;Brand\";v=\"99\", \"Chromium\";v=\"98\", \"Google Chrome\";v=\"98\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"macOS\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-site",
            "Referer": "https://trainingcn.coros.com/",
            "Referrer-Policy": "strict-origin-when-cross-origin"
        },
        "body": "{\"account\":\"" + EMAIL + "\",\"accountType\":2,\"pwd\":\"" + md5(PASSWORD) + "\"}",
        "method": "POST"
    })
    .then(response => response.json())
    .then(res => res.data.accessToken)
    .then(token => fetch("https://teamcnapi.coros.com/activity/query?size=20&pageNumber=1&modeList=", {
        "headers": {
          "accept": "application/json, text/plain, */*",
          "accept-language": "zh-CN,zh;q=0.9",
          "accesstoken": token,
          "cache-control": "no-cache",
          "pragma": "no-cache",
          "sec-ch-ua": "\" Not A;Brand\";v=\"99\", \"Chromium\";v=\"98\", \"Google Chrome\";v=\"98\"",
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": "\"macOS\"",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site",
          "Referer": "https://trainingcn.coros.com/",
          "Referrer-Policy": "strict-origin-when-cross-origin"
        },
        "body": null,
        "method": "GET"
      }))
      .then(response => response.json())
      .then(res => res.data.dataList)
      .then(list => {
          const data = list.map(item => ({
            time: item.startTime * 1000,
            title: item.name,         // 标题
            distance: (item.distance / 1000).toFixed(1) + 'km',      // 距离
            pace: dayjs(item.avgSpeed * 1000).format("mm'ss''"),           // 配速
            device: item.device        // 设备
          }))

          const recenetData = data
            .filter(({time}) => new Date().getTime() - time < RANGE_TIME)
            .map(data => ({ ...data, relativeTime: dayjs().from(dayjs(data.time))}))
            .slice(0, RECEND_DATA_LENGTH)

            console.log('data: \n', recenetData)
            renderMarkdown(recenetData)
      })
})();


function renderMarkdown(data) {
    const markdownPath = path.resolve(__dirname, '../', '../', MARKDOWN_FILE)
    const markdownContent = fs.readFileSync(markdownPath, 'utf-8')
    const markdownContentArray = markdownContent.split('\n')
    const startIndex = markdownContentArray.findIndex(line => line.startsWith('<!-- coros-box start -->'))
    const endIndex = markdownContentArray.findIndex(line => line.startsWith('<!-- coros-box end -->'))

    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {

        const prepareData = ['🏃最近运动', '```text', '```']

        data.forEach(item => {
            prepareData.splice(prepareData.length - 1, 0, `${formatTitle(item.title).padEnd(15, ' ')}${item.distance.padEnd(12, ' ')}🕘 ${item.pace.padEnd(17, ' ')}${item.relativeTime} `)
        })
        if (prepareData.length === 3) {
            prepareData.splice(2, 0, '这个人有点懒~')
        }
        prepareData.push('<!-- Powered by https://github.com/summerscar/coros-box . -->')

        markdownContentArray.splice(startIndex + 1, endIndex - startIndex - 1)
        markdownContentArray.splice(startIndex + 1, 0, ...prepareData)
        fs.writeFileSync(markdownPath, markdownContentArray.join('\n'), { flag: 'w', encoding: 'utf-8' })
    }
}

function formatTitle (title) {
    if (title.includes("跑步")) {
      return `🏃${title}`;
    }
    if (title.includes("骑行")) {
      return `🚴${title}`;
    }
    switch (title) {
        case 'Open Water':
        case 'Pool Swim':
            return `🏊${title}`
        case 'Run':
            return `🏃${title}`
        case 'Bike':
            return `🚴${title}`
        default:
            return title
    }
}
