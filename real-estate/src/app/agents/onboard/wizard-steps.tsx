import Link from "next/link";

export type WizardStep = "account" | "office" | "agents" | "done";

const STEPS: { id: WizardStep; label: string }[] = [
  { id: "account", label: "Бүртгэл" },
  { id: "office", label: "Оффис" },
  { id: "agents", label: "Агентууд" },
];

export default function WizardSteps({ current }: { current: WizardStep }) {
  const currentIdx = STEPS.findIndex((s) => s.id === current);
  return (
    <div className="flex items-center gap-2 sm:gap-4">
      {STEPS.map((s, i) => {
        const done = i < currentIdx || current === "done";
        const active = i === currentIdx;
        return (
          <div key={s.id} className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <span
                className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold transition-colors ${
                  done
                    ? "bg-indigo-600 text-white"
                    : active
                    ? "bg-indigo-600 text-white ring-4 ring-indigo-100"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {done ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>
              <span
                className={`text-[13px] font-medium hidden sm:inline ${
                  active ? "text-gray-900" : done ? "text-gray-700" : "text-gray-400"
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <span className={`hidden sm:block w-8 h-px ${done ? "bg-indigo-300" : "bg-gray-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function WizardHeader({ current }: { current: WizardStep }) {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="max-w-screen-md mx-auto px-6 py-4 flex items-center justify-between gap-4">
        <Link
          href="/agents"
          className="font-[family-name:var(--font-onest)] font-extrabold text-gray-900 text-xl tracking-tight lowercase hover:text-indigo-600 transition-colors"
        >
          meni
        </Link>
        <WizardSteps current={current} />
      </div>
    </header>
  );
}
