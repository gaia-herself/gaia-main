async function runFurniture(page) {
  function parseDollars(text) {
    text = text.toLowerCase().replace(',', '').trim();
    if (text.endsWith('k')) return parseFloat(text) * 1000;
    if (text.endsWith('m')) return parseFloat(text) * 1_000_000;
    return parseFloat(text);
  }

  const ITEM_PRICE = 260;
  const MAX_CART_ITEMS = 100;

  while (true) {
    console.log('🛒 Navigating to cart page...');
    await page.goto('https://v3.g.ladypopular.com/mall/cart.php?action=loadMallContent');
    await page.waitForLoadState('networkidle');

    // 💰 Check if we have enough dollars
    const dollarText = await page.locator('#player-dollars').innerText();
    const dollars = parseDollars(dollarText);
    console.log(`💰 Current dollars: ${dollars}`);
    if (dollars < ITEM_PRICE * MAX_CART_ITEMS) {
      console.log('💸 Dollars below threshold. Stopping furniture loop.');
      break;
    }

    // 🛍️ Add items to cart — fire each request only after the previous one confirms success.
    // No artificial delay: the request round-trip itself is the natural pacing.
    console.log(`📦 Adding ${MAX_CART_ITEMS} items to cart...`);
    let addedCount = 0;
    for (let i = 0; i < MAX_CART_ITEMS; i++) {
      const response = await page.request.post('https://v3.g.ladypopular.com/ajax/mall/cart.php', {
        form: {
          action: 'addToCart',
          mallType: '3',
          itemId: '726',
          itemCategoryId: '19',
          itemCollectionId: '19',
          itemColor: '1',
          pageNum: '1',
          collectionsPage: 'false',
          orderBy: 'id',
          orderType: 'desc'
        }
      });

      let json;
      try {
        json = await response.json();
      } catch (err) {
        console.warn(`⚠️ Failed to parse response for item ${i + 1}:`, err.message);
        break;
      }

      if (json?.status !== 1) {
        console.warn(`⚠️ Failed to add item ${i + 1}: ${json?.message || 'unknown error'}`);
        break;
      }

      addedCount++;
      // Loop immediately moves to the next iteration — next request only fires
      // because this one already resolved successfully above.
    }

    if (addedCount === 0) {
      console.warn('⚠️ No items were added this cycle. Stopping.');
      break;
    }
    console.log(`✅ Added ${addedCount} item(s) to cart.`);

    // 🧾 Buy items directly via the internal checkout API — no UI click, no waiting for a button.
    console.log('🪙 Sending checkout request...');
    let buySuccess = false;
    try {
      const buyResponse = await page.request.post('https://v3.g.ladypopular.com/ajax/mall/cart.php', {
        form: {
          action: 'checkoutCart',
          collectionsPage: 'false'
        }
      });
      const buyJson = await buyResponse.json();
      buySuccess = buyJson?.status === 1;
    } catch (err) {
      console.error('❌ Checkout request failed:', err.message);
      buySuccess = false;
    }

    console.log(buySuccess ? '✅ Buying success.' : '❌ Buying failed.');

    if (!buySuccess) {
      break;
    }
  }

  console.log('🏁 Furniture automation complete.');
}

module.exports = runFurniture;
