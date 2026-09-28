import type { CSSProperties } from "react";

type Props = {
  text: string;
  className?: string;
};

/** Renders text as per-letter spans driven by the parent beat's --v variable; screen readers get the plain string. */
export function SplitText({ text, className }: Props) {
  const words = text.split(" ");
  const total = Math.max(1, text.replace(/\s/g, "").length);
  let index = 0;
  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((word, wi) => (
          <span key={wi}>
            <span className="word">
              {Array.from(word).map((ch) => {
                const i = index++;
                return (
                  <span key={i} className="ch" style={{ "--i": i, "--n": total } as CSSProperties}>
                    {ch}
                  </span>
                );
              })}
            </span>
            {wi < words.length - 1 ? " " : null}
          </span>
        ))}
      </span>
    </span>
  );
}
