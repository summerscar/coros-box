const cheerio = require('cheerio')
const dayjs = require('dayjs')
const fs = require('fs')
const path = require('path')
const fetch = require('node-fetch')
require('dotenv').config()
const relativeTime = require('dayjs/plugin/relativeTime')
require('dayjs/locale/zh-cn')

dayjs.locale('zh-cn')
dayjs.extend(relativeTime)

const RANGE = 7  // 最近7天
const RANGE_TIME = 1000 * 60 * 60 * 24 * RANGE
const RECEND_DATA_LENGTH = 5
const LOGIN_URL = 'https://www.coros.com/web/webdata/login.html'
const MARKDOWN_FILE = 'README.md';
const EMAIL = process.env.EMAIL
const PASSWORD = process.env.PASSWORD

if (!EMAIL || !PASSWORD) throw Error('set EMAIL/PASSWORD env first!')

;(async () => {
    const preLoginRes = await fetch(LOGIN_URL, {
        headers: {
            "Accept-Language": 'zh-CN,zh;',
            "Referer": 'https://www.coros.com/',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36'
        }
    })

    const cookie = preLoginRes.headers.raw()['set-cookie'].map(item => item.split(';')[0]).join(';')
    let $ = cheerio.load(await preLoginRes.text());
    const cncoros = $('form input[name="cncoros"]')[0].attribs.value

    const fetchConfig = {
        "headers": {
            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
            "accept-language": "zh-CN,zh;q=0.9",
            "cache-control": "no-cache",
            "content-type": "application/x-www-form-urlencoded",
            "pragma": "no-cache",
            "sec-ch-ua": "\" Not A;Brand\";v=\"99\", \"Chromium\";v=\"90\", \"Google Chrome\";v=\"90\"",
            "sec-ch-ua-mobile": "?0",
            "sec-fetch-dest": "document",
            "sec-fetch-mode": "navigate",
            "sec-fetch-site": "same-origin",
            "sec-fetch-user": "?1",
            "upgrade-insecure-requests": "1",
            "cookie": cookie
        },
        "referrer": "https://www.coros.com/web/webdata/login.html",
        "referrerPolicy": "strict-origin-when-cross-origin",
        "body": `cncoros=${encodeURIComponent(cncoros)}&data%5Bemail%5D=${encodeURIComponent(EMAIL)}&data%5Bpassword%5D=${encodeURIComponent(PASSWORD)}`,
        "method": "POST",
        "mode": "cors"
    }
    const res = await fetch(LOGIN_URL, fetchConfig);

    $ = cheerio.load(await res.text());

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

    console.log('data: \n', recenetData)
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