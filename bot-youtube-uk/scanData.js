const puppeteer = require("puppeteer-extra");
const fs = require("fs");
require("dotenv").config();
const requestBody = require("./request");
const axios = require("axios");
const moment = require("moment");
const sendMessageToTelegram = require("../utils/sendMessageToTelegram");
const contains = require("./contains");
const getCategory = require("../utils/getCategory");

const writeListVideoId = (listVideoId) => {
  fs.writeFileSync(__dirname + "/listId.txt", listVideoId, (err) => {
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

  const formattedDate = __dirname + `/data/${year}-${month}-${day}.json`;
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

  const formattedDate = __dirname + `/data/${year}-${month}-${day}.json`;
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
    fs.readFile(__dirname + "/listId.txt", "utf8", (err, data) => {
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
  //May 19, 2023
  const monthsMap = {
      "January": "01",
      "February": "02",
      "March": "03",
      "April": "04",
      "May": "05",
      "June": "06",
      "July": "07",
      "August": "08",
      "September": "09",
      "October": "10",
      "November": "11",
      "December": "12",
  };
  //[May,19,2023]
  const dateParts = text.replace(/\,/g, "").split(" ");
  const day = dateParts[0];
  const month = monthsMap[dateParts[1]];
  const year = dateParts[2];
  const formattedDate = `${day}-${month}-${year}`;
  const timestamp = moment(formattedDate, "D-M-YYYY").valueOf();
  return timestamp;
};
const getNumberFromView = (text) => {
  //527,444 views
  const numberString = text.replace(/\,/g, "").split(" ")[0];
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
  const result = cld3.getLanguage(text)?.filter((i) => i?.language == 'en' || (i?.language == 'zh' && i?.proportion > 0.8));
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
    sendMessageToTelegram(`có lỗi khi scan ${__dirname.split("/").pop()}`);

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
    sendMessageToTelegram(`bắt đầu scan ${__dirname.split("/").pop()} sl: ${contains.SCANS}`);
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
    while (count < contains.SCANS) {
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
      const videoURL = page.url();
      const videoID = videoURL.split("/").pop();

      if (!listVideoId.includes(videoID)) {
        const video = await getShortVideoById(videoID);
        if (video.lang) {
          video.video[0].link = "https://www.youtube.com/watch?v=" + videoID;
          listVideoId.push(videoID);
          fileJson.push(video);
          console.log(video);
          count++;
          countReset = 0;
          continue;
        }
      }
      countReset++;
      await page.waitForTimeout(1000);
      console.log("next");
    }
    writeFileJSON(fileJson);
    writeListVideoId(listVideoId.toString());
    await browser.close();

    const endTime = performance.now();
    const executionTime = (endTime - startTime) / 1000;
    console.log(executionTime);
    sendMessageToTelegram(`scan ${__dirname.split("/").pop()} xong ${executionTime}`);

  } catch (error) {
    console.log("Error: ", error);
    await browser.close();
    sendMessageToTelegram(`reset scan ${__dirname.split("/").pop()}`);
    await scan();
  }
};
module.exports = scan;
