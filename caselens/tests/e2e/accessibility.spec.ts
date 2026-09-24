import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Accessibility gate (TASKS.md Phase 8).
 *
 * Every surface a user reaches on the golden path is audited against WCAG
 * 2.1 A and AA. Failures are reported with the offending selectors so a
 * regression names the element rather than just the rule.
 */

const PAGES: Array<{ name: string; path: string }> = [
  { name: "landing", path: "/" },
  { name: "home", path: "/home" },
  { name: "search results", path: "/search?q=personal+guarantor+moratorium" },
  { name: "empty search", path: "/search?q=zzzznotanauthorityzzzz" },
  { name: "case dossier", path: "/cases/sbi-v-ramakrishnan-sc-2018" },
  { name: "relationship graph", path: "/cases/sbi-v-ramakrishnan-sc-2018/graph" },
  { name: "verify", path: "/verify" },
  { name: "sources", path: "/sources" },
  { name: "research", path: "/research" },
  { name: "investigations", path: "/investigations" },
  { name: "reports", path: "/reports" },
];

function describeViolations(
  violations: Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"],
): string {
  return violations
    .map(
      (violation) =>
        `${violation.id} (${violation.impact}): ${violation.help}\n  ${violation.nodes
          .slice(0, 3)
          .map((node) => node.target.join(" "))
          .join("\n  ")}`,
    )
    .join("\n\n");
}

for (const entry of PAGES) {
  test(`${entry.name} has no WCAG A/AA violations`, async ({ page }) => {
    await page.goto(entry.path);
    // The graph settles its layout after mount; audit the settled DOM.
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    expect(describeViolations(results.violations)).toBe("");
  });
}

test("the review workspace has no WCAG A/AA violations", async ({ page }) => {
  await page.goto("/verify");
  await page.getByRole("button", { name: "Use the demo brief" }).click();
  await page.waitForURL(/\/documents\/.+\/review$/, { timeout: 60_000 });
  await page.waitForLoadState("networkidle");

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  expect(describeViolations(results.violations)).toBe("");
});

test.describe("keyboard and motion", () => {
  test("the case finder is reachable by keyboard shortcut", async ({ page }) => {
    await page.goto("/home");
    const box = page.getByRole("combobox", { name: "Search the indexed corpus" });
    // The shortcut is bound on hydration; wait for it before pressing.
    await expect(box).toBeVisible();
    await page.waitForFunction(() => document.readyState === "complete");

    await page.keyboard.press("ControlOrMeta+k");
    await expect(box).toBeFocused();
  });

  test("suggestions are navigable with the arrow keys", async ({ page }) => {
    await page.goto("/home");
    const box = page.getByRole("combobox", { name: "Search the indexed corpus" }).first();
    await expect(box).toBeVisible();
    await box.fill("Lalit Kumar Jain");
    await expect(page.getByRole("listbox")).toBeVisible();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/cases\/lalit-kumar-jain-2021$/);
  });

  test("reduced motion is respected", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/cases/sbi-v-ramakrishnan-sc-2018");

    const probed = await page.evaluate(() => {
      const probe = document.createElement("div");
      probe.className = "cl-skeleton";
      document.body.appendChild(probe);
      const styles = getComputedStyle(probe);
      const result = {
        matches: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        animation: styles.animationDuration,
        transition: styles.transitionDuration,
        animationName: styles.animationName,
      };
      probe.remove();
      return result;
    });

    expect(probed.matches).toBe(true);
    // Browsers serialise sub-millisecond durations inconsistently ("0.01ms",
    // "1e-05s"), so compare the parsed value rather than the string.
    const seconds = (value: string) =>
      value.endsWith("ms") ? Number.parseFloat(value) / 1000 : Number.parseFloat(value);

    expect(seconds(probed.animation)).toBeLessThanOrEqual(0.001);
    expect(seconds(probed.transition)).toBeLessThanOrEqual(0.001);
    expect(probed.animationName).toBe("none");
  });
});
