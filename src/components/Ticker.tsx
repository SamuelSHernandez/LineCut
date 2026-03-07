"use client";

const items = [
  "KATZ'S DELICATESSEN",
  "PASTRAMI ON RYE",
  "RUSS & DAUGHTERS",
  "LOX EVERYTHING BAGEL",
  "JOE'S PIZZA",
  "CLASSIC SLICE",
  "DI FARA PIZZA",
  "SQUARE PIE",
  "PETER LUGER",
  "PORTERHOUSE FOR TWO",
  "LOS TACOS NO.1",
  "ADOBO TACO",
];

export default function Ticker() {
  const row = items.map((item, i) => (
    <span key={i} className="flex items-center gap-6 shrink-0">
      <span className="font-[family-name:var(--font-display)] text-[14px] tracking-[2px] text-butcher-paper/80 whitespace-nowrap">
        {item}
      </span>
      <span className="text-ketchup text-[10px]">&#10022;</span>
    </span>
  ));

  return (
    <div className="bg-chalkboard border-t-[2px] border-b-[2px] border-ketchup py-3 overflow-hidden">
      <div
        className="flex gap-6"
        style={{ animation: "tickerScroll 30s linear infinite", width: "max-content" }}
      >
        {row}
        {row}
      </div>
    </div>
  );
}
