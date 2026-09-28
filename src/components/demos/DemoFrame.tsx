import type { ReactNode } from "react";

type Props = {
  title: string;
  note?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export default function DemoFrame({ title, note = "Synthetic data · built for this portfolio", actions, children }: Props) {
  return (
    <div className="demo-frame">
      <div className="demo-bar">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="font-medium">{title}</span>
          <span className="label muted">{note}</span>
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      <div className="demo-body">{children}</div>
    </div>
  );
}
