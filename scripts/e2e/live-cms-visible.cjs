#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require("playwright");
const path = require("node:path");

function normalizePathPrefix(value) {
  const input = `${value ?? ""}`.trim();
  if (!input) return "";

  const stripped = input.replace(/^\/+|\/+$/g, "");
  if (!stripped) return "";

  return `/${stripped}`;
}

function buildRuntimeConfig(env) {
  return {
    baseUrl: (env.FRSIEG_BASE_URL || "http://localhost:3000").replace(/\/$/, ""),
    pathPrefix: normalizePathPrefix(env.FRSIEG_PATH_PREFIX ?? ""),
    email: env.FRSIEG_ADMIN_EMAIL || "admin@fr-sieg.de",
    password: env.FRSIEG_ADMIN_PASSWORD || "OmaModus2026!",
    uploadPath: env.FRSIEG_UPLOAD_FILE || path.resolve("public/next.svg"),
    heading: `Willkommen bei FR-Sieg ${Date.now()}`,
    headless: env.FRSIEG_HEADLESS !== "0",
    slowMo: Number(env.FRSIEG_SLOW_MO || 0),
  };
}

function buildStatusPayload({
  ok,
  step,
  artifactPath,
  message,
  action,
  endpoint,
  finalUrl,
  heading,
  detail,
}) {
  return {
    ok,
    step,
    action: action || null,
    endpoint: endpoint || null,
    artifactPath,
    message,
    detail: detail || null,
    heading: heading || null,
    finalUrl: finalUrl || null,
    timestamp: new Date().toISOString(),
  };
}

function buildUrl(config, pathname) {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${config.baseUrl}${config.pathPrefix}${normalizedPath}`;
}

class SmokeError extends Error {
  constructor(message, context = {}) {
    super(message);
    this.name = "SmokeError";
    this.context = context;
  }
}

async function parseResponseJson(response, context) {
  const rawBody = await response.text();

  try {
    return rawBody ? JSON.parse(rawBody) : {};
  } catch {
    throw new SmokeError("Malformed JSON response from endpoint", {
      ...context,
      status: response.status(),
      responseSnippet: rawBody.slice(0, 180),
    });
  }
}

async function runSmoke(rawEnv = process.env) {
  const config = buildRuntimeConfig(rawEnv);
  const browser = await chromium.launch({
    headless: config.headless,
    slowMo: config.slowMo,
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  let step = "startup";
  let stepContext = {
    action: null,
    endpoint: null,
  };

  try {
    step = "login-page";
    stepContext = {
      action: "open-login-page",
      endpoint: "/admin/login",
    };
    await page.goto(buildUrl(config, "/admin/login"), {
      waitUntil: "networkidle",
      timeout: 20000,
    });

    step = "login-submit";
    stepContext = {
      action: "admin-login",
      endpoint: "/api/admin/login",
    };
    await page.fill("#email", config.email);
    await page.fill("#password", config.password);

    const loginResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" && response.url().includes("/api/admin/login"),
      { timeout: 20000 },
    );

    await page.click('button[type="submit"]');
    const loginResponse = await loginResponsePromise;
    const loginBody = await parseResponseJson(loginResponse, {
      step,
      action: "admin-login",
      endpoint: "/api/admin/login",
    });

    if (!loginResponse.ok()) {
      throw new SmokeError("Admin login failed", {
        step,
        action: "admin-login",
        endpoint: "/api/admin/login",
        status: loginResponse.status(),
        responseSnippet: JSON.stringify(loginBody).slice(0, 180),
      });
    }

    await page.waitForURL("**/admin", { timeout: 20000 });

    step = "open-live-editor";
    stepContext = {
      action: "open-live-editor",
      endpoint: "/?edit=1",
    };
    await page.getByRole("link", { name: "Live-Editor öffnen" }).click();
    await page.waitForURL("**/?edit=1", { timeout: 20000 });

    step = "content-edit";
    stepContext = {
      action: "edit-content",
      endpoint: "/?edit=1",
    };
    await page.getByLabel("Status").selectOption("published");
    await page.getByLabel("Hero Überschrift").fill(config.heading);
    await page.getByLabel("Schriftart").selectOption({ label: "Klassisch (Arial)" });

    const colorInput = page
      .locator('label:has-text("Überschrift-Farbe") input[type="color"]')
      .first();

    await colorInput.evaluate((el) => {
      el.value = "#7c3aed";
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    });

    step = "media-upload";
    stepContext = {
      action: "upload-media",
      endpoint: "/api/admin/media",
    };
    const mediaInput = page.locator('input[type="file"]').first();
    const uploadButton = page.getByRole("button", { name: "Datei hochladen" });

    if ((await mediaInput.count()) > 0 && (await uploadButton.count()) > 0) {
      await mediaInput.setInputFiles(config.uploadPath);
      await uploadButton.first().click();
      await page.getByText("Datei hochgeladen.").first().waitFor({ timeout: 15000 });
    }

    step = "save";
    stepContext = {
      action: "save-content",
      endpoint: "/api/admin/pages/:id",
    };
    const saveResponsePromise = page.waitForResponse(
      (response) => {
        const isPut = response.request().method() === "PUT";
        return isPut && response.url().includes("/api/admin/pages/");
      },
      { timeout: 20000 },
    );

    const saveButton = page.getByRole("button", { name: /Speichern|Anlegen/ }).first();
    await saveButton.click();
    const saveResponse = await saveResponsePromise;
    const saveBody = await parseResponseJson(saveResponse, {
      step,
      action: "save-content",
      endpoint: "/api/admin/pages/:id",
    });

    if (!saveResponse.ok()) {
      throw new SmokeError("CMS save failed", {
        step,
        action: "save-content",
        endpoint: "/api/admin/pages/:id",
        status: saveResponse.status(),
        responseSnippet: JSON.stringify(saveBody).slice(0, 180),
      });
    }

    step = "public-assert";
    stepContext = {
      action: "assert-public-home",
      endpoint: "/",
    };
    await page.goto(buildUrl(config, "/"), { waitUntil: "networkidle", timeout: 20000 });
    const updatedVisible = await page.getByRole("heading", { level: 1, name: config.heading }).isVisible();

    const artifactPath = path.resolve(".gsd/pw-live-cms-proof.png");
    await page.screenshot({ path: artifactPath, fullPage: true });

    if (!updatedVisible) {
      throw new SmokeError("Saved heading is not visible on public route", {
        step,
        action: "assert-public-home",
        endpoint: "/",
      });
    }

    return buildStatusPayload({
      ok: true,
      step: "done",
      action: "assert-public-home",
      endpoint: "/",
      artifactPath,
      message: "Live CMS smoke passed",
      finalUrl: page.url(),
      heading: config.heading,
    });
  } catch (error) {
    const artifactPath = path.resolve(`.gsd/pw-live-cms-error-${step}.png`);
    await page.screenshot({ path: artifactPath, fullPage: true }).catch(() => {});

    const detailContext = error instanceof SmokeError ? error.context : {};

    return buildStatusPayload({
      ok: false,
      step,
      action: detailContext.action || stepContext.action,
      endpoint: detailContext.endpoint || stepContext.endpoint,
      artifactPath,
      message: error instanceof Error ? error.message : String(error),
      detail: {
        ...stepContext,
        ...detailContext,
        name: error instanceof Error ? error.name : "UnknownError",
      },
      finalUrl: page.url(),
      heading: config.heading,
    });
  } finally {
    await browser.close();
  }
}

async function main() {
  const payload = await runSmoke(process.env);
  const logMethod = payload.ok ? console.log : console.error;
  logMethod(JSON.stringify(payload));
  process.exit(payload.ok ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = {
  normalizePathPrefix,
  buildRuntimeConfig,
  buildStatusPayload,
  buildUrl,
  SmokeError,
  parseResponseJson,
  runSmoke,
};
