"use client";

import { AnimatePresence, motion, useMotionValue, useSpring, useTransform, type MotionValue, type SpringOptions } from "framer-motion";
import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";

export type DockItemData = {
  icon: ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
  external?: boolean;
  active?: boolean;
  /** Hidden on narrow screens to keep the bar within the viewport. */
  hideOnMobile?: boolean;
  className?: string;
};

export type DockEntry = DockItemData | "divider";

export type DockProps = {
  items: DockEntry[];
  className?: string;
  /** Pointer distance (px) over which neighbouring items magnify. */
  distance?: number;
  panelHeight?: number;
  baseItemSize?: number;
  magnification?: number;
  spring?: SpringOptions;
  label?: string;
};

type ItemProps = {
  item: DockItemData;
  mouseX: MotionValue<number>;
  spring: SpringOptions;
  distance: number;
  baseItemSize: number;
  magnification: number;
};

function DockItem({ item, mouseX, spring, distance, baseItemSize, magnification }: ItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [showLabel, setShowLabel] = useState(false);

  const mouseDistance = useTransform(mouseX, (x) => {
    const rect = ref.current?.getBoundingClientRect();
    return rect ? x - rect.x - baseItemSize / 2 : Infinity;
  });
  const target = useTransform(mouseDistance, [-distance, 0, distance], [baseItemSize, magnification, baseItemSize]);
  const size = useSpring(target, spring);

  const content = (
    <>
      <span className="dock-icon" aria-hidden>
        {item.icon}
      </span>
      <span className="dock-caption" aria-hidden>
        {item.label}
      </span>
    </>
  );
  const common = {
    className: `dock-item ${item.className ?? ""}`,
    "data-active": item.active ? "true" : undefined,
    "aria-label": item.label,
    "aria-current": item.active ? ("true" as const) : undefined,
    onFocus: () => setShowLabel(true),
    onBlur: () => setShowLabel(false),
  };

  return (
    <motion.div
      ref={ref}
      className={`dock-slot ${item.hideOnMobile ? "max-sm:hidden" : ""}`}
      style={{ width: size, height: size }}
      onHoverStart={() => setShowLabel(true)}
      onHoverEnd={() => setShowLabel(false)}
    >
      {item.href && item.external ? (
        <a href={item.href} target={item.href.startsWith("mailto:") ? undefined : "_blank"} rel="noreferrer" {...common}>
          {content}
        </a>
      ) : item.href ? (
        <Link href={item.href} onClick={item.onClick} {...common}>
          {content}
        </Link>
      ) : (
        <button type="button" onClick={item.onClick} {...common}>
          {content}
        </button>
      )}
      <AnimatePresence>
        {showLabel ? (
          <motion.span
            className="dock-label max-sm:hidden"
            role="tooltip"
            initial={{ opacity: 0, y: 2, x: "-50%" }}
            animate={{ opacity: 1, y: -2, x: "-50%" }}
            exit={{ opacity: 0, y: 2, x: "-50%" }}
            transition={{ duration: 0.14 }}
          >
            {item.label}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}

export default function Dock({
  items,
  className,
  distance = 140,
  panelHeight = 60,
  baseItemSize = 44,
  magnification = 64,
  spring = { mass: 0.1, stiffness: 150, damping: 12 },
  label = "Site navigation",
}: DockProps) {
  const mouseX = useMotionValue(Infinity);

  return (
    <div className={`dock-outer ${className ?? ""}`}>
      <motion.nav
        aria-label={label}
        className="dock-panel"
        style={{ height: panelHeight }}
        onMouseMove={(e) => mouseX.set(e.clientX)}
        onMouseLeave={() => mouseX.set(Infinity)}
      >
        {items.map((entry, i) =>
          entry === "divider" ? (
            <span key={`d${i}`} className="dock-divider max-sm:hidden" aria-hidden />
          ) : (
            <DockItem
              key={entry.label}
              item={entry}
              mouseX={mouseX}
              spring={spring}
              distance={distance}
              baseItemSize={baseItemSize}
              magnification={magnification}
            />
          ),
        )}
      </motion.nav>
    </div>
  );
}
