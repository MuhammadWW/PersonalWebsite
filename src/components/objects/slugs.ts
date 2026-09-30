/** Projects that get a 3D object instead of a line glyph. Kept free of three.js so server components can import it. */
export const OBJECT_PROJECTS = ["iss-wifi", "audit-tool", "report-exports", "agents", "mentorship-hub"] as const;
export type ObjectProject = (typeof OBJECT_PROJECTS)[number];

export const OBJECT_LABELS: Record<ObjectProject, string> = {
  "iss-wifi": "3D model of the International Space Station, with Wi-Fi rings rising from the U.S. lab",
  "audit-tool": "3D model of a datacenter campus under construction, with a tower crane",
  "report-exports": "3D model of a fan of per-project report pages",
  agents: "3D model of a chat answer that cites a source document",
  "mentorship-hub": "3D model of a mentee connected to three mentors",
};

export function hasObject(slug: string): slug is ObjectProject {
  return (OBJECT_PROJECTS as readonly string[]).includes(slug);
}
