const puppeteer = require("puppeteer-extra");
const fs = require("fs");
const sendMessageToTelegram =require("../utils/sendMessageToTelegram");
require("dotenv").config();
const requestBody = require("./request");
const axios = require("axios");
const moment = require("moment");
const contains = require("./contains");
const getCategory = require("../utils/getCategory");

const writeListVideoId = (listVideoId) => {
    fs.writeFileSync(__dirname+"/listId.txt", listVideoId, (err) => {
        if (err) {
            console.error(err);
            return;
        }
    });
};
const writeFileJSON = (text) => {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, "0");
    const day = String(currentDate.getDate()).padStart(2, "0");

    const formattedDate =__dirname+ `/data/${year}-${month}-${day}.json`;
    fs.writeFileSync(formattedDate, JSON.stringify(text, null, 4), (err) => {
        if (err) {
            console.error(err);
            return;
        }
    });
};
const readFileListJSONVideos = () => {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, "0");
    const day = String(currentDate.getDate()).padStart(2, "0");

    const formattedDate =__dirname+ `/data/${year}-${month}-${day}.json`;
    return new Promise((resolve, reject) => {
        fs.readFile(formattedDate, "utf8", (err, data) => {
            if (err) {
                console.error(err);
                resolve([]);
                return;
            }

            const jsonData = JSON.parse(data);
            resolve(jsonData);
        });
    });
};
const readFileListVideoId = () => {
    return new Promise((resolve, reject) => {
        fs.readFile(__dirname+"/listId.txt", "utf8", (err, data) => {
            if (err) {
                resolve([]);
                return;
            }
            const listVideoId = data.split(",")?.filter((item) => item !== "");
            resolve(listVideoId);
        });
    });
};
const getNumberFromComment = (text) => {
    const numberString = text.replace(/\,/g, "").split(" ")[1];
    const number = parseInt(numberString, 10);
    return number;
};
const convertDate = (text) => {
    const monthsMap = {
        "ม.ค.": "01",
        "ก.พ.": "02",
        "มี.ค.": "03",
        "เม.ย.": "04",
        "พ.ค.": "05",
        "มิ.ย.": "06",
        "ก.ค.": "07",
        "ส.ค.": "08",
        "ก.ย.": "09",
        "ต.ค.": "10",
        "พ.ย.": "11",
        "ธ.ค.": "12",
    };
    const dateParts = text.split(" ");
    const day = dateParts[0];
    const month = monthsMap[dateParts[1]];
    const year = dateParts[2];
    const formattedDate = `${day}-${month}-${year}`;
    const timestamp = moment(formattedDate, "D-M-YYYY").valueOf();
    return timestamp;
};
const getNumberFromView = (text) => {
    const numberString = text.replace(/\,/g, "").split(" ")[1];
    // Chuyển chuỗi số thành số nguyên
    const number = parseInt(numberString, 10);

    return number;
};
const checkVerified = async (link) => {
    try {
        const res = await axios.get("https://www.youtube.com/" + link);
        const regex = /BADGE_STYLE_TYPE_VERIFIED*/g;
        const matches = res.data.match(regex);
        if (matches) {
            return true;
        } else {
            return false;
        }
    } catch (error) {
        return false;
    }
};

const detectLanguage = async (text) => {
    const cld3 = await import('cld3');
    // models dau tao bo ngon ngu thu 2 ra
    const result = cld3.getLanguage(text)?.filter((i) =>  i?.language == 'th');
    // console.log(cld3.getLanguage(text));
    if (!result?.length == 0)
        return true;
    return false;
};

const getShortVideoById = async (videoId) => {
    try {
        const req = requestBody(videoId);
        const res = await axios.post(
            "https://www.youtube.com/youtubei/v1/reel/reel_item_watch?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8&prettyPrint=true",
            req
        );
        const likeCount =
            res.data.overlay.reelPlayerOverlayRenderer?.likeButton.likeButtonRenderer
                .likeCount;
        const commentCount = getNumberFromComment(
            res.data.overlay.reelPlayerOverlayRenderer?.viewCommentsButton
                .buttonRenderer.accessibility.label
        );
        const linkThumbnail = `https://i.ytimg.com/vi/${videoId}/hq2.jpg`;

        const viewCount = getNumberFromView(
            res.data.engagementPanels[1].engagementPanelSectionListRenderer.content
                .structuredDescriptionContentRenderer.items[0]
                .videoDescriptionHeaderRenderer.views.simpleText
        );
        const title =
            res.data.engagementPanels[1].engagementPanelSectionListRenderer.content
                .structuredDescriptionContentRenderer.items[0]
                .videoDescriptionHeaderRenderer.title.runs[0].text;
        const publishDate = convertDate(
            res.data.engagementPanels[1].engagementPanelSectionListRenderer.content
                .structuredDescriptionContentRenderer.items[0]
                .videoDescriptionHeaderRenderer.publishDate.simpleText
        );
        const username =
            res.data.engagementPanels[1].engagementPanelSectionListRenderer.content
                .structuredDescriptionContentRenderer.items[0]
                .videoDescriptionHeaderRenderer.channel.simpleText;

        const avatar =
            res.data.overlay.reelPlayerOverlayRenderer?.reelPlayerHeaderSupportedRenderers
                .reelPlayerHeaderRenderer
                .channelThumbnail?.thumbnails[2].url;
        const channel = res.data.overlay.reelPlayerOverlayRenderer?.reelPlayerHeaderSupportedRenderers.reelPlayerHeaderRenderer
            .channelTitleText?.runs[0].text;
     
        const origin_link = "https://www.youtube.com/shorts/" + videoId;
        let verified, lang, category;
        await Promise.all([
            verified = await checkVerified(channel),
            lang = await detectLanguage(title),
            category = await getCategory(origin_link)]);
        return {
            title: title,
            id: videoId,
            img: [],
            avatar,
            created_at: publishDate,
            video: [
                {
                    link: 2,
                    thumbnail: linkThumbnail,
                },
            ],
            likeCount,
            viewCount,
            commentCount,
            username,
            verified,
            origin_link,
            lang,
            category,
        };
    } catch (error) {
        console.log("Error:", error);
        sendMessageToTelegram(`có lỗi khi scan ${__dirname.split("/")[5]}`);
        return {
            video: [
                {
                    thumbnail: undefined,
                },
            ],
        };
    }
};

const scan = async () => {
    try {

        sendMessageToTelegram(`bat dau scan ${__dirname.split("/")[5]} sl: ${contains.SCANS}`);

        const startTime = performance.now();
        const StealthPlugin = require('puppeteer-extra-plugin-stealth')
        puppeteer.use(StealthPlugin())
        var browser = await puppeteer.launch({
            headless: false,
            args: ['--lang=th-TH'],
        });

        var page = await browser.newPage();
        await page.goto('https://accounts.google.com');

        page.setDefaultNavigationTimeout(60000);
        // Điền thông tin đăng nhập vào các trường input
        await page.type('input[name="identifier"]', contains.EMAIL); // Thay 'your_email_here' bằng địa chỉ email của bạn
        await page.click('#identifierNext');
        // return;

        // Chờ trang tải xong và nhập mật khẩu
        await page.waitForNavigation();
        await page.waitForSelector('input[name="Passwd"]');
        await page.waitForTimeout(1000);
        await page.type('input[name="Passwd"]', contains.PASSWORD); // Thay 'your_password_here' bằng mật khẩu của bạn
        await page.click('#passwordNext');

        await page.waitForNavigation();
        await page.close();
        page = await browser.newPage();
        await page.goto("https://www.youtube.com/shorts/" + contains.SERVER);
        await page.waitForTimeout(1000);
        await page.waitForSelector("#thumbnail");

        let listVideoId = await readFileListVideoId();
        let fileJson = await readFileListJSONVideos();
        console.log(listVideoId.length);
        let count = 0;
        let countReset = 0;
        while (count < contains.SCANS ) {
            if (countReset == 30) {
                countReset = 0;
                await page.goto("https://www.youtube.com/shorts/" + contains.SERVER);
                await page.waitForTimeout(1000);
                await page.waitForSelector("#thumbnail");
            }
            if (count % 10 == 0) {
                writeFileJSON(fileJson);
                writeListVideoId(listVideoId.toString());
            }
            await page.keyboard.press("ArrowDown");
            await page.waitForSelector("#thumbnail");
            await page.waitForTimeout(1000);

            const videoURL = await page.url();
            const videoID = videoURL.split("/").pop();

            if (!listVideoId.includes(videoID)) {
                const video = await getShortVideoById(videoID);
                if (video.lang) {                   
                    // use click like
                    await page.evaluate(() => {
                        const reelVideo = document.querySelector('ytd-reel-video-renderer.reel-video-in-sequence[is-active=""]');
                        const toggleButton = reelVideo.querySelector('ytd-toggle-button-renderer#like-button');
                        if (toggleButton) {
                            const button = toggleButton.querySelector('button.yt-spec-button-shape-next.yt-spec-button-shape-next--tonal.yt-spec-button-shape-next--mono.yt-spec-button-shape-next--size-l.yt-spec-button-shape-next--icon-button');
                            if (button) {
                                button.click();
                            }
                        }
                    });

                    // use click sub
                    page.evaluate(() => {
                        const reelVideo = document.querySelector('ytd-reel-video-renderer.reel-video-in-sequence[is-active=""]');
                        const button = reelVideo.querySelector('button.yt-spec-button-shape-next.yt-spec-button-shape-next--filled.yt-spec-button-shape-next--overlay.yt-spec-button-shape-next--size-m');
                        if (button) {
                            button.click();
                        }
                    });
                    video.video[0].link = "https://www.youtube.com/watch?v=" + videoID;
                    listVideoId.push(videoID);
                    fileJson.push(video);
                    console.log(video);
                    count++;
                    countReset = 0;
                    
                    await page.waitForTimeout(1000);
                    continue;
                }
            }
            countReset++;
            await page.waitForTimeout(500);
            console.log("next");
        }
        writeFileJSON(fileJson);
        writeListVideoId(listVideoId.toString());
        await browser.close();

        const endTime = performance.now();
        const executionTime = (endTime - startTime) / 1000;
        console.log(executionTime);
    sendMessageToTelegram(`scan ${__dirname.split("/")[5]} xong  ${executionTime}`);


    } catch (error) {
        console.log("Error: ", error);
        await browser.close();
        await scan();
        sendMessageToTelegram(`có lỗi khi scan`);

    }
};


module.exports = scan;















