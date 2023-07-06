const puppeteer = require("puppeteer");
require("dotenv").config();
const axios = require("axios");
const contains = require("./contains");


const listChannel = async () => {
    const response = await axios.get("https://pl.youtubers.me/indonesia/all/top-1000-youtube-channels-in-indonesia/en");
    const regex = /<a[^>]*href="([^"]*\/youtuber-stats\/en")[^>]*>([\s\S]*?)<\/a>/g;

    const matches = response.data.match(regex);
    if (matches) {
        const links = matches.map((match) => {
            // console.log(match);
            const textRegex = /<img class="lazy"[^>]*alt="([^"]*)"/;
            const textMatch = match.match(textRegex);
            const text = textMatch ? textMatch[1] : '';
            return text;
        });
        return links.slice(12, 1012);
    }
}
(async () => {
    const listChannels = await listChannel();
    console.log(listChannels);
    var browser = await puppeteer.launch({
        headless: false,
    });

    var page = await browser.newPage();
    await page.goto('https://accounts.google.com');
    page.setDefaultNavigationTimeout(60000);



    await page.type('input[name="identifier"]', contains.EMAIL); // Thay 'your_email_here' bằng địa chỉ email của bạn
    await page.click('#identifierNext');

    // Chờ trang tải xong và nhập mật khẩu
    await page.waitForNavigation();
    await page.waitForSelector('input[name="Passwd"]');
    await page.waitForTimeout(1000);
    await page.type('input[name="Passwd"]', contains.PASSWORD); // Thay 'your_password_here' bằng mật khẩu của bạn
    await page.click('#passwordNext');

    await page.waitForNavigation();

    await page.waitForTimeout(1000);
    await page.close();
    page = await browser.newPage();

    const scan  = listChannels.length;
    console.log(scan);
    let count = 0;
    while (count < scan) {
        await page.goto('https://www.youtube.com/results'+ contains.SERVER + '&search_query=' + listChannels[count] + '%2C+channel');
        // await page.waitForTimeout(1000);
        await page.waitForSelector("#thumbnail");
        try {
            await page.click('button.yt-spec-button-shape-next.yt-spec-button-shape-next--filled.yt-spec-button-shape-next--mono.yt-spec-button-shape-next--size-m');
        } catch (error) {
            count++;
            continue;
        }
        count++;
        // await page.waitForTimeout(1000);
    }


})();