"use client";

import { useState } from "react";

const buyerSteps = [
  {
    num: "01",
    title: "FIND A LINE",
    desc: "See who\u2019s already waiting at your favorite spots. Real people, real wait times, right now.",
  },
  {
    num: "02",
    title: "PLACE YOUR ORDER",
    desc: "Tell them exactly what you want. They order it at the counter. You pay upfront \u2014 food cost + a small fee + tip.",
  },
  {
    num: "03",
    title: "GRAB YOUR FOOD",
    desc: "Walk to the handoff spot outside. Quick exchange. No line, no wait. You eat, they earn.",
  },
];

const sellerSteps = [
  {
    num: "01",
    title: "POST YOUR SPOT",
    desc: "You\u2019re already in line. Go live on LineCut and nearby buyers will find you instantly.",
  },
  {
    num: "02",
    title: "GET ORDERS",
    desc: "Orders come to you. Accept what you can carry. The buyer pays upfront \u2014 you never front the cost.",
  },
  {
    num: "03",
    title: "GET PAID",
    desc: "Hand off the food. Earn your fee + tip. You were waiting anyway.",
  },
];

export default function HowItWorks() {
  const [tab, setTab] = useState<"buyer" | "seller">("buyer");
  const steps = tab === "buyer" ? buyerSteps : sellerSteps;
  const accentColor = tab === "buyer" ? "ketchup" : "mustard";

  return (
    <div>
      {/* Tab toggle */}
      <div className="flex justify-center mb-14">
        <div className="inline-flex rounded-[6px] border border-[#eee6d8] overflow-hidden">
          <button
            type="button"
            onClick={() => setTab("buyer")}
            className={`px-6 py-3 font-[family-name:var(--font-mono)] text-[12px] tracking-[2px] uppercase transition-all cursor-pointer ${
              tab === "buyer"
                ? "bg-ketchup text-ticket"
                : "bg-ticket text-sidewalk hover:text-chalkboard"
            }`}
          >
            I&apos;m Hungry
          </button>
          <button
            type="button"
            onClick={() => setTab("seller")}
            className={`px-6 py-3 font-[family-name:var(--font-mono)] text-[12px] tracking-[2px] uppercase transition-all cursor-pointer ${
              tab === "seller"
                ? "bg-mustard text-chalkboard"
                : "bg-ticket text-sidewalk hover:text-chalkboard"
            }`}
          >
            I&apos;m In Line
          </button>
        </div>
      </div>

      {/* Steps — text-only, editorial layout */}
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col gap-0">
          {steps.map((step, i) => (
            <div
              key={`${tab}-${step.num}`}
              className="group"
            >
              {i > 0 && (
                <div className="border-t border-dashed border-[#ddd4c4] my-0" />
              )}
              <div className="py-8 md:py-10 flex items-start gap-6">
                <span
                  className={`font-[family-name:var(--font-display)] text-[clamp(36px,6vw,48px)] leading-none tracking-[2px] shrink-0 ${
                    accentColor === "ketchup" ? "text-ketchup" : "text-mustard"
                  }`}
                >
                  {step.num}
                </span>
                <div className="pt-1">
                  <h4 className="font-[family-name:var(--font-display)] text-[18px] md:text-[20px] tracking-[2px] mb-2">
                    {step.title}
                  </h4>
                  <p className="font-[family-name:var(--font-body)] text-[15px] text-sidewalk leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom line */}
        <div className="border-t border-dashed border-[#ddd4c4] pt-8 text-center">
          <p className={`font-[family-name:var(--font-body)] text-[14px] ${
            accentColor === "ketchup" ? "text-ketchup" : "text-mustard"
          } font-medium`}>
            {tab === "buyer"
              ? "That\u2019s it. No app to learn, no algorithm. Just people helping people."
              : "You\u2019re already standing there. Might as well get paid for it."}
          </p>
        </div>
      </div>
    </div>
  );
}
