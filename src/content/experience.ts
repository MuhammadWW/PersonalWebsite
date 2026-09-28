export type Experience = {
  org: string;
  team?: string;
  role: string;
  period: string;
  place: string;
  note: string;
  caseStudies?: string[];
};

export const experience: Experience[] = [
  {
    org: "SpaceX",
    team: "Starlink, Operations Engineering",
    role: "Starlink Engineering Intern",
    period: "Jul 2026 – present",
    place: "Bastrop, TX",
    note: "Manufacturing data analysis on the Starlink production line. Details stay with SpaceX.",
  },
  {
    org: "Microsoft",
    team: "Cloud Operations + Innovation, Global Project Controls",
    role: "Technical Program Management Intern",
    period: "May – Jul 2026",
    place: "Redmond, WA",
    note: "Built audit, reporting and AI-agent tools for the teams that manage datacenter construction costs.",
    caseStudies: ["audit-tool", "report-exports", "agents"],
  },
  {
    org: "JPMorgan Chase",
    team: "Innovation Development Program",
    role: "Summer Analyst, Advancing Black Pathways Fellowship",
    period: "Summer 2025",
    place: "Plano, TX",
    note: "Ran a product discovery playbook end to end: interviews, persona, concept, pitch and roadmap.",
    caseStudies: ["mentorship-hub"],
  },
  {
    org: "U.S. Department of Health and Human Services",
    team: "SAMHSA, Office of Financial Resources",
    role: "Intern",
    period: "2024 – 2025",
    place: "Remote",
    note: "Budget justifications, Budget Data Requests and reporting; helped run the office's annual awards ceremony.",
  },
  {
    org: "NASA Johnson Space Center",
    team: "Joint Station LAN Integration Laboratory",
    role: "Electrical Engineering Intern",
    period: "Jun – Aug 2023",
    place: "Houston, TX",
    note: "Investigated why the station crew's tablets kept losing Wi-Fi, from log analysis to lab reproduction.",
    caseStudies: ["iss-wifi"],
  },
  {
    org: "Southwest Airlines",
    team: "Houston Hobby ground operations",
    role: "Ground Operations Intern",
    period: "Summer 2022",
    place: "Houston, TX",
    note: "Worked the airport floor as a high school intern and helped design realistic job-preview material for three frontline roles.",
  },
  {
    org: "BetterBuilt",
    role: "Co-founder",
    period: "2020 – 2023",
    place: "Houston, TX",
    note: "A PC-build consulting business I started with my brother, run through Reddit and Quora.",
    caseStudies: ["betterbuilt"],
  },
];

export const education = [
  {
    org: "Texas A&M University",
    detail: "B.S. Electrical Engineering, minor in Business",
    period: "Expected 2027",
  },
  {
    org: "Texas A&M University at Qatar",
    detail: "Study abroad semester, Doha",
    period: "Spring 2025",
  },
];

export const recognition = [
  "Finis Welch Foundation Scholarship (full ride)",
  "NASA HUNCH national finalist, Destiny Module category (2021–22)",
  "Accenture Student Leadership Program fellow (2025)",
  "P&G Standout Emerging Leaders (one of 150 selected)",
  "2nd place, Product@TAMU Ideathon (2024)",
  "Invited to the UN ECOSOC Youth Forum (2026)",
];
