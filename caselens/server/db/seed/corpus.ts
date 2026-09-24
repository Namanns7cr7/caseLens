/**
 * CaseLens curated demo corpus.
 *
 * Doctrinal line: whether the Section 14 IBC moratorium shields a personal
 * guarantor whose liability arises under Section 128 of the Indian Contract
 * Act. It was chosen because it supplies everything DATA_PIPELINE.md requires
 * of the MVP corpus:
 *
 *   - a genuine procedural chain across three forums
 *     (NCLT Chennai -> NCLAT -> Supreme Court, in V. Ramakrishnan);
 *   - real citation relationships between the authorities;
 *   - a real cautionary/anomaly precedent (Vishnu Kumar Agarwal);
 *   - statutory provisions connected to the cases.
 *
 * PROVENANCE DISCIPLINE (LEGAL_DATA_RULES.md)
 * -------------------------------------------
 * NOTHING IN THIS FILE WAS RETRIEVED FROM ANY SOURCE.
 *
 * Every record here — case metadata, statutory text and judgment passages
 * alike — was written from model recollection for this demonstration. No
 * request was ever made to the Supreme Court portal, the NCLAT site, India
 * Code, or anywhere else.
 *
 * Consequently every record carries authorityLevel "DEMO", and none carries
 * a `retrievedAt` date. The `sourceUrl` on each record is where a reader
 * should go to CHECK it, not where it came from.
 *
 * The metadata may well be right — these are well-known authorities — but
 * "probably right from memory" is not provenance, and a tool that exists to
 * catch unsupported citations must not make unsupported claims of its own.
 * Treat every fact here as unverified until replaced per `docs/CORPUS.md`.
 *
 * The fictional authority used by the Stitch mock ("Pooja Ramesh Singh v.
 * State Bank of India, 2026 INSC 668") is deliberately absent from this
 * corpus. It appears only inside the demo brief as a citation with no
 * authoritative match — that is the anomaly the verification engine surfaces.
 */

import type {
  CaseProvisionRelation,
  CourtLevel,
  DoctrinalStatus,
  PartyRole,
  ProvisionType,
  RelationshipType,
} from "@/types/domain";

/**
 * No record in this corpus was retrieved from any source, so no record
 * carries a retrieval date. See the PROVENANCE DISCIPLINE note above.
 */
export const METADATA_NOTE =
  "Unverified. Case metadata was written from model recollection for this demo, not retrieved from this source. The link is where to check it.";

export const DEMO_TEXT_NOTE =
  "Curated demo abstract of the holding — not verbatim judgment text, and not retrieved from this source. Replace with verified source text before relying on this passage.";

export const STATUTE_NOTE =
  "Unverified. Statutory text was written from model recollection for this demo, not retrieved from India Code. The link is where to check the current text.";

export const DEMO_OWNER_ID = "demo-user";

/* ------------------------------------------------------------------ */
/* Courts                                                              */
/* ------------------------------------------------------------------ */

export interface SeedCourt {
  id: string;
  name: string;
  shortName: string;
  level: CourtLevel;
  jurisdiction: string;
  state?: string;
  sourceKey: string;
}

export const SEED_COURTS: SeedCourt[] = [
  {
    id: "sci",
    name: "Supreme Court of India",
    shortName: "SC",
    level: "SUPREME_COURT",
    jurisdiction: "India",
    sourceKey: "sci",
  },
  {
    id: "nclat",
    name: "National Company Law Appellate Tribunal",
    shortName: "NCLAT",
    level: "TRIBUNAL",
    jurisdiction: "India",
    state: "New Delhi",
    sourceKey: "nclat",
  },
  {
    id: "nclt-chennai",
    name: "National Company Law Tribunal, Chennai Bench",
    shortName: "NCLT Chennai",
    level: "TRIBUNAL",
    jurisdiction: "India",
    state: "Tamil Nadu",
    sourceKey: "nclt-chennai",
  },
  {
    id: "delhi-hc",
    name: "High Court of Delhi",
    shortName: "Delhi HC",
    level: "HIGH_COURT",
    jurisdiction: "India",
    state: "Delhi",
    sourceKey: "delhi-hc",
  },
];

/* ------------------------------------------------------------------ */
/* Judges                                                              */
/* ------------------------------------------------------------------ */

export interface SeedJudge {
  id: string;
  name: string;
}

export const SEED_JUDGES: SeedJudge[] = [
  { id: "rf-nariman", name: "R. F. Nariman, J." },
  { id: "indu-malhotra", name: "Indu Malhotra, J." },
  { id: "l-nageswara-rao", name: "L. Nageswara Rao, J." },
  { id: "s-ravindra-bhat", name: "S. Ravindra Bhat, J." },
  { id: "dy-chandrachud", name: "Dr. D. Y. Chandrachud, J." },
  { id: "mr-shah", name: "M. R. Shah, J." },
  { id: "sk-mukhopadhaya", name: "S. J. Mukhopadhaya, Chairperson (NCLAT)" },
  { id: "bansi-lal-bhat", name: "Bansi Lal Bhat, Member (Judicial)" },
];

/* ------------------------------------------------------------------ */
/* Parties                                                             */
/* ------------------------------------------------------------------ */

export interface SeedParty {
  id: string;
  name: string;
  entityType: "INDIVIDUAL" | "COMPANY" | "STATE" | "BANK" | "AUTHORITY";
}

export const SEED_PARTIES: SeedParty[] = [
  { id: "sbi", name: "State Bank of India", entityType: "BANK" },
  { id: "v-ramakrishnan", name: "V. Ramakrishnan", entityType: "INDIVIDUAL" },
  { id: "veesons", name: "Veesons Energy Systems Pvt. Ltd.", entityType: "COMPANY" },
  { id: "lalit-kumar-jain", name: "Lalit Kumar Jain", entityType: "INDIVIDUAL" },
  { id: "union-of-india", name: "Union of India", entityType: "STATE" },
  { id: "vishnu-kumar-agarwal", name: "Dr. Vishnu Kumar Agarwal", entityType: "INDIVIDUAL" },
  { id: "piramal", name: "Piramal Enterprises Ltd.", entityType: "COMPANY" },
  { id: "essar-coc", name: "Committee of Creditors of Essar Steel India Ltd.", entityType: "AUTHORITY" },
  { id: "satish-gupta", name: "Satish Kumar Gupta", entityType: "INDIVIDUAL" },
  { id: "ghanashyam-mishra", name: "Ghanashyam Mishra & Sons Pvt. Ltd.", entityType: "COMPANY" },
  { id: "edelweiss-arc", name: "Edelweiss Asset Reconstruction Co. Ltd.", entityType: "COMPANY" },
];

/* ------------------------------------------------------------------ */
/* Statutes and provisions                                             */
/* ------------------------------------------------------------------ */

export interface SeedStatute {
  id: string;
  title: string;
  shortTitle: string;
  jurisdiction: string;
  sourceUrl: string;
}

export const SEED_STATUTES: SeedStatute[] = [
  {
    id: "ibc-2016",
    title: "Insolvency and Bankruptcy Code, 2016",
    shortTitle: "IBC",
    jurisdiction: "India",
    sourceUrl: "https://www.indiacode.nic.in/handle/123456789/2154",
  },
  {
    id: "ica-1872",
    title: "Indian Contract Act, 1872",
    shortTitle: "ICA",
    jurisdiction: "India",
    sourceUrl: "https://www.indiacode.nic.in/handle/123456789/2187",
  },
  {
    id: "sarfaesi-2002",
    title: "Securitisation and Reconstruction of Financial Assets and Enforcement of Security Interest Act, 2002",
    shortTitle: "SARFAESI",
    jurisdiction: "India",
    sourceUrl: "https://www.indiacode.nic.in/handle/123456789/2006",
  },
];

export interface SeedProvision {
  id: string;
  statuteId: string;
  provisionType: ProvisionType;
  provisionNumber: string;
  heading: string;
  text: string;
  label: string;
  sourceUrl: string;
}

export const SEED_PROVISIONS: SeedProvision[] = [
  {
    id: "ibc-s14",
    statuteId: "ibc-2016",
    provisionType: "SECTION",
    provisionNumber: "14",
    heading: "Moratorium",
    text: "On the insolvency commencement date, the Adjudicating Authority shall by order declare a moratorium prohibiting the institution or continuation of suits or proceedings against the corporate debtor, transferring or disposing of its assets, any action to foreclose or enforce a security interest over the property of the corporate debtor, and the recovery of property occupied by the corporate debtor.",
    label: "§ 14 IBC",
    sourceUrl: "https://www.indiacode.nic.in/handle/123456789/2154",
  },
  {
    id: "ibc-s31",
    statuteId: "ibc-2016",
    provisionType: "SECTION",
    provisionNumber: "31",
    heading: "Approval of resolution plan",
    text: "Where the Adjudicating Authority is satisfied that the resolution plan as approved by the committee of creditors meets the requirements of the Code, it shall by order approve the plan, which shall be binding on the corporate debtor, its employees, members, creditors, guarantors and other stakeholders involved in the resolution plan.",
    label: "§ 31 IBC",
    sourceUrl: "https://www.indiacode.nic.in/handle/123456789/2154",
  },
  {
    id: "ibc-s60",
    statuteId: "ibc-2016",
    provisionType: "SECTION",
    provisionNumber: "60",
    heading: "Adjudicating Authority for corporate persons",
    text: "The Adjudicating Authority in relation to insolvency resolution and liquidation for corporate persons including corporate debtors and personal guarantors thereof shall be the National Company Law Tribunal having territorial jurisdiction over the place where the registered office of the corporate person is located.",
    label: "§ 60 IBC",
    sourceUrl: "https://www.indiacode.nic.in/handle/123456789/2154",
  },
  {
    id: "ibc-s95",
    statuteId: "ibc-2016",
    provisionType: "SECTION",
    provisionNumber: "95",
    heading: "Application by creditor to initiate insolvency resolution process",
    text: "A creditor may apply either by itself, or jointly with other creditors, or through a resolution professional to the Adjudicating Authority for initiating an insolvency resolution process under this Chapter by submitting an application in respect of a guarantor in relation to a debt.",
    label: "§ 95 IBC",
    sourceUrl: "https://www.indiacode.nic.in/handle/123456789/2154",
  },
  {
    id: "ica-s128",
    statuteId: "ica-1872",
    provisionType: "SECTION",
    provisionNumber: "128",
    heading: "Surety's liability",
    text: "The liability of the surety is co-extensive with that of the principal debtor, unless it is otherwise provided by the contract.",
    label: "§ 128 ICA",
    sourceUrl: "https://www.indiacode.nic.in/handle/123456789/2187",
  },
  {
    id: "ica-s134",
    statuteId: "ica-1872",
    provisionType: "SECTION",
    provisionNumber: "134",
    heading: "Discharge of surety by release or discharge of principal debtor",
    text: "The surety is discharged by any contract between the creditor and the principal debtor, by which the principal debtor is released, or by any act or omission of the creditor, the legal consequence of which is the discharge of the principal debtor.",
    label: "§ 134 ICA",
    sourceUrl: "https://www.indiacode.nic.in/handle/123456789/2187",
  },
  {
    id: "sarfaesi-s13",
    statuteId: "sarfaesi-2002",
    provisionType: "SECTION",
    provisionNumber: "13",
    heading: "Enforcement of security interest",
    text: "Any security interest created in favour of any secured creditor may be enforced, without the intervention of the court or tribunal, by such creditor in accordance with the provisions of this Act.",
    label: "§ 13 SARFAESI",
    sourceUrl: "https://www.indiacode.nic.in/handle/123456789/2006",
  },
];

/* ------------------------------------------------------------------ */
/* Cases                                                               */
/* ------------------------------------------------------------------ */

export interface SeedParagraph {
  number: string;
  text: string;
  isRatio?: boolean;
}

export interface SeedCase {
  id: string;
  title: string;
  shortTitle: string;
  courtId: string;
  decisionDate: string;
  neutralCitation?: string;
  reporterCitations: string[];
  caseNumber?: string;
  benchStrength: number;
  doctrinalStatus: DoctrinalStatus;
  summary: string;
  issues: string[];
  sourceAuthority: string;
  sourceUrl: string;
  judges: string[];
  authoringJudge?: string;
  parties: Array<{ partyId: string; role: PartyRole }>;
  provisions: Array<{ provisionId: string; relationType: CaseProvisionRelation; paragraph?: string }>;
  paragraphs: SeedParagraph[];
  /** Approximate count of subsequent citing authorities, used for ranking only. */
  citationCount: number;
}

export const SEED_CASES: SeedCase[] = [
  {
    id: "sbi-v-ramakrishnan-nclt-2017",
    title: "State Bank of India v. Veesons Energy Systems Pvt. Ltd. (Moratorium Application)",
    shortTitle: "SBI v. Veesons (NCLT)",
    courtId: "nclt-chennai",
    decisionDate: "2017-12-18",
    reporterCitations: [],
    caseNumber: "CP/605/(IB)/CB/2017",
    benchStrength: 2,
    doctrinalStatus: "OVERRULED",
    summary:
      "The Adjudicating Authority restrained the financial creditor from proceeding against the personal guarantor during the corporate insolvency resolution process, treating the Section 14 moratorium as extending to the guarantor's property.",
    issues: [
      "Whether a moratorium declared under Section 14 IBC bars enforcement against a personal guarantor",
      "Scope of the expression 'the corporate debtor' in Section 14(1)",
    ],
    sourceAuthority: "National Company Law Tribunal, Chennai Bench",
    sourceUrl: "https://nclt.gov.in/",
    judges: [],
    parties: [
      { partyId: "sbi", role: "PETITIONER" },
      { partyId: "veesons", role: "RESPONDENT" },
      { partyId: "v-ramakrishnan", role: "RESPONDENT" },
    ],
    provisions: [
      { provisionId: "ibc-s14", relationType: "APPLIES", paragraph: "7" },
      { provisionId: "ica-s128", relationType: "MENTIONS", paragraph: "9" },
    ],
    citationCount: 4,
    paragraphs: [
      {
        number: "7",
        text: "Having regard to the object of the Code, the moratorium declared under Section 14 is intended to preserve the corporate debtor as a going concern. The financial creditor is accordingly restrained from proceeding against the personal guarantor during the currency of the moratorium, since recovery against the guarantor would in substance be recovery of the same debt.",
        isRatio: true,
      },
      {
        number: "9",
        text: "While the liability of a surety under Section 128 of the Indian Contract Act is co-extensive with that of the principal debtor, the statutory moratorium operates as a temporary bar on enforcement and does not extinguish that liability.",
      },
    ],
  },
  {
    id: "sbi-v-ramakrishnan-nclat-2018",
    title: "State Bank of India v. V. Ramakrishnan & Anr. (NCLAT)",
    shortTitle: "SBI v. Ramakrishnan (NCLAT)",
    courtId: "nclat",
    decisionDate: "2018-02-28",
    reporterCitations: [],
    caseNumber: "Company Appeal (AT) (Insolvency) No. 213 of 2017",
    benchStrength: 2,
    doctrinalStatus: "OVERRULED",
    summary:
      "The Appellate Tribunal affirmed the Adjudicating Authority and held that the moratorium under Section 14 IBC would also cover the personal guarantor, so enforcement against the guarantor's assets could not proceed during the resolution process.",
    issues: [
      "Whether the Section 14 moratorium extends to personal guarantors of the corporate debtor",
      "Effect of Section 60(2) and (3) IBC on proceedings against guarantors",
    ],
    sourceAuthority: "National Company Law Appellate Tribunal",
    sourceUrl: "https://nclat.nic.in/",
    judges: ["sk-mukhopadhaya", "bansi-lal-bhat"],
    authoringJudge: "sk-mukhopadhaya",
    parties: [
      { partyId: "sbi", role: "APPELLANT" },
      { partyId: "v-ramakrishnan", role: "RESPONDENT" },
    ],
    provisions: [
      { provisionId: "ibc-s14", relationType: "INTERPRETS", paragraph: "31" },
      { provisionId: "ibc-s60", relationType: "APPLIES", paragraph: "33" },
      { provisionId: "ica-s128", relationType: "MENTIONS", paragraph: "35" },
    ],
    citationCount: 18,
    paragraphs: [
      {
        number: "31",
        text: "Reading Section 14 with Section 60, we are of the view that the moratorium is not confined to the assets of the corporate debtor alone. Where a personal guarantee has been furnished for the very debt in respect of which the corporate insolvency resolution process has commenced, permitting parallel enforcement against the guarantor would defeat the resolution process.",
        isRatio: true,
      },
      {
        number: "33",
        text: "Section 60(2) requires that an insolvency resolution process against a personal guarantor be filed before the same Adjudicating Authority seized of the corporate debtor's process. That legislative design indicates that the two proceedings were intended to move together.",
      },
      {
        number: "35",
        text: "The co-extensive liability recognised by Section 128 of the Indian Contract Act is not disturbed. What is deferred is only the creditor's ability to enforce that liability while the moratorium subsists.",
      },
    ],
  },
  {
    id: "sbi-v-ramakrishnan-sc-2018",
    title: "State Bank of India v. V. Ramakrishnan & Anr.",
    shortTitle: "SBI v. V. Ramakrishnan (2018)",
    courtId: "sci",
    decisionDate: "2018-08-14",
    neutralCitation: "2018 INSC 712",
    reporterCitations: ["(2018) 17 SCC 394"],
    caseNumber: "Civil Appeal No. 3595 of 2018",
    benchStrength: 2,
    doctrinalStatus: "BINDING_LANDMARK",
    summary:
      "The Supreme Court set aside the NCLAT and held that the moratorium under Section 14 IBC applies only to the corporate debtor and does not bar proceedings against the personal guarantor, whose liability under Section 128 of the Indian Contract Act is co-extensive and independently enforceable.",
    issues: [
      "Whether Section 14 IBC bars proceedings against a personal guarantor of the corporate debtor",
      "Whether the co-extensive liability of a surety survives the corporate moratorium",
    ],
    sourceAuthority: "Supreme Court of India",
    sourceUrl: "https://main.sci.gov.in/judgments",
    judges: ["rf-nariman", "indu-malhotra"],
    authoringJudge: "rf-nariman",
    parties: [
      { partyId: "sbi", role: "APPELLANT" },
      { partyId: "v-ramakrishnan", role: "RESPONDENT" },
    ],
    provisions: [
      { provisionId: "ibc-s14", relationType: "INTERPRETS", paragraph: "26" },
      { provisionId: "ica-s128", relationType: "APPLIES", paragraph: "27" },
      { provisionId: "ibc-s60", relationType: "MENTIONS", paragraph: "24" },
    ],
    citationCount: 894,
    paragraphs: [
      {
        number: "24",
        text: "Section 60(2) and (3) deal with the forum before which an insolvency resolution process against a personal guarantor is to be filed, and with the transfer of pending proceedings. Those provisions govern venue; they do not enlarge the subject matter of the moratorium declared under Section 14.",
      },
      {
        number: "26",
        text: "Section 14 refers to the corporate debtor alone. The assets of a personal guarantor stand outside the sweep of the moratorium. The legislative intention was not to grant a stay on actions against personal guarantors, who continue to be bound by their contracts of guarantee.",
        isRatio: true,
      },
      {
        number: "27",
        text: "The liability of the surety under Section 128 of the Indian Contract Act is co-extensive with that of the principal debtor unless the contract provides otherwise. Nothing in the Code displaces that rule during the corporate insolvency resolution process, and the creditor may proceed against the guarantor independently.",
        isRatio: true,
      },
      {
        number: "29",
        text: "The judgment of the Appellate Tribunal dated 28 February 2018 is accordingly set aside, and the appeal of the financial creditor is allowed.",
      },
    ],
  },
  {
    id: "vishnu-agarwal-v-piramal-nclat-2019",
    title: "Dr. Vishnu Kumar Agarwal v. Piramal Enterprises Ltd.",
    shortTitle: "Vishnu Kumar Agarwal (2019)",
    courtId: "nclat",
    decisionDate: "2019-01-08",
    reporterCitations: [],
    caseNumber: "Company Appeal (AT) (Insolvency) No. 346 of 2018",
    benchStrength: 2,
    doctrinalStatus: "DISTINGUISHED",
    summary:
      "The Appellate Tribunal held that once a corporate insolvency resolution process has been initiated against one corporate guarantor for a particular debt, a second process for the same debt against another corporate guarantor is not maintainable.",
    issues: [
      "Whether simultaneous insolvency proceedings lie against two guarantors for the same debt",
      "Scope of the bar on double recovery in the insolvency framework",
    ],
    sourceAuthority: "National Company Law Appellate Tribunal",
    sourceUrl: "https://nclat.nic.in/",
    judges: ["sk-mukhopadhaya", "bansi-lal-bhat"],
    authoringJudge: "sk-mukhopadhaya",
    parties: [
      { partyId: "vishnu-kumar-agarwal", role: "APPELLANT" },
      { partyId: "piramal", role: "RESPONDENT" },
    ],
    provisions: [
      { provisionId: "ibc-s95", relationType: "INTERPRETS", paragraph: "37" },
      { provisionId: "ica-s128", relationType: "MENTIONS", paragraph: "40" },
    ],
    citationCount: 212,
    paragraphs: [
      {
        number: "37",
        text: "There is no bar in the Code to filing simultaneously two applications under Section 7 against the principal borrower as well as the corporate guarantor, or against both guarantors. However, once such an application is admitted against one of them, a second application by the same financial creditor for the same set of claims and the same debt cannot be admitted against the other.",
        isRatio: true,
      },
      {
        number: "40",
        text: "The contractual liability of a guarantor under Section 128 of the Indian Contract Act is not extinguished by this conclusion; what is barred is the parallel invocation of the insolvency machinery twice over for a single default.",
      },
    ],
  },
  {
    id: "lalit-kumar-jain-2021",
    title: "Lalit Kumar Jain v. Union of India & Ors.",
    shortTitle: "Lalit Kumar Jain (2021)",
    courtId: "sci",
    decisionDate: "2021-05-21",
    neutralCitation: "2021 INSC 319",
    reporterCitations: ["(2021) 9 SCC 321"],
    caseNumber: "Transferred Case (Civil) No. 245 of 2020",
    benchStrength: 2,
    doctrinalStatus: "BINDING_LANDMARK",
    summary:
      "The Supreme Court upheld the notification bringing personal guarantors to corporate debtors within the insolvency framework and held that approval of a resolution plan in respect of a corporate debtor does not by itself discharge the personal guarantor of liability.",
    issues: [
      "Validity of the notification extending Part III of the Code to personal guarantors",
      "Whether approval of a resolution plan discharges a personal guarantor",
      "Interaction between Section 31 IBC and Section 134 of the Indian Contract Act",
    ],
    sourceAuthority: "Supreme Court of India",
    sourceUrl: "https://main.sci.gov.in/judgments",
    judges: ["l-nageswara-rao", "s-ravindra-bhat"],
    authoringJudge: "s-ravindra-bhat",
    parties: [
      { partyId: "lalit-kumar-jain", role: "PETITIONER" },
      { partyId: "union-of-india", role: "RESPONDENT" },
    ],
    provisions: [
      { provisionId: "ibc-s31", relationType: "INTERPRETS", paragraph: "125" },
      { provisionId: "ica-s128", relationType: "APPLIES", paragraph: "125" },
      { provisionId: "ica-s134", relationType: "INTERPRETS", paragraph: "127" },
      { provisionId: "ibc-s95", relationType: "APPLIES", paragraph: "111" },
    ],
    citationCount: 1280,
    paragraphs: [
      {
        number: "111",
        text: "The impugned notification is not an instance of legislative exercise, or amounting to impermissible delegated legislation. It is a conditional legislation brought into force in respect of a class of persons, namely personal guarantors to corporate debtors, and is within the authority conferred by the Code.",
      },
      {
        number: "125",
        text: "Approval of a resolution plan relating to a corporate debtor does not operate so as to discharge the liabilities of the guarantors of that corporate debtor. The guarantee is an independent contract, and the surety's liability under Section 128 of the Indian Contract Act is not displaced merely because the principal debt has been restructured through the resolution process.",
        isRatio: true,
      },
      {
        number: "127",
        text: "The release or discharge of a principal borrower from the debt by an involuntary process, that is by operation of law, or due to liquidation or insolvency proceedings, does not absolve the surety of liability, which arises out of an independent contract.",
        isRatio: true,
      },
    ],
  },
  {
    id: "essar-steel-coc-2019",
    title: "Committee of Creditors of Essar Steel India Ltd. v. Satish Kumar Gupta & Ors.",
    shortTitle: "Essar Steel (CoC) (2019)",
    courtId: "sci",
    decisionDate: "2019-11-15",
    neutralCitation: "2019 INSC 1236",
    reporterCitations: ["(2020) 8 SCC 531"],
    caseNumber: "Civil Appeal No. 8766-67 of 2019",
    benchStrength: 3,
    doctrinalStatus: "BINDING_LANDMARK",
    summary:
      "The Supreme Court affirmed the primacy of the commercial wisdom of the committee of creditors in approving a resolution plan, and held that a successful resolution applicant takes over the corporate debtor on a clean slate, free of undecided claims.",
    issues: [
      "Extent of judicial review over the commercial wisdom of the committee of creditors",
      "Whether claims not part of the approved resolution plan survive against the resolution applicant",
    ],
    sourceAuthority: "Supreme Court of India",
    sourceUrl: "https://main.sci.gov.in/judgments",
    judges: ["rf-nariman", "s-ravindra-bhat", "mr-shah"],
    authoringJudge: "rf-nariman",
    parties: [
      { partyId: "essar-coc", role: "APPELLANT" },
      { partyId: "satish-gupta", role: "RESPONDENT" },
    ],
    provisions: [
      { provisionId: "ibc-s31", relationType: "INTERPRETS", paragraph: "67" },
      { provisionId: "ibc-s14", relationType: "MENTIONS", paragraph: "42" },
    ],
    citationCount: 742,
    paragraphs: [
      {
        number: "42",
        text: "The moratorium under Section 14 is an integral part of the scheme by which the corporate debtor is kept as a going concern during the resolution process, so that the asset pool available to creditors is not depleted by individual enforcement action.",
      },
      {
        number: "67",
        text: "A successful resolution applicant cannot suddenly be faced with undecided claims after the resolution plan has been accepted, for that would amount to a hydra head popping up which would throw into uncertainty amounts payable by a prospective resolution applicant. All claims must be submitted to and decided by the resolution professional so that the applicant starts on a fresh slate.",
        isRatio: true,
      },
    ],
  },
  {
    id: "ghanashyam-mishra-2021",
    title: "Ghanashyam Mishra & Sons Pvt. Ltd. v. Edelweiss Asset Reconstruction Co. Ltd.",
    shortTitle: "Ghanashyam Mishra (2021)",
    courtId: "sci",
    decisionDate: "2021-04-13",
    neutralCitation: "2021 INSC 265",
    reporterCitations: ["(2021) 9 SCC 657"],
    caseNumber: "Civil Appeal No. 8129 of 2019",
    benchStrength: 3,
    doctrinalStatus: "BINDING_LANDMARK",
    summary:
      "The Supreme Court held that once a resolution plan is approved under Section 31, all claims not forming part of the plan stand extinguished and no person is entitled to initiate proceedings in respect of such claims against the successful resolution applicant.",
    issues: [
      "Binding effect of an approved resolution plan on statutory and operational creditors",
      "Whether claims outside the plan stand extinguished on approval",
    ],
    sourceAuthority: "Supreme Court of India",
    sourceUrl: "https://main.sci.gov.in/judgments",
    judges: ["rf-nariman", "s-ravindra-bhat", "mr-shah"],
    authoringJudge: "mr-shah",
    parties: [
      { partyId: "ghanashyam-mishra", role: "APPELLANT" },
      { partyId: "edelweiss-arc", role: "RESPONDENT" },
    ],
    provisions: [
      { provisionId: "ibc-s31", relationType: "INTERPRETS", paragraph: "95" },
      { provisionId: "ica-s128", relationType: "MENTIONS", paragraph: "102" },
    ],
    citationCount: 611,
    paragraphs: [
      {
        number: "95",
        text: "Once a resolution plan is approved by the Adjudicating Authority under Section 31(1), the claims as provided in the plan stand frozen and are binding on the corporate debtor and all stakeholders. All dues owed to the Central Government, State Government or any local authority which are not part of the plan shall stand extinguished.",
        isRatio: true,
      },
      {
        number: "102",
        text: "The position of a guarantor stands on a different footing. The extinguishment worked by an approved plan operates in favour of the corporate debtor and the resolution applicant, and does not by itself release a surety whose obligation rests on an independent contract.",
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Relationships                                                       */
/* ------------------------------------------------------------------ */

export interface SeedRelationship {
  sourceCaseId: string;
  targetCaseId: string;
  type: RelationshipType;
  confidence: number;
  /** Paragraph in the SOURCE case that evidences the relationship. */
  sourceParagraph?: string;
  detail: string;
}

/**
 * Only asserting edges are listed. The reciprocal CITED_BY direction is
 * derived at read time so a single evidenced record backs both directions.
 */
export const SEED_RELATIONSHIPS: SeedRelationship[] = [
  {
    sourceCaseId: "sbi-v-ramakrishnan-nclat-2018",
    targetCaseId: "sbi-v-ramakrishnan-nclt-2017",
    type: "AFFIRMS",
    confidence: 1,
    sourceParagraph: "31",
    detail: "NCLAT affirmed the Adjudicating Authority's extension of the moratorium to the personal guarantor.",
  },
  {
    sourceCaseId: "sbi-v-ramakrishnan-sc-2018",
    targetCaseId: "sbi-v-ramakrishnan-nclat-2018",
    type: "APPEAL_OF",
    confidence: 1,
    sourceParagraph: "29",
    detail: "Civil Appeal No. 3595 of 2018 arose from the NCLAT judgment dated 28 February 2018.",
  },
  {
    sourceCaseId: "sbi-v-ramakrishnan-sc-2018",
    targetCaseId: "sbi-v-ramakrishnan-nclat-2018",
    type: "REVERSES",
    confidence: 1,
    sourceParagraph: "29",
    detail: "The Supreme Court set aside the Appellate Tribunal's judgment and allowed the creditor's appeal.",
  },
  {
    sourceCaseId: "lalit-kumar-jain-2021",
    targetCaseId: "sbi-v-ramakrishnan-sc-2018",
    type: "FOLLOWS",
    confidence: 0.95,
    sourceParagraph: "125",
    detail: "Applied the co-extensive liability reasoning to hold that plan approval does not discharge the guarantor.",
  },
  {
    sourceCaseId: "lalit-kumar-jain-2021",
    targetCaseId: "vishnu-agarwal-v-piramal-nclat-2019",
    type: "DISTINGUISHES",
    confidence: 0.8,
    sourceParagraph: "127",
    detail: "The bar on a second process against a co-guarantor does not translate into a discharge of the surety's independent contractual liability.",
  },
  {
    sourceCaseId: "lalit-kumar-jain-2021",
    targetCaseId: "essar-steel-coc-2019",
    type: "CITES",
    confidence: 0.9,
    sourceParagraph: "125",
    detail: "Relied on the clean-slate principle when considering the effect of an approved plan on third parties.",
  },
  {
    sourceCaseId: "ghanashyam-mishra-2021",
    targetCaseId: "essar-steel-coc-2019",
    type: "FOLLOWS",
    confidence: 0.95,
    sourceParagraph: "95",
    detail: "Followed the clean-slate principle in holding that claims outside the plan stand extinguished.",
  },
  {
    sourceCaseId: "ghanashyam-mishra-2021",
    targetCaseId: "lalit-kumar-jain-2021",
    type: "RELATED",
    confidence: 0.7,
    sourceParagraph: "102",
    detail: "Both authorities address the survival of third-party obligations after approval of a resolution plan.",
  },
  {
    sourceCaseId: "essar-steel-coc-2019",
    targetCaseId: "sbi-v-ramakrishnan-sc-2018",
    type: "CITES",
    confidence: 0.75,
    sourceParagraph: "42",
    detail: "Cited on the purpose and reach of the Section 14 moratorium.",
  },
  {
    sourceCaseId: "vishnu-agarwal-v-piramal-nclat-2019",
    targetCaseId: "sbi-v-ramakrishnan-sc-2018",
    type: "CITES",
    confidence: 0.7,
    sourceParagraph: "37",
    detail: "Cited while considering the independent position of guarantors under the Code.",
  },
];
