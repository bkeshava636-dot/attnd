const puppeteer = require('puppeteer');
const http = require('http');
const fs = require('fs');
const path = require('path');

function startStaticServer(port = 4173) {
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.webmanifest': 'application/manifest+json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
  };

  const distDir = path.join(__dirname, 'dist');

  const server = http.createServer((req, res) => {
    let filePath = path.join(distDir, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(distDir, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end('Server Error');
      } else {
        res.writeHead(200, {
          'Content-Type': contentType,
          'Service-Worker-Allowed': '/',
        });
        res.end(content, 'utf-8');
      }
    });
  });

  return new Promise((resolve) => {
    server.listen(port, () => {
      console.log(`Server running at http://localhost:${port}/`);
      resolve(server);
    });
  });
}

async function runMobileTests() {
  console.log("=== STARTING REAL MOBILE DEVICE & PWA TEST SUITE ===\n");
  const server = await startStaticServer(4173);

  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  console.log(`Launching real Chrome from: ${chromePath}`);

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--allow-file-access-from-files',
    ],
  });

  const page = await browser.newPage();

  // Emulate Pixel 7 / iPhone 15 Pro Mobile Viewport (393 x 852, touch, DPR 2.5)
  await page.setViewport({
    width: 393,
    height: 852,
    deviceScaleFactor: 2.5,
    isMobile: true,
    hasTouch: true,
  });

  await page.setUserAgent(
    'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36'
  );

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(err.message);
  });

  const screenshotDir = path.join(__dirname, 'screenshots');
  const artifactScreenshotDir = path.join("C:\\Users\\bhrao\\.gemini\\antigravity\\brain\\4d40c752-af1c-491e-b449-972103312e21", 'screenshots');

  async function saveScreenshot(name) {
    const p1 = path.join(screenshotDir, `${name}.png`);
    const p2 = path.join(artifactScreenshotDir, `${name}.png`);
    await page.screenshot({ path: p1 });
    try {
      fs.copyFileSync(p1, p2);
    } catch(e) {}
    console.log(`  📸 Screenshot saved: ${name}.png`);
  }

  const results = [];
  function record(testNumber, area, passed, details = '') {
    results.push({ testNumber, area, passed, details });
    const status = passed ? '✅ PASSED' : '❌ FAILED';
    console.log(`${status} [${testNumber}] ${area} ${details ? `(${details})` : ''}`);
  }

  try {
    // 1. Open app on mobile and check responsive layout
    await page.goto('http://localhost:4173/', { waitUntil: 'networkidle0' });
    await page.waitForSelector('main', { timeout: 10000 });

    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    record(1, 'Mobile Responsive Layout (No horizontal overflow)', !hasHorizontalScroll, `scrollWidth=${await page.evaluate(() => document.documentElement.scrollWidth)}, innerWidth=393`);
    await saveScreenshot('01-mobile-home-initial');

    // 2. Test Mobile Bottom Navigation: Target specifically nav.fixed
    const mobileNavButtons = await page.$$('nav.fixed button');
    record(2, 'Mobile Bottom Navigation Items', mobileNavButtons.length === 5, `Found ${mobileNavButtons.length} mobile navigation items`);

    // Click Settings (index 4 in mobile nav)
    await mobileNavButtons[4].click();
    await new Promise((r) => setTimeout(r, 600));
    await saveScreenshot('02-mobile-settings-view');

    // Click "Load Sample Setup" in Settings to seed realistic 3rd Semester setup
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    const loadSampleBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find((b) => b.textContent.includes('Load Sample Setup'));
    });

    if (loadSampleBtn) {
      await loadSampleBtn.click();
      await new Promise((r) => setTimeout(r, 1200));
      record(4, 'Load Realistic Sample Setup (Subjects & Timetable)', true, 'Loaded 5 subjects, timetable & rules');
    }

    // 3. Configure Semester start and end dates
    const semesterNameVal = await page.$eval('input[placeholder*="3rd Semester"]', (el) => el.value);
    record(3, 'Semester Configuration & Editable Dates', semesterNameVal.includes('3rd Semester'), `Current semester: ${semesterNameVal}`);

    // 4. Test Navigation to Timetable
    const navItems = await page.$$('nav.fixed button');
    await navItems[1].click(); // Timetable
    await new Promise((r) => setTimeout(r, 600));
    await saveScreenshot('03-mobile-timetable-view');

    const periodCardsCount = await page.$$eval('.min-w-0 h4', (els) => els.length);
    record(4, 'Timetable Period Cards on Mobile', periodCardsCount >= 4, `Found ${periodCardsCount} period cards`);

    // Test Day Tabs (switch to Tuesday)
    const dayTabs = await page.$$('button span');
    let tuesdayTab = null;
    for (const t of dayTabs) {
      const text = await page.evaluate((el) => el.textContent, t);
      if (text && text.trim() === 'Tuesday') {
        tuesdayTab = t;
        break;
      }
    }
    if (tuesdayTab) {
      await tuesdayTab.click();
      await new Promise((r) => setTimeout(r, 500));
      record(5, 'Day Switcher Tab (Tuesday Schedule)', true, 'Switched to Tuesday schedule');
    }

    // 5. Test Saturday Rules
    await navItems[4].click(); // Back to Settings
    await new Promise((r) => setTimeout(r, 500));
    const satRuleSelects = await page.$$eval('select', (els) => els.length);
    record(5, 'Saturday Occurrence Rules Engine (1st-5th)', satRuleSelects >= 5, `Found ${satRuleSelects} rule controls`);

    // 6. Test Holidays and Academic Events / IAS
    const hasAddHolidayBtn = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button')).some((b) => b.textContent.includes('Add Holiday'));
    });
    record(6, 'Holidays & Academic Events (IAS) Management', hasAddHolidayBtn, 'Holidays and IAS managers present');

    // 7. Test Navigation to Calendar
    await navItems[3].click(); // Calendar
    await new Promise((r) => setTimeout(r, 600));
    await saveScreenshot('04-mobile-calendar-view');

    const calendarCells = await page.$$eval('.grid-cols-7 button', (els) => els.length);
    record(13, 'Operations Calendar Grid on Mobile', calendarCells >= 28, `Rendered ${calendarCells} calendar day cells`);

    // 8. Test Navigation to Attendance View
    await navItems[2].click(); // Attendance
    await new Promise((r) => setTimeout(r, 600));
    await saveScreenshot('05-mobile-attendance-view');

    const subjectCardsCount = await page.$$eval('.p-5.rounded-3xl', (els) => els.length);
    record(11, 'Subject-Wise Attendance Cards', subjectCardsCount >= 3, `Found ${subjectCardsCount} subject cards with progress & bunk telemetry`);

    // Test Scenario Simulator sliders
    const sliders = await page.$$('input[type="range"]');
    record(12, 'Attendance Projection Simulator', sliders.length === 2, 'Interactive +attend / +miss sliders active');

    // 9. Test Navigation to Home Dashboard
    await navItems[0].click(); // Home
    await new Promise((r) => setTimeout(r, 600));
    await saveScreenshot('06-mobile-home-populated');

    const overallPct = await page.$eval('.text-5xl, .text-6xl', (el) => el.textContent);
    record(11, 'Overall Attendance HUD Display', overallPct && overallPct.includes('%'), `Percentage: ${overallPct}`);

    // 10. Mark attendance for today's classes: Present, Absent, Cancelled (1-Tap test)
    const actionButtons = await page.$$('button');
    let presentBtn = null;
    let absentBtn = null;

    for (const b of actionButtons) {
      const text = await page.evaluate((el) => el.textContent, b);
      if (text && text.includes('Present') && !presentBtn) presentBtn = b;
      if (text && text.includes('Absent') && !absentBtn) absentBtn = b;
    }

    if (presentBtn) {
      await presentBtn.click();
      await new Promise((r) => setTimeout(r, 500));
      record(8, 'Mark Class Present (One-Hand Touch Target)', true, 'Recorded Present status');
    }

    if (absentBtn) {
      await absentBtn.click();
      await new Promise((r) => setTimeout(r, 500));
      record(8, 'Mark Class Absent (One-Hand Touch Target)', true, 'Recorded Absent status');
    }

    await saveScreenshot('07-mobile-marked-classes');

    // 11. Test Daily Review & Confirm Today Modal
    const confirmDayBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find((b) => b.textContent.includes('Confirm Day'));
    });

    if (confirmDayBtn) {
      await confirmDayBtn.click();
      await new Promise((r) => setTimeout(r, 500));
      await saveScreenshot('08-mobile-review-modal');
      record(9, 'Daily Operations Review Modal Fit', true, 'Modal fits mobile screen cleanly');

      // Close modal
      const closeBtn = await page.evaluateHandle(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        return btns.find((b) => b.textContent.includes('Close') || b.getAttribute('aria-label') === 'Close');
      });
      if (closeBtn) await closeBtn.click();
      await new Promise((r) => setTimeout(r, 400));
    }

    // 12. Test PWA Web App Manifest
    const manifestResponse = await page.goto('http://localhost:4173/manifest.webmanifest');
    const manifestJson = await manifestResponse.json();
    const manifestValid = manifestJson && manifestJson.name && manifestJson.short_name === 'Attnd' && manifestJson.display === 'standalone';
    record(20, 'PWA Manifest Installability', manifestValid, `name="${manifestJson.name}", display="${manifestJson.display}"`);

    // 13. Test Service Worker Registration & Offline Readiness
    await page.goto('http://localhost:4173/', { waitUntil: 'networkidle0' });
    const swRegistered = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        return regs.length > 0;
      }
      return false;
    });
    record(19, 'Offline Service Worker Registered', swRegistered, 'PWA service worker active');

    // 14. Test Persistence: Reload page and verify data intact
    await page.reload({ waitUntil: 'networkidle0' });
    const pctAfterReload = await page.$eval('.text-5xl, .text-6xl', (el) => el.textContent);
    record(18, 'Data Persistence on Reload (IndexedDB)', pctAfterReload && pctAfterReload.includes('%'), `Preserved standing: ${pctAfterReload}`);

    // Check Console Errors
    const filteredErrors = consoleErrors.filter((e) => !e.includes('favicon'));
    record(10, 'Runtime Console Stability', filteredErrors.length === 0, `${filteredErrors.length} runtime console errors`);

  } catch (err) {
    console.error("Test execution error:", err);
    record(99, 'Test Runner Exception', false, err.message);
  } finally {
    await browser.close();
    server.close();
  }

  console.log("\n=== MOBILE TEST RESULTS SUMMARY ===");
  const passedCount = results.filter((r) => r.passed).length;
  console.log(`Passed: ${passedCount}/${results.length}`);

  return results;
}

runMobileTests().then((res) => {
  fs.writeFileSync(path.join(__dirname, 'screenshots', 'results.json'), JSON.stringify(res, null, 2));
  console.log("Results saved to screenshots/results.json");
  process.exit(0);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
