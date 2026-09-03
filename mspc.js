require('dotenv').config();
const { chromium } = require('playwright');

// ⬇️ Import all sub-scripts (exported as functions)..
const DIVIDER = '────────────────────────────────────────────────────────────────────────────────';
const runBurnEnergy = require('./burn-energy.js');
const runClaimRewards = require('./claim-BPrewards.js');
const runFashionMagazine = require('./fashion-magazine.js');
const runTeleportEvent = require('./tele.js');
const runSolitaireEvent = require('./solitaire.js');
const runMapsEvent = require('./maps.js');
const runSlotsEvent = require('./Slots.js');
const runMemoryEvent = require('./memory.js');
const runFurnitureScript = require('./furniture.js');
const runDailyTasks = require('./daily-tasks.js');
const runBoyfriendKiss = require('./bfk.js');
const runGuildShow = require('./guild-show.js');
const runPetTraining = require('./pet-train.js');
const runBridesmaids = require('./bridesmaids.js');
const runParties = require('./parties.js');
const runApartmentAndGifts = require('./apartment-gifts.js');
const runCars = require('./cars.js');
const runRaiseStats = require('./RaiseStats.js');

const scripts = [
  { name: 'Burn Energy', fn: runBurnEnergy, alwaysRun: true },
  { name: 'Claim BP Duel Rewards', fn: runClaimRewards, alwaysRun: false }, //its equally distributing stats, bella doesnt need it
  { name: 'Fashion Magazine', fn: runFashionMagazine, envKey: 'LP_FASHION_MAGAZINE_URL' },
  { name: 'Tele Event', fn: runTeleportEvent, envKey: 'LP_TELEPORT_URL' },
  { name: 'Solitaire Event', fn: runSolitaireEvent, envKey: 'LP_SOLITAIRE_URL' },
  { name: 'Maps Event', fn: runMapsEvent, envKey: 'LP_MAPS_URL' },
  { name: 'Slots Event', fn: runSlotsEvent, envKey: 'LP_SLOTS_URL' },
  { name: 'Parties', fn: runParties, alwaysRun: true},
  { name: 'Memory Event', fn: runMemoryEvent, envKey: 'LP_MEMORY_URL' },
  { name: 'Furniture Script', fn: runFurnitureScript, alwaysRun: true },
  { name: 'Daily Tasks', fn: runDailyTasks, alwaysRun: true },
  { name: 'Boyfriend Kiss', fn: runBoyfriendKiss, alwaysRun: true },
  { name: 'Guild Show', fn: runGuildShow, alwaysRun: true },
  { name: 'Pet Training', fn: runPetTraining, alwaysRun: true },
  { name: 'Bridesmaids Tasks', fn: runBridesmaids, alwaysRun: false },
  { name: 'Apartment + Gifts', fn: runApartmentAndGifts, alwaysRun: true },
  { name: 'Activate Cars', fn: runCars, alwaysRun: true },
  { name: 'Raise stats', fn: runRaiseStats, alwaysRun: true },
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const email = process.env.LP_EMAIL;
  const password = process.env.LP_PASSWORD;

  // ✅ LOGIN
  let loginSuccess = false;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      console.log(`🔐 [Attempt ${attempt}] Opening Lady Popular login page...`);
      await page.goto('https://ladypopular.com', {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });

      console.log("🔎 Waiting for Sign In button...");
      await page.waitForSelector('#login-btn', { timeout: 30000 });
      await page.waitForTimeout(5000);
      await page.click('#login-btn');

      console.log("🔐 Entering credentials...");
      await page.waitForSelector('#login-username-field', { timeout: 10000 });
      await page.fill('#login-username-field', email);
      await page.fill('#loginForm3 > div > label:nth-child(2) > input[type=password]', password);
      await page.waitForTimeout(5000);
      await page.click('#loginSubmit');

      await page.waitForSelector('#header', { timeout: 15000 });
      console.log("🎉 Login successful.");
      loginSuccess = true;
      break;
    } catch (error) {
      console.log(`❌ Login attempt ${attempt} failed: ${error.message}`);
      await page.screenshot({ path: `login-error-${attempt}.png`, fullPage: true });

      if (attempt === 5) {
        console.log("🚫 Max login attempts reached. Aborting.");
        await browser.close();
        return;
      }
    }
  }

  // 🎁 DAILY REWARD COLLECTION
  /* REMOVE THIS IF U WANT LATER
  if (loginSuccess) {
    console.log(DIVIDER);
    console.log("🎁 Starting daily reward collection...");
    console.log("📡 Endpoint: /ajax/daily_rewards.php");
    console.log("🔁 Will attempt dates 1 → 7");

    for (let date = 1; date <= 7; date++) {
      try {
        console.log(`➡️ Sending daily reward request for date = ${date}...`);

        const response = await page.evaluate(async (date) => {
          const res = await fetch('https://v3.g.ladypopular.com/ajax/daily_rewards.php', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'X-Requested-With': 'XMLHttpRequest'
            },
            body: new URLSearchParams({
              type: 'collectSevenDayReward',
              date: date
            }),
            credentials: 'same-origin'
          });

          return await res.json();
        }, date);

        console.log(
          `📦 Date ${date} → status=${response.status}` +
          (response.message ? ` | message="${response.message}"` : '')
        );

        if (response.status === 1) {
          console.log(`🎉 Daily reward successfully collected for date ${date}.`);
          console.log("⛔ Future dates will be locked. Stopping further requests.");
          break;
        }

        await page.waitForTimeout(500);
      } catch (err) {
        console.log(`❌ Daily reward request failed for date ${date}: ${err.message}`);
      }
    }

    console.log("🎁 Daily reward collection block finished.");
    console.log(DIVIDER);
  } */

  // ✅ RUN EACH SCRIPT
  for (const script of scripts) {
    const shouldRun =
      script.alwaysRun || (process.env[script.envKey] && process.env[script.envKey] !== 'OFF');

    if (!shouldRun) {
      console.log(`⏭️ ${script.name} skipped (not active or URL = OFF)`);
      continue;
    }

    console.log(`\n🚀 Starting: ${script.name}`);
    try {
      await script.fn(page);
      console.log(`✅ ${script.name} finished successfully.`);
      console.log(DIVIDER);
    } catch (err) {
      console.log(`❌ ${script.name} failed: ${err.message}`);
      await page.screenshot({ path: `${script.name.replace(/\s+/g, '_')}-error.png`, fullPage: true });
      console.log(DIVIDER);
    }
  }

  await browser.close();
  console.log(`\n🎉 All scripts done. Browser closed.`);
})();
