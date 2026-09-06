module.exports = async function runBridesmaids(page) {
  // =========================
  // 🔧 CONFIG
  // =========================
  const PARTY_ID = 11465;
  const TARGET_URL =
    `https://v3.g.ladypopular.com/party/center/planning.php?bridesmaid_party_id=${PARTY_ID}`;

  console.log(`👰 Bridesmaids script started`);

  // =========================
  // 🌐 LOAD PAGE
  // =========================
  await page.goto(TARGET_URL, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });

  await page.waitForTimeout(4000);

  // =========================
  // 🔍 DETECT ACTIVE TASK (CONTENT-BASED)
  // =========================
  // const isBouquetTask = await page.$('.shine-box.bouquets'); ---- old detector (not working)
  const isBouquetTask = await page.$('.gb_bouquet');
  const isSouvenirTask = await page.$('.shine-box.souvenirs');

  if (!isBouquetTask && !isSouvenirTask) {
    console.log('⏭️ No bridesmaids task detected. Skipping.');
    return;
  }

  // ==================================================
  // 🌸 TASK 1 — BOUQUETS
  // ==================================================
  if (isBouquetTask) {
    console.log('🌸 Bouquet task detected');

    const bouquetIds = await page.$$eval('.gb_bouquet', els =>
      els.map(el => el.getAttribute('rel')).filter(Boolean)
    );

    if (bouquetIds.length === 0) {
      console.log('✅ No bouquets available to collect.');
      return;
    }

    // As per your rule: ONE request only
    const bouquetId = bouquetIds[0];
    console.log(`🌼 Attempting bouquet ID: ${bouquetId}`);

    const response = await page.evaluate(
      async ({ partyId, bouquetId }) => {
        const res = await fetch(
          'https://v3.g.ladypopular.com/ajax/party/planning/bridesmaids.php',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'X-Requested-With': 'XMLHttpRequest',
            },
            body: new URLSearchParams({
              party_id: partyId,
              action: 'getBouquet',
              bouquet_id: bouquetId,
            }),
            credentials: 'same-origin',
          }
        );
        return res.json();
      },
      { partyId: PARTY_ID, bouquetId }
    );

    if (response.status === 1) {
      console.log(`✅ Bouquet ${bouquetId} collected successfully.`);
    } else {
      console.log(
        `⏳ Bouquet cooldown / error: ${response.message || 'Unknown'}`
      );
    }

    return;
  }

  // ==================================================
  // 🎁 TASK 2 — SOUVENIRS
  // ==================================================
  if (isSouvenirTask) {
    console.log('🎁 Souvenir task detected');

    const hasStartButton = await page.$(
      'button[onclick="startMakingSouvenir()"]'
    );
    const hasFinishButton = await page.$(
      'button[onclick="tryMakingSouvenir()"]'
    );
    const hasProgressBar = await page.$('.progressbar-wrap');

    // ---------------------------
    // STATE 2 — COOLDOWN ACTIVE
    // ---------------------------
    if (hasProgressBar && !hasFinishButton) {
      console.log('⏳ Souvenir is currently in cooldown. Skipping.');
      return;
    }

    // ---------------------------
    // STATE 1 — START MAKING
    // ---------------------------
    if (hasStartButton && !hasFinishButton) {
      console.log('▶️ Starting souvenir...');

      const startRes = await page.evaluate(async partyId => {
        const r = await fetch(
          'https://v3.g.ladypopular.com/ajax/party/planning/bridesmaids.php',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'X-Requested-With': 'XMLHttpRequest',
            },
            body: new URLSearchParams({
              party_id: partyId,
              action: 'startMakingSouvenir',
            }),
            credentials: 'same-origin',
          }
        );
        return r.json();
      }, PARTY_ID);

      if (startRes.status === 1) {
        console.log('✅ Souvenir started successfully.');
      } else {
        console.log('⚠️ Failed to start souvenir.', startRes);
      }

      return;
    }

    // ---------------------------
    // STATE 3 — FINISH + RESTART
    // ---------------------------
    if (hasFinishButton) {
      console.log('🏁 Finishing souvenir...');

      const finishRes = await page.evaluate(async partyId => {
        const r = await fetch(
          'https://v3.g.ladypopular.com/ajax/party/planning/bridesmaids.php',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'X-Requested-With': 'XMLHttpRequest',
            },
            body: new URLSearchParams({
              party_id: partyId,
              action: 'tryMakingSouvenir',
            }),
            credentials: 'same-origin',
          }
        );
        return r.json();
      }, PARTY_ID);

      if (finishRes.status === 1) {
        console.log('🎉 Souvenir finished successfully.');
      } else {
        console.log('⚠️ Souvenir may be ruined, continuing anyway.');
      }

      console.log('🔄 Starting new souvenir...');

      const startRes = await page.evaluate(async partyId => {
        const r = await fetch(
          'https://v3.g.ladypopular.com/ajax/party/planning/bridesmaids.php',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'X-Requested-With': 'XMLHttpRequest',
            },
            body: new URLSearchParams({
              party_id: partyId,
              action: 'startMakingSouvenir',
            }),
            credentials: 'same-origin',
          }
        );
        return r.json();
      }, PARTY_ID);

      if (startRes.status === 1) {
        console.log('✅ New souvenir started successfully.');
      } else {
        console.log('⚠️ Failed to start new souvenir.', startRes);
      }

      return;
    }

    console.log('❓ Unknown souvenir state detected. Skipping.');
  }
};
