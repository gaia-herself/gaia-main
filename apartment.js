// ================================================================
// 🏠 APARTMENT INCOME
// ================================================================

module.exports = async function runApartment(page) {

  await page.goto(
    'https://v3.g.ladypopular.com/apartment.php',
    {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    }
  );


  try {

    const apartmentResponse = await page.evaluate(async () => {

      const response = await fetch(
        'https://v3.g.ladypopular.com/ajax/apartment.php?type=collectApartmentRent',
        {
          method: 'GET',
          credentials: 'same-origin',
          headers: {
            'X-Requested-With': 'XMLHttpRequest'
          }
        }
      );

      return await response.json();

    });


    if (apartmentResponse && apartmentResponse.status === 1) {

      console.log('💰 Apartment income collected.');

    } else {

      console.log(
        `⚠️ Apartment collection returned status=${apartmentResponse?.status}`
      );

    }

  } catch (error) {

    console.log(`❌ Apartment income failed: ${error.message}`);

    throw error;

  }

};
