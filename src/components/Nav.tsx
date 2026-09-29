"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import SiteDock from "./SiteDock";

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
    <>
      <header className="site-nav" data-solid={solid ? "true" : "false"}>
        <div className="wrap flex h-16 items-center">
          <Link href="/" className="name-chip state">
            <span className="mark" aria-hidden>
              MW
            </span>
            Muhammad Wadiwala
          </Link>
        </div>
      </header>
      <SiteDock />
    </>
  );
}
