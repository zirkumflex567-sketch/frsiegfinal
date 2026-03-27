#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require('playwright');
const path = require('node:path');

(async () => {
  const base = process.env.FRSIEG_BASE_URL || 'https://h-town.duckdns.org';
  const pathPrefix = (process.env.FRSIEG_PATH_PREFIX ?? '/fr-sieg').replace(/\/$/, '');
  const email = process.env.FRSIEG_ADMIN_EMAIL || 'admin@fr-sieg.de';
  const password = process.env.FRSIEG_ADMIN_PASSWORD || 'OmaModus2026!';
  const uploadPath = process.env.FRSIEG_UPLOAD_FILE || path.resolve('public/next.svg');
  const heading = `Willkommen bei FR-Sieg ${Date.now()}`;

  const browser = await chromium.launch({ headless: false, slowMo: 220 });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(`${base}${pathPrefix}/admin/login`, { waitUntil: 'networkidle' });
    await page.fill('#email', email);
    await page.fill('#password', password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin', { timeout: 20000 });
    await page.waitForTimeout(1200);

    await page.getByLabel('Hero Überschrift').fill(heading);
    await page.getByLabel('Schriftart').selectOption({ label: 'Klassisch (Arial)' });

    const colorInput = page.locator('label:has-text("Überschrift-Farbe") input[type="color"]').first();
    await colorInput.evaluate((el) => {
      el.value = '#7c3aed';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await page.locator('aside:has-text("Medien") input[type="file"]').first().setInputFiles(uploadPath);
    await page.getByRole('button', { name: 'Datei hochladen' }).click();
    await page.getByText('Datei hochgeladen.').first().waitFor({ timeout: 15000 });

    const saveButton = page.getByRole('button', { name: /Speichern|Anlegen/ }).first();
    await saveButton.click();
    await page.getByText('Änderungen gespeichert.').first().waitFor({ timeout: 15000 });

    await page.goto(`${base}${pathPrefix}/?edit=1`, { waitUntil: 'networkidle' });
    const updatedVisible = await page.getByRole('heading', { level: 1, name: heading }).isVisible();

    const screenshot = path.resolve('.gsd/pw-live-cms-proof.png');
    await page.screenshot({ path: screenshot, fullPage: true });

    console.log(JSON.stringify({ ok: updatedVisible, heading, screenshot, finalUrl: page.url() }));

    await page.waitForTimeout(10000);
    await browser.close();
    process.exit(updatedVisible ? 0 : 1);
  } catch (error) {
    const screenshot = path.resolve('.gsd/pw-live-cms-error.png');
    await page.screenshot({ path: screenshot, fullPage: true }).catch(() => {});
    console.error(JSON.stringify({ ok: false, error: String(error), screenshot }));
    await browser.close();
    process.exit(1);
  }
})();
