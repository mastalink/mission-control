import type { ReactNode } from "react";

export type GuideStep = {
  title: string;
  body: string;
};

export type GuideTerm = {
  term: string;
  definition: string;
};

type Props = {
  eyebrow: string;
  title: string;
  summary: string;
  steps: GuideStep[];
  terms?: GuideTerm[];
  actions?: ReactNode;
  compact?: boolean;
};

export function OperatorGuide({
  eyebrow,
  title,
  summary,
  steps,
  terms,
  actions,
  compact = false,
}: Props) {
  return (
    <section className="rounded-xl border border-dunder-carpet/25 bg-dunder-blue/80 shadow-xl backdrop-blur-sm">
      <div className="space-y-4 px-4 py-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="text-[10px] font-mono uppercase tracking-[0.32em] text-dunder-carpet">
              {eyebrow}
            </div>
            <h2 className="mt-2 font-dunder text-xl font-bold text-dunder-paper">
              {title}
            </h2>
            <p className="mt-2 font-dunder text-sm leading-6 text-dunder-wall">
              {summary}
            </p>
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
        </div>

        {terms && terms.length > 0 ? (
          <div className={`grid gap-3 ${compact ? "grid-cols-1" : "md:grid-cols-2"}`}>
            {terms.map((term) => (
              <div
                key={term.term}
                className="rounded-lg border border-dunder-carpet/20 bg-dunder-paper/6 px-3 py-3"
              >
                <div className="font-dunder text-sm font-bold text-dunder-paper">
                  {term.term}
                </div>
                <div className="mt-1 text-sm leading-6 text-dunder-wall">
                  {term.definition}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <div className={`grid gap-3 ${compact ? "grid-cols-1" : "lg:grid-cols-3"}`}>
          {steps.map((step, index) => (
            <div
              key={step.title}
              className="rounded-lg border border-dunder-carpet/20 bg-dunder-paper/6 px-3 py-3"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-dunder-carpet/30 bg-dunder-paper/10 font-mono text-[11px] text-dunder-paper">
                  {index + 1}
                </span>
                <div className="font-dunder text-sm font-bold text-dunder-paper">
                  {step.title}
                </div>
              </div>
              <p className="mt-2 text-sm leading-6 text-dunder-wall">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
