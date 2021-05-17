const axios = require('axios')
const cheerio = require('cheerio')
const dayjs = require('dayjs')
const fs = require('fs')
const path = require('path')
require('dotenv').config()

const relativeTime = require('dayjs/plugin/relativeTime')
require('dayjs/locale/zh-cn')

dayjs.locale('zh-cn')
dayjs.extend(relativeTime)

const RANGE = 7  // 最近7天
const RANGE_TIME = 1000 * 60 * 60 * 24 * RANGE
const RECEND_DATA_LENGTH = 5
const API_URL = 'https://www.coros.com/web/webdata/datalist.html'
const MARKDOWN_FILE = 'README.md';
const COOKIE = process.env.COOKIE

if (!COOKIE) throw Error('set cookie env first!')

;(async () => {
    const res = await axios.get(API_URL, { headers: {
        'Cookie': COOKIE,
        "Accept-Language": 'zh-CN,zh;',
        "Referer": 'https://www.coros.com/',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36'
    }})
    const $ = cheerio.load(res.data);
    console.log(res.data, res.config)
    const checkError = $('body').find('ul.data-list-ul').length === 0
    if (checkError) throw Error('未能获取到数据，Cookie 也许过期了')

    const data = $('ul.data-list-ul li.item').toArray().map((el) => {
        const [time, title, distance, pace, device] = $(el).text().trim().split('\n').map(text => text.trim())

        return {
            time,
            title,         // 标题
            distance,      // 距离
            pace,           // 配速
            device         // 设备
        }
    });

    const recenetData = data
        .filter(({time}) => new Date().getTime() - new Date(dayjs(time).toISOString()).getTime() < RANGE_TIME)
        .map(data => ({ ...data, relativeTime: dayjs().from(dayjs(data.time))}))
        .slice(0, RECEND_DATA_LENGTH)

    renderMarkdown(recenetData)
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
            prepareData.splice(2, 0, `${item.title.padEnd(8, ' ')}${item.distance.padEnd(12, ' ')}🕘 ${item.pace.padEnd(17, ' ')}${item.relativeTime} `)
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