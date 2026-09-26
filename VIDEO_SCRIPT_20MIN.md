# CaseLens — 20-Minute Video Guide Script

**Runtime target:** 20:00
**Format:** screen recording + voiceover
**Marker legend:** ⭐ = beat that belongs in the 4-minute hackathon submission cut (see the cut sheet at the end)

> ⚠️ The official submission guide caps the judged video at **4 minutes**. This 20-minute script is the
> full deep-dive/product-walkthrough version. Record it once, then cut to the ⭐ beats for submission.

---

## PRE-FLIGHT (do this before you hit record)

| # | Check | Why |
|---|-------|-----|
| 1 | `GEMINI_API_KEY` set in `.env.local`, app restarted | Otherwise `/sources` shows "Not configured" and research degrades to retrieved passages. You want the *live* model for the GenAI segment. |
| 2 | `npm run dev` up on `localhost:3000`, hit `/api/health` once | Warms the route; no cold-start stall on camera. |
| 3 | `npm run demo:pdf` has been run so `/demo/written-submissions-personal-guarantor.pdf` exists | The Verify segment depends on it. |
| 4 | Clear any existing investigation board / documents | Pinning must happen *live* on camera. Judges flag pre-filled state. |
| 5 | Browser at 1920×1080, zoom 110–125%, cursor highlight ON, bookmarks bar hidden | Citation text must be readable after upload compression. |
| 6 | Second tab open on the repo (`server/ai/gemini.ts`) | Used at 15:30 to prove the AI is real and constrained. |
| 7 | Do-not-disturb on, notifications off | |

**Recording spec:** 1080p / 30fps minimum, system audio off, mic gain tested. Speak at ~140 wpm.
When you type a value that matters, **pause 2 full seconds on it before pressing Enter.**

---

## SEGMENT MAP

| Time | Segment | ⭐ |
|------|---------|---|
| 00:00 – 01:00 | Cold open — the problem | ⭐ |
| 01:00 – 02:30 | What CaseLens is + the six modes | ⭐ (compressed) |
| 02:30 – 04:00 | Live search & discovery | ⭐ |
| 04:00 – 06:30 | The case dossier | ⭐ (partial) |
| 06:30 – 08:30 | The relationship graph | |
| 08:30 – 09:30 | Sources — the honesty page | |
| 09:30 – 13:30 | Verify a document (the core demo) | ⭐ |
| 13:30 – 15:30 | Evidence deep dive — the failure modes | ⭐ (two findings) |
| 15:30 – 17:30 | **GenAI in action** — grounded research | ⭐ |
| 17:30 – 18:45 | Investigation board | ⭐ (brief) |
| 18:45 – 19:30 | Reports & export | ⭐ |
| 19:30 – 20:00 | Close | ⭐ |

---

# THE SCRIPT

---

## ⭐ 00:00 – 01:00 · COLD OPEN — THE PROBLEM

**SCREEN:** Start on the CaseLens landing page (`localhost:3000`). Do not scroll yet.

**SAY:**

> In 2023, a New York lawyer filed a brief containing six case citations that did not exist.
> He had not invented them — a language model had. He had no way to check.
>
> That is the problem I want to talk about, and it is bigger than one embarrassing filing.
> Every legal document is built on citations: a case, a paragraph number, a quoted sentence,
> and a proposition the drafter says that authority stands for. Any one of those four can be
> wrong — and in a fifty-page written submission, nobody checks all four, every time.
>
> This is CaseLens.

**DO:** Let the hero line sit on screen — *"See the full story behind every case."*

**SAY:**

> Investigate the law. Trace the evidence. And read the line at the bottom of this page, because
> it is the whole design philosophy:

**DO:** Scroll slowly to the closing statement. **Pause 3 seconds on it.**

> *"CaseLens does not ask users to trust AI. It lets them trace every conclusion back to evidence."*

---

## ⭐ 01:00 – 02:30 · WHAT IT IS + THE SIX MODES

**SCREEN:** Scroll to the "One investigative loop" section on the landing page.

**SAY:**

> CaseLens is an investigative legal intelligence platform, built initially around Indian case law.
> It runs one loop, six steps.

**DO:** Hover each of the six cards in order as you name them — roughly 4 seconds each.

> **Search** — find an authority by party, citation, judge, statute or issue.
> **Open the dossier** — read the holding, the issues, the passages that carry them.
> **Trace the chronology** — follow one matter across every forum that touched it.
> **Map the relationships** — see which authority affirms, distinguishes, reverses or follows which.
> **Verify a document** — check every citation, quotation and proposition against its source.
> **Export the evidence** — produce a report where every line carries its provenance.

**DO:** Scroll to the status pill row.

**SAY:**

> And this row is the part I am proudest of. When a citation fails, it does not fail in one way —
> it fails in six distinguishable ways, and CaseLens refuses to blur them together.
> Verified. Metadata mismatch. Paragraph mismatch. Weak proposition support. No authoritative match.
> Needs review.
>
> Notice what is missing from that list: there is no "fabricated" status. If CaseLens cannot find
> an authority, it says *no record in the connected sources carries this citation* — a statement
> about its own coverage, not an accusation about the law. We will see that distinction bite later.

**DO:** Click **Open CaseLens**. Land on `/home`.

---

## ⭐ 02:30 – 04:00 · LIVE SEARCH & DISCOVERY

**SCREEN:** `/home`.

**SAY:**

> Here is the workspace. Left rail: Home, Cases, Investigate, Verify, Research, Reports, Sources.
> Everything is one investigation away.
>
> Let me run a real research question through it. The doctrinal line I am going to investigate is
> this: when a company goes into insolvency and a moratorium is declared, does that moratorium also
> protect the person who personally guaranteed the company's debt?

**DO:** Click into the omnibox. **Type slowly and visibly:**

```
personal guarantor moratorium
```

**Pause 2 seconds on the typed text.** Then Enter.

**SAY (over results):**

> Five authorities, ranked. Each result carries its forum, its bench strength, its citation, and a
> doctrinal status pill — binding landmark, overruled, distinguished. That status is not decoration;
> it is the first thing a researcher needs and the last thing a keyword search gives you.

**DO:** Point the cursor at the filter rail. Apply one filter (court = Supreme Court), show the result
count change, then clear it.

### Edge case #1 — the empty result (do not skip this)

**SAY:**

> And because judges should see failure states, not just happy paths — watch what happens when the
> corpus genuinely does not have something.

**DO:** Clear the search box. **Type slowly:**

```
maritime salvage arbitration Gujarat
```

**Pause 2 seconds.** Enter.

**SAY:**

> *"No authority in the connected sources matches this query."*
>
> Not "no results found". Not a hallucinated best guess. The wording is deliberate — it tells you the
> limit is the index, not the law. That sentence is a product decision, and it is enforced everywhere
> in this app.

**DO:** Search `personal guarantor moratorium` again. Click **State Bank of India v. V. Ramakrishnan & Anr.**

---

## ⭐ 04:00 – 06:30 · THE CASE DOSSIER

**SCREEN:** `/cases/sbi-v-ramakrishnan-sc-2018`.

**SAY:**

> This is a dossier. Supreme Court of India, 14 August 2018, neutral citation 2018 INSC 712,
> reported at (2018) 17 SCC 394. Two-judge bench: Justice Nariman and Justice Indu Malhotra.
> Marked binding landmark, 894 subsequent citations recorded.

**DO:** Scroll to **Headnote**.

> The headnote: the Court set aside the NCLAT and held the Section 14 moratorium applies only to the
> corporate debtor — it does not bar proceedings against the personal guarantor, whose liability under
> Section 128 of the Contract Act is co-extensive and independently enforceable.

**DO:** Scroll to **Issues framed**. Read one aloud.

**DO:** Scroll to **Judgment passages**. Stop on **paragraph 26**, highlight the text with the cursor.

**SAY:**

> Paragraph 26, tagged as ratio: *"Section 14 refers to the corporate debtor alone. The assets of a
> personal guarantor stand outside the sweep of the moratorium."*
>
> Remember this paragraph. It is going to come back three more times in this video — in the graph,
> in the verification engine, and in the AI synthesis. That is the point of the architecture:
> one indexed passage, reused as evidence everywhere, never re-summarised into something looser.

**DO:** Scroll to **Procedural chronology**. Trace it top to bottom with the cursor.

**SAY:**

> And this is the chronology — the same matter across three forums.
>
> **December 2017**, NCLT Chennai restrains the bank from touching the guarantor. Status: overruled.
> **February 2018**, NCLAT affirms it. Also overruled.
> **August 2018**, the Supreme Court sets both aside.
>
> Any one of those three, read in isolation, looks like good law. Two of them are dead. A citation
> checker that only matches strings would happily verify the 2017 decision and tell you nothing.

**DO:** Scroll to **Provisions considered** — point at Section 14 IBC and Section 128 Contract Act.
Then **Connected authorities**, then **Subsequent treatment**.

**SAY:**

> Provisions considered, with the paragraph each was discussed in. Connected authorities. Subsequent
> treatment. Every one of these is an evidenced relationship — there is a source behind the edge,
> and I will show you that source in a moment.

---

## 06:30 – 08:30 · THE RELATIONSHIP GRAPH

**DO:** Open the **Graph** view for this case.

**SAY:**

> Same case, spatial view. One set of nodes is authorities, the other is statutory provisions.
> Edges are typed: affirms, reverses, distinguishes, follows, interprets, applies.

**DO:** Drag the central node so the force layout settles. Let the motion play for ~3 seconds.

**SAY:**

> The layout is force-directed, so the doctrinal structure arranges itself — the Supreme Court
> decision pulls to the centre because everything else cites it.

**DO:** Click the edge between the SC case and the NCLAT case. Open **Edge evidence**.

**SAY:**

> Click an edge and you get the node inspector — and critically, **edge evidence**. This relationship
> is not asserted by a model. It is recorded, with the paragraph it comes from: paragraph 29,
> *"The judgment of the Appellate Tribunal dated 28 February 2018 is accordingly set aside."*
>
> If we cannot evidence an edge, we do not draw the edge.

**DO:** Click the **Section 128, Indian Contract Act** provision node. Show it connects to multiple cases.

**SAY:**

> Section 128 is the hub of this whole doctrine — several separate authorities interpret it. Expanding
> a statutory node is how you find the cases you did not know to search for.

**DO:** Click **Pin to board** on the Section 128 node. Show the pinned confirmation state.

**SAY:**

> Pinned. That goes to my investigation board with its provenance attached — we will come back to it.

---

## 08:30 – 09:30 · SOURCES — THE HONESTY PAGE

**DO:** Navigate to **Sources** in the left rail.

**SAY:**

> Before I show you the verification engine, I want to show you the page most demos would hide.
>
> This is Sources. It declares exactly what CaseLens is connected to and how much each record is
> worth. Four authority levels: official court record, reporter or established database, **demo**,
> and user-authored.

**DO:** Point at the DEMO level description. **Pause on it.**

**SAY:**

> Read the demo level: *"Written from model recollection, not retrieved. Everything in this index
> sits here."*
>
> That is my own corpus, marked down honestly in my own product. These are real, well-known
> authorities and the metadata is probably right — but "probably right from memory" is not
> provenance, and a tool whose entire purpose is catching unsupported citations cannot go around
> making unsupported claims of its own. Every record links out to where you should go and check it.
>
> Swap in a licensed source feed and these records promote to reporter or official level. Nothing
> else in the app changes — the provenance layer is the interface.

**DO:** Scroll to **Runtime configuration**. Point at the line showing the model is configured.

**SAY:**

> And runtime configuration tells you the truth about the stack: which corpus is loaded, and whether
> the model is connected. Right now it is. In a minute I will show you what happens when it is not.

---

## ⭐ 09:30 – 13:30 · VERIFY A DOCUMENT — THE CORE DEMO

**DO:** Click **Verify** in the left rail.

**SAY:**

> Now the centre of the product.
>
> I have a written submission — a synthetic one I authored for this demo, not a real filing. It is a
> three-page brief arguing that a bank can enforce against a personal guarantor during a corporate
> moratorium. It cites six authorities. It reads perfectly competently.
>
> Four of those six citations are wrong, in four different ways. Let us see if CaseLens can tell them
> apart.

**DO:** Scroll down to **"How the checks are ordered"**. Walk the five steps with the cursor, ~5s each.

**SAY:**

> The order matters, so read it with me.
>
> **One, extract and normalize** — citations are located with their character offsets preserved, so
> every finding traces back to an exact span in the document.
> **Two, resolve by identifier** — exact identifier first, then fuzzy title match. Read the last
> sentence: *"Source data decides whether a record exists — no model is consulted at this step."*
> **Three, compare metadata** — title, year, reporter series and forum, field by field.
> **Four, check the words** — quoted passages matched against indexed judgment text, exact first,
> fuzzy second.
> **Five, assess the proposition** — and only here, only after a record has already been resolved
> deterministically, may a model contribute. And only to interpret text that was already retrieved.
>
> The model never decides whether an authority exists. That is the architectural guarantee.

**DO:** Scroll up. Click **Use the demo brief** (or drag the PDF onto the dropzone — dragging is more
convincing on camera if you can do it cleanly).

**SAY (over the stage ladder — let it run, do not cut):**

> And there is the stage ladder. This is not a spinner dressed up — these are the real pipeline
> stages reporting in.
>
> Extracting text. Detecting citations. Checking metadata against sources. Checking quoted paragraphs.
> Assessing proposition support. Complete.

**SCREEN:** Review workspace loads — source document on one side, findings, evidence panel.

**SAY:**

> Six citations found. Six verdicts. Let me read the board.

**DO:** Point at each finding pill in turn as you say it — ~5 seconds each, cursor resting on each pill.

> **Lalit Kumar Jain v. Union of India, (2021) 9 SCC 321** — VERIFIED.
> **Dr. Vishnu Kumar Agarwal v. Piramal Enterprises, Company Appeal (AT) (Insolvency) No. 346 of 2018** — VERIFIED.
> **State Bank of India v. V. Ramakrishnan, (2019) 17 SCC 394** — METADATA MISMATCH.
> **Essar Steel v. Satish Kumar Gupta, (2020) 8 SCC 531** — PARAGRAPH MISMATCH.
> **Ghanashyam Mishra v. Edelweiss ARC, (2021) 9 SCC 657** — WEAK PROPOSITION SUPPORT.
> **Pooja Ramesh Singh v. State Bank of India, 2026 INSC 668** — NO AUTHORITATIVE MATCH.
>
> Four distinct failure modes, from one document, in one pass. Now let us open them.

---

## ⭐ 13:30 – 15:30 · EVIDENCE DEEP DIVE

### ⭐ Finding 1 — METADATA_MISMATCH (the subtle one)

**DO:** Click the **V. Ramakrishnan** finding. Open **Claimed vs. authoritative**.

**SAY:**

> The brief cites it as **(2019) 17 SCC 394**. The indexed record is **(2018) 17 SCC 394**, decided
> 14 August 2018.
>
> One digit. The case is real, the volume is right, the page is right, the proposition is right.
> Only the year is wrong — and that is exactly the error a human proof-reader slides past at
> 2 a.m. and a string-matcher never catches.

**DO:** Scroll the side-by-side table so both columns are readable. **Pause 3 seconds.**

> Claimed on the left, authoritative on the right, field by field. Below it, the matched authority
> with **Record source** — click through and you land back on the dossier we were just reading.

### ⭐ Finding 2 — NO_AUTHORITATIVE_MATCH (the headline moment)

**DO:** Click the **Pooja Ramesh Singh, 2026 INSC 668** finding.

**SAY:**

> And here is the one that matters most.
>
> The brief cites *Pooja Ramesh Singh v. State Bank of India, 2026 INSC 668*, quotes eleven lines from
> its paragraph 18, and calls it "directly binding on this Adjudicating Authority." It is the most
> confidently written paragraph in the entire document.
>
> There is no such authority in the index.

**DO:** Rest the cursor on the finding text. **Pause 3 seconds so the wording is readable.**

> And now read what CaseLens actually says — because this is the line I care about more than any
> other in the product:
>
> *"No record in the connected sources carries this citation or a comparable title. This reports the
> limits of those sources — it is not a finding that the authority does not exist."*
>
> It would be so easy to print "FABRICATED" there. It would demo better. It would also, one day, be
> wrong — about a genuine unreported judgment, a regional bench, a case the index simply does not
> cover. A tool that cries fabrication and is wrong once destroys its own credibility permanently.
> So CaseLens reports its own coverage and hands the judgement to the lawyer. That is the ethic of
> the whole system in one sentence.

### Finding 3 — PARAGRAPH_MISMATCH (cover briefly)

**DO:** Click the **Essar Steel** finding. Open **Quoted passage**.

**SAY:**

> Essar Steel. Citation correct, metadata correct — and note the engine correctly does *not* flag
> that the reporter year 2020 differs from the decision year 2019, because for reporters that is
> normal and a naive checker would false-positive there.
>
> What *is* wrong is the quotation. The words attributed to paragraph 67 do not appear in the indexed
> text of paragraph 67. The claimed quote and the indexed passage are shown side by side, with
> **Passage source** underneath.

**DO:** Expand **Checks run**, show the list of individual checks with their outcomes.

**SAY:**

> And every finding shows its work — the full list of checks that ran, each marked deterministic
> or model-assisted, so you always know which part of the verdict came from source data and which
> from inference.

---

## ⭐ 15:30 – 17:30 · GENAI IN ACTION

### ⭐ Part A — the model inside verification

**DO:** Click the **Ghanashyam Mishra** finding. Scroll to the check labelled
**"Proposition support (model-assisted)"**.

**SAY:**

> This is the first place generative AI touches the system, and it is deliberately the *fifth* step,
> not the first.
>
> The brief says Ghanashyam Mishra establishes that a secured creditor forfeits its right to enforce
> a personal guarantee if it voted for the resolution plan. The citation is correct. The authority is
> real. The proposition is not in it.
>
> Catching that is not a string comparison — it is a reading-comprehension problem, and that is what
> the model is for. Look at the check: **"Proposition support (model-assisted)"**, marked
> non-deterministic, with the model version stamped on it, and this disclaimer attached:

**DO:** Highlight the detail text. **Pause 2 seconds.**

> *"This step interprets the retrieved paragraphs only; the existence and metadata of the authority
> were established by source lookup, not by the model."*

### ⭐ Part B — grounded research, live

**DO:** Click **Research** in the left rail.

**SAY:**

> Second place: grounded research. Retrieval runs first and is deterministic; anything written
> afterwards is tied to the passages it rests on.

**DO:** Click into the question field. **Type slowly and let it be read:**

```
Does the Section 14 moratorium bar enforcement against a personal guarantor?
```

**Pause 2 seconds.** Click **Ask**. Let the "Retrieving…" state play.

**SAY (over the result):**

> **Grounded synthesis**, with the exact model version stamped in the corner.
>
> And then the part that makes it usable: every claim is a separate row, with a confidence level and
> the **paragraph IDs it rests on**. Not a footnote. Not a citation the model wrote from memory — the
> actual retrieved passage, expandable inline.

**DO:** Expand a claim's supporting passage. Show it is paragraph 26 of the SC judgment — the same one
from 04:00.

**SAY:**

> There it is again — paragraph 26. The same indexed text I read in the dossier twelve minutes ago.
> Not a paraphrase of it. The same record.
>
> And the answer does not stop at the answer: it lists **limitations** where the retrieved records do
> not settle the question, and concrete **next steps**. A research tool that never says "I don't
> know" is not a research tool.

### ⭐ Part C — proving it is dynamic, not scripted

**SAY:**

> Judges always ask whether this is hardcoded. So let me change the input and let you watch the
> output change.

**DO:** Clear the field. **Type slowly:**

```
Does approval of a resolution plan discharge a personal guarantor?
```

**Pause 2 seconds.** Ask.

**SAY:**

> Different question, different retrieval set, different claims, different supporting paragraphs —
> it has pulled Lalit Kumar Jain instead, because that is where the answer actually lives.

### Part D — the edge case: a question the corpus cannot answer

**DO:** Clear the field. **Type slowly:**

```
What is the limitation period for a suit on a promissory note?
```

**Pause 2 seconds.** Ask.

**SAY:**

> Nothing in this index addresses limitation periods. So instead of inventing a confident answer,
> the system reports that the retrieved records do not settle the question and says so in the
> limitations. The failure mode is under-claiming, never over-claiming.

**DO (optional, 15 seconds — only if you have the time budget):** Switch to the code tab,
show `server/ai/gemini.ts` — the Zod schema and the comment block at the top.

**SAY:**

> One implementation note. Every model response is parsed against a strict schema and **discarded**
> if it does not conform — a malformed answer degrades to the deterministic result rather than being
> shown. And any paragraph ID the model produces that was not in the retrieved set is dropped before
> render. The model physically cannot cite a paragraph that does not exist.
>
> If the key is removed entirely, the app does not break — verification stays fully deterministic,
> and research returns the retrieved passages under the heading "Retrieved passages" instead of a
> synthesis. Honest degradation, not a crash.

---

## ⭐ 17:30 – 18:45 · THE INVESTIGATION BOARD

**DO:** Go back to the review workspace. Click **Pin finding to board** on the Pooja Ramesh Singh
finding, then **Pin authority** on the Ramakrishnan match. Navigate to **Investigate**.

**SAY:**

> Findings are only useful if they survive the session. Everything I pin lands on an investigation
> board — a spatial workspace for one matter.

**DO:** Drag a card to reposition it. Show the position persisting.

> Cases, statutory provisions, verification findings, paragraphs, notes — all on one canvas, each
> card keeping the provenance it arrived with.

**DO:** Open the **Card inspector** on the pinned finding. Show **Card provenance**.

**SAY:**

> Card inspector, card provenance. The evidence rides along with the card.

**DO:** Use the link control to connect two cards. Then add a note card and **type live:**

```
Brief's strongest paragraph rests on an authority with no record in our sources — raise before filing.
```

**SAY:**

> And notes. Read the placeholder text, because it is another one of those deliberate lines:
> *"Notes are marked as user-authored and never presented as authority."*
>
> My reasoning is on the same board as the evidence, and the system keeps them permanently
> distinguishable.

---

## ⭐ 18:45 – 19:30 · REPORTS & EXPORT

**DO:** Click **Export investigation report**.

**SAY:**

> And then it leaves the tool. Export investigation report.

**DO:** Let the report render. Scroll it slowly.

> Every entry in this report is followed by the sources behind it. There is no separate export
> pipeline that can drift out of sync with the app — this is the same evidence objects, print-styled.

**DO:** Click **Print or save as PDF**. Show the print preview, then cancel out.

**DO:** Navigate back to the document review, click **Legal integrity report**.

**SAY:**

> And the other export: the legal integrity report. This is the artefact a senior counsel actually
> wants — one document saying which of the six citations in this brief hold up, which do not, in what
> way, and what the source says instead.
>
> That is a page you can hand to the person who signs the filing.

---

## ⭐ 19:30 – 20:00 · CLOSE

**DO:** Navigate back to the landing page. Let the closing line sit on screen.

**SAY:**

> So, to close.
>
> CaseLens searches a legal corpus, opens a full dossier, traces one matter across three forums,
> maps evidenced relationships between authorities, verifies every citation, quotation and
> proposition in an uploaded document, distinguishes four different ways a citation can fail,
> assembles the findings on an investigation board, and exports a report where every line carries
> its source.
>
> Generative AI does two jobs in that stack — judging whether an authority bears out a proposition,
> and synthesising retrieved passages into an answer. It does not decide what exists. It never
> touches a record it was not handed. Its output is schema-validated and thrown away if it
> misbehaves. And it is stamped, every single time, as model-assisted.
>
> Because the point was never to build something that sounds authoritative.

**DO:** Cursor rests on the closing line.

> *CaseLens does not ask users to trust AI. It lets them trace every conclusion back to evidence.*
>
> Thank you.

---
---

# 4-MINUTE SUBMISSION CUT SHEET

Same recording, edited down. Target **3:50** to leave headroom.

| # | Beat | Source timecode | Length | Submission criterion |
|---|------|-----------------|--------|---------------------|
| 1 | Cold open — the 2023 filing + hero line | 00:00–00:35 | 0:25 | Presentation |
| 2 | Live search, typed on screen | 02:30–02:55 | 0:20 | **Live testing** |
| 3 | Empty-state edge case | 03:10–03:30 | 0:15 | **Edge case** |
| 4 | Dossier: para 26 + three-forum chronology | 04:00–05:30 | 0:30 | Walkthrough |
| 5 | Upload demo brief + stage ladder (uncut) | 11:00–11:25 | 0:25 | **Live testing** |
| 6 | Six findings read out | 12:40–13:10 | 0:20 | Walkthrough |
| 7 | METADATA_MISMATCH — the one-digit year | 13:30–14:00 | 0:20 | **Edge case** |
| 8 | NO_AUTHORITATIVE_MATCH + the refusal to say "fabricated" | 14:00–14:50 | 0:35 | **Edge case**, GenAI ethics |
| 9 | "Proposition support (model-assisted)" check | 15:30–15:55 | 0:20 | **GenAI in action** |
| 10 | Research: question typed live → grounded synthesis with paragraph IDs | 16:10–16:50 | 0:30 | **GenAI in action** |
| 11 | Second question → different output | 17:00–17:20 | 0:15 | **Proves dynamic, not hardcoded** |
| 12 | Pin to board (live) | 17:30–17:50 | 0:10 | Walkthrough |
| 13 | Export integrity report | 19:00–19:20 | 0:15 | Walkthrough |
| 14 | Closing line | 19:50–20:00 | 0:10 | Presentation |
| | | | **≈ 3:50** | |

### Condensed VO for the 4-minute cut

> A lawyer once filed a brief with six citations that did not exist. He had no way to check. This is
> CaseLens — it lets you check.
>
> I search the corpus for "personal guarantor moratorium" — five authorities, each with a doctrinal
> status. Search something the index does not hold and it says so honestly: no authority in the
> connected sources matches.
>
> Opening the Supreme Court decision: paragraph 26, tagged as ratio, and the procedural chronology —
> the same matter across NCLT, NCLAT and the Supreme Court. Two of those three stages are overruled.
>
> Now I upload a written submission that cites six authorities. Watch the real pipeline stages:
> extract, detect citations, check metadata, check quoted paragraphs, assess propositions.
>
> Six verdicts. Two verified, and four failures that are not the same failure.
>
> Ramakrishnan is cited as 2019 — the record is 2018. One digit.
>
> And this one: quoted at length, called directly binding, and there is no such authority in the
> index. But read what CaseLens says — "no record in the connected sources carries this citation.
> This reports the limits of those sources, it is not a finding that the authority does not exist."
> It refuses to cry fabrication, because being wrong about that once would destroy the tool's
> credibility forever.
>
> Here is where generative AI runs. Step five of five, after the record has already been resolved
> from source data: a Gemini call that reads the retrieved paragraphs and judges whether they bear
> out the drafter's proposition. Marked model-assisted, version stamped.
>
> And grounded research — I type a question, and every claim comes back tied to the paragraph IDs it
> rests on, with limitations and next steps. Different question, different retrieval, different
> answer — nothing here is hardcoded.
>
> I pin the finding to an investigation board, and export a legal integrity report where every line
> carries its source.
>
> CaseLens does not ask users to trust AI. It lets them trace every conclusion back to evidence.

---

# SUBMISSION CHECKLIST MAPPING

| Requirement | Where it is satisfied |
|---|---|
| Walkthrough of all core features in logical order | Beats 1–14, following the product's own six-step loop |
| Data entered live, not pre-filled | Search query, second search, document upload, two research questions, board note — all typed on camera |
| Success **and** error/edge cases | VERIFIED findings vs. four failure modes; empty search result; unanswerable research question |
| Test inputs clearly readable | Every typed value carries an explicit **pause 2 seconds** direction |
| GenAI usage clearly pointed out | 15:30–17:30 is dedicated to it; the model-assisted check is named on screen |
| AI responses shown to be dynamic | Part C — two different questions, two different outputs, live |
| Each step easy to follow | Numbered stage ladder on screen; narration names each step as it happens |
| Under 4 minutes | Use the cut sheet — ≈3:50 |
| Upload + incognito test | Do this last, before submitting the link |
