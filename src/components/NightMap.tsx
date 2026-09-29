import Image from "next/image";
import type { AbroadStay } from "@/content/abroad";
import { withBase } from "@/lib/site";

type MapData = AbroadStay["map"];

function toPercent(bounds: MapData["bounds"], lat: number, lon: number) {
  const [w, s, e, n] = bounds;
  return { x: ((lon - w) / (e - w)) * 100, y: ((n - lat) / (n - s)) * 100 };
}

/** Night satellite crop with labelled pins. The image is plate carrée, so pins place linearly. */
export default function NightMap({ map }: { map: MapData }) {
  const at = new Map(map.pins.map((p) => [p.name, toPercent(map.bounds, p.lat, p.lon)]));
  return (
    <figure className="night-map" style={{ aspectRatio: `${map.width} / ${map.height}` }}>
      <Image src={withBase(map.src)} alt={map.alt} fill sizes="(min-width: 1024px) 680px, 100vw" className="object-cover" />
      {map.arcs?.length ? (
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          {map.arcs.map(([a, b]) => {
            const p = at.get(a);
            const q = at.get(b);
            if (!p || !q) return null;
            const cx = (p.x + q.x) / 2 + (q.y - p.y) * 0.35;
            const cy = (p.y + q.y) / 2 - (q.x - p.x) * 0.35;
            return (
              <path
                key={a + b}
                d={`M${p.x.toFixed(2)} ${p.y.toFixed(2)}Q${cx.toFixed(2)} ${cy.toFixed(2)} ${q.x.toFixed(2)} ${q.y.toFixed(2)}`}
                className="map-arc"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>
      ) : null}
      {map.pins.map((pin) => {
        const pos = at.get(pin.name)!;
        return (
          <span
            key={pin.name}
            className="map-pin"
            data-group={pin.group}
            data-side={pin.side ?? "right"}
            style={{ left: `${pos.x.toFixed(2)}%`, top: `${pos.y.toFixed(2)}%` }}
            aria-hidden
          >
            <i />
            <span>{pin.name}</span>
          </span>
        );
      })}
      <figcaption className="map-credit">{map.credit}</figcaption>
    </figure>
  );
}
