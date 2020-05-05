// Set timezone.
process.env.TZ = "Europe/Stockholm";

// Initialization of express.
const express = require("express");
const app = express();
app.use(express.urlencoded());
app.use(express.static("res"));

// Other modules and initialization.
const chalk = require("chalk");
const fetch = require("node-fetch");
const jest = require("jest");
const fs = require("fs");

// Function to get information on request.
function reqInfo(t, i) {
  console.log("\n\n");
  console.log(chalk.bold("|============!============|"));
  console.log("[MEMORY]:");
  const proc = process.memoryUsage();
  let procList = 0;
  for (const k in proc) {
    const mb = parseFloat((proc[k] * 0.000001).toFixed(2));
    console.log(`  ${k.toUpperCase()}: ${mb}MB`);
    procList += mb;
  }
  console.log(`  TOTAL: ${procList.toFixed(2)}MB`);
  console.log(chalk.bold("|============!============|"));
  console.log("[PINGED]:");
  console.log(`  PINGED: ${new Date().toLocaleString()}`);
  if (typeof i === "string" && typeof t === "string") {
    console.log(chalk.bold("|============!============|"));
    console.log(`[${t.toUpperCase()}]:`);
    console.log(`  MESSAGE: ${i}`);
  }
  console.log(chalk.bold("|============!============|"));
  console.log("\n\n");
}

// Page to show when you enter video details.
app.get("/", (req, res) => {
  reqInfo();
  res
    .header("X-Method", "GET")
    .status(200)
    .sendFile(`${__dirname}/views/index.html`);
});

// Page to show off when you request a video download.
app.post("/", (req, res) => {
  reqInfo();
  res.header("X-Method", "POST");
  if (!req.body.m || req.body.m.length <= 0) {
    res
      .header("Content-Type", "plain/text")
      .status(403)
      .send("403: Missing format.")
      .end();
  } else if (!req.body.v || req.body.v.length <= 0) {
    res
      .header("Content-Type", "plain/text")
      .status(403)
      .send("403: Missing video URL.")
      .end();
  } else {
    const ytdl = require("ytdl-core");
    const URL = req.body.v;
    const FORMAT = req.body.m.toLowerCase();
    let DATA = {};
    const FORMATS = [
      ["mp3", "wav", "ogg"],
      ["mp4", "flv", "avi", "mov", "wmv"]
    ];
    if (!FORMATS[0].includes(FORMAT) && !FORMATS[1].includes(FORMAT)) {
      res
        .header("Content-Type", "plain/text")
        .status(403)
        .send("403: Invalid format passed in request.")
        .end();
    }
    ytdl.getInfo(URL).then(data => {
      DATA = data;
      //console.log(data);
    });
    setTimeout(function() {
      function extractID() {
        return DATA.video_id;
      }
      function tooLong() {
        return parseInt(DATA.length_seconds) > 3600;
      }
      if (ytdl.validateURL(URL)) {
        if (extractID()) {
          try {
            if (tooLong()) {
              res
                .header("Content-Type", "plain/text")
                .status(403)
                .send("403: Video may not exceed 1 hour.")
                .end();
              return;
            }
            const opts = FORMATS[0].includes(FORMAT)
              ? { filter: "audioonly" }
              : { format: FORMAT };
            res
              .header(
                "Content-Disposition",
                'attachment;filename="' +
                  `${extractID()}_${Math.floor(Date.now() / 1000)}.${FORMAT}` +
                  '"'
              )
              .status(200);
            const stream = ytdl(URL, opts);
            reqInfo(
              "VIDEOCONVERSION",
              `Successful video conversion of "${URL}", using format "${FORMAT}".`
            );
            stream.pipe(res);
          } catch (e) {
            res
              .header("Content-Type", "plain/text")
              .status(500)
              .plain("500: An error occured when generating your file.")
              .end();
          }
        } else {
          res
            .header("Content-Type", "plain/text")
            .status(404)
            .plain("404: Video URL could not be located.")
            .end();
        }
      } else {
        res
          .header("Content-Type", "plain/text")
          .status(403)
          .plain("403: Malformed video URL provided.")
          .end();
      }
    }, 3000);
  }
});

app.get("*", function(req, res) {
  reqInfo();
  res
    .status(404)
    .json({ status: 404, message: "Page could not be found!" })
    .end();
});

const listener = app.listen(process.env.PORT, function() {
  console.log("Your app is listening on port " + listener.address().port);
});
