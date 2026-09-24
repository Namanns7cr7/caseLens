import { expect, test, type Locator } from "@playwright/test";

/**
 * The review workspace renders its evidence pane twice — once for the
 * desktop three-pane layout and once for the mobile bottom sheet — with the
 * inapplicable one hidden by CSS. `onScreen` picks whichever is actually
 * displayed, so one assertion works at both breakpoints.
 */
const onScreen = (locator: Locator): Locator => locator.locator("visible=true").first();

/**
 * The golden demo path from docs/DEMO_SCRIPT.md, start to finish:
 *
 *   search -> dossier -> timeline -> graph -> upload -> extraction stages
 *   -> flagged citation -> evidence -> pin to board -> export report
 *
 * Each step asserts on what a demo viewer is meant to see, so a regression
 * that breaks the narrative fails here rather than on stage.
 */

test.describe("golden demo path", () => {
  test("search, investigate, verify, pin, export", async ({ page }, testInfo) => {
    const isMobile = testInfo.project.name === "mobile";

    /* ---- 1. Search a real case ------------------------------------- */
    await page.goto("/search?q=personal+guarantor+moratorium");

    const leadingResult = page.getByRole("article").first();
    await expect(leadingResult).toBeVisible();
    // Binding Supreme Court authority must lead, not the superseded order.
    await expect(leadingResult).toContainText("State Bank of India v. V. Ramakrishnan");
    await expect(leadingResult).toContainText("(2018) 17 SCC 394");
    await expect(leadingResult.getByText("Binding landmark")).toBeVisible();

    /* ---- 2. Open the case dossier ---------------------------------- */
    await leadingResult.getByRole("link", { name: "Open dossier" }).click();
    await expect(page).toHaveURL(/\/cases\/sbi-v-ramakrishnan-sc-2018$/);

    await expect(
      page.getByRole("heading", { level: 1, name: /State Bank of India v\. V\. Ramakrishnan/ }),
    ).toBeVisible();
    await expect(page.getByText("Supreme Court of India").first()).toBeVisible();
    await expect(page.getByText("R. F. Nariman").first()).toBeVisible();

    // Operative ratio is present and rendered as primary-source text.
    await expect(page.getByText("Operative ratio decidendi").first()).toBeVisible();
    await expect(
      page.getByText(/Section 14 refers to the corporate debtor alone/).first(),
    ).toBeVisible();

    // Provenance is exposed for the record.
    await expect(page.getByRole("button", { name: /Record source/ }).first()).toBeVisible();

    /* ---- 3. Trace the procedural chronology ------------------------ */
    await expect(page.getByText("Procedural chronology").first()).toBeVisible();
    // Three forums dealt with this matter.
    await expect(
      page.getByText("National Company Law Tribunal, Chennai Bench").first(),
    ).toBeVisible();
    await expect(page.getByText("National Company Law Appellate Tribunal").first()).toBeVisible();
    await expect(page.getByText("Reversed below").first()).toBeVisible();

    /* ---- 4. Explore the relationship graph ------------------------- */
    await page.getByRole("link", { name: "Open relationship graph" }).click();
    await expect(page).toHaveURL(/\/graph$/);
    await expect(page.getByText(/evidenced edges/).first()).toBeVisible();

    if (isMobile) {
      // Mobile falls back to the linear tree, per UI_UX_SPEC.md.
      await expect(page.getByText("This case →").first()).toBeVisible();
      await expect(page.getByRole("button", { name: /Edge evidence/ }).first()).toBeVisible();
    } else {
      await expect(page.locator(".react-flow__node").first()).toBeVisible();
      await expect(page.locator(".react-flow__edge").first()).toBeVisible();
      // The node inspector shows the evidence behind an edge.
      await page.locator(".react-flow__node").first().click();
      await expect(page.getByText("Node inspector").first()).toBeVisible();
    }

    /* ---- 5. Upload the curated demo brief -------------------------- */
    await page.goto("/verify");
    await page.getByRole("button", { name: "Use the demo brief" }).click();

    // Extraction stages are shown, not a bare spinner.
    await expect(page.getByText("Analysis pipeline").first()).toBeVisible();
    await expect(page.getByText("Detecting citations").first()).toBeVisible();

    await page.waitForURL(/\/documents\/.+\/review$/, { timeout: 60_000 });

    /* ---- 6. Findings distinguish the failure modes ----------------- */
    await expect(
      page.getByRole("heading", { level: 1, name: /written-submissions-personal-guarantor/ }),
    ).toBeVisible();
    for (const status of [
      "Verified",
      "Metadata mismatch",
      "Paragraph mismatch",
      "Weak proposition support",
      "No authoritative match",
    ]) {
      await expect(page.getByText(status, { exact: false }).first()).toBeVisible();
    }

    /* ---- 7. Inspect the evidence for the flagged citation ---------- */
    await onScreen(page.getByRole("button", { name: /Pooja Ramesh Singh/ })).click();

    // The responsive layout renders the evidence pane twice (the desktop
    // column and the mobile sheet, one of which is display:none), so these
    // assertions scope to the first match.
    // Wording rule: a missing match is never called fabricated.
    await expect(
      onScreen(page.getByText(/does not correspond to any record in the sources/)),
    ).toBeVisible();
    await expect(
      onScreen(page.getByText(/not a finding that the authority does not exist/)),
    ).toBeVisible();

    // Claimed vs. authoritative comparison is on screen.
    await expect(onScreen(page.getByText("Document states"))).toBeVisible();
    await expect(onScreen(page.getByText("No matching record"))).toBeVisible();

    /* ---- 8. Pin the finding to an investigation board -------------- */
    await onScreen(page.getByRole("button", { name: /Pin finding to board/ })).click();
    await expect(onScreen(page.getByText("Pinned"))).toBeVisible({ timeout: 20_000 });

    await onScreen(page.getByRole("link", { name: /Open board/ })).click();
    await expect(page).toHaveURL(/\/investigations\/inv-/);
    await expect(page.getByText(/Pooja Ramesh Singh/).first()).toBeVisible();

    /* ---- 9. Export the report -------------------------------------- */
    await page.getByRole("link", { name: /Export investigation report/ }).click();
    await expect(page).toHaveURL(/\/reports\/inv-/);

    await expect(page.getByText("Investigation report").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Evidence inspected" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Sources" })).toBeVisible();
    // Every report carries the limitations statement.
    await expect(page.getByText("Limitations").first()).toBeVisible();
    await expect(
      page.getByText(/Always verify against the linked primary authority/).first(),
    ).toBeVisible();
  });
});

test.describe("legal integrity report", () => {
  test("reports every failure mode with its evidence", async ({ page }) => {
    await page.goto("/verify");
    await page.getByRole("button", { name: "Use the demo brief" }).click();
    await page.waitForURL(/\/documents\/.+\/review$/, { timeout: 60_000 });

    await page.getByRole("link", { name: /Legal integrity report/ }).click();
    await expect(page).toHaveURL(/\/reports\/doc-/);

    await expect(page.getByRole("heading", { name: "Document examined" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Citations requiring attention" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Citations verified" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "How these findings were produced" }),
    ).toBeVisible();

    // The method section states whether a model was involved.
    await expect(
      page.getByText(/No model was consulted|model.*was consulted only/).first(),
    ).toBeVisible();
  });
});

test.describe("source transparency", () => {
  test("states plainly that nothing was retrieved", async ({ page }) => {
    await page.goto("/sources");
    await expect(
      page.getByRole("heading", { name: /Nothing in this index was retrieved from a source/ }),
    ).toBeVisible();
    await expect(page.getByText(/written[\s\S]*from model recollection/).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Authority levels" })).toBeVisible();

    // Neither PRIMARY nor SECONDARY may be claimed anywhere in this build.
    await expect(page.getByText("Primary source").first()).toBeVisible();
    await expect(page.getByText(/Nothing in this build carries this level/).first()).toBeVisible();
  });

  test("no record claims a retrieval date it does not have", async ({ page }) => {
    await page.goto("/cases/sbi-v-ramakrishnan-sc-2018");
    await page.getByRole("button", { name: /Record source/ }).first().click();

    // The link is offered as somewhere to check the record, not as its origin.
    await expect(page.getByText("Verify at:").first()).toBeVisible();
    await expect(page.getByText("Not retrieved").first()).toBeVisible();
    await expect(page.getByText(/Retrieved \d/)).toHaveCount(0);
  });
});

test.describe("empty and error states", () => {
  test("a search with no match explains the next action", async ({ page }) => {
    await page.goto("/search?q=zzzznotanauthorityzzzz");
    await expect(
      page.getByText(/No authority in the connected sources matches this query/).first(),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /Try a sample investigation/ })).toBeVisible();
  });

  test("an unknown case returns a not-found page", async ({ page }) => {
    const response = await page.goto("/cases/not-a-real-case");
    expect(response?.status()).toBe(404);
  });
});
