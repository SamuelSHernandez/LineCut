"use client";

import { useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";

const steps = [
  {
    number: 1,
    title: "FIND SOMEONE IN LINE",
    description:
      "Browse nearby restaurants with active waiters. You'll see who's in line, how long the wait is, and their rating.",
    details: [
      "Pick the restaurant you're craving",
      "See real wait times from people actually in line",
      "Choose a waiter based on their rating and position",
    ],
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="22" stroke="#E2A832" strokeWidth="2" strokeDasharray="4 4" />
        <circle cx="24" cy="20" r="7" stroke="#1A1A18" strokeWidth="2" fill="none" />
        <path d="M12 40c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke="#1A1A18" strokeWidth="2" fill="none" />
      </svg>
    ),
  },
  {
    number: 2,
    title: "PLACE YOUR ORDER",
    description:
      "Tell them exactly what you want. Be specific — this is a real person ordering for you at the counter.",
    details: [
      "Type your order clearly (item names, sizes, extras)",
      "Add any special instructions or modifications",
      "You pay upfront — food cost + a service fee + tip",
    ],
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <rect x="8" y="4" width="32" height="40" rx="4" stroke="#1A1A18" strokeWidth="2" fill="none" />
        <line x1="14" y1="14" x2="34" y2="14" stroke="#8C8778" strokeWidth="1.5" strokeDasharray="3 3" />
        <line x1="14" y1="22" x2="34" y2="22" stroke="#8C8778" strokeWidth="1.5" strokeDasharray="3 3" />
        <line x1="14" y1="30" x2="28" y2="30" stroke="#8C8778" strokeWidth="1.5" strokeDasharray="3 3" />
        <circle cx="34" cy="36" r="6" fill="#C4382A" />
        <text x="34" y="40" textAnchor="middle" fill="#FFFDF5" fontSize="10" fontWeight="bold">$</text>
      </svg>
    ),
  },
  {
    number: 3,
    title: "SHOW UP ON TIME",
    description:
      "You'll get a pickup time and location. Head to the meeting spot outside the restaurant. This is important.",
    details: [
      "You'll get a notification when your food is ready",
      "Meet your waiter at the designated pickup spot",
      "Arrive on time — the waiter is doing you a favor",
    ],
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="20" stroke="#1A1A18" strokeWidth="2" fill="none" />
        <line x1="24" y1="12" x2="24" y2="24" stroke="#1A1A18" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="24" y1="24" x2="32" y2="28" stroke="#C4382A" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="24" cy="24" r="2" fill="#1A1A18" />
      </svg>
    ),
  },
  {
    number: 4,
    title: "GRAB YOUR FOOD",
    description:
      "Quick handoff. Confirm the order, say thanks, and you're out. No line, no wait, real food.",
    details: [
      "Verify your order matches what you requested",
      "Confirm the handoff in the app",
      "Rate your waiter — helps the next person",
    ],
    callout: null,
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <path d="M8 24h32" stroke="#E2A832" strokeWidth="2" strokeDasharray="4 4" />
        <rect x="14" y="12" width="20" height="20" rx="3" stroke="#1A1A18" strokeWidth="2" fill="none" />
        <path d="M20 22l4 4 6-8" stroke="#C4382A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

const noShowWarning = {
  title: "LATE OR NO-SHOW?",
  lines: [
    "If you don't show up on time, you're still charged the full amount.",
    "The waiter keeps your food and still gets paid.",
    "This isn't to be harsh — it's to protect the person who waited in line and spent their own money on your order.",
    "Set an alarm. Leave early. Show up.",
  ],
};

export default function BuyerOnboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const isLastStep = currentStep === steps.length;
  const showingWarning = isLastStep;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 md:px-12 py-5">
        <Link href="/">
          <Logo size="sm" />
        </Link>
        <Link
          href="/"
          className="font-[family-name:var(--font-body)] text-[13px] font-medium text-sidewalk hover:text-chalkboard transition-colors"
        >
          Back
        </Link>
      </nav>

      <main className="flex-1 flex flex-col items-center px-6 pt-8 pb-16">
        {/* Header */}
        <p className="font-[family-name:var(--font-mono)] text-[11px] tracking-[3px] uppercase text-sidewalk mb-3">
          I&apos;m Hungry
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-[36px] md:text-[42px] tracking-[2px] leading-none text-center mb-10">
          HOW BUYING WORKS
        </h1>

        {/* Progress dots */}
        <div className="flex gap-2 mb-10">
          {[...steps, noShowWarning].map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentStep(i)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-200 cursor-pointer ${
                i === currentStep
                  ? "bg-ketchup scale-125"
                  : i < currentStep
                    ? "bg-ketchup/40"
                    : "bg-[#ddd4c4]"
              }`}
              aria-label={`Go to step ${i + 1}`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="w-full max-w-lg">
          {!showingWarning ? (
            <div className="bg-ticket rounded-[10px] p-6 md:p-8 border border-[#eee6d8] shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
              <div className="flex items-start gap-4 mb-5">
                <div className="shrink-0">{steps[currentStep].icon}</div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="w-7 h-7 rounded-full bg-ketchup flex items-center justify-center font-[family-name:var(--font-display)] text-[14px] text-ticket shrink-0">
                      {steps[currentStep].number}
                    </span>
                    <h2 className="font-[family-name:var(--font-display)] text-[22px] tracking-[1px] leading-none">
                      {steps[currentStep].title}
                    </h2>
                  </div>
                </div>
              </div>

              <p className="font-[family-name:var(--font-body)] text-[15px] text-chalkboard leading-relaxed mb-5">
                {steps[currentStep].description}
              </p>

              <div className="border-t border-dashed border-[#ddd4c4] pt-4">
                <ul className="space-y-2.5">
                  {steps[currentStep].details.map((detail, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="text-ketchup mt-1 text-[10px]">&#9670;</span>
                      <span className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk leading-relaxed">
                        {detail}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            /* No-show warning card */
            <div className="bg-ticket rounded-[10px] p-6 md:p-8 border-2 border-ketchup shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
              <div className="flex items-center gap-3 mb-5">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <path d="M16 2L30 28H2L16 2Z" stroke="#C4382A" strokeWidth="2" fill="none" />
                  <line x1="16" y1="12" x2="16" y2="20" stroke="#C4382A" strokeWidth="2.5" strokeLinecap="round" />
                  <circle cx="16" cy="24" r="1.5" fill="#C4382A" />
                </svg>
                <h2 className="font-[family-name:var(--font-display)] text-[22px] tracking-[1px] leading-none text-ketchup">
                  {noShowWarning.title}
                </h2>
              </div>

              <div className="space-y-4">
                {noShowWarning.lines.map((line, i) => (
                  <p
                    key={i}
                    className={`font-[family-name:var(--font-body)] text-[15px] leading-relaxed ${
                      i === noShowWarning.lines.length - 1
                        ? "text-chalkboard font-semibold pt-2 border-t border-dashed border-[#ddd4c4]"
                        : "text-sidewalk"
                    }`}
                  >
                    {line}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-3 mt-8">
          {currentStep > 0 && (
            <button
              onClick={() => setCurrentStep(currentStep - 1)}
              className="px-6 py-3 border-2 border-chalkboard text-chalkboard font-[family-name:var(--font-body)] text-[14px] font-semibold rounded-[6px] hover:bg-chalkboard hover:text-butcher-paper transition-all duration-200 cursor-pointer"
            >
              Back
            </button>
          )}
          {!isLastStep ? (
            <button
              onClick={() => setCurrentStep(currentStep + 1)}
              className="px-6 py-3 bg-ketchup text-ticket font-[family-name:var(--font-body)] text-[14px] font-semibold rounded-[6px] hover:opacity-90 transition-opacity cursor-pointer"
            >
              Next
            </button>
          ) : (
            <Link
              href="/buyer"
              className="px-8 py-3 bg-ketchup text-ticket font-[family-name:var(--font-body)] text-[14px] font-semibold rounded-[6px] hover:opacity-90 transition-opacity text-center"
            >
              Got It — Find Food
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}
