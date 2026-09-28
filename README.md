# wadiwala.net

Personal site of Muhammad Ali Wadiwala: case studies, working demos and a résumé.

The home page opens with a scroll-driven WebGL sequence that climbs from a pre-dawn Houston rooftop, through the cloud deck, to low Earth orbit. Each case study ends with a small interactive demo, rebuilt from scratch with synthetic data. None of them is an employer's code or data.

## Stack

- Next.js 16 (App Router), exported as a fully static site (`output: "export"`)
- React 19, TypeScript, Tailwind CSS v4
- Three.js for the intro (custom shaders, no post-processing library)
- Jost and IBM Plex Mono via `next/font`

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # static site in out/
```

`npm run build` also runs `scripts/postbuild.mjs`, which copies Next's segment prefetch files to the flat names the client requests, so plain static hosts don't return 404s for them.

## Where things live

| What | Where |
| --- | --- |
| Bio, links, headline | `src/content/profile.ts` |
| Roles, education, recognition | `src/content/experience.ts` |
| Case studies (copy, facts, which demo to show) | `src/content/projects.ts` |
| Demos | `src/components/demos/` |
| Intro scene and scroll beats | `src/components/intro/` |
| Printable résumé | `src/app/resume/page.tsx` |

To add a case study, add an entry to `projects` in `src/content/projects.ts`. Its page, the home-page row and the sitemap entry are generated from that. To attach a demo, add a component under `src/components/demos/`, register it in `DemoSlot.tsx` and set `demo` on the project.

## Deployment

Every push to `main` runs `.github/workflows/deploy.yml`, which:

1. builds the site for the root of a domain and force-pushes it to the **`deploy`** branch. Porkbun static hosting can serve that branch directly.
2. publishes the site to **GitHub Pages**. Until a custom domain is set in the repo's Pages settings, this is a preview at `https://muhammadww.github.io/PersonalWebsite/`. That preview is built under `/PersonalWebsite` and marked `noindex`.

For the very first publish, run `powershell -ExecutionPolicy Bypass -File scripts/publish.ps1`. It signs in to GitHub, sets the Pages source to GitHub Actions and pushes `main`. To do the same by hand, go to **Settings → Pages → Source: GitHub Actions**, then run `git push -u origin main`.

### Pointing wadiwala.net at the site

The domain is registered at Porkbun. First make sure it uses Porkbun's nameservers: **Domain Management → wadiwala.net → Authoritative Nameservers → use Porkbun defaults**. Then pick one host.

**Option A: GitHub Pages (free)**

1. In Porkbun **DNS** for wadiwala.net, delete any parking/ALIAS/CNAME records on the root and `www`, then add:
   - `A` records for the root host (blank) → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `CNAME` for `www` → `muhammadww.github.io`
2. On GitHub: **Settings → Pages → Custom domain** → `wadiwala.net` → Save. Tick **Enforce HTTPS** once the certificate is issued (usually within the hour).
3. **Actions → Deploy → Run workflow**, so the next build drops the `/PersonalWebsite` prefix.

**Option B: Porkbun static hosting**

1. In Porkbun, open **Website** for wadiwala.net and choose static hosting.
2. Use **Connect to GitHub** and select repository `PersonalWebsite`, branch `deploy`. The branch appears after the first deploy has run.
3. Porkbun adds the DNS records itself. Porkbun hosting is a paid add-on after its trial.

Don't set up both options: one set of DNS records wins.

## Credits

Earth textures: NASA Earth Observatory (Blue Marble and Black Marble). Fonts: Jost and IBM Plex Mono (SIL Open Font License). The demo datasets are synthetic and were generated for this site.
