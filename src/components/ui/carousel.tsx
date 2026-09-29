"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { clamp, lerp } from "@/lib/math";
import { withBase } from "@/lib/site";

/**
 * Material 3 carousel (m3.material.io/components/carousel/specs).
 *
 * Multi-browse and hero layouts place items on keylines: large, medium and small slots
 * that items grow and shrink through as the track scrolls. Items keep a fixed "unmasked"
 * width and are clipped to their slot, so images crop instead of squashing. Near the end
 * the keylines shift to their mirrored end state so the last items can reach full size.
 */

export type CarouselItem = {
  id: string;
  href: string;
  title: string;
  meta?: string;
  image?: string;
  imageAlt?: string;
  /** Rendered instead of an image, centred in the item. */
  fallback?: ReactNode;
};

export type CarouselLayout = "multi-browse" | "hero" | "center-hero" | "uncontained" | "full-screen";

type Slot = { x: number; w: number };

type Geometry = {
  kind: "keyline" | "center" | "free";
  width: number;
  inner: number;
  pad: number;
  gap: number;
  small: number;
  large: number;
  step: number;
  snaps: number[];
  maxScroll: number;
  start: Slot[];
  end: Slot[];
  shiftFrom: number;
};

const SMALL_MIN = 40;
const SMALL_MAX = 56;

function tile(widths: number[], gap: number): Slot[] {
  let x = 0;
  return widths.map((w) => {
    const slot = { x, w };
    x += w + gap;
    return slot;
  });
}

function range(count: number, step: number): number[] {
  return Array.from({ length: Math.max(1, count) }, (_, k) => k * step);
}

function computeGeometry(width: number, count: number, requested: CarouselLayout, largePref?: number): Geometry {
  const compact = width < 600;
  const layout = requested === "multi-browse" && compact ? "hero" : requested;
  const empty = { start: [], end: [], shiftFrom: 0 };

  if (layout === "full-screen") {
    const gap = 16;
    const step = width + gap;
    return { kind: "free", width, inner: width, pad: 0, gap, small: 0, large: width, step, snaps: range(count, step), maxScroll: (count - 1) * step, ...empty };
  }

  const pad = 16;
  const gap = 8;
  const inner = Math.max(0, width - pad * 2);
  const small = compact ? SMALL_MIN : SMALL_MAX;

  if (layout === "uncontained" || count < 2) {
    const large = count < 2 ? inner : Math.min(largePref ?? Math.round(inner * 0.72), inner);
    const step = large + gap;
    const maxScroll = Math.max(0, pad * 2 + count * large + (count - 1) * gap - width);
    const snaps = range(count, step).filter((s) => s < maxScroll);
    snaps.push(maxScroll);
    return { kind: "free", width, inner, pad, gap, small, large, step, snaps, maxScroll, ...empty };
  }

  if (layout === "center-hero") {
    const large = Math.max(small * 2, inner - 2 * (small + gap));
    const start = tile([small, large, small], gap);
    const step = large + gap;
    return { kind: "center", width, inner, pad, gap, small, large, step, snaps: range(count, step), maxScroll: (count - 1) * step, start, end: start, shiftFrom: count };
  }

  const withMedium = layout === "multi-browse";
  let largeCount = withMedium && inner >= 1100 ? 2 : 1;
  let visible = largeCount + (withMedium ? 2 : 1);
  while (largeCount > 1 && visible > count) {
    largeCount -= 1;
    visible -= 1;
  }
  const medium = withMedium && visible <= count;
  if (!medium) visible = largeCount + 1;

  const base = inner - small - gap * (visible - 1);
  let mediumWidth = medium ? Math.round(base * (largeCount === 2 ? 0.26 : 0.36)) : 0;
  let large = (base - mediumWidth) / largeCount;
  if (largePref && medium && large > largePref) {
    const grown = base - largePref * largeCount;
    if (grown < largePref * 0.85) {
      large = largePref;
      mediumWidth = grown;
    }
  }

  const widths = [...Array<number>(largeCount).fill(large), ...(medium ? [mediumWidth] : []), small];
  const start = tile(widths, gap);
  const end = tile([...widths].reverse(), gap);
  const step = large + gap;
  const shiftFrom = count - visible;
  const lastIndex = shiftFrom + visible - 1;
  return { kind: "keyline", width, inner, pad, gap, small, large, step, snaps: range(lastIndex + 1, step), maxScroll: lastIndex * step, start, end, shiftFrom };
}

function place(g: Geometry, count: number, index: number, f: number): Slot | null {
  const visible = g.start.length;
  const anchorStart = { x: -(g.small + g.gap), w: g.small };
  const anchorEnd = { x: g.inner + g.gap, w: g.small };
  const slotAt = (j: number) => (j < 0 ? anchorStart : j >= visible ? anchorEnd : g.start[j]);
  const along = (k: number) => {
    if (k <= -1 || k >= visible) return null;
    const j = Math.floor(k);
    const t = k - j;
    const a = slotAt(j);
    const b = slotAt(j + 1);
    return { x: lerp(a.x, b.x, t), w: lerp(a.w, b.w, t) };
  };

  if (g.kind === "center") return along(index - f + 1);
  if (f <= g.shiftFrom) return along(index - f);

  const e = clamp((f - g.shiftFrom) / Math.max(1, visible - 1));
  const m = index - (count - visible);
  if (m < 0) return null;
  return { x: lerp(g.start[m].x, g.end[m].x, e), w: lerp(g.start[m].w, g.end[m].w, e) };
}

type Props = {
  items: CarouselItem[];
  label: string;
  layout?: CarouselLayout;
  /** Preferred width of large items; the layout may make them narrower to fit. */
  largeItemWidth?: number;
  /** CSS height of the carousel, including its 8px top and bottom padding. */
  height?: string;
  className?: string;
};

export default function Carousel({ items, label, layout = "multi-browse", largeItemWidth, height = "clamp(320px, 38vw, 480px)", className }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const mediaRefs = useRef<(HTMLDivElement | null)[]>([]);
  const textRefs = useRef<(HTMLDivElement | null)[]>([]);
  const geoRef = useRef<Geometry | null>(null);
  const frame = useRef(0);
  const drag = useRef<{ x0: number; s0: number; moved: boolean; id: number } | null>(null);
  const suppressClick = useRef(false);
  const [geo, setGeo] = useState<Geometry | null>(null);
  const [edges, setEdges] = useState({ atStart: true, atEnd: false });
  const count = items.length;

  const paint = useCallback(() => {
    frame.current = 0;
    const g = geoRef.current;
    const scroller = scrollerRef.current;
    if (!g || !scroller || g.kind === "free") return;
    const f = scroller.scrollLeft / g.step;
    for (let i = 0; i < count; i++) {
      const el = itemRefs.current[i];
      if (!el) continue;
      const slot = place(g, count, i, f);
      if (!slot || slot.w < 1) {
        el.style.visibility = "hidden";
        continue;
      }
      el.style.visibility = "visible";
      el.style.width = `${slot.w}px`;
      el.style.transform = `translate3d(${g.pad + slot.x}px, 0, 0)`;
      const text = textRefs.current[i];
      if (text) text.style.opacity = String(clamp((slot.w - 150) / 90));
    }
    const left = scroller.scrollLeft;
    setEdges((prev) => {
      const next = { atStart: left <= 2, atEnd: left >= g.maxScroll - 2 };
      return prev.atStart === next.atStart && prev.atEnd === next.atEnd ? prev : next;
    });
  }, [count]);

  const schedule = useCallback(() => {
    if (!frame.current) frame.current = requestAnimationFrame(paint);
  }, [paint]);

  const register = useMemo<Register>(
    () => ({
      item: (i, el) => {
        itemRefs.current[i] = el;
      },
      media: (i, el) => {
        mediaRefs.current[i] = el;
      },
      text: (i, el) => {
        textRefs.current[i] = el;
      },
    }),
    [],
  );

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const ro = new ResizeObserver(() => {
      const g = computeGeometry(scroller.clientWidth, count, layout, largeItemWidth);
      geoRef.current = g;
      setGeo(g);
      schedule();
    });
    ro.observe(scroller);
    scroller.addEventListener("scroll", schedule, { passive: true });
    return () => {
      ro.disconnect();
      scroller.removeEventListener("scroll", schedule);
      cancelAnimationFrame(frame.current);
      frame.current = 0;
    };
  }, [count, layout, largeItemWidth, schedule]);

  useEffect(() => {
    const g = geoRef.current;
    if (!g || g.kind === "free") return;
    for (let i = 0; i < count; i++) {
      const media = mediaRefs.current[i];
      if (media) media.style.width = `${g.large}px`;
    }
    schedule();
  }, [geo, count, schedule]);

  const nearestSnap = (left: number) => {
    const g = geoRef.current;
    if (!g) return left;
    return g.snaps.reduce((best, s) => (Math.abs(s - left) < Math.abs(best - left) ? s : best), g.snaps[0]);
  };

  const go = (direction: -1 | 1) => {
    const scroller = scrollerRef.current;
    const g = geoRef.current;
    if (!scroller || !g) return;
    const current = nearestSnap(scroller.scrollLeft);
    const idx = g.snaps.indexOf(current);
    const target = g.snaps[clamp(idx + direction, 0, g.snaps.length - 1)];
    scroller.scrollTo({ left: target, behavior: "smooth" });
  };

  const focusItem = (i: number) => {
    const scroller = scrollerRef.current;
    const g = geoRef.current;
    if (!scroller || !g) return;
    let target: number;
    if (g.kind === "free") target = Math.min(i * g.step, g.maxScroll);
    else if (g.kind === "center") target = i * g.step;
    else target = (i <= g.shiftFrom ? i : g.snaps.length - 1) * g.step;
    if (Math.abs(scroller.scrollLeft - target) > 2) scroller.scrollTo({ left: target, behavior: "smooth" });
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    drag.current = { x0: e.clientX, s0: e.currentTarget.scrollLeft, moved: false, id: e.pointerId };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x0;
    if (!d.moved && Math.abs(dx) > 5) {
      d.moved = true;
      e.currentTarget.style.scrollSnapType = "none";
      e.currentTarget.setPointerCapture(d.id);
    }
    if (d.moved) e.currentTarget.scrollLeft = d.s0 - dx;
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d?.moved) return;
    suppressClick.current = true;
    const scroller = e.currentTarget;
    const target = nearestSnap(scroller.scrollLeft);
    scroller.scrollTo({ left: target, behavior: "smooth" });
    window.setTimeout(() => {
      scroller.style.scrollSnapType = "";
    }, 450);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(-1);
    }
  };

  const free = !geo || geo.kind === "free";
  const trackWidth = geo && !free ? geo.maxScroll + geo.width : undefined;

  return (
    <div className={`m3-carousel ${className ?? ""}`} role="region" aria-roledescription="carousel" aria-label={label}>
      <div className="mb-3 flex justify-end gap-2 px-4 max-sm:hidden">
        <button type="button" className="btn btn-sm !px-2" onClick={() => go(-1)} disabled={edges.atStart} aria-label="Previous">
          <ChevronLeft size={18} aria-hidden />
        </button>
        <button type="button" className="btn btn-sm !px-2" onClick={() => go(1)} disabled={edges.atEnd} aria-label="Next">
          <ChevronRight size={18} aria-hidden />
        </button>
      </div>
      <div
        ref={scrollerRef}
        className="m3-carousel-scroller"
        style={{ height }}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={(e) => {
          if (suppressClick.current) {
            e.preventDefault();
            e.stopPropagation();
            suppressClick.current = false;
          }
        }}
      >
        {free ? (
          <div
            className="flex h-full"
            style={{ gap: geo?.gap ?? 8, paddingLeft: geo?.pad ?? 16, paddingRight: geo?.pad ?? 16, width: "max-content" }}
          >
            {items.map((item, i) => (
              <ItemLink
                key={item.id}
                item={item}
                index={i}
                count={count}
                style={{
                  position: "relative",
                  top: "auto",
                  bottom: "auto",
                  alignSelf: "center",
                  height: "calc(100% - 16px)",
                  width: geo?.large ?? 320,
                  flexShrink: 0,
                  scrollSnapAlign: "start",
                  scrollMarginLeft: geo?.pad ?? 16,
                }}
                onFocus={() => focusItem(i)}
                register={register}
                mediaWidth={geo?.large}
              />
            ))}
          </div>
        ) : (
          <div className="m3-carousel-track h-full" style={{ width: trackWidth }}>
            {geo!.snaps.map((s) => (
              <span key={s} className="m3-carousel-snap" style={{ left: s }} aria-hidden />
            ))}
            <div className="m3-carousel-stage h-full" style={{ width: geo!.width }}>
              {items.map((item, i) => (
                <ItemLink
                  key={item.id}
                  item={item}
                  index={i}
                  count={count}
                  style={{ visibility: "hidden" }}
                  onFocus={() => focusItem(i)}
                  register={register}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

type Register = {
  item: (index: number, el: HTMLAnchorElement | null) => void;
  media: (index: number, el: HTMLDivElement | null) => void;
  text: (index: number, el: HTMLDivElement | null) => void;
};

function ItemLink({
  item,
  index,
  count,
  style,
  onFocus,
  register,
  mediaWidth,
}: {
  item: CarouselItem;
  index: number;
  count: number;
  style: React.CSSProperties;
  onFocus: () => void;
  register: Register;
  mediaWidth?: number;
}) {
  return (
    <Link
      href={item.href}
      className="m3-carousel-item"
      style={style}
      aria-roledescription="slide"
      aria-label={`${item.title}${item.meta ? `, ${item.meta}` : ""} (${index + 1} of ${count})`}
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
      onFocus={onFocus}
      ref={(el) => register.item(index, el)}
    >
      <div className="m3-carousel-media" style={mediaWidth ? { width: mediaWidth } : undefined} ref={(el) => register.media(index, el)}>
        {item.image ? (
          <Image src={withBase(item.image)} alt={item.imageAlt ?? ""} fill sizes="(min-width: 1100px) 560px, 90vw" draggable={false} />
        ) : (
          <div className="grid h-full w-full place-items-center bg-primary-container text-on-primary-container">{item.fallback}</div>
        )}
      </div>
      <div className="m3-carousel-scrim" />
      <div className="m3-carousel-text" ref={(el) => register.text(index, el)}>
        {item.meta ? <p className="label-s mb-1 opacity-85">{item.meta}</p> : null}
        <p className="title-l">{item.title}</p>
      </div>
    </Link>
  );
}
