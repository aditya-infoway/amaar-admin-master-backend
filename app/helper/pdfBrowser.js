const puppeteer = require("puppeteer");

let browserPromise = null;

const launch = () =>
  puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  });

const isAlive = (b) =>
  b && (typeof b.connected === "boolean" ? b.connected : b.isConnected());

// Ek hi browser reuse hoga; crash/close ho jaye to naya launch
const getBrowser = async () => {
  if (browserPromise) {
    try {
      const b = await browserPromise;
      if (isAlive(b)) return b;
    } catch {}
  }
  browserPromise = launch();
  return browserPromise;
};

const htmlToPdf = async (html) => {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    return await page.pdf({ format: "A4", printBackground: true });
  } finally {
    await page.close();
  }
};

const closeBrowser = async () => {
  if (!browserPromise) return;
  try {
    const b = await browserPromise;
    await b.close();
  } catch {}
  browserPromise = null;
};

process.on("SIGINT", async () => { await closeBrowser(); process.exit(0); });
process.on("SIGTERM", async () => { await closeBrowser(); process.exit(0); });

module.exports = { htmlToPdf, getBrowser, closeBrowser };