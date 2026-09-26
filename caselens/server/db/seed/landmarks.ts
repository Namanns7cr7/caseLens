/**
 * Coverage index — landmark Indian authorities, metadata only.
 *
 * WHY THIS EXISTS
 * ---------------
 * The main corpus in `corpus.ts` carries full paragraph text for seven
 * insolvency authorities. Anything outside that returned
 * NO_AUTHORITATIVE_MATCH, which is a poor answer for a citation to
 * Kesavananda Bharati: the engine was reporting a gap in its index as though
 * it were a finding about the citation.
 *
 * These records close that gap. They carry a title, reporter citation, forum
 * and year — and deliberately no judgment text. A citation to one of them
 * resolves, the engine reports that the authority is known, and then says
 * plainly that the judgment text is not indexed so the quotation and the
 * proposition could not be checked. That is a useful, honest answer.
 *
 * NOT VERIFIED
 * ------------
 * Like everything else in this build, these were written from model
 * recollection, not retrieved from any source (see the note at the top of
 * `corpus.ts`). Because a citation here could itself be slightly wrong,
 * these records are marked `coverageOnly` and the verification engine does
 * NOT raise a metadata mismatch against them — it would be accusing a
 * correctly-cited document on the strength of an unverified record. It
 * reports what it knows and routes the citation to human review instead.
 */

export interface SeedLandmark {
  id: string;
  title: string;
  shortTitle: string;
  /** Reporter citations as commonly used. */
  reporterCitations: string[];
  decisionDate: string;
  benchStrength: number;
  /** Subject matter only — not a statement of the holding. */
  subject: string;
  courtId?: string;
}

const SCI_SOURCE = "https://main.sci.gov.in/judgments";

export const SEED_LANDMARKS: SeedLandmark[] = [
  {
    id: "kesavananda-bharati-1973",
    title: "Kesavananda Bharati v. State of Kerala",
    shortTitle: "Kesavananda Bharati (1973)",
    reporterCitations: ["(1973) 4 SCC 225"],
    decisionDate: "1973-04-24",
    benchStrength: 13,
    subject: "Amending power of Parliament under Article 368 and the basic structure of the Constitution.",
  },
  {
    id: "maneka-gandhi-1978",
    title: "Maneka Gandhi v. Union of India",
    shortTitle: "Maneka Gandhi (1978)",
    reporterCitations: ["(1978) 1 SCC 248", "AIR 1978 SC 597"],
    decisionDate: "1978-01-25",
    benchStrength: 7,
    subject: "Scope of Article 21 and the interrelationship between Articles 14, 19 and 21.",
  },
  {
    id: "puttaswamy-privacy-2017",
    title: "K.S. Puttaswamy v. Union of India",
    shortTitle: "Puttaswamy (Privacy) (2017)",
    reporterCitations: ["(2017) 10 SCC 1"],
    decisionDate: "2017-08-24",
    benchStrength: 9,
    subject: "Whether the right to privacy is a fundamental right under Part III of the Constitution.",
  },
  {
    id: "puttaswamy-aadhaar-2018",
    title: "K.S. Puttaswamy v. Union of India (Aadhaar)",
    shortTitle: "Puttaswamy (Aadhaar) (2018)",
    reporterCitations: ["(2019) 1 SCC 1"],
    decisionDate: "2018-09-26",
    benchStrength: 5,
    subject: "Constitutional validity of the Aadhaar Act and the Aadhaar scheme.",
  },
  {
    id: "indra-sawhney-1992",
    title: "Indra Sawhney v. Union of India",
    shortTitle: "Indra Sawhney (1992)",
    reporterCitations: ["1992 Supp (3) SCC 217"],
    decisionDate: "1992-11-16",
    benchStrength: 9,
    subject: "Reservation in public employment for backward classes under Article 16(4).",
  },
  {
    id: "minerva-mills-1980",
    title: "Minerva Mills Ltd. v. Union of India",
    shortTitle: "Minerva Mills (1980)",
    reporterCitations: ["(1980) 3 SCC 625"],
    decisionDate: "1980-07-31",
    benchStrength: 5,
    subject: "Validity of the 42nd Amendment and the balance between fundamental rights and directive principles.",
  },
  {
    id: "sr-bommai-1994",
    title: "S.R. Bommai v. Union of India",
    shortTitle: "S.R. Bommai (1994)",
    reporterCitations: ["(1994) 3 SCC 1"],
    decisionDate: "1994-03-11",
    benchStrength: 9,
    subject: "Judicial review of Presidential proclamations under Article 356 and federalism.",
  },
  {
    id: "vishaka-1997",
    title: "Vishaka v. State of Rajasthan",
    shortTitle: "Vishaka (1997)",
    reporterCitations: ["(1997) 6 SCC 241"],
    decisionDate: "1997-08-13",
    benchStrength: 3,
    subject: "Guidelines against sexual harassment of women at the workplace.",
  },
  {
    id: "shreya-singhal-2015",
    title: "Shreya Singhal v. Union of India",
    shortTitle: "Shreya Singhal (2015)",
    reporterCitations: ["(2015) 5 SCC 1"],
    decisionDate: "2015-03-24",
    benchStrength: 2,
    subject: "Constitutional validity of Section 66A of the Information Technology Act, 2000.",
  },
  {
    id: "navtej-johar-2018",
    title: "Navtej Singh Johar v. Union of India",
    shortTitle: "Navtej Johar (2018)",
    reporterCitations: ["(2018) 10 SCC 1"],
    decisionDate: "2018-09-06",
    benchStrength: 5,
    subject: "Constitutional validity of Section 377 of the Indian Penal Code as applied to consenting adults.",
  },
  {
    id: "joseph-shine-2018",
    title: "Joseph Shine v. Union of India",
    shortTitle: "Joseph Shine (2018)",
    reporterCitations: ["(2019) 3 SCC 39"],
    decisionDate: "2018-09-27",
    benchStrength: 5,
    subject: "Constitutional validity of Section 497 of the Indian Penal Code (adultery).",
  },
  {
    id: "shayara-bano-2017",
    title: "Shayara Bano v. Union of India",
    shortTitle: "Shayara Bano (2017)",
    reporterCitations: ["(2017) 9 SCC 1"],
    decisionDate: "2017-08-22",
    benchStrength: 5,
    subject: "Validity of talaq-e-biddat (instant triple talaq).",
  },
  {
    id: "olga-tellis-1985",
    title: "Olga Tellis v. Bombay Municipal Corporation",
    shortTitle: "Olga Tellis (1985)",
    reporterCitations: ["(1985) 3 SCC 545"],
    decisionDate: "1985-07-10",
    benchStrength: 5,
    subject: "Right to livelihood as part of the right to life under Article 21.",
  },
  {
    id: "adm-jabalpur-1976",
    title: "ADM Jabalpur v. Shivkant Shukla",
    shortTitle: "ADM Jabalpur (1976)",
    reporterCitations: ["(1976) 2 SCC 521"],
    decisionDate: "1976-04-28",
    benchStrength: 5,
    subject: "Suspension of the right to move courts for enforcement of Article 21 during an Emergency.",
  },
  {
    id: "golaknath-1967",
    title: "I.C. Golaknath v. State of Punjab",
    shortTitle: "Golaknath (1967)",
    reporterCitations: ["AIR 1967 SC 1643"],
    decisionDate: "1967-02-27",
    benchStrength: 11,
    subject: "Whether Parliament can amend fundamental rights under Article 368.",
  },
  {
    id: "mc-mehta-oleum-1987",
    title: "M.C. Mehta v. Union of India",
    shortTitle: "M.C. Mehta (Oleum Gas) (1987)",
    reporterCitations: ["(1987) 1 SCC 395"],
    decisionDate: "1986-12-20",
    benchStrength: 5,
    subject: "Absolute liability of enterprises engaged in hazardous activity.",
  },
  {
    id: "dk-basu-1997",
    title: "D.K. Basu v. State of West Bengal",
    shortTitle: "D.K. Basu (1997)",
    reporterCitations: ["(1997) 1 SCC 416"],
    decisionDate: "1996-12-18",
    benchStrength: 2,
    subject: "Safeguards governing arrest and custodial detention.",
  },
  {
    id: "hussainara-khatoon-1980",
    title: "Hussainara Khatoon v. Home Secretary, State of Bihar",
    shortTitle: "Hussainara Khatoon (1980)",
    reporterCitations: ["(1980) 1 SCC 98"],
    decisionDate: "1979-03-09",
    benchStrength: 2,
    subject: "Right to a speedy trial and free legal aid for undertrial prisoners.",
  },
  {
    id: "common-cause-euthanasia-2018",
    title: "Common Cause v. Union of India",
    shortTitle: "Common Cause (2018)",
    reporterCitations: ["(2018) 5 SCC 1"],
    decisionDate: "2018-03-09",
    benchStrength: 5,
    subject: "Passive euthanasia and the validity of advance medical directives.",
  },
  {
    id: "anuradha-bhasin-2020",
    title: "Anuradha Bhasin v. Union of India",
    shortTitle: "Anuradha Bhasin (2020)",
    reporterCitations: ["(2020) 3 SCC 637"],
    decisionDate: "2020-01-10",
    benchStrength: 3,
    subject: "Internet shutdowns, proportionality and restrictions under Article 19.",
  },
  {
    id: "sabarimala-2018",
    title: "Indian Young Lawyers Association v. State of Kerala",
    shortTitle: "Sabarimala (2018)",
    reporterCitations: ["(2019) 11 SCC 1"],
    decisionDate: "2018-09-28",
    benchStrength: 5,
    subject: "Entry of women into the Sabarimala temple and Articles 25 and 26.",
  },
  {
    id: "ayodhya-2019",
    title: "M. Siddiq v. Mahant Suresh Das",
    shortTitle: "Ayodhya (2019)",
    reporterCitations: ["(2020) 1 SCC 1"],
    decisionDate: "2019-11-09",
    benchStrength: 5,
    subject: "Title dispute over the Ram Janmabhoomi–Babri Masjid site.",
  },
  {
    id: "vellore-citizens-1996",
    title: "Vellore Citizens Welfare Forum v. Union of India",
    shortTitle: "Vellore Citizens (1996)",
    reporterCitations: ["(1996) 5 SCC 647"],
    decisionDate: "1996-08-28",
    benchStrength: 3,
    subject: "Precautionary principle and the polluter pays principle in Indian environmental law.",
  },
  {
    id: "subramanian-swamy-defamation-2016",
    title: "Subramanian Swamy v. Union of India",
    shortTitle: "Subramanian Swamy (2016)",
    reporterCitations: ["(2016) 7 SCC 221"],
    decisionDate: "2016-05-13",
    benchStrength: 2,
    subject: "Constitutional validity of criminal defamation under Sections 499 and 500 IPC.",
  },
  {
    id: "shah-bano-1985",
    title: "Mohd. Ahmed Khan v. Shah Bano Begum",
    shortTitle: "Shah Bano (1985)",
    reporterCitations: ["(1985) 2 SCC 556"],
    decisionDate: "1985-04-23",
    benchStrength: 5,
    subject: "Maintenance for a divorced Muslim woman under Section 125 CrPC.",
  },
  {
    id: "rc-cooper-1970",
    title: "Rustom Cavasjee Cooper v. Union of India",
    shortTitle: "R.C. Cooper (1970)",
    reporterCitations: ["(1970) 1 SCC 248"],
    decisionDate: "1970-02-10",
    benchStrength: 11,
    subject: "Bank nationalisation, the right to property and the effect-on-rights test.",
  },
  {
    id: "swiss-ribbons-2019",
    title: "Swiss Ribbons Pvt. Ltd. v. Union of India",
    shortTitle: "Swiss Ribbons (2019)",
    reporterCitations: ["(2019) 4 SCC 17"],
    decisionDate: "2019-01-25",
    benchStrength: 2,
    subject: "Constitutional validity of the Insolvency and Bankruptcy Code, 2016.",
  },
  {
    id: "innoventive-industries-2018",
    title: "Innoventive Industries Ltd. v. ICICI Bank",
    shortTitle: "Innoventive Industries (2018)",
    reporterCitations: ["(2018) 1 SCC 407"],
    decisionDate: "2017-08-31",
    benchStrength: 2,
    subject: "Admission of a financial creditor's application under Section 7 IBC.",
  },
  {
    id: "mobilox-innovations-2018",
    title: "Mobilox Innovations Pvt. Ltd. v. Kirusa Software Pvt. Ltd.",
    shortTitle: "Mobilox Innovations (2018)",
    reporterCitations: ["(2018) 1 SCC 353"],
    decisionDate: "2017-09-21",
    benchStrength: 2,
    subject: "Existence of a dispute under Section 8 and 9 IBC for operational creditors.",
  },
  {
    id: "vidarbha-industries-2022",
    title: "Vidarbha Industries Power Ltd. v. Axis Bank Ltd.",
    shortTitle: "Vidarbha Industries (2022)",
    reporterCitations: ["(2022) 8 SCC 352"],
    decisionDate: "2022-07-12",
    benchStrength: 2,
    subject: "Discretion of the Adjudicating Authority in admitting a Section 7 IBC application.",
  },
];

export const LANDMARK_NOTE =
  "Coverage index: this authority is known to CaseLens by citation only. Its metadata was written from model recollection and has not been independently verified, and its judgment text is not indexed.";

export const LANDMARK_SOURCE_URL = SCI_SOURCE;
