require("dotenv").config();
const schedule = require("node-schedule");
const fs = require("fs");
const express = require("express");
const scanTh = require("./bot-youtube-th/scanData");
const scanPhi = require("./bot-youtube-phi/scanData");
const scanFra = require("./bot-youtube-fra/scanData");
const scanUs = require("./bot-youtube-us/scanData");
const scanGer = require("./bot-youtube-ger/scanData");
const scanUk = require("./bot-youtube-uk/scanData");
const scanInd = require("./bot-youtube-ind/scanData");
const scanMalay = require("./bot-youtube-malay/scanData");
const scanAus = require("./bot-youtube-aus/scanData"); // chua
// const scanTw = require("./bot-youtube-tw/scanData"); // chua





const app = express();
const port = parseInt(process.env.PORT || 3000);

//dailyJob 00:01
schedule.scheduleJob("1 0 * * *", async () => {
  scanTh();
  scanInd();
  scanPhi();
  scanAus();
});
// return;
//weeklyJob xoa het du lieu trong listId.txt 22:00
schedule.scheduleJob("0 22 */3 * *", () => {
  fs.writeFileSync("listId.txt", "", (err) => {
    if (err) {
      console.error(err);
      return;
    }
  });
});

const readFileData = async (date, country) => {
  return new Promise((resolve, reject) => {
    fs.readFile("./" + country + "/data/" + date + ".json", "utf8", (err, data) => {
      if (err) {
        console.log(err);
        resolve([]);
      } else {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          resolve([]);
        }
      }
    });
  });
};
const data = async (country) => {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = String(currentDate.getMonth() + 1).padStart(2, "0");
  const day = String(currentDate.getDate()).padStart(2, "0");
  const formattedDate = `${year}-${month}-${day}`;
  return await readFileData(formattedDate, "bot-youtube-" + country);

}
app.get("/api/crawler/youtube-short/:country", async (req, res) => {
  const { country } = req.params;
  const allowedCountries = ['th', 'ger', 'fra', 'us', 'uk', 'phi', 'ind', 'malay', 'aus', 'tw'];
  if (!allowedCountries.includes(country)) {
    return res.status(400).json({
      success: false,
      message: "BAD REQUEST"
    });
  };
  // console.log(await data(country));

  res.json({
    success: true,
    data: await data(country)
  });

});


app.get("/api/data/:filename", async (req, res) => {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = String(currentDate.getMonth() + 1).padStart(2, "0");
  const day = String(currentDate.getDate()).padStart(2, "0");

  const formattedDate = `data/${year}-${month}-${day}.json`;
  const date = req.params.filename | formattedDate;
  const data = await readFileData(date);

  res.json({
    success: true,
    data,
  });
});

app.listen(port, () => {
  console.log(`Server đang lắng nghe tại http://localhost:${port}/api/crawler/youtube-short/th`);
});
