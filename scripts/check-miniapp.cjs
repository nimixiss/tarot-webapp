// Offline structural/syntax validation. No external services or Telegram tokens.
const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const html = fs.readFileSync("index.html", "utf8");
const scriptTags = Array.from(html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi));
const inlineScript = scriptTags.map(match => match[1]).filter(Boolean).join("\n");
assert(inlineScript, "Expected inline Mini App script");
new vm.Script(inlineScript, { filename: "index.html:inline-script" });

const mapMatch = inlineScript.match(/const cardImageMap = \{([\s\S]+?)\};/);
assert(mapMatch, "78-card lookup table missing");
const mappings = Array.from(mapMatch[1].matchAll(/"([^"]+)":\s*"([^"]+\.png)"/g));
assert.equal(mappings.length, 78, "Exactly 78 unique Tarot cards are required");
assert.equal(new Set(mappings.map(x => x[1])).size, 78);
mappings.forEach(([, name, file]) => {
  assert(fs.existsSync("images/" + file), "Missing image for " + name);
});
assert(fs.existsSync("images/rubashka.png"), "Card back image missing");

["one", "two", "three"].forEach(mode => {
  assert(html.includes('data-mode="' + mode + '"'), "Missing mode " + mode);
});
assert(html.includes('<option value="career">'), "Career spread option missing");
assert(html.includes('career: ["Текущая работа", "Шанс другого предложения", "Что принесёт смена"]'),
  "Career layout positions must match backend");
assert(html.includes('src="https://telegram.org/js/telegram-web-app.js"'));
assert(html.includes("tg.sendData(JSON.stringify(payload))"));
assert(html.includes('id="result"'), "In-app reading result screen missing");
assert(html.includes("configuredApiBase + \"/api/readings\""), "Backend fetch missing");
assert(html.includes('"X-Telegram-Init-Data": tg.initData'), "Signed Telegram auth header missing");
assert(html.includes('id="copy-result"'), "Optional copy action missing");
const publicConfig = fs.readFileSync("config.js", "utf8");
assert(!/(BOT_TOKEN|OPENAI_API_KEY|sk-proj-)/i.test(publicConfig), "Secret in public config");
assert(publicConfig.includes("apiBaseUrl"), "API base URL placeholder missing");
assert(!/(OPENAI_API_KEY|BOT_TOKEN|sk-proj-)/i.test(html), "Secret reference in public WebApp");

console.log("Mini App: JS parses, cards and assets present, no embedded secrets.");
