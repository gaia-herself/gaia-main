// raise-stats.js
//
// Steps performed by this script:
//
// 1. Open the Duels page.
// 2. Send getStatistics and read the base/practice numbers for
//    Elegance (style), Creativity (creativity), Confidence (devotion),
//    and Grace (beauty). Kindness and Loyalty are ignored.
// 3. Case 1: if ANY of those 4 numbers is < 200 -> STOP. Nothing else
//    is sent.
//    Case 2: if ALL 4 numbers are >= 200 -> pick the stat with the
//    LOWEST base/practice number (random tie-break if there's a tie),
//    then send trainStats for that stat.
//
// Important:
// - getStatistics goes to /ajax/main.php.
// - trainStats goes to /ajax/train.php, amount is always 2000.
// - Playwright's existing logged-in browser session is used.


const DUELS_URL = 'https://v3.g.ladypopular.com/duels.php';
const TRAIN_URL = 'https://v3.g.ladypopular.com/ajax/train.php';
const MAIN_URL = 'https://v3.g.ladypopular.com/ajax/main.php';

// Maps the internal payload key -> friendly display name.
const STAT_LABELS = {
  style: 'Elegance',
  creativity: 'Creativity',
  devotion: 'Confidence',
  beauty: 'Grace'
};

// The 4 stats we care about, in the order we want to check them.
const STAT_KEYS = ['style', 'creativity', 'devotion', 'beauty'];


// ------------------------------------------------------------
// Helper: extract base/practice numbers from getStatistics HTML
// ------------------------------------------------------------
//
// The statsHtml returned by getStatistics repeats a template block
// per stat, each starting with `<li class="player-stat...`. Inside
// each block, the FIRST `<div class="value">NUMBER</div>` found
// after the stat's data-type marker is the base/practice number
// (e.g. 101, 101, 101, 100 in your example).
//
// We split on the `<li class="player-stat` marker and, for each
// resulting chunk, check whether it belongs to one of our 4 tracked
// stats (style / creativity / devotion / beauty), then pull that
// first "value" number out of it.

function extractBaseStatValues(statsHtml) {

  const result = {};

  const blocks = statsHtml.split('<li class="player-stat');

  for (const block of blocks) {

    const typeMatch = block.match(
      /data-type="(style|creativity|devotion|beauty)"\s+id="stat_/
    );

    if (!typeMatch) {
      continue;
    }

    const type = typeMatch[1];

    const valueMatch = block.match(
      /<div class="value">\s*([\d,]+)\s*<\/div>/
    );

    if (valueMatch) {
      result[type] = parseInt(valueMatch[1].replace(/,/g, ''), 10);
    }
  }

  return result;
}


// ------------------------------------------------------------
// Main function
// ------------------------------------------------------------

module.exports = async function runRaiseStats(page) {

  console.log('');
  console.log('────────────────────────────────────────────────────────────────────────────────');
  console.log('⚔️ Starting Duel FP conversion/distribution...');
  console.log('────────────────────────────────────────────────────────────────────────────────');


  // ============================================================
  // STEP 1
  // Open the Duels page
  // ============================================================

  console.log('🌐 Step 1: Opening Duels page...');

  await page.goto(DUELS_URL, {
    waitUntil: 'domcontentloaded'
  });

  console.log('✅ Duels page loaded.');

  // Give the page a little time to finish populating its
  // dynamically loaded elements.
  await page.waitForTimeout(3000);


  // ============================================================
  // STEP 2
  // Send getStatistics and read the base/practice numbers
  // ============================================================

  console.log('');
  console.log('📊 Step 2: Sending getStatistics request...');
  console.log('📦 type=getStatistics');

  let statValues = {};

  try {

    const response = await page.request.post(
      MAIN_URL,
      {
        form: {
          type: 'getStatistics'
        },
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      }
    );

    const responseText = await response.text();

    console.log(
      `📡 getStatistics HTTP status: ${response.status()}`
    );

    if (!response.ok()) {

      throw new Error(
        `getStatistics request returned HTTP ${response.status()}`
      );

    }

    const data = JSON.parse(responseText);

    if (data.status !== 1 || !data.statsHtml) {

      throw new Error(
        `getStatistics returned unexpected data (status=${data.status})`
      );

    }

    statValues = extractBaseStatValues(data.statsHtml);

    console.log('🔎 Base/practice numbers extracted:');

    for (const key of STAT_KEYS) {

      console.log(
        `   ${STAT_LABELS[key]} (${key}): ${statValues[key]}`
      );

    }

  } catch (error) {

    console.log(
      `❌ getStatistics request failed or could not be parsed: ${error.message}`
    );

    console.log(
      '🛑 Cannot evaluate stats. Stopping here.'
    );

    console.log('────────────────────────────────────────────────────────────────────────────────');

    return;

  }


  // ============================================================
  // STEP 3
  // Decide: Case 1 (stop) vs Case 2 (train weakest stat)
  // ============================================================

  console.log('');
  console.log('🧮 Step 3: Evaluating stats...');

  // If any of the 4 tracked values is missing or NaN, treat that
  // as "could not confirm >= 200" and stop, same as Case 1.
  const missingOrInvalid = STAT_KEYS.some(
    (key) => statValues[key] === undefined || isNaN(statValues[key])
  );

  if (missingOrInvalid) {

    console.log(
      '⚠️ One or more stat values could not be read.'
    );

    console.log(
      '🛑 Case 1 (by default): stopping without further steps.'
    );

    console.log('────────────────────────────────────────────────────────────────────────────────');

    return;

  }

  const belowThreshold = STAT_KEYS.filter(
    (key) => statValues[key] < 200
  );

  if (belowThreshold.length > 0) {

    console.log(
      `⚠️ At least one stat is below 200: ${belowThreshold
        .map((key) => `${STAT_LABELS[key]}=${statValues[key]}`)
        .join(', ')}`
    );

    console.log(
      '🛑 Case 1: stopping here without going forward with next steps.'
    );

    console.log('────────────────────────────────────────────────────────────────────────────────');

    return;

  }

  console.log(
    '✅ Case 2: all 4 stats are 200 or greater.'
  );


  // ------------------------------------------------------------
  // Pick the stat with the lowest base/practice number.
  // Random tie-break if 2+ stats share the lowest value.
  // ------------------------------------------------------------

  const minValue = Math.min(
    ...STAT_KEYS.map((key) => statValues[key])
  );

  const lowestKeys = STAT_KEYS.filter(
    (key) => statValues[key] === minValue
  );

  const chosenKey =
    lowestKeys[Math.floor(Math.random() * lowestKeys.length)];

  console.log(
    `🎯 Lowest base/practice value is ${minValue}.`
  );

  if (lowestKeys.length > 1) {

    console.log(
      `🎲 Tie between: ${lowestKeys
        .map((key) => STAT_LABELS[key])
        .join(', ')}. Randomly picked: ${STAT_LABELS[chosenKey]}.`
    );

  } else {

    console.log(
      `🏆 Selected stat: ${STAT_LABELS[chosenKey]} (${chosenKey}).`
    );

  }


  // ============================================================
  // STEP 4
  // Send trainStats for the chosen stat
  // ============================================================

  console.log('');
  console.log(
    `🏋️ Step 4: Sending trainStats for ${STAT_LABELS[chosenKey]} (${chosenKey}) x5...`
  );

  for (let i = 1; i <= 1; i++) {

    console.log(`➡️ trainStats request ${i}/1 for ${chosenKey}...`);

    try {

      const response = await page.request.post(
        TRAIN_URL,
        {
          form: {
            type: 'trainStats',
            popularityType: chosenKey,
            practiceType: 'fp',
            amount: '2000'
          },
          headers: {
            'X-Requested-With': 'XMLHttpRequest'
          }
        }
      );

      const responseText = await response.text();

      console.log(
        `📡 trainStats (${i}/1) HTTP status: ${response.status()}`
      );

      console.log(
        `📨 trainStats (${i}/1) response: ${responseText}`
      );

      if (!response.ok()) {

        throw new Error(
          `trainStats request returned HTTP ${response.status()}`
        );

      }

      try {

        const data = JSON.parse(responseText);

        if (data.status === 1) {

          console.log(
            `✅ trainStats (${i}/1) succeeded: ${data.message || ''}`
          );

        } else {

          console.log(
            `⚠️ trainStats (${i}/1) returned status: ${data.status}`
          );

        }

      } catch {

        console.log(
          `⚠️ Could not parse trainStats (${i}/1) response as JSON.`
        );

      }

    } catch (error) {

      console.log(
        `❌ trainStats request ${i}/1 failed: ${error.message}`
      );

      // One failed rep shouldn't stop the remaining reps.
      continue;

    }

  }


  // ============================================================
  // FINISHED
  // ============================================================

  console.log('');
  console.log('✅ Duel FP conversion/distribution completed.');
  console.log('────────────────────────────────────────────────────────────────────────────────');
};
