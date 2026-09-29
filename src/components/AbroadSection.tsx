import { abroad } from "@/content/abroad";
import NightMap from "./NightMap";

export default function AbroadSection() {
  return (
    <section id="abroad" className="scroll-mt-16" aria-labelledby="abroad-title">
      <div className="wrap pb-10 pt-4">
        <div className="grid gap-5 md:grid-cols-12 md:items-end">
          <h2 id="abroad-title" className="display-l md:col-span-6">
            Abroad
          </h2>
          <p className="lead muted md:col-span-6 md:max-w-[52ch] md:justify-self-end">A semester in Qatar and a research program in Mexico.</p>
        </div>
      </div>
      {abroad.map((stay, i) => (
        <div key={stay.id} className="abroad-band" data-theme={stay.theme}>
          <div className="wrap grid gap-10 md:grid-cols-12 md:items-center md:gap-12">
            <div className={`md:col-span-5 ${i % 2 ? "md:order-2" : ""}`}>
              <p className="label abroad-muted">{stay.kicker}</p>
              <h3 className="display-l mt-5">{stay.place}</h3>
              <p className="title-l mt-3">{stay.program}</p>
              <p className="label-s abroad-muted mt-2 font-mono">{stay.coords}</p>
              <div className="prose-mw mt-7 text-[1.05rem]">
                {stay.body.map((para) => (
                  <p key={para.slice(0, 24)}>{para}</p>
                ))}
              </div>
              <dl className="abroad-facts mt-8">
                {stay.facts.map((f) => (
                  <div key={f.label}>
                    <dt className="label-s abroad-muted">{f.label}</dt>
                    <dd>{f.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className={`md:col-span-7 ${i % 2 ? "md:order-1" : ""}`}>
              <NightMap map={stay.map} />
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
