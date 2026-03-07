"use client";

import { useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";

const steps = [
  {
    number: 1,
    title: "POST YOUR SPOT",
    description:
      "You're already waiting in line. Open the app, pick the restaurant, and let people know you can order for them.",
    details: [
      "Select the restaurant you're at",
      "Set how many extra orders you can handle",
      "Your spot goes live — nearby buyers will see you",
    ],
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <rect x="10" y="6" width="28" height="36" rx="4" stroke="#1A1A18" strokeWidth="2" fill="none" />
        <circle cx="24" cy="20" r="6" stroke="#E2A832" strokeWidth="2" fill="none" />
        <path d="M24 26v8" stroke="#E2A832" strokeWidth="2" strokeLinecap="round" />
        <circle cx="24" cy="38" r="2" fill="#C4382A" />
      </svg>
    ),
  },
  {
    number: 2,
    title: "ACCEPT AN ORDER",
    description:
      "A buyer sends you their order with exactly what they want. Review it, accept it, and you're locked in.",
    details: [
      "You'll see the full order with item details",
      "Accept only what you can carry — no pressure",
      "The buyer pays upfront. Their money is held securely until handoff.",
    ],
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <rect x="6" y="10" width="36" height="28" rx="4" stroke="#1A1A18" strokeWidth="2" fill="none" />
        <line x1="12" y1="20" x2="36" y2="20" stroke="#8C8778" strokeWidth="1.5" strokeDasharray="3 3" />
        <line x1="12" y1="28" x2="30" y2="28" stroke="#8C8778" strokeWidth="1.5" strokeDasharray="3 3" />
        <path d="M28 30l4 4 8-10" stroke="#C4382A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    number: 3,
    title: "ORDER TO-GO",
    description:
      "When you reach the counter, order their food along with yours. This is critical: always order TO-GO.",
    details: [
      "Order the buyer's items exactly as listed",
      "Always request TO-GO packaging — no exceptions",
      "Keep their order separate from yours",
      "Save the receipt — you may need it for disputes",
    ],
    callout: {
      text: "Always order TO-GO. The buyer is meeting you outside — the food needs to travel.",
      type: "warning" as const,
    },
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <path d="M10 20h28l-3 20H13L10 20Z" stroke="#1A1A18" strokeWidth="2" fill="none" />
        <path d="M16 20V14a8 8 0 0116 0v6" stroke="#E2A832" strokeWidth="2" fill="none" />
        <line x1="18" y1="28" x2="30" y2="28" stroke="#8C8778" strokeWidth="1.5" strokeDasharray="3 3" />
        <line x1="19" y1="33" x2="29" y2="33" stroke="#8C8778" strokeWidth="1.5" strokeDasharray="3 3" />
      </svg>
    ),
  },
  {
    number: 4,
    title: "WAIT FOR THE BUYER",
    description:
      "Head to the pickup spot outside the restaurant. The buyer has a set window to arrive. Hold tight.",
    details: [
      "Go to the designated meeting point (usually right outside)",
      "The app shows you the buyer's ETA",
      "Wait for them at the spot — don't leave early",
    ],
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="20" stroke="#1A1A18" strokeWidth="2" fill="none" strokeDasharray="4 4" />
        <circle cx="24" cy="16" r="5" stroke="#1A1A18" strokeWidth="2" fill="none" />
        <path d="M16 36c0-4.418 3.582-8 8-8s8 3.582 8 8" stroke="#1A1A18" strokeWidth="2" fill="none" />
        <circle cx="36" cy="12" r="6" fill="#E2A832" />
        <text x="36" y="15" textAnchor="middle" fill="#1A1A18" fontSize="8" fontWeight="bold">!</text>
      </svg>
    ),
  },
  {
    number: 5,
    title: "HAND IT OFF & GET PAID",
    description:
      "Buyer arrives, you hand over the food, both confirm in the app. Done. You earn your fee + tip.",
    details: [
      "Confirm the handoff in the app when you give them the food",
      "Your earnings (fee + tip) are released to you immediately",
      "Rate the buyer — helps the community",
    ],
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <circle cx="16" cy="16" r="6" stroke="#1A1A18" strokeWidth="2" fill="none" />
        <circle cx="32" cy="16" r="6" stroke="#1A1A18" strokeWidth="2" fill="none" />
        <path d="M8 32c0-4.418 3.582-8 8-8" stroke="#1A1A18" strokeWidth="2" fill="none" />
        <path d="M40 32c0-4.418-3.582-8-8-8" stroke="#1A1A18" strokeWidth="2" fill="none" />
        <path d="M16 28h16" stroke="#E2A832" strokeWidth="2" strokeDasharray="4 4" />
        <circle cx="24" cy="36" r="6" fill="#C4382A" />
        <text x="24" y="39" textAnchor="middle" fill="#FFFDF5" fontSize="8" fontWeight="bold">$</text>
      </svg>
    ),
  },
];

const protectionInfo = {
  title: "YOU'RE PROTECTED",
  lines: [
    "If the buyer doesn't show up on time, you still get paid in full.",
    "The buyer is charged no matter what. Late or no-show — doesn't matter.",
    "And you keep the food. Their loss, your lunch.",
    "You'll never foot the bill for someone else's order. That's the deal.",
    "We built it this way so you never take a risk by helping someone out.",
  ],
};

export default function SellerOnboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const isLastStep = currentStep === steps.length;
  const showingProtection = isLastStep;

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
          I&apos;m In Line
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-[36px] md:text-[42px] tracking-[2px] leading-none text-center mb-10">
          HOW SELLING WORKS
        </h1>

        {/* Progress dots */}
        <div className="flex gap-2 mb-10">
          {[...steps, protectionInfo].map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentStep(i)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-200 cursor-pointer ${
                i === currentStep
                  ? "bg-mustard scale-125"
                  : i < currentStep
                    ? "bg-mustard/40"
                    : "bg-[#ddd4c4]"
              }`}
              aria-label={`Go to step ${i + 1}`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="w-full max-w-lg">
          {!showingProtection ? (
            <div className="bg-ticket rounded-[10px] p-6 md:p-8 border border-[#eee6d8] shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
              <div className="flex items-start gap-4 mb-5">
                <div className="shrink-0">{steps[currentStep].icon}</div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="w-7 h-7 rounded-full bg-mustard flex items-center justify-center font-[family-name:var(--font-display)] text-[14px] text-chalkboard shrink-0">
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

              {/* TO-GO callout */}
              {steps[currentStep].callout && (
                <div className="bg-[#FFF3D6] border border-mustard rounded-[6px] px-4 py-3 mb-5">
                  <p className="font-[family-name:var(--font-body)] text-[13px] text-chalkboard font-semibold leading-relaxed">
                    {steps[currentStep].callout.text}
                  </p>
                </div>
              )}

              <div className="border-t border-dashed border-[#ddd4c4] pt-4">
                <ul className="space-y-2.5">
                  {steps[currentStep].details.map((detail, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="text-mustard mt-1 text-[10px]">&#9670;</span>
                      <span className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk leading-relaxed">
                        {detail}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            /* Protection guarantee card */
            <div className="bg-ticket rounded-[10px] p-6 md:p-8 border-2 border-mustard shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
              <div className="flex items-center gap-3 mb-5">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <path d="M16 2L28 8v10c0 7.18-5.12 12.86-12 14C9.12 30.86 4 25.18 4 18V8L16 2Z" stroke="#E2A832" strokeWidth="2" fill="none" />
                  <path d="M11 16l4 4 6-8" stroke="#C4382A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <h2 className="font-[family-name:var(--font-display)] text-[22px] tracking-[1px] leading-none text-mustard">
                  {protectionInfo.title}
                </h2>
              </div>

              <div className="space-y-4">
                {protectionInfo.lines.map((line, i) => (
                  <p
                    key={i}
                    className={`font-[family-name:var(--font-body)] text-[15px] leading-relaxed ${
                      i === protectionInfo.lines.length - 1
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
              className="px-6 py-3 bg-mustard text-chalkboard font-[family-name:var(--font-body)] text-[14px] font-semibold rounded-[6px] hover:opacity-90 transition-opacity cursor-pointer"
            >
              Next
            </button>
          ) : (
            <Link
              href="/seller"
              className="px-8 py-3 bg-mustard text-chalkboard font-[family-name:var(--font-body)] text-[14px] font-semibold rounded-[6px] hover:opacity-90 transition-opacity text-center"
            >
              Got It — Start Earning
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}
