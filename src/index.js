const axios = require('axios')
const cheerio = require('cheerio')
const dayjs = require('dayjs')
require('dotenv').config()

// const relativeTime = require('dayjs/plugin/relativeTime')
// require('dayjs/locale/zh-cn')

// dayjs.locale('zh-cn')
// dayjs.extend(relativeTime)

const RANGE = 7  // 最近7天
const RANGE_TIME = 1000 * 60 * 60 * 24 * RANGE
const API_URL = 'https://www.coros.com/web/webdata/datalist.html'
const COOKIE = process.env.COOKIE

if (!COOKIE) throw Error('set cookie env first!')

;(async () => {
    const res = await axios.get(API_URL, { headers: { cookie: COOKIE } })
    // console.log(res.data)
    const $ = cheerio.load(res.data);

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
        .filter(({time}) => {
            return new Date().getTime() - new Date(dayjs(time).toISOString()).getTime() < RANGE_TIME
        })
        // .map(data => ({ ...data, time: dayjs().from(dayjs(data.time))}))
    console.log(recenetData)
})();
