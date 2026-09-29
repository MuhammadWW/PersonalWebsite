"use client";

import { Briefcase, Earth, FileText, FlaskConical, History, House, Mail, User } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { profile } from "@/content/profile";
import Dock, { type DockEntry } from "./ui/dock";

const SECTIONS = ["intro", "work", "lab", "experience", "abroad", "about", "contact"] as const;
type Section = (typeof SECTIONS)[number];

function LinkedInMark() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.75h4v11H3v-11Zm7 0h3.8v1.5h.05c.53-.96 1.83-1.98 3.77-1.98 4.03 0 4.78 2.53 4.78 5.83v5.65h-4v-5c0-1.2-.02-2.75-1.7-2.75-1.7 0-1.95 1.3-1.95 2.66v5.09H10v-11Z" />
    </svg>
  );
}

function GitHubMark() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2.25a9.75 9.75 0 0 0-3.08 19c.49.09.67-.21.67-.47v-1.65c-2.72.59-3.29-1.31-3.29-1.31-.45-1.13-1.09-1.43-1.09-1.43-.89-.61.07-.6.07-.6.98.07 1.5 1.01 1.5 1.01.87 1.49 2.29 1.06 2.85.81.09-.63.34-1.06.62-1.31-2.17-.25-4.46-1.09-4.46-4.84 0-1.07.38-1.94 1.01-2.63-.1-.25-.44-1.24.1-2.59 0 0 .82-.26 2.68 1a9.3 9.3 0 0 1 4.88 0c1.86-1.26 2.68-1 2.68-1 .54 1.35.2 2.34.1 2.59.63.69 1.01 1.56 1.01 2.63 0 3.76-2.29 4.59-4.47 4.83.35.3.67.9.67 1.82v2.7c0 .26.18.57.68.47A9.75 9.75 0 0 0 12 2.25Z" />
    </svg>
  );
}

export default function SiteDock() {
  const pathname = usePathname();
  const isHome = pathname === "/" || pathname === "";
  const [section, setSection] = useState<Section>("intro");

  useEffect(() => {
    if (!isHome) return;
    const els = SECTIONS.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el);
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setSection(entry.target.id as Section);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [isHome]);

  const current = isHome ? section : pathname.startsWith("/work") ? "work" : pathname.startsWith("/resume") ? "resume" : null;
  const icon = { strokeWidth: 1.75 };

  const items: DockEntry[] = [
    { icon: <House {...icon} />, label: "Home", href: "/#intro", active: current === "intro" },
    "divider",
    { icon: <Briefcase {...icon} />, label: "Projects", href: "/#work", active: current === "work" },
    { icon: <FlaskConical {...icon} />, label: "Demos", href: "/#lab", active: current === "lab" },
    { icon: <History {...icon} />, label: "Experience", href: "/#experience", active: current === "experience", hideOnMobile: true },
    { icon: <Earth {...icon} />, label: "Abroad", href: "/#abroad", active: current === "abroad", hideOnMobile: true },
    { icon: <User {...icon} />, label: "About", href: "/#about", active: current === "about" },
    { icon: <Mail {...icon} />, label: "Contact", href: "/#contact", active: current === "contact" },
    "divider",
    { icon: <FileText {...icon} />, label: "Résumé", href: "/resume/", active: current === "resume" },
    { icon: <LinkedInMark />, label: "LinkedIn", href: profile.linkedin, external: true, hideOnMobile: true },
    { icon: <GitHubMark />, label: "GitHub", href: profile.github, external: true, hideOnMobile: true },
  ];

  return <Dock items={items} className="no-print" />;
}
