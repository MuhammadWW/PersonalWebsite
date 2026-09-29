export type Lens = "product" | "engineering" | "program";

export type DemoId = "doorfit" | "reflection" | "watermark" | "landing" | "voice" | "parts";

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
  /** Screenshot of the demo, used by the home page carousel. */
  cover?: string;
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
    title: "Quarterly audit tool",
    short: "Audit tool",
    org: "Microsoft",
    context: "Cloud Operations + Innovation · Global Project Controls",
    period: "Summer 2026",
    year: 2026,
    role: "Technical Program Management Intern. I owned the build; two audit process owners owned the rules.",
    lenses: ["product", "program", "engineering"],
    summary:
      "The cost team's quarterly invoice audit lived in a Python notebook that only one person could run. I rebuilt it as a browser tool that walks a reviewer through the audit step by step.",
    outcome: "Reviewers made about 80 grouped decisions instead of 276 line-by-line edits.",
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
        heading: "Background",
        body: [
          "Every quarter the cost team decides which general contractor invoices go into a sampled audit. Two process owners had written the selection rules as a Python notebook, and the rules were correct.",
          "Running the notebook meant installing Python and its libraries, editing file paths in the code and stepping through cells in order. One technical person ended up running it for everyone, and reviewers still made hundreds of edits by hand in Excel.",
        ],
      },
      {
        heading: "Constraints",
        body: [
          "The team's internal hosting serves static files only, so there was no server and no Python runtime. The data is confidential and could not be sent to an outside service.",
          "I rewrote the pipeline in JavaScript that runs in the browser. Spreadsheets are parsed and processed on the reviewer's computer and are never uploaded. A build script packs everything into one HTML file that can be hosted internally or opened straight from disk.",
        ],
      },
      {
        heading: "What I built",
        body: [
          "A nine-step wizard that follows the order the audit team already works in:",
          "- Load the two source spreadsheets and set the quarter",
          "- Check purchase-order and invoice totals against the source report",
          "- Classify every line using last quarter's decisions and out-of-scope categories",
          "- Review only what can't be resolved automatically",
          "- Catch lines that ended up tagged both include and exclude",
          "- Apply the value rules for credits, re-balances and small invoices",
          "- Build the sample population and its pivots",
          "- Download a formatted, multi-tab workbook for the witnessed random draw",
          "The tool stops before the random draw. The draw is done live with witnesses, and that step stays manual.",
        ],
      },
      {
        heading: "Review workflow",
        body: [
          "I checked that no purchase order in the data had lines split between include and exclude, then grouped pending lines by purchase order. That reduced 276 individual edits to about 80 decisions.",
          "Reviewers can filter, sort, search, select in bulk and pin the decision column. Anyone who prefers Excel can export the decisions, edit them there and import them back.",
        ],
      },
      {
        heading: "Validation",
        body: [
          "I compared every output tab against the notebook's reference workbook, cell by cell. Each run also reconciles the sample and the excluded groups back to the original total, to the cent.",
          "Automated browser tests check for zero console errors and zero network requests, which is how the no-upload rule is verified.",
          "Testing found real defects: a composite key that hid quality-control exceptions, total and filter rows that were counted twice, and a worksheet step with quadratic run time that froze the browser. I rewrote that step as a single pass, and it went from hanging to about half a second.",
        ],
      },
      {
        heading: "Feedback and handoff",
        body: [
          "The two process owners and a second reviewer tested it on real files. Their requests turned into features: grouped and detailed views, downloadable QC tabs, a Prime filter, sticky controls, clearer labels and a reference page for first-time users.",
          "At the final demo a senior stakeholder called it a “game changer.” The audit team estimated the workflow went from hours to under 30 minutes. That figure is their estimate, not a timed measurement, and measuring it properly is the first item on the handoff list.",
        ],
      },
    ],
    boundary:
      "The real tool runs on confidential Microsoft cost data, so it isn't shown here. The 3D model is an illustration with made-up data: the steps follow the real method, and every name, amount and screen is invented.",
    cover: "/images/work/audit-tool.jpg",
    featured: true,
  },
  {
    slug: "mentorship-hub",
    title: "Mentorship hub concept",
    short: "Mentorship hub",
    org: "JPMorgan Chase",
    context: "Advancing Black Pathways Fellowship · Innovation Development Program",
    period: "Summer 2025",
    year: 2025,
    role: "Summer Analyst. I ran the product playbook myself, from interviews through the pitch.",
    lenses: ["product"],
    summary:
      "The fellowship asked how JPMorgan Chase could widen access to careers and skills. I chose mentorship, interviewed employees and designed a concept for matching mentors and finding internal resources.",
    outcome: "A concept, a prototype direction and a pitch to leadership, based on employee interviews.",
    status: "Fellowship concept and pitch, not a launched product",
    stack: ["User interviews", "Personas", "Lucid", "Figma", "OKRs", "DVF scoring"],
    facts: [
      { label: "My role", value: "Discovery, synthesis, concept, pitch" },
      { label: "Method", value: "Discover, ideate, prototype, test" },
      { label: "Pillar", value: "Careers and skills" },
      { label: "Status", value: "Concept and pitch" },
    ],
    sections: [
      {
        heading: "Why mentorship",
        body: [
          "My parents never worked in corporate America, and I know how much it helps to have one person inside a company looking out for you. Each fellow picked a pillar from the playbook. I picked careers and skills and narrowed it to mentorship.",
        ],
      },
      {
        heading: "Interviews",
        body: [
          "I interviewed people across the bank about how they had grown their careers there. The same points came up repeatedly:",
          "- Onboarding often lacked structure, and resources were scattered",
          "- Mentorship existed on paper but not always in practice",
          "- Few senior leaders shared their backgrounds",
          "- Feedback was often generic, and skill paths were unclear",
          "- The mentoring relationships that worked were built on shared interests or backgrounds",
        ],
      },
      {
        heading: "Choosing an idea",
        body: [
          "I did a competitive scan, wrote “how might we” statements and set success metrics as OKRs. I plotted ideas on an impact versus effort map and scored the top three on desirability, viability and feasibility. One idea scored clearly higher than the others.",
        ],
      },
      {
        heading: "The concept",
        body: [
          "- A short survey on role, goals, interests and working style that produces a visible compatibility score",
          "- Mentor cards to browse and match with, capped at three active mentors",
          "- Messaging and short feedback after a match",
          "- One searchable page for the bank's scattered internal “go” links, with plain-language search",
          "I also wrote a risk and controls review and a small business case, ran a user test with a peer and drafted a now, next, later roadmap.",
        ],
      },
      {
        heading: "What I learned",
        body: [
          "Most of my first ideas did not survive the interviews. The concept that won was simpler than what I started with and much closer to what people described.",
        ],
      },
    ],
    boundary: "This was a fellowship design exercise, not a launched JPMorgan Chase product, and no internal material is shown here.",
    featured: true,
  },
  {
    slug: "report-exports",
    title: "Per-project report exports",
    short: "Report exports",
    org: "Microsoft",
    context: "Cloud Operations + Innovation · Cost analytics",
    period: "Summer 2026",
    year: 2026,
    role: "Builder, working with the reporting team member who requested it.",
    lenses: ["engineering", "program"],
    summary:
      "Exported leadership reports always showed the default view, whichever project was selected. I found the cause and built an exporter that captures the exact state on screen.",
    outcome: "Correctly filtered PDFs for each project in the test environment.",
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
        heading: "The request",
        body: [
          "A cost manager should be able to pick a campus and a few projects and get a PDF of the monthly financial review for each one, without clicking through every page by hand.",
        ],
      },
      {
        heading: "The bug",
        body: [
          "The export API accepted filter parameters without an error and then rendered the report's default published state. Passing a saved bookmark by name failed the same way. Because the API reported success either way, I started checking the PDFs themselves instead of the response codes.",
        ],
      },
      {
        heading: "The fix",
        body: [
          "- Open the report in a headless browser",
          "- Set the campus and project slicers through the Power BI JavaScript API",
          "- Capture the live bookmark state after the slicers apply",
          "- Pass that captured state to the export job, then poll and download",
          "With that change the filters held on every page for the selected project.",
        ],
      },
      {
        heading: "Export-safe visuals",
        body: [
          "Seven custom HTML visuals would not export at all. I cleaned their text in Power Query, wrote export-safe measures and replaced them with seven native table visuals that carry the same information.",
        ],
      },
      {
        heading: "Handoff",
        body: [
          "The team got a small local web app: pick a campus, select projects, follow a live status log and download the PDFs.",
          "Three issues were still open when my internship ended, and I documented them in the handoff. Data refresh credentials in the test workspace weren't resolved, so some panels rendered blank. Sensitivity labels prevent merging the PDFs into one file. A shared, hosted version needs an app registration and approved infrastructure.",
        ],
      },
    ],
    boundary: "The report, data and workspace are internal, so none of them are shown here.",
    featured: true,
  },
  {
    slug: "iss-wifi",
    title: "ISS crew Wi-Fi investigation",
    short: "ISS network",
    org: "NASA",
    context: "Johnson Space Center · Joint Station LAN Integration Laboratory",
    period: "Summer 2023",
    year: 2023,
    role: "Electrical Engineering Intern, one of two interns in the lab.",
    lenses: ["engineering"],
    summary:
      "Crew tablets on the International Space Station kept losing their Wi-Fi connection. I reconstructed what happened from access point logs and helped reproduce the failures in the lab.",
    outcome: "Evidence that device settings, not only the network, caused some of the drops.",
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
        heading: "The question",
        body: [
          "The ISS crew uses tablets on the station's wireless network, and the tablets kept disconnecting. I was given a list of device hardware addresses, several days of access point logs and one question: what is happening to these connections?",
          "I expected the internship to be mostly coding. Most of it was reading logs.",
        ],
      },
      {
        heading: "Timelines from the logs",
        body: [
          "At first I pulled events by hand for each tablet: first appearance, connection attempts, authentication, successes, failures and disconnects with their reason codes. When more devices were added, my co-intern and I wrote a Python script to extract those events.",
          "I plotted them as a color-coded timeline with one lane per device, colored by access point and band, so the team could see the patterns directly.",
        ],
      },
      {
        heading: "Findings",
        body: [
          "- A tablet stuck reconnecting on a fixed interval for more than half an hour",
          "- Bursts where many devices disassociated at once",
          "- Connections that completed every step except the last. A privacy feature had given the tablet a randomized hardware address that the server didn't recognize, and the feature turned itself back on whenever Wi-Fi was toggled",
          "- Sessions that ended when screens turned off",
        ],
      },
      {
        heading: "Lab reproduction",
        body: [
          "Over three days we ran a test series on two tablets: screen timeouts, logins with and without the privacy setting, wrong passwords, walking out of range and loading one access point with many devices.",
          "Several theories were ruled out. Typing speed made no difference. One tablet's configuration profile explained its screen-off disconnects. We also found that one consumer phone could make an access point reboot after a few minutes. Each result went into a report and a timeline for the engineers.",
        ],
      },
      {
        heading: "Other work that summer",
        body: [
          "Power supply threshold testing on an access point, Ethernet cable repair, and one afternoon in the Mission Evaluation Room listening to the crew install an Ethernet cable live.",
        ],
      },
    ],
    boundary: "Network names, device identifiers, logs and operating details stay internal. Nothing on this page is station data.",
    featured: true,
  },
  {
    slug: "agents",
    title: "Copilot Studio agents",
    short: "AI agents",
    org: "Microsoft",
    context: "Cloud Operations + Innovation · Global Project Controls",
    period: "Summer 2026",
    year: 2026,
    role: "Designed, configured, tested and documented the agents.",
    lenses: ["program", "engineering", "product"],
    summary:
      "I built Copilot agents that answer the team's process questions from their own documents, with citations, and fixed one that failed a simple lookup.",
    outcome: "Cut the instructions from 19,437 to 7,725 characters to fit an 8,000-character limit, which fixed the failed lookup.",
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
        heading: "Background",
        body: [
          "Questions like “who do I ask about this?” went back and forth in chats and email. Procedures were spread across SharePoint, and the answer depended on who you asked.",
        ],
      },
      {
        heading: "Approach",
        body: [
          "I kept behavior separate from knowledge. The instructions hold guardrails, citation rules and routing. The facts stay in the connected document library, so the answers change when the documents change.",
          "Every answer cites a source. The agents only give guidance: they don't approve anything, change records or submit financial data.",
        ],
      },
      {
        heading: "Debugging a failed lookup",
        body: [
          "A test question asking who managed a specific site came back wrong. There were three causes:",
          "- The instructions had grown past the platform's 8,000-character limit without any warning",
          "- Content inside Excel files wasn't being indexed reliably",
          "- There was no routing or alias rule, so a site's short code and its city name looked like different things",
          "I cut the instructions from 19,437 characters to 7,725, added document-first routing and alias rules, and the lookup returned the right answer.",
        ],
      },
      {
        heading: "Testing",
        body: [
          "I wrote 18 structured test cases, 24 demo questions and a 50-question bank covering assignments, deadlines, accruals and cash flow. Not all 50 pass yet. The bank is there so the team can keep measuring after my internship.",
        ],
      },
      {
        heading: "Other agents",
        body: [
          "- A PowerPoint agent that turns one Excel workbook into a branded 21-slide deck, following a versioned brand and build spec",
          "- A VS Code agent that builds a new Power BI report or rebrands an existing one from a plain-English request, generating the model, a date table and dozens of measures",
          "- Written brand standards for Power BI, PowerPoint and HTML, so people and agents follow the same rules",
        ],
      },
    ],
    boundary: "Internal prompts, documents and screenshots aren't shown. The numbers above describe how the system was built, not confidential content.",
    featured: true,
  },
  {
    slug: "destiny-module",
    title: "Destiny module exhibit",
    short: "Destiny module",
    org: "NASA HUNCH",
    context: "Clear Creek High School · Architecture & Civil Engineering",
    period: "2021 – 2022",
    year: 2022,
    role: "Project lead on a two-person team with Ashton East.",
    lenses: ["engineering", "program"],
    summary:
      "A NASA HUNCH brief to design an exhibit of the ISS Destiny lab for Houston's Hobby Airport. The real module is about fourteen feet across, and the airport's doors are seven feet tall.",
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
          "The brief asked for an exhibit of the Destiny laboratory module at Hobby Airport. A module about fourteen feet in diameter has to pass through seven-foot doors, so the whole design had to come apart.",
        ],
      },
      {
        heading: "Design",
        body: [
          "- End cones split into four interlocking sections of layered plywood",
          "- Interior corridor walls on hinges that fold flat for transport",
          "- A base platform of wood and sheet metal, light enough to move and stiff enough to carry the tube",
          "- A Southern Yellow Pine truss system in four segments that keeps the shape round and carries eight touchscreens",
          "- A bolted aluminum outer shell, HVAC, and wheelchair access through the corridor",
          "I modeled it in Autodesk Inventor and presented it at a Preliminary Design Review and a Critical Design Review with NASA HUNCH mentors, then revised the design based on their feedback.",
        ],
      },
      {
        heading: "Building the model",
        body: [
          "We built a detailed scale model between October 2021 and February 2022, with a ribbed clear shell, interior panels and a fan base for airflow. We had 50 minutes of class a day, and both of us got COVID partway through, so we started coming in before school. Some of the build photos are timestamped 6:47 a.m.",
        ],
      },
      {
        heading: "Why it matters to me",
        body: [
          "It was my first project with constraints I didn't choose and a schedule that fell apart halfway through. It is the project that made me want to study engineering.",
        ],
      },
    ],
    demo: {
      id: "doorfit",
      title: "Door fit check",
      blurb: "Switch the module between assembled and transport mode and see which parts clear a seven-foot door.",
    },
    cover: "/images/work/destiny-module.jpg",
    featured: true,
  },
  {
    slug: "forwardnotes",
    title: "ForwardNotes",
    short: "ForwardNotes",
    org: "Product@TAMU Ideathon",
    context: "Sponsored by You.com",
    period: "November 2024",
    year: 2024,
    role: "Team lead and presenter, team of four (Russell Cates, Srikar Kolipaka, Khushi Gupta and me).",
    lenses: ["product"],
    summary: "A journaling app concept that brings back an entry from about two months ago and asks what has changed since.",
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
          "Journaling apps focus on writing, not rereading. People rarely look back at old entries, and few apps help them see how their mood and habits change over months.",
        ],
      },
      {
        heading: "The product",
        body: [
          "- A reflection cycle that shows an entry from about two months ago next to today's and asks “what's changed since then?”",
          "- Emotion tags such as stress, gratitude and anxiety, so entries are searchable",
          "- A mood trend view over time",
          "- Prompts and small coping suggestions based on past entries",
        ],
      },
      {
        heading: "Business model",
        body: [
          "The free tier keeps entries on the device. The premium tier, at $8 a month, adds backups, deeper trends and a monthly reflection report. Our pitch modeled 10,000 first-year users with 20% converting, or $192,000 in year one. That's a projection from a student pitch, not revenue.",
        ],
      },
      {
        heading: "What I'd change now",
        body: [
          "I would lead with privacy: local storage by default and clear rules about what any model can see. I would also keep it clearly non-clinical. It is a reflection tool, not a diagnostic one.",
        ],
      },
    ],
    boundary: "The demo uses a fictional journal. There's no account, and nothing you type is stored.",
    demo: {
      id: "reflection",
      title: "Resurfacing an old entry",
      blurb: "Scrub through a fictional semester of entries and see which one ForwardNotes would bring back today.",
    },
    cover: "/images/work/forwardnotes.jpg",
    featured: true,
  },
  {
    slug: "watermark-lab",
    title: "LLM watermark detection",
    short: "Watermarking",
    org: "Undergraduate research",
    context: "LSAMP research program · Texas A&M",
    period: "Spring 2025",
    year: 2025,
    role: "Undergraduate researcher.",
    lenses: ["engineering"],
    summary:
      "Research on statistical watermarks for language models: bias generation toward a secret, pseudo-random “green list” of words, then detect the bias later with a hypothesis test.",
    outcome: "An animated detector that shows how much evidence a watermark leaves, and how edits wash it out.",
    status: "Research topic; lab built for this site",
    stack: ["Hypothesis testing", "Token-level watermarking", "TypeScript (lab)"],
    facts: [
      { label: "Topic", value: "Watermarking language model output" },
      { label: "Methods", value: "Hard and soft green-list biasing, z-score detection" },
      { label: "Based on", value: "Kirchenbauer et al., 2023" },
      { label: "Lab", value: "Toy vocabulary, bigram model" },
    ],
    sections: [
      {
        heading: "How the watermark works",
        body: [
          "Before each word is generated, the previous word is hashed to seed a random split of the vocabulary into a green list and a red list. A hard watermark only picks green words. A soft watermark adds a bonus to green words, so it gives way when one word is clearly right, such as the second half of a name.",
        ],
      },
      {
        heading: "Detection",
        body: [
          "Anyone who knows the hashing rule can recount the green words without access to the model. Human text lands near the expected share, γ, and watermarked text lands well above it. A one-proportion z-test turns the gap into a p-value: z = (greens − γT) / √(T·γ(1−γ)).",
        ],
      },
      {
        heading: "What I studied",
        body: [
          "- Hard versus soft biasing, and how the bias strength δ trades text quality for detectability",
          "- How many tokens are needed before detection is statistically meaningful",
          "- How edits and paraphrasing dilute the signal",
        ],
      },
    ],
    boundary:
      "The detector runs on a teaching rebuild with a small vocabulary and a bigram model. It is not a real language model and not my research code. The method follows the published paper, and the human-written sample is President Kennedy's 1962 speech at Rice University.",
    demo: {
      id: "watermark",
      title: "Watermark detector",
      blurb: "Watch every word get checked against a secret green list, and the z-score decide whether the text carries the watermark.",
    },
    cover: "/images/work/watermark-lab.jpg",
    featured: true,
  },
  {
    slug: "learn-out-loud",
    title: "Learn Out Loud",
    short: "Learn Out Loud",
    org: "Product case study",
    context: "Duolingo · voice-first learning",
    period: "2025",
    year: 2025,
    role: "Author, solo product case.",
    lenses: ["product"],
    summary: "A product case for a voice-first Duolingo mode, so learners can keep a streak while driving, cooking or walking.",
    outcome: "A feature spec, a retention hypothesis, an A/B test design and the events to measure it.",
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
        heading: "Opportunity",
        body: [
          "Streaks drive the daily habit, and they tend to break when people's hands and eyes are busy. Those moments add up to a large part of the day, and a voice mode also helps learners who can't easily use a screen.",
        ],
      },
      {
        heading: "The feature",
        body: [
          "- Audio lessons: normal lessons converted into guided, spoken dialogues",
          "- Voice commands such as “next,” “repeat” and “translate again”",
          "- Conversation practice matched to the learner's level",
          "- XP, streaks and skill tree progress synced with standard mode",
          "- Entry points that suggest voice mode when car mode or headphones are detected, plus streak reminders",
        ],
      },
      {
        heading: "Measuring it",
        body: [
          "Hypothesis: if learners can study during moments without a screen, daily sessions and streak retention go up. I'd run a three-arm test: control, voice-only mode, and voice plus offline download. Events would include voice_mode_started, voice_lesson_completed, voice_error_retry and streak_retained_after_voice_day, plus edge-case testing for noise, bad connectivity and accessibility settings.",
        ],
      },
    ],
    boundary: "The prototype uses your browser's built-in speech features and a five-phrase Spanish lesson I wrote. It isn't affiliated with Duolingo.",
    demo: {
      id: "voice",
      title: "Hands-free mini lesson",
      blurb: "Say the phrase, or say “next” or “repeat.” It falls back to buttons if your browser can't listen.",
    },
    cover: "/images/work/learn-out-loud.jpg",
    featured: false,
  },
  {
    slug: "drag-dynamics",
    title: "Drag Dynamics",
    short: "Drag Dynamics",
    org: "Texas A&M Ignite Design Challenge",
    context: "Team AM12",
    period: "Fall 2024",
    year: 2024,
    role: "Simulation and design, team of five.",
    lenses: ["engineering"],
    summary: "A class design challenge: design and simulate a descent system that lands a rocket below 5 m/s, then justify each material and design choice.",
    outcome: "4.43 m/s simulated touchdown and a score of 298/300.",
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
        heading: "Process",
        body: ["We iterated in a loop we called CAD, Code, Consider: change the model, change the simulation, check what broke, repeat."],
      },
      {
        heading: "Design changes",
        body: [
          "- Mass came down by moving the fins to carbon fiber and shelling the main body",
          "- Air brakes, grid fins and chines added drag and steered the airflow",
          "- The parachute deploys higher, where it has time to slow the rocket",
          "- Thrust is capped, and reverse thrust fires only in the final phase",
          "- Materials were chosen with a decision matrix: titanium airframe, carbon fiber fins, a graphite nozzle and a Kevlar and Nomex parachute",
        ],
      },
      {
        heading: "Results",
        body: [
          "The simulated touchdown came in at 4.43 m/s with a thrust-to-weight ratio of 1.01. We then re-ran the model with lunar gravity to show the approach carries over. The graders gave the report and technical work full marks and the video 98.",
        ],
      },
    ],
    boundary: "The simulator is a simplified one-dimensional model I wrote for this site, not the team's original code.",
    demo: {
      id: "landing",
      title: "Landing simulator",
      blurb: "Tune the parachute altitude, air brakes and thrust. Try to touch down under 5 m/s on Earth and on the Moon.",
    },
    cover: "/images/work/drag-dynamics.jpg",
    featured: false,
  },
  {
    slug: "betterbuilt",
    title: "BetterBuilt",
    short: "BetterBuilt",
    org: "BetterBuilt",
    context: "Houston",
    period: "2020 – 2023",
    year: 2023,
    role: "Co-founder, with my younger brother.",
    lenses: ["product", "engineering"],
    summary:
      "A PC build consulting business my brother and I ran during COVID. We helped people online plan and build their own PCs, and I automated the part we repeated most.",
    outcome: "50–75 inquiries a week at peak, all through Reddit and Quora.",
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
          "My brother and I wanted to buy our family Christmas gifts and didn't have the money, but we knew PCs. We started answering people on Reddit and Quora who wanted to build one, then offered to plan the whole build.",
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
        heading: "Automation",
        body: [
          "Most of the work was matching the same inputs to compatible parts over and over. I built a small Python and SQLite tool that took budget, performance priorities and appearance preferences and generated a starting parts list, which we then adjusted by hand.",
        ],
      },
      {
        heading: "What I learned",
        body: [
          "Customers rarely describe what they need in spec language. “I want to stream and it has to be quiet” is a requirement, and turning it into a parts list was most of the job. The same is true for enterprise software.",
        ],
      },
    ],
    boundary: "The part picker is a rebuild for this site with a small made-up parts catalog. It isn't the original tool.",
    demo: {
      id: "parts",
      title: "Part picker",
      blurb: "Set a budget, a use and a look, and get a compatible build with the reasoning spelled out.",
    },
    cover: "/images/work/betterbuilt.jpg",
    featured: false,
  },
];

export function getProject(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}
