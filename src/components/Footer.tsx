import Link from "next/link";
import { profile } from "@/content/profile";

export default function Footer() {
  return (
    <footer className="content-over border-t border-line pb-[calc(var(--dock-space)+8px)]">
      <div className="wrap flex flex-col gap-6 py-10 text-sm sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="font-medium">© {new Date().getFullYear()} {profile.name}</p>
          <p className="muted max-w-[60ch]">
            Demos use made-up data. Night imagery is NASA Black Marble, served by NASA GIBS; daytime Earth from NASA Blue Marble.
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
