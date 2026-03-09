import type { ReactNode } from "react";
import { getDwightCoach } from "../characters/officeVoice";
import type { CoachStep } from "../store/useUIStore";

type Props = {
  step: CoachStep;
  headline: string;
  detail: string;
  nextActionLabel: string;
  actions?: ReactNode;
  compact?: boolean;
};

export function DwightCoach({
  step,
  headline,
  detail,
  nextActionLabel,
  actions,
  compact = false,
}: Props) {
  const coach = getDwightCoach(step);

  return (
    <section className="rounded-xl border border-dunder-desk/40 bg-[linear-gradient(135deg,rgba(26,54,93,0.96),rgba(34,52,79,0.92))] shadow-2xl">
      <div className={`space-y-4 ${compact ? "px-4 py-4" : "px-5 py-5"}`}>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-dunder-wall">
              Dwight K. Schrute · Acting Expert Manager
            </div>
            <h2 className="mt-2 font-dunder text-xl font-bold text-dunder-paper">
              {headline}
            </h2>
            <p className="mt-2 font-dunder text-sm leading-6 text-dunder-wall">
              {coach.intro}
            </p>
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>

        <div className={`grid gap-3 ${compact ? "grid-cols-1" : "lg:grid-cols-[1.1fr_1fr_1fr]"}`}>
          <div className="rounded-lg border border-dunder-carpet/20 bg-dunder-paper/8 px-4 py-4">
            <div className="text-[10px] font-mono uppercase tracking-[0.24em] text-dunder-carpet">
              Current Lesson
            </div>
            <div className="mt-2 font-dunder text-base font-bold text-dunder-paper">
              {step === "connect"
                ? coach.connect
                : step === "worker"
                  ? coach.worker
                  : step === "character"
                    ? coach.character
                    : step === "chat"
                      ? coach.chat
                      : "Operational. You have reached a competent state."}
            </div>
            <p className="mt-2 text-sm leading-6 text-dunder-wall">{detail}</p>
          </div>

          <div className="rounded-lg border border-dunder-carpet/20 bg-dunder-paper/6 px-4 py-4">
            <div className="text-[10px] font-mono uppercase tracking-[0.24em] text-dunder-carpet">
              Dwight Correction
            </div>
            <div className="mt-2 font-dunder text-base font-bold text-dunder-paper">
              {coach.correction}
            </div>
            <p className="mt-2 text-sm leading-6 text-dunder-wall">{headline}</p>
          </div>

          <div className="rounded-lg border border-dunder-carpet/20 bg-dunder-paper/6 px-4 py-4">
            <div className="text-[10px] font-mono uppercase tracking-[0.24em] text-dunder-carpet">
              Exact Next Step
            </div>
            <div className="mt-2 font-dunder text-base font-bold text-dunder-paper">
              {nextActionLabel}
            </div>
            <p className="mt-2 text-sm leading-6 text-dunder-wall">{coach.failureTip}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
