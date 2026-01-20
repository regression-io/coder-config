#!/usr/bin/env node
/**
 * Capture screenshots for the tutorial using Playwright
 * Run: node scripts/capture-screenshots.js
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUTPUT_DIR = path.join(__dirname, '..', 'ui', 'public', 'tutorial');
const BASE_URL = 'http://localhost:3333';

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function captureScreenshots() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    deviceScaleFactor: 2, // Retina quality
  });
  const page = await context.newPage();

  // Clear the welcome modal flag so we can capture it
  await page.goto(BASE_URL);
  await page.evaluate(() => localStorage.removeItem('claude-config-welcome-seen'));
  await page.reload();
  await page.waitForTimeout(1000);

  // 1. Welcome Modal
  console.log('Capturing: welcome-modal.png');
  await page.waitForSelector('[role="dialog"]', { timeout: 5000 }).catch(() => {});
  const welcomeModal = await page.$('[role="dialog"]');
  if (welcomeModal) {
    await welcomeModal.screenshot({ path: path.join(OUTPUT_DIR, 'welcome-modal.png') });
    // Dismiss the modal
    await page.click('button:has-text("Skip")');
    await page.waitForTimeout(500);
  }

  // 2. Full sidebar
  console.log('Capturing: sidebar.png');
  const sidebar = await page.$('aside');
  if (sidebar) {
    await sidebar.screenshot({ path: path.join(OUTPUT_DIR, 'sidebar.png') });
  }

  // 3. Project Switcher
  console.log('Capturing: project-switcher.png');
  await page.click('button:has-text("Select project")').catch(() => {});
  await page.waitForTimeout(300);
  const projectDropdown = await page.$('[role="listbox"], [data-radix-popper-content-wrapper]');
  if (projectDropdown) {
    await projectDropdown.screenshot({ path: path.join(OUTPUT_DIR, 'project-switcher.png') });
    await page.keyboard.press('Escape');
  }

  // 4. All Projects View
  console.log('Capturing: projects-view.png');
  await page.click('button:has-text("All Projects")');
  await page.waitForTimeout(500);
  const mainContent = await page.$('main');
  if (mainContent) {
    await mainContent.screenshot({ path: path.join(OUTPUT_DIR, 'projects-view.png') });
  }

  // 5. Project Explorer
  console.log('Capturing: project-explorer.png');
  await page.click('button:has-text("Project Explorer")');
  await page.waitForTimeout(500);
  await mainContent?.screenshot({ path: path.join(OUTPUT_DIR, 'project-explorer.png') });

  // 6. MCP Registry
  console.log('Capturing: mcp-registry.png');
  await page.click('button:has-text("MCP Registry")');
  await page.waitForTimeout(500);
  await mainContent?.screenshot({ path: path.join(OUTPUT_DIR, 'mcp-registry.png') });

  // 7. Plugins View
  console.log('Capturing: plugins-view.png');
  await page.click('button:has-text("Plugins")');
  await page.waitForTimeout(500);
  await mainContent?.screenshot({ path: path.join(OUTPUT_DIR, 'plugins-view.png') });

  // 8. Memory View
  console.log('Capturing: memory-view.png');
  await page.click('button:has-text("Memory")');
  await page.waitForTimeout(500);
  await mainContent?.screenshot({ path: path.join(OUTPUT_DIR, 'memory-view.png') });

  // Dismiss any toasts/overlays that might be blocking
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // 9. Claude Code Settings
  console.log('Capturing: claude-settings.png');
  await page.click('button:has-text("Claude Code")', { force: true });
  await page.waitForTimeout(800);
  const mainAfterClaude = await page.$('main');
  await mainAfterClaude?.screenshot({ path: path.join(OUTPUT_DIR, 'claude-settings.png') });

  // 10. Permissions section specifically
  console.log('Capturing: permissions.png');
  const permissionsSection = await page.$('[class*="space-y"]');
  if (permissionsSection) {
    await permissionsSection.screenshot({ path: path.join(OUTPUT_DIR, 'permissions.png') });
  }

  // 11. Workstreams View
  console.log('Capturing: workstreams-view.png');
  await page.click('button:has-text("Workstreams")', { force: true });
  await page.waitForTimeout(800);
  const mainAfterWorkstreams = await page.$('main');
  await mainAfterWorkstreams?.screenshot({ path: path.join(OUTPUT_DIR, 'workstreams-view.png') });

  // 12. Tutorial View
  console.log('Capturing: tutorial-view.png');
  await page.click('button:has-text("Tutorial")', { force: true });
  await page.waitForTimeout(800);
  const mainAfterTutorial = await page.$('main');
  await mainAfterTutorial?.screenshot({ path: path.join(OUTPUT_DIR, 'tutorial-view.png') });

  // 13. Header area
  console.log('Capturing: header.png');
  const header = await page.$('header');
  if (header) {
    await header.screenshot({ path: path.join(OUTPUT_DIR, 'header.png') });
  }

  await browser.close();
  console.log(`\nScreenshots saved to: ${OUTPUT_DIR}`);
  console.log('Files:', fs.readdirSync(OUTPUT_DIR).join(', '));
}

captureScreenshots().catch(err => {
  console.error('Error capturing screenshots:', err);
  process.exit(1);
});
