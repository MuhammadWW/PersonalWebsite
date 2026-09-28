import Link from "next/link";
import { profile } from "@/content/profile";

export default function Footer() {
  return (
    <footer className="content-over border-t border-line">
      <div className="wrap flex flex-col gap-6 py-10 text-sm sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="font-medium">{profile.name}</p>
          <p className="muted max-w-[52ch]">
            Designed and built by me in Houston and Bastrop. Interactive demos use synthetic data and are labeled as
            portfolio reconstructions. Earth imagery: NASA Earth Observatory.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <a href={`mailto:${profile.email}`} className="nav-link">
            Email
          </a>
          <a href={profile.linkedin} className="nav-link" target="_blank" rel="noreferrer">
            LinkedIn
          </a>
          <a href={profile.github} className="nav-link" target="_blank" rel="noreferrer">
            GitHub
          </a>
          <Link href="/resume/" className="nav-link">
            Résumé
          </Link>
        </div>
      </div>
    </footer>
  );
}
