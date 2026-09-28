type Props = { slug: string; className?: string; title?: string };

const ACCENT = "var(--color-signal)";

/** Monoline "mission patch" diagrams, one per project. */
export default function ProjectGlyph({ slug, className, title }: Props) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      {glyph(slug)}
    </svg>
  );
}

function glyph(slug: string) {
  switch (slug) {
    case "audit-tool":
      return (
        <g>
          {Array.from({ length: 11 }, (_, i) => (
            <line key={i} x1={24} x2={24 + 14 + ((i * 7) % 12)} y1={28 + i * 6} y2={28 + i * 6} opacity={0.75} />
          ))}
          <path d="M58 28 q6 0 6 8 v6 q0 4 4 4 q-4 0 -4 4 v6 q0 8 -6 8" />
          <path d="M58 70 q6 0 6 6 v2 q0 4 4 4 q-4 0 -4 4 v2 q0 6 -6 6" />
          <rect x={74} y={40} width={24} height={12} rx={2} stroke={ACCENT} />
          <rect x={74} y={76} width={24} height={12} rx={2} />
          <path d="M80 46 l3 3 l6 -6" stroke={ACCENT} />
        </g>
      );
    case "mentorship-hub":
      return (
        <g>
          <circle cx={48} cy={60} r={20} />
          <circle cx={72} cy={60} r={20} stroke={ACCENT} />
          {[0, 1, 2].map((i) => (
            <circle key={i} cx={46 + i * 14} cy={96} r={3.5} fill={i < 3 ? "currentColor" : "none"} />
          ))}
          <line x1={30} y1={24} x2={90} y2={24} opacity={0.5} />
          <line x1={38} y1={30} x2={82} y2={30} opacity={0.35} />
        </g>
      );
    case "report-exports":
      return (
        <g>
          <rect x={22} y={28} width={36} height={48} rx={2} />
          <line x1={28} y1={36} x2={52} y2={36} />
          <rect x={28} y={44} width={24} height={6} rx={1} stroke={ACCENT} />
          <line x1={28} y1={58} x2={48} y2={58} opacity={0.6} />
          <line x1={28} y1={64} x2={44} y2={64} opacity={0.6} />
          <path d="M62 52 h14" stroke={ACCENT} />
          <path d="M72 48 l4 4 l-4 4" stroke={ACCENT} />
          <rect x={80} y={34} width={22} height={30} rx={2} />
          <rect x={84} y={40} width={14} height={4} fill={ACCENT} stroke="none" />
          <line x1={84} y1={50} x2={98} y2={50} opacity={0.6} />
          <line x1={84} y1={55} x2={94} y2={55} opacity={0.6} />
          <rect x={80} y={70} width={22} height={18} rx={2} opacity={0.45} />
        </g>
      );
    case "iss-wifi":
      return (
        <g>
          {[36, 52, 68, 84].map((y, i) => (
            <line key={y} x1={20} x2={100} y1={y} y2={y} opacity={0.35} strokeDasharray={i === 2 ? "2 3" : undefined} />
          ))}
          <line x1={26} x2={62} y1={36} y2={36} strokeWidth={3} />
          <line x1={70} x2={96} y1={52} y2={52} strokeWidth={3} />
          {Array.from({ length: 9 }, (_, i) => (
            <line key={i} x1={28 + i * 8} x2={28 + i * 8} y1={63} y2={73} stroke={ACCENT} />
          ))}
          <line x1={26} x2={48} y1={84} y2={84} strokeWidth={3} />
          <line x1={58} x2={88} y1={84} y2={84} strokeWidth={3} opacity={0.6} />
        </g>
      );
    case "agents":
      return (
        <g>
          <path d="M24 32 h60 a6 6 0 0 1 6 6 v24 a6 6 0 0 1 -6 6 h-38 l-12 10 v-10 h-10 a6 6 0 0 1 -6 -6 v-24 a6 6 0 0 1 6 -6 z" />
          <line x1={32} y1={44} x2={74} y2={44} />
          <line x1={32} y1={52} x2={66} y2={52} opacity={0.6} />
          <rect x={70} y={48} width={10} height={8} rx={1.5} stroke={ACCENT} />
          <path d="M80 84 h16 v-10" stroke={ACCENT} />
          <rect x={64} y={80} width={16} height={12} rx={1.5} stroke={ACCENT} />
        </g>
      );
    case "destiny-module":
      return (
        <g>
          <circle cx={50} cy={62} r={30} />
          <circle cx={50} cy={62} r={22} strokeDasharray="3 3" opacity={0.6} />
          {[0, 45, 90, 135].map((a) => (
            <line
              key={a}
              x1={50 + Math.cos((a * Math.PI) / 180) * 30}
              y1={62 + Math.sin((a * Math.PI) / 180) * 30}
              x2={50 - Math.cos((a * Math.PI) / 180) * 30}
              y2={62 - Math.sin((a * Math.PI) / 180) * 30}
              opacity={0.35}
            />
          ))}
          <rect x={88} y={47} width={16} height={30} stroke={ACCENT} />
          <line x1={84} y1={77} x2={108} y2={77} />
          <path d="M80 32 v60" strokeDasharray="1 4" opacity={0.5} />
        </g>
      );
    case "forwardnotes":
      return (
        <g>
          <rect x={20} y={46} width={30} height={40} rx={2} opacity={0.55} />
          <rect x={70} y={46} width={30} height={40} rx={2} />
          <line x1={26} y1={56} x2={44} y2={56} opacity={0.55} />
          <line x1={26} y1={63} x2={40} y2={63} opacity={0.55} />
          <line x1={76} y1={56} x2={94} y2={56} />
          <line x1={76} y1={63} x2={90} y2={63} />
          <path d="M35 42 q25 -26 50 0" stroke={ACCENT} />
          <path d="M80 38 l5 4 l-6 3" stroke={ACCENT} />
        </g>
      );
    case "watermark-lab":
      return (
        <g>
          {Array.from({ length: 36 }, (_, i) => {
            const x = 24 + (i % 6) * 12;
            const y = 24 + Math.floor(i / 6) * 12;
            const green = [1, 2, 4, 7, 9, 10, 14, 15, 17, 20, 22, 25, 27, 28, 31, 33, 34].includes(i);
            return <rect key={i} x={x} y={y} width={8} height={8} rx={1.5} fill={green ? ACCENT : "none"} stroke={green ? "none" : "currentColor"} opacity={green ? 0.9 : 0.5} />;
          })}
        </g>
      );
    case "learn-out-loud":
      return (
        <g>
          {[8, 18, 30, 22, 40, 28, 14, 34, 24, 12, 20, 8].map((h, i) => (
            <line key={i} x1={26 + i * 6} x2={26 + i * 6} y1={60 - h / 2} y2={60 + h / 2} stroke={i === 4 || i === 7 ? ACCENT : "currentColor"} strokeWidth={2} />
          ))}
          <circle cx={60} cy={60} r={42} opacity={0.3} />
        </g>
      );
    case "drag-dynamics":
      return (
        <g>
          <path d="M34 26 q26 -12 52 0" />
          <line x1={34} y1={26} x2={57} y2={52} opacity={0.6} />
          <line x1={86} y1={26} x2={63} y2={52} opacity={0.6} />
          <rect x={56} y={52} width={8} height={22} rx={3} />
          <path d="M56 70 l-4 6 h4 M64 70 l4 6 h-4" />
          <path d="M60 80 v6" stroke={ACCENT} strokeDasharray="2 2" />
          <line x1={22} y1={96} x2={98} y2={96} />
          <path d="M40 96 v-3 M80 96 v-3" opacity={0.5} />
          <text x={84} y={88} fontSize={8} fill={ACCENT} stroke="none" fontFamily="monospace">
            &lt;5
          </text>
        </g>
      );
    case "betterbuilt":
      return (
        <g>
          <rect x={34} y={22} width={46} height={76} rx={3} />
          <circle cx={57} cy={40} r={9} />
          <circle cx={57} cy={40} r={3} stroke={ACCENT} />
          <circle cx={57} cy={64} r={9} />
          <circle cx={57} cy={64} r={3} />
          <rect x={42} y={80} width={30} height={8} rx={1} stroke={ACCENT} />
          <line x1={86} y1={36} x2={98} y2={36} opacity={0.5} />
          <line x1={86} y1={48} x2={96} y2={48} opacity={0.5} />
          <line x1={86} y1={60} x2={100} y2={60} opacity={0.5} />
        </g>
      );
    default:
      return <circle cx={60} cy={60} r={30} />;
  }
}
