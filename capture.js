const puppeteer = require('puppeteer');

(async () => {
  try {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({ 
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1080 });
    
    console.log('Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 30000 });
    
    // Wait for data to load
    console.log('Waiting for charts and data to render...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const screenshotPath = '/Users/wukexin/.gemini/antigravity-ide/brain/00e1687f-26cf-4a5b-b805-923ec6f0c957/dashboard_review.png';
    await page.screenshot({ path: screenshotPath, fullPage: true });
    
    console.log('Screenshot saved to: ' + screenshotPath);
    await browser.close();
  } catch (err) {
    console.error('Error taking screenshot:', err);
    process.exit(1);
  }
})();
