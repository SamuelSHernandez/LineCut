"use client";

import { useTheme } from "@/hooks/useTheme";

const options = [
  { value: "light" as const, label: "Light" },
  { value: "dark" as const, label: "Dark" },
  { value: "system" as const, label: "System" },
];

export default function AppearanceSection() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="bg-ticket rounded-[10px] border border-[#eee6d8] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
      <h3 className="font-[family-name:var(--font-display)] text-[16px] tracking-[1px] text-chalkboard mb-4">
        APPEARANCE
      </h3>

      <fieldset>
        <legend className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[2px] text-sidewalk mb-3">
          Theme
        </legend>
        <div className="flex gap-2">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTheme(opt.value)}
              className={`min-h-[44px] px-5 py-2.5 rounded-[6px] font-[family-name:var(--font-body)] text-[13px] font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-ketchup/50 ${
                theme === opt.value
                  ? "bg-ketchup text-ticket"
                  : "border border-card-border text-sidewalk hover:text-chalkboard hover:border-chalkboard/30"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
