import { test, expect } from "@playwright/test";

// Bypass the first-run setup modal so tests can interact with the main UI.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("mikro:setup", "1"));
});

test.describe("MikroOS app", () => {
  test("loads and shows the landing screen", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/browser-native AI coding agent/i)).toBeVisible();
  });

  test("sidebar is visible with new chat button", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("MikroOS").first()).toBeVisible();
    await expect(page.locator('button[title="New chat"]')).toBeVisible();
  });

  test("creates a new thread when + is clicked", async ({ page }) => {
    await page.goto("/");
    await page.locator('button[title="New chat"]').click();
    await expect(page.getByText("New chat").first()).toBeVisible();
  });

  test("shows chat input", async ({ page }) => {
    await page.goto("/");
    await page.locator('button[title="New chat"]').click();
    await expect(page.locator('[data-testid="chat-input"]')).toBeVisible();
  });

  test("shows status bar", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".pixel-dot").first()).toBeVisible();
  });

  test("send button is disabled when input is empty", async ({ page }) => {
    await page.goto("/");
    await page.locator('button[title="New chat"]').click();
    const sendBtn = page.locator("button", { hasText: /^send$/i });
    await expect(sendBtn).toBeDisabled();
  });

  test("can type in the input", async ({ page }) => {
    await page.goto("/");
    await page.locator('button[title="New chat"]').click();
    const input = page.locator('[data-testid="chat-input"]');
    await input.fill("hello mikroos");
    await expect(input).toHaveValue("hello mikroos");
  });

  test("creates thread on first message and shows it in sidebar", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => { localStorage.clear(); localStorage.setItem("mikro:setup", "1"); });
    await page.reload();

    await page.locator('button[title="New chat"]').click();
    await page.locator('[data-testid="chat-input"]').fill("test message here");
    await expect(page.locator(".truncate", { hasText: "New chat" })).toBeVisible();
  });

  test("can delete a thread", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => { localStorage.clear(); localStorage.setItem("mikro:setup", "1"); });
    await page.reload();

    await page.locator('button[title="New chat"]').click();
    const threadItem = page.locator(".truncate", { hasText: "New chat" }).locator("..");
    await threadItem.hover();
    await threadItem.locator("button", { hasText: "x" }).click();
    await expect(page.getByText(/no threads yet/i)).toBeVisible();
  });

  test("multiple threads can be created and switched", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => { localStorage.clear(); localStorage.setItem("mikro:setup", "1"); });
    await page.reload();

    const plus = page.locator('button[title="New chat"]');
    await plus.click();
    await plus.click();
    await expect(page.locator(".truncate", { hasText: "New chat" })).toHaveCount(2);
  });

  test("persists threads across page reloads", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => { localStorage.clear(); localStorage.setItem("mikro:setup", "1"); });
    await page.reload();

    await page.locator('button[title="New chat"]').click();
    await page.reload();
    await expect(page.locator(".truncate", { hasText: "New chat" })).toBeVisible();
  });
});

test.describe("setup modal", () => {
  test("shows on first visit, advances to step 2, and dismisses via skip", async ({ page }) => {
    await page.addInitScript(() => localStorage.removeItem("mikro:setup"));
    await page.goto("/");
    await expect(page.getByText(/setup 1\/2/i)).toBeVisible();
    await page.getByRole("button", { name: /get started/i }).click();
    await expect(page.getByText(/setup 2\/2/i)).toBeVisible();
    await expect(page.getByText(/rec/i).first()).toBeVisible();
    // Skip is only on step 1 — go back to reach it
    await page.getByRole("button", { name: /back/i }).click();
    await page.getByRole("button", { name: /skip/i }).click();
    await expect(page.getByText(/setup 1\/2/i)).not.toBeVisible();
  });
});

test.describe("terminal", () => {
  test("toggle button exists in status bar", async ({ page }) => {
    await page.goto("/");
    const btn = page.locator('[data-testid="toggle-terminal"]');
    await expect(btn).toHaveCount(1);
  });

  test("terminal panel is collapsed by default", async ({ page }) => {
    await page.goto("/");
    const wrapper = page.locator('[data-testid="terminal-wrapper"]');
    const box = await wrapper.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.height).toBe(0);
  });

  test("clicking toggle expands the terminal", async ({ page }) => {
    await page.goto("/");
    await page.locator('[data-testid="toggle-terminal"]').click({ force: true });
    const wrapper = page.locator('[data-testid="terminal-wrapper"]');
    const box = await wrapper.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.height).toBe(280);
  });

  test("clicking toggle again collapses the terminal", async ({ page }) => {
    await page.goto("/");
    const btn = page.locator('[data-testid="toggle-terminal"]');
    await btn.click({ force: true });
    const wrapper = page.locator('[data-testid="terminal-wrapper"]');
    expect((await wrapper.boundingBox())!.height).toBe(280);
    await btn.click({ force: true });
    expect((await wrapper.boundingBox())!.height).toBe(0);
  });

  test("terminal contains xterm instance when open", async ({ page }) => {
    await page.goto("/");
    await page.locator('[data-testid="toggle-terminal"]').click({ force: true });
    await expect(page.locator('[data-testid="terminal"] .xterm')).toBeVisible({ timeout: 5000 });
  });
});

test.describe("autowork", () => {
  // The autowork button now uses inline `color` style to indicate state
  // (amber when on, undefined when off), so we assert on computed style.
  async function autoColor(page: any) {
    return page.locator('[data-testid="toggle-autowork"]').evaluate(
      (el: HTMLElement) => getComputedStyle(el).color,
    );
  }

  test("toggle button is visible", async ({ page }) => {
    await page.goto("/");
    const btn = page.locator('[data-testid="toggle-autowork"]');
    await expect(btn).toBeVisible();
    await expect(btn).toHaveText(/auto/i);
  });

  test("clicking toggle enables autowork (color shifts to accent)", async ({ page }) => {
    await page.goto("/");
    const off = await autoColor(page);
    await page.locator('[data-testid="toggle-autowork"]').click();
    const on = await autoColor(page);
    expect(on).not.toBe(off);
  });

  test("clicking toggle again disables autowork", async ({ page }) => {
    await page.goto("/");
    const off1 = await autoColor(page);
    await page.locator('[data-testid="toggle-autowork"]').click();
    await page.locator('[data-testid="toggle-autowork"]').click();
    const off2 = await autoColor(page);
    expect(off2).toBe(off1);
  });
});
