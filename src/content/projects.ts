export type Lens = "product" | "engineering" | "program";

export type DemoId =
  | "audit"
  | "exports"
  | "logs"
  | "doorfit"
  | "mentor"
  | "reflection"
  | "watermark"
  | "landing"
  | "voice"
  | "parts";

export type Section = {
  heading: string;
  /** Paragraphs. Consecutive lines starting with "- " render as a list. */
  body: string[];
};

export type Project = {
  slug: string;
  title: string;
  short: string;
  org: string;
  context: string;
  period: string;
  year: number;
  role: string;
  lenses: Lens[];
  summary: string;
  outcome: string;
  status: string;
  stack: string[];
  facts: { label: string; value: string }[];
  sections: Section[];
  boundary?: string;
  demo?: { id: DemoId; title: string; blurb: string };
  featured: boolean;
};

export const lensLabels: Record<Lens, string> = {
  product: "Product",
  engineering: "Engineering",
  program: "Program",
};

export const projects: Project[] = [
  {
    slug: "audit-tool",
    title: "A quarterly audit anyone on the team can run",
    short: "Audit tool",
    org: "Microsoft",
    context: "Cloud Operations + Innovation · Global Project Controls",
    period: "Summer 2026",
    year: 2026,
    role: "Technical Program Management Intern. I owned the build; two audit process owners owned the rules.",
    lenses: ["product", "program", "engineering"],
    summary:
      "The team's quarterly invoice audit only ran inside a Python notebook, so it depended on one technical person. I rebuilt it as a guided browser tool the whole team could run.",
    outcome: "276 line-by-line edits became about 80 on-screen decisions.",
    status: "Shipped internally and handed off to a maintainer",
    stack: ["JavaScript", "SheetJS", "ExcelJS", "Playwright", "Node build script"],
    facts: [
      { label: "My role", value: "Requirements, UX, build, validation, handoff" },
      { label: "Partners", value: "Two audit process owners and a second reviewer" },
      { label: "Timeline", value: "About four weeks, June to July 2026" },
      { label: "Status", value: "Internal site plus a single offline HTML file" },
    ],
    sections: [
      {
        heading: "The problem",
        body: [
          "Every quarter, the cost team decides which general-contractor invoices go into a sampled audit. Two process owners had already written the rules into a Python notebook, and the logic was right.",
          "Running it was the problem. It meant installing Python and its libraries, editing file paths inside the code and stepping through notebook cells. In practice one technical person ran it for everyone, and reviewers still made hundreds of line-by-line edits in Excel.",
        ],
      },
      {
        heading: "The constraint that decided everything",
        body: [
          "The team's internal hosting only serves static files: no server and no Python runtime. The data is also confidential, so sending it anywhere else wasn't an option.",
          "So I rewrote the whole pipeline in browser JavaScript. Spreadsheets are parsed and processed on the reviewer's own machine, and nothing leaves it. The build step inlines everything into one self-contained file that can be hosted internally or simply double-clicked.",
        ],
      },
      {
        heading: "What I built",
        body: [
          "A nine-step wizard that mirrors how the audit team already thinks:",
          "- Load the two source spreadsheets and set the quarter",
          "- Check purchase-order and invoice totals against the source report",
          "- Classify every line from last quarter's decisions and out-of-scope categories",
          "- Review only what can't be resolved automatically",
          "- Catch lines that ended up tagged both include and exclude",
          "- Apply the value rules: credits, re-balances and small invoices",
          "- Build the sample population and its pivots",
          "- Download a formatted, multi-tab workbook for the witnessed random draw",
          "By design it stops before the random draw itself. That step stays live and human.",
        ],
      },
      {
        heading: "Making review fast",
        body: [
          "The biggest usability change was grouping. I confirmed that in the dataset no purchase order was split across include and exclude outcomes, then grouped pending lines by purchase order. That turned 276 individual edits into about 80 decisions.",
          "Reviewers get checkboxes, search, sorting, bulk actions and a pinned decision column. People who prefer Excel can export their decisions, edit them and import them back.",
        ],
      },
      {
        heading: "Earning trust",
        body: [
          "A new audit tool is worthless if the audit team can't trust it. I compared every output tab against the notebook's reference workbook cell by cell. On every run, the pipeline reconciles the sample and the excluded buckets back to the original total, to the cent.",
          "Browser tests check for zero console errors and zero network requests, so the privacy promise is actually tested.",
          "Validation caught real defects: a composite key that hid quality-control exceptions, exported total and filter rows that were being double-counted, and an early version with an O(n²) worksheet operation that froze the browser. I rewrote it as a single-pass build, and that step went from a hang to about half a second.",
        ],
      },
      {
        heading: "Feedback became the roadmap",
        body: [
          "The process owners and a second reviewer tested it on real files. Their requests became features: grouped and detail views, downloadable QC tabs, a Prime filter, sticky controls, clearer labels and a built-in process reference page for first-time users.",
          "At the final demo, a senior stakeholder called it a “game changer.” The audit team estimated the workflow went from hours to under 30 minutes. That's their estimate, not a timed benchmark, and measuring it properly is the first item on the handoff list.",
        ],
      },
    ],
    boundary:
      "The real tool runs on confidential Microsoft cost data, which I can't show. The demo is a reconstruction I built for this site with synthetic invoices: the steps and checks mirror the method, while the data, names and amounts are invented.",
    demo: {
      id: "audit",
      title: "Audit wizard, rebuilt with synthetic data",
      blurb: "Generate a fake quarter of invoices, let the rules classify them, review the leftovers by purchase order, and watch the totals reconcile to the cent.",
    },
    featured: true,
  },
  {
    slug: "mentorship-hub",
    title: "Designing mentorship people would actually use",
    short: "Mentorship hub",
    org: "JPMorgan Chase",
    context: "Advancing Black Pathways Fellowship · Innovation Development Program",
    period: "Summer 2025",
    year: 2025,
    role: "Summer Analyst. I ran the product playbook myself, from interviews through the pitch.",
    lenses: ["product"],
    summary:
      "The fellowship asked how JPMorgan could widen access to careers and skills. I picked mentorship, interviewed people at the bank, and designed a concept for matching mentors and finding internal resources.",
    outcome: "Research-backed concept, prototype direction and leadership pitch.",
    status: "Fellowship concept and pitch, not a launched product",
    stack: ["User interviews", "Personas", "Lucid", "Figma", "OKRs", "DVF scoring"],
    facts: [
      { label: "My role", value: "Discovery, synthesis, concept, pitch" },
      { label: "Method", value: "Discover → Ideate → Prototype → Test playbook" },
      { label: "Pillar", value: "Careers and skills" },
      { label: "Status", value: "Concept and pitch" },
    ],
    sections: [
      {
        heading: "Why this problem",
        body: [
          "As a first-generation student whose parents never worked in corporate America, I know how much one person inside a company who has your back is worth. The playbook let each fellow pick a pillar. I picked careers and skills and narrowed it to mentorship.",
        ],
      },
      {
        heading: "What people told me",
        body: [
          "I interviewed people across the bank about growing their careers there. The same themes kept coming up:",
          "- Onboarding often lacked structure, and resources were scattered",
          "- Mentorship existed on paper but not always in practice",
          "- Few senior leaders shared their backgrounds",
          "- Feedback was often generic, and skill paths were unclear",
          "- The relationships that worked were built on real common ground",
        ],
      },
      {
        heading: "From problem to idea",
        body: [
          "I worked through a competitive scan, “how might we” statements and success metrics as OKRs, then brainstormed and plotted ideas on an impact-versus-effort map. I scored the top three for desirability, viability and feasibility, and one idea clearly won.",
        ],
      },
      {
        heading: "The concept",
        body: [
          "- A short survey covering role, goals, interests and working style, producing a transparent compatibility score",
          "- Mentor cards you can browse and match with, capped at three active mentors so it stays real",
          "- Messaging and lightweight feedback after a match",
          "- One searchable home for the bank's scattered internal “go” links, with plain-language search",
          "I also wrote the risk and controls review, a small business case, a user test with a peer, and a now/next/later roadmap.",
        ],
      },
      {
        heading: "What I took away",
        body: [
          "The hardest part wasn't generating ideas. It was letting the interviews kill the ideas I liked. The winning concept was less flashy than my first instinct and much closer to what people actually described.",
        ],
      },
    ],
    boundary:
      "This was a fellowship design exercise, not a launched JPMorgan product. The prototype is my own reconstruction of the concept with fictional mentors and fictional internal tools.",
    demo: {
      id: "mentor",
      title: "Mentor matching and resource search",
      blurb: "Answer four questions, see how compatibility is scored, and search a fictional directory of internal tools in plain English.",
    },
    featured: true,
  },
  {
    slug: "report-exports",
    title: "Exports that print the project you actually picked",
    short: "Report exports",
    org: "Microsoft",
    context: "Cloud Operations + Innovation · Cost analytics",
    period: "Summer 2026",
    year: 2026,
    role: "Builder, working with the reporting team member who requested it.",
    lenses: ["engineering", "program"],
    summary:
      "Leadership reports exported the default view no matter which project you chose. I traced why, then built an exporter that captures the exact on-screen state.",
    outcome: "Correctly filtered per-project PDFs, for the first time, in the test environment.",
    status: "Working in the test workspace; refresh and hosting pending",
    stack: ["Node.js", "Playwright", "Power BI JavaScript API", "ExportToFile REST API", "Express", "Power Query", "DAX"],
    facts: [
      { label: "My role", value: "Diagnosis, build, report fixes, docs" },
      { label: "Users", value: "Cost managers preparing monthly reviews" },
      { label: "Timeline", value: "July 2026" },
      { label: "Status", value: "Local tool, validated in test" },
    ],
    sections: [
      {
        heading: "The ask",
        body: [
          "A cost manager should be able to pick a campus and a few projects and get a leadership-ready PDF of the monthly financial review for each one, without clicking through every page by hand.",
        ],
      },
      {
        heading: "What was going wrong",
        body: [
          "The export API accepted filter parameters without complaint, then rendered the report's default published state. Passing a saved bookmark by name failed the same way. A successful response wasn't proof of a correct result, so I started checking the PDFs themselves instead of the status codes.",
        ],
      },
      {
        heading: "The fix",
        body: [
          "- Open the report in a headless browser",
          "- Set the real campus and project slicers through the Power BI JavaScript API",
          "- Capture the live bookmark state after the slicers apply",
          "- Pass that captured state to the export job, then poll and download",
          "Filters finally stuck, on every page, for the selected project.",
        ],
      },
      {
        heading: "Making the report export-safe",
        body: [
          "Seven custom HTML visuals refused to export at all. I cleaned their text in Power Query, wrote export-safe measures and replaced them with seven native table visuals that carry the same information.",
        ],
      },
      {
        heading: "Self-serve, with the limits left visible",
        body: [
          "The team gets a small local web app: pick a campus, select projects, watch a live status log and download the PDFs.",
          "Three things were still open when I left, and I documented them rather than hiding them. Data refresh credentials in the test workspace weren't resolved, so some panels rendered blank. Sensitivity labels block merging PDFs into one file. And a shared, hosted version needs an app registration and approved infrastructure.",
        ],
      },
    ],
    boundary:
      "The report, data and workspace are internal. The explainer uses a fictional report to show why filter parameters and captured state produce different PDFs.",
    demo: {
      id: "exports",
      title: "Filters vs. captured state",
      blurb: "Pick a project and export it both ways to see why the first approach prints the wrong page.",
    },
    featured: true,
  },
  {
    slug: "iss-wifi",
    title: "Why the crew's iPads kept dropping Wi-Fi",
    short: "ISS network",
    org: "NASA",
    context: "Johnson Space Center · Joint Station LAN Integration Laboratory",
    period: "Summer 2023",
    year: 2023,
    role: "Electrical Engineering Intern, one of two interns in the lab.",
    lenses: ["engineering"],
    summary:
      "Crew tablets on the space station kept losing their connection. I rebuilt what happened from access-point logs, then helped reproduce the failures on the ground.",
    outcome: "Evidence that pointed at device settings, not only the network.",
    status: "Internship project",
    stack: ["Python", "Log analysis", "Wireshark", "Lab test design"],
    facts: [
      { label: "My role", value: "Log analysis, timelines, lab testing" },
      { label: "Team", value: "Lab engineers, two mentors, one co-intern" },
      { label: "Timeline", value: "Eight weeks, summer 2023" },
      { label: "Place", value: "Houston, TX" },
    ],
    sections: [
      {
        heading: "The puzzle",
        body: [
          "The crew on the International Space Station uses tablets on the station's wireless network, and they kept dropping off. I got a list of device hardware addresses, several days of access-point logs and a simple question: what's actually happening?",
          "I applied expecting networking to mean mostly coding. It turned out to be detective work.",
        ],
      },
      {
        heading: "Rebuilding the story from logs",
        body: [
          "At first I pulled events by hand for each tablet: first appearance, connection attempts, authentication, successes, failures and disconnects with their reason codes. When more devices were added, my co-intern and I wrote a Python script to extract exactly those events.",
          "I laid them out as a color-coded timeline, one lane per device and colored by access point and band, so patterns could be seen instead of argued about.",
        ],
      },
      {
        heading: "What the timeline showed",
        body: [
          "- A tablet stuck reconnecting on a fixed interval, over and over, for more than half an hour",
          "- Bursts where many devices disassociated at once",
          "- Connections that completed every step except the last. A privacy feature had given the tablet a randomized hardware address the server didn't recognize, and the feature quietly turned itself back on whenever Wi-Fi was toggled",
          "- Sessions that ended when screens turned off",
        ],
      },
      {
        heading: "Reproducing it on the ground",
        body: [
          "Over three days we ran a test series on two tablets: screen timeouts, logins with and without the privacy setting, wrong passwords, walking out of range, and loading one access point with many devices.",
          "Some theories died. Typing speed didn't matter. One tablet's configuration profile explained its screen-off disconnects. We also found that one consumer phone could make an access point reboot after a few minutes. Every result went into a report and a timeline the engineers could build on.",
        ],
      },
      {
        heading: "Also that summer",
        body: [
          "Power-supply threshold testing on an access point, Ethernet cable repair, and one of my favorite moments ever: sitting in the Mission Evaluation Room while the crew installed an Ethernet cable, hearing them live.",
        ],
      },
    ],
    boundary:
      "Network names, device identifiers and operating details stay internal. The explorer runs on synthetic logs I generated to show the method. It is not station data.",
    demo: {
      id: "logs",
      title: "Wireless log explorer, synthetic data",
      blurb: "Parse a raw access-point log, see each device's connection history as a timeline, and let the detectors flag the patterns.",
    },
    featured: true,
  },
  {
    slug: "agents",
    title: "Agents that answer with a source",
    short: "AI agents",
    org: "Microsoft",
    context: "Cloud Operations + Innovation · Global Project Controls",
    period: "Summer 2026",
    year: 2026,
    role: "Designed, configured, tested and documented the agents.",
    lenses: ["program", "engineering", "product"],
    summary:
      "I built Copilot agents that answer team process questions from the actual documents, with citations, and debugged why one of them couldn't answer a simple lookup.",
    outcome: "Cut a 19,437-character instruction set to 7,725 to fit an 8,000-character limit, and fixed the failed lookup.",
    status: "Published to the team in Teams; testing ongoing",
    stack: ["Copilot Studio", "SharePoint knowledge", "Prompt and retrieval design", "VS Code agents", "Power BI (PBIP/TMDL)"],
    facts: [
      { label: "Agents", value: "Team knowledge, process docs, PowerPoint, Power BI builder" },
      { label: "Testing", value: "18 structured cases, 24 demo questions, 50-question bank" },
      { label: "Guardrail", value: "Guidance only: no approvals or record changes" },
      { label: "Status", value: "Published to the team" },
    ],
    sections: [
      {
        heading: "The problem",
        body: [
          "“Who do I ask?” questions were bouncing between chats and inboxes. Procedures were scattered across SharePoint, and the answer you got depended on who you caught.",
        ],
      },
      {
        heading: "The approach",
        body: [
          "I kept behavior separate from knowledge. The instructions hold guardrails, citation rules and routing. The facts live in the connected document library, so the answers change when the documents do.",
          "Every answer cites its source. The agents give guidance only: they never approve anything, change a record or submit financial data.",
        ],
      },
      {
        heading: "The failure worth telling",
        body: [
          "A test question asking who managed a specific site came back wrong. It had three causes:",
          "- The instructions had silently grown past the platform's 8,000-character limit",
          "- Content inside Excel files wasn't being indexed reliably",
          "- There was no explicit routing or alias rule, so a site's short code and its city name looked like different things",
          "I rewrote the instructions from 19,437 characters to 7,725, added document-first routing and alias rules, and the lookup worked.",
        ],
      },
      {
        heading: "Testing honestly",
        body: [
          "I wrote 18 structured test cases and 24 demo questions, plus a 50-question bank covering assignments, deadlines, accruals and cash flow. I don't claim all 50 pass. I built the bank so the team can keep measuring after I left.",
        ],
      },
      {
        heading: "The rest of the suite",
        body: [
          "- A PowerPoint agent that turns one Excel workbook into a branded, 21-slide deck, following a versioned brand and build spec",
          "- A VS Code agent that builds a new Power BI report or rebrands an existing one from a plain-English request, generating the model, a date table and dozens of measures",
          "- Written brand standards for Power BI, PowerPoint and HTML, so humans and agents follow the same rules",
        ],
      },
    ],
    boundary: "Internal prompts, documents and screenshots aren't shown. The lessons and numbers above are about how the system was built, not about confidential content.",
    featured: false,
  },
  {
    slug: "destiny-module",
    title: "A space station module that fits through an airport door",
    short: "Destiny module",
    org: "NASA HUNCH",
    context: "Clear Creek High School · Architecture & Civil Engineering",
    period: "2021 – 2022",
    year: 2022,
    role: "Project lead on a two-person team with Ashton East.",
    lenses: ["engineering", "program"],
    summary:
      "Design an exhibit of the ISS Destiny lab for Houston's Hobby Airport. The real module is about fourteen feet across. The airport's doors are seven feet tall.",
    outcome: "National finalist, 2021–22 Destiny Module category.",
    status: "Competition project",
    stack: ["Autodesk Inventor", "Structural design", "Prototyping", "Design reviews"],
    facts: [
      { label: "My role", value: "Project lead, CAD, build" },
      { label: "Team", value: "Two students, instructor Robin Merrit, NASA mentors" },
      { label: "Reviews", value: "Preliminary (Nov 2021) and Critical (Apr 2022)" },
      { label: "Result", value: "National finalist" },
    ],
    sections: [
      {
        heading: "The constraint",
        body: [
          "The NASA HUNCH brief was an exhibit of the Destiny laboratory module for Houston's Hobby Airport. The catch was physical: a module that's roughly fourteen feet in diameter has to get through seven-foot doors. So everything had to come apart.",
        ],
      },
      {
        heading: "The design",
        body: [
          "- End cones split into four interlocking sections of layered plywood that go back together almost like Lego",
          "- Interior corridor walls on hinges that fold flat for transport",
          "- A base platform of wood and sheet metal, light enough to move but stiff enough to carry the tube",
          "- A Southern Yellow Pine truss system in four segments that keeps the shape round and carries eight touchscreens",
          "- A bolted aluminum outer shell, HVAC, and wheelchair access through the corridor",
          "I modeled it in Autodesk Inventor and defended it at a Preliminary Design Review and a Critical Design Review with NASA HUNCH mentors, folding their feedback back into the design.",
        ],
      },
      {
        heading: "Building it",
        body: [
          "We built a detailed scale model between October 2021 and February 2022, with a ribbed clear shell, interior panels and a fan base for airflow. We had 50 minutes of class a day, and my partner and I both got COVID mid-build. So we started coming in before school, and some of the build photos are timestamped 6:47 a.m.",
        ],
      },
      {
        heading: "Why it still matters to me",
        body: [
          "It was my first real lesson in engineering under constraints I didn't choose, and in leading when the schedule collapses. The project made me want to be an engineer.",
        ],
      },
    ],
    demo: {
      id: "doorfit",
      title: "Door fit check",
      blurb: "Switch the module between assembled and transport mode and see which parts clear a seven-foot door.",
    },
    featured: true,
  },
  {
    slug: "forwardnotes",
    title: "ForwardNotes: a journal that remembers for you",
    short: "ForwardNotes",
    org: "Product@TAMU Ideathon",
    context: "Sponsored by You.com",
    period: "November 2024",
    year: 2024,
    role: "Team lead and presenter, team of four (Russell Cates, Srikar Kolipaka, Khushi Gupta and me).",
    lenses: ["product"],
    summary:
      "Most journaling apps help you write. Almost none help you look back. We designed one that brings back what you wrote two months ago and asks what changed.",
    outcome: "2nd place.",
    status: "Ideathon concept and pitch",
    stack: ["User research", "Competitive analysis", "Prototype", "Business model"],
    facts: [
      { label: "My role", value: "Led the team and the pitch" },
      { label: "Audience", value: "College students and young adults" },
      { label: "Model", value: "Free local tier, $8/month premium" },
      { label: "Result", value: "2nd place" },
    ],
    sections: [
      {
        heading: "The problem",
        body: [
          "College gets busy, and it's easy to forget how far you've come. Journaling apps focus on writing, not reflection. People rarely reread old entries, and nobody helps them see how their mood and habits change over months.",
        ],
      },
      {
        heading: "The product",
        body: [
          "- A reflection cycle that resurfaces an entry from about two months ago next to today's and asks “what's changed since then?”",
          "- Emotion tags such as stress, gratitude and anxiety, so entries are searchable",
          "- A mood-trend view over time",
          "- Personalized prompts and small coping suggestions drawn from past entries",
        ],
      },
      {
        heading: "The business",
        body: [
          "The free tier keeps entries on the device. The premium tier, at $8 a month, adds backups, deeper trends and a monthly reflection report. Our pitch modeled 10,000 first-year users with 20% converting, or $192,000 in year one. That's a projection from a student pitch, not revenue.",
        ],
      },
      {
        heading: "What I'd change now",
        body: [
          "Lead with privacy: local-first by default and explicit about what any model sees. Keep it clearly non-clinical, too. It's a reflection tool, not a diagnosis tool.",
        ],
      },
    ],
    boundary: "The demo is built for this site with a fictional journal. There's no account, and nothing you type is stored.",
    demo: {
      id: "reflection",
      title: "The moment an old entry comes back",
      blurb: "Scrub through a fictional semester of entries and see what ForwardNotes would resurface today.",
    },
    featured: true,
  },
  {
    slug: "watermark-lab",
    title: "Can you prove a machine wrote this?",
    short: "Watermarking",
    org: "Undergraduate research",
    context: "LSAMP research program · Texas A&M",
    period: "Spring 2025",
    year: 2025,
    role: "Undergraduate researcher.",
    lenses: ["engineering"],
    summary:
      "I studied statistical watermarks for language models: quietly nudge generation toward a secret, pseudo-random “green list” of words, then detect it later with a simple hypothesis test.",
    outcome: "An interactive lab showing the tradeoff between detectability, text quality and robustness.",
    status: "Research topic; lab built for this site",
    stack: ["Hypothesis testing", "Token-level watermarking", "TypeScript (lab)"],
    facts: [
      { label: "Topic", value: "Watermarking language-model output" },
      { label: "Methods", value: "Hard and soft green-list biasing, z-score detection" },
      { label: "Based on", value: "Kirchenbauer et al., 2023" },
      { label: "Lab", value: "Toy vocabulary, bigram model" },
    ],
    sections: [
      {
        heading: "The idea",
        body: [
          "Before each word is generated, hash the previous word to seed a random split of the vocabulary into a green list and a red list. A “hard” watermark only ever picks green words. A “soft” one just adds a bonus to green words, so it steps aside when there's one obviously right word, such as the second half of a name.",
        ],
      },
      {
        heading: "Detection is just counting",
        body: [
          "Anyone who knows the hashing rule can recount which words were green, without the model. Human text lands near the expected share, γ. Watermarked text lands far above it. A one-proportion z-test turns that gap into a p-value: z = (greens − γT) / √(T·γ(1−γ)).",
        ],
      },
      {
        heading: "What I looked at",
        body: [
          "- Hard versus soft biasing, and how the bias strength δ trades text quality for detectability",
          "- How many tokens you need before detection is statistically meaningful",
          "- How edits and paraphrasing dilute the signal",
        ],
      },
    ],
    boundary:
      "The lab is a teaching reconstruction with a small vocabulary and a bigram model. It is not a real language model and not my research code. The method follows the published paper.",
    demo: {
      id: "watermark",
      title: "Watermark lab",
      blurb: "Generate text with and without a watermark, attack it, and watch the z-score decide.",
    },
    featured: true,
  },
  {
    slug: "learn-out-loud",
    title: "Learn Out Loud: Duolingo without the screen",
    short: "Learn Out Loud",
    org: "Product case study",
    context: "Duolingo · voice-first learning",
    period: "2025",
    year: 2025,
    role: "Author, solo product case.",
    lenses: ["product"],
    summary:
      "People lose streaks when they're driving, cooking or walking. What if you could keep learning without touching the screen?",
    outcome: "A voice-first mode with a retention thesis, an A/B design and the events to measure it.",
    status: "Product case study",
    stack: ["Product strategy", "Experiment design", "Metrics (CURR, DAU/MAU)"],
    facts: [
      { label: "North star", value: "Current user retention rate (CURR)" },
      { label: "Secondary", value: "DAU/MAU stickiness" },
      { label: "Test", value: "Control vs. voice-only vs. voice + offline" },
      { label: "Status", value: "Case study" },
    ],
    sections: [
      {
        heading: "The insight",
        body: [
          "Streaks are the habit engine, and they break at exactly the moments people's hands and eyes are busy. Those moments are also a large, underused part of the day, and voice-first learning helps people who can't easily use a screen.",
        ],
      },
      {
        heading: "The feature",
        body: [
          "- Audio lessons: normal lessons converted into guided, spoken dialogues",
          "- Voice commands such as “next,” “repeat” and “translate again”",
          "- Conversational practice adapted to the learner's level",
          "- XP, streaks and skill-tree progress synced with standard mode",
          "- Smart entry points that suggest voice mode when car mode or headphones are detected, plus streak-saving nudges",
        ],
      },
      {
        heading: "How I'd know it works",
        body: [
          "Hypothesis: if learners can study during no-screen moments, daily sessions and streak retention go up. I'd run a three-arm test: control, voice-only mode, and voice plus offline download. Events would include voice_mode_started, voice_lesson_completed, voice_error_retry and streak_retained_after_voice_day, plus edge-case testing for noise, bad connectivity and accessibility settings.",
        ],
      },
    ],
    boundary: "The prototype uses your browser's built-in speech features and a five-phrase Spanish lesson I wrote. It isn't affiliated with Duolingo.",
    demo: {
      id: "voice",
      title: "A hands-free mini lesson",
      blurb: "Say the phrase, or say “next” or “repeat.” It falls back to buttons if your browser can't listen.",
    },
    featured: false,
  },
  {
    slug: "drag-dynamics",
    title: "Landing a rocket under five meters per second",
    short: "Drag Dynamics",
    org: "Texas A&M Ignite Design Challenge",
    context: "Team AM12",
    period: "Fall 2024",
    year: 2024,
    role: "Simulation and design, team of five.",
    lenses: ["engineering"],
    summary:
      "Design and simulate a descent system that brings a rocket down below 5 m/s, then defend every material and design choice.",
    outcome: "4.43 m/s simulated touchdown and a 298/300 from the graders.",
    status: "Course design challenge",
    stack: ["Python simulation", "SolidWorks", "Materials selection", "Force analysis"],
    facts: [
      { label: "Goal", value: "Touchdown below 5 m/s" },
      { label: "Result", value: "4.43 m/s, thrust-to-weight 1.01" },
      { label: "Score", value: "298 / 300" },
      { label: "Team", value: "Five students" },
    ],
    sections: [
      {
        heading: "The approach",
        body: [
          "We worked in loops we called the three C's: CAD, Code, Consider. We changed the model, changed the simulation, looked at what broke and went again.",
        ],
      },
      {
        heading: "What changed",
        body: [
          "- Mass came down by moving fins to carbon fiber and shelling the main body",
          "- Air brakes, grid fins and chines raised drag and steered airflow",
          "- The parachute deploys higher, where it has time to matter",
          "- Thrust is capped, and reverse thrust fires only in the final phase",
          "- Materials were chosen by matrix: titanium airframe, carbon-fiber fins, a graphite nozzle and a Kevlar/Nomex chute",
        ],
      },
      {
        heading: "Results",
        body: [
          "The simulated touchdown came in at 4.43 m/s with a thrust-to-weight ratio of 1.01. We then re-ran the model with lunar gravity to show the approach carries over. The graders gave the report and technical work full marks, and the video 98.",
        ],
      },
    ],
    boundary: "The simulator is a simplified one-dimensional model I wrote for this site, not the team's original code.",
    demo: {
      id: "landing",
      title: "Landing simulator",
      blurb: "Tune chute altitude, air brakes and thrust. Can you touch down under 5 m/s, on Earth and on the Moon?",
    },
    featured: false,
  },
  {
    slug: "betterbuilt",
    title: "Starting a PC-build business with my brother",
    short: "BetterBuilt",
    org: "BetterBuilt",
    context: "Houston",
    period: "2020 – 2023",
    year: 2023,
    role: "Co-founder, with my younger brother.",
    lenses: ["product", "engineering"],
    summary:
      "During COVID, my brother and I started helping people online spec and build their own PCs, then automated the part we repeated most.",
    outcome: "50–75 inquiries a week at peak, run entirely through online communities.",
    status: "Student business",
    stack: ["Python", "SQLite", "Customer research", "Affiliate marketing"],
    facts: [
      { label: "Started", value: "Winter break 2020" },
      { label: "Channels", value: "Reddit and Quora" },
      { label: "Builds", value: "Roughly $500–$3,000" },
      { label: "Tooling", value: "Python + SQLite parts matcher" },
    ],
    sections: [
      {
        heading: "How it started",
        body: [
          "My brother and I wanted to buy our family Christmas gifts and didn't have money, but we knew PCs. So we started answering people on Reddit and Quora who wanted to build one, then offered to plan the whole build.",
        ],
      },
      {
        heading: "How it worked",
        body: [
          "- A client shares a budget, what they'll use the PC for and how they want it to look",
          "- We recommend a compatible parts list and explain the tradeoffs",
          "- After the build, we get on a video call and walk them through it",
          "We charged a small fee, a percentage of the build budget, and earned affiliate commissions on parts.",
        ],
      },
      {
        heading: "Automating the repetitive part",
        body: [
          "Most of the work was matching the same inputs to compatible parts over and over. I built a small Python and SQLite tool that took budget, performance priorities and aesthetic preferences and generated a starting parts list, which we then tuned by hand.",
        ],
      },
      {
        heading: "What it taught me",
        body: [
          "Customers rarely describe what they need in spec language. “I want to stream and it has to be quiet” is a product requirement. Translating that into a design is the job, whether the product is a PC or an enterprise tool.",
        ],
      },
    ],
    boundary: "The part picker is a modern reconstruction built for this site with a small made-up parts catalog. It isn't the original tool.",
    demo: {
      id: "parts",
      title: "Part picker",
      blurb: "Set a budget, a use and a look, and get a compatible build with the reasoning spelled out.",
    },
    featured: false,
  },
];

export function getProject(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}
