"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const links = [
  { href: "/#work", label: "Work" },
  { href: "/#lab", label: "Lab", hideSm: true },
  { href: "/#about", label: "About" },
  { href: "/#contact", label: "Contact", hideSm: true },
  { href: "/resume/", label: "Résumé" },
];

export default function Nav() {
  const pathname = usePathname();
  const isHome = pathname === "/" || pathname === "";
  const [pastIntro, setPastIntro] = useState(false);
  const solid = !isHome || pastIntro;

  useEffect(() => {
    if (!isHome) return;
    const onScroll = () => {
      const intro = document.getElementById("intro");
      const bottom = intro ? intro.getBoundingClientRect().bottom : 0;
      setPastIntro(bottom < 64);
    };
    const raf = requestAnimationFrame(onScroll);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, [isHome]);

  return (
    <header className="site-nav" data-solid={solid ? "true" : "false"}>
      <div className="wrap flex h-16 items-center justify-between gap-6">
        <Link href="/" className="text-[0.95rem] font-medium tracking-tight">
          Muhammad Wadiwala
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-5 sm:gap-7">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`nav-link ${l.hideSm ? "hidden sm:inline-block" : ""}`}
              aria-current={l.href === "/resume/" && pathname.startsWith("/resume") ? "page" : undefined}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
