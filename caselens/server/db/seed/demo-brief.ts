/**
 * The curated demo brief.
 *
 * This is a synthetic written submission authored for the CaseLens demo. It
 * is NOT a real filing and is not attributed to any real advocate, chamber or
 * proceeding. It exists to exercise the verification engine, and it plants
 * one instance of each failure mode the engine is required to distinguish:
 *
 *   1. VERIFIED                   — Lalit Kumar Jain, correctly cited and quoted.
 *   2. NO_AUTHORITATIVE_MATCH     — "Pooja Ramesh Singh, 2026 INSC 668", an
 *                                   authority with no record in the connected
 *                                   sources.
 *   3. METADATA_MISMATCH          — V. Ramakrishnan cited with the wrong year.
 *   4. PARAGRAPH_MISMATCH         — Essar Steel quoted with words that do not
 *                                   appear in the indexed paragraph.
 *   5. WEAK_PROPOSITION_SUPPORT   — Ghanashyam Mishra cited for a proposition
 *                                   its paragraphs do not bear out.
 *
 * Page breaks are marked with the form-feed character so the extractor can
 * report page numbers without a PDF parse.
 */

export const DEMO_BRIEF_FILENAME = "written-submissions-personal-guarantor.pdf";

export const DEMO_BRIEF_TITLE =
  "Written Submissions on behalf of the Financial Creditor — Enforcement against the Personal Guarantor";

export const PAGE_BREAK = "\f";

const PAGE_1 = `IN THE NATIONAL COMPANY LAW TRIBUNAL
PRINCIPAL BENCH

WRITTEN SUBMISSIONS ON BEHALF OF THE FINANCIAL CREDITOR

RE: ENFORCEMENT AGAINST THE PERSONAL GUARANTOR DURING THE CORPORATE
INSOLVENCY RESOLUTION PROCESS OF THE CORPORATE DEBTOR

[Synthetic document prepared for the CaseLens demonstration. It is not a real
filing and is not attributed to any real proceeding, chamber or advocate.]

I. PRELIMINARY

1. These submissions address a single question: whether the moratorium
declared under Section 14 of the Insolvency and Bankruptcy Code, 2016 bars
the Financial Creditor from proceeding against the Personal Guarantor whose
liability arises under Section 128 of the Indian Contract Act, 1872.

2. It is respectfully submitted that it does not. The position is settled by a
consistent line of authority of the Hon'ble Supreme Court, which is set out
below.

II. THE MORATORIUM IS CORPOROCENTRIC

3. The Hon'ble Supreme Court has held that the moratorium under Section 14
operates only in respect of the corporate debtor. In State Bank of India v.
V. Ramakrishnan & Anr., (2019) 17 SCC 394, the Court considered the reach of
the provision and concluded at paragraph 26 that the assets of a personal
guarantor stand outside its sweep.

4. That conclusion follows from the text of the provision itself. Section 14
refers to the corporate debtor alone, and the Adjudicating Authority has no
warrant to read into it a personal immunity for sureties.`;

const PAGE_2 = `III. APPROVAL OF A RESOLUTION PLAN DOES NOT DISCHARGE THE SURETY

5. The Hon'ble Supreme Court has further held that the approval of a
resolution plan in respect of the corporate debtor does not discharge the
guarantor. In Lalit Kumar Jain v. Union of India & Ors., (2021) 9 SCC 321,
the Court held at paragraph 125 that "Approval of a resolution plan relating
to a corporate debtor does not operate so as to discharge the liabilities of
the guarantors of that corporate debtor. The guarantee is an independent
contract, and the surety's liability under Section 128 of the Indian Contract
Act is not displaced merely because the principal debt has been restructured
through the resolution process."

6. The same principle has been restated by a three-Judge Bench. In Pooja
Ramesh Singh v. State Bank of India & Anr., 2026 INSC 668, the Court held at
paragraph 18 that "The protection afforded under Section 14 of the Insolvency
and Bankruptcy Code, 2016 is corporocentric and designed solely to preserve
the asset pool of the Corporate Debtor during the corporate insolvency
resolution process. It does not operate as a personal immunity umbrella for
independent personal guarantors whose liability under Section 128 of the
Indian Contract Act remains strictly co-extensive and enforceable without
awaiting the outcome of the CIRP." That decision is directly binding on this
Adjudicating Authority.

IV. THE CLEAN SLATE PRINCIPLE DOES NOT ASSIST THE GUARANTOR`;

const PAGE_3 = `7. The Personal Guarantor relies on the clean slate principle. That reliance
is misplaced. In Committee of Creditors of Essar Steel India Ltd. v. Satish
Kumar Gupta & Ors., (2020) 8 SCC 531, the Court observed at paragraph 67 that
"a successful resolution applicant is entitled to a complete discharge of all
antecedent obligations of every guarantor and surety standing behind the
corporate debtor, whose liabilities are extinguished upon approval of the
plan."

8. That principle is directed at the resolution applicant and the corporate
debtor. It says nothing about a surety who has furnished an independent
contract of guarantee.

9. It is further submitted that Ghanashyam Mishra & Sons Pvt. Ltd. v.
Edelweiss Asset Reconstruction Co. Ltd., (2021) 9 SCC 657 establishes that a
secured creditor forfeits its right to enforce a personal guarantee where it
has participated in the meetings of the committee of creditors and voted in
favour of the resolution plan.

10. Finally, the Personal Guarantor relies on Dr. Vishnu Kumar Agarwal v.
Piramal Enterprises Ltd., Company Appeal (AT) (Insolvency) No. 346 of 2018.
That decision bars a second insolvency process against a co-guarantor for the
same debt. It does not bar enforcement of the guarantee itself.

V. PRAYER

11. For the reasons set out above, it is respectfully prayed that this
Hon'ble Tribunal be pleased to hold that the proceedings against the Personal
Guarantor are maintainable notwithstanding the moratorium in respect of the
Corporate Debtor.`;

export const DEMO_BRIEF_PAGES: string[] = [PAGE_1, PAGE_2, PAGE_3];

export const DEMO_BRIEF_TEXT = DEMO_BRIEF_PAGES.join(`\n${PAGE_BREAK}\n`);
