import { chromium } from 'playwright';

(async () => {
  console.log("Launching browser...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();
  
  try {
    console.log("Navigating to https://supabase.geneze.online ...");
    await page.goto('https://supabase.geneze.online', { waitUntil: 'networkidle' });
    
    console.log("Taking screenshot of login page...");
    await page.screenshot({ path: 'login_page.png' });
    
    console.log("Trying to fill credentials...");
    // Try to find inputs.
    const inputs = await page.$$('input');
    console.log(`Found ${inputs.length} inputs.`);
    
    if (inputs.length >= 2) {
      await inputs[0].fill('lsbarcaro');
      await inputs[1].fill('@Panaleo0');
      
      const buttons = await page.$$('button');
      for (const btn of buttons) {
        const text = await btn.innerText();
        if (text.toLowerCase().includes('sign in') || text.toLowerCase().includes('login') || text.toLowerCase().includes('entrar')) {
          console.log(`Clicking button: ${text}`);
          await btn.click();
          break;
        }
      }
      
      console.log("Waiting for navigation after login...");
      await page.waitForTimeout(5000); // wait 5 seconds just in case
      await page.screenshot({ path: 'after_login.png' });
      console.log("Saved after_login.png");
    }
    
  } catch (err) {
    console.error("Error during automation:", err);
  } finally {
    await browser.close();
  }
})();
