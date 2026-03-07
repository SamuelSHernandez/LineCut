import Image from "next/image";
import Link from "next/link";
import Logo from "@/components/Logo";
import Nav from "@/components/Nav";
import Ticker from "@/components/Ticker";
import SignupForm from "@/components/SignupForm";
import { features } from "@/lib/features";

const launchLocations = [
  { order: "001", restaurant: "Katz's Delicatessen", address: "205 E Houston St", item: "Pastrami on Rye" },
  { order: "002", restaurant: "Joe's Pizza", address: "7 Carmine St", item: "Classic NY Slice" },
  { order: "003", restaurant: "Russ & Daughters", address: "179 E Houston St", item: "Lox on a Bagel" },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Nav />

      {/* Hero */}
      <section className="relative min-h-screen flex flex-col items-center justify-center bg-chalkboard overflow-hidden">
        {/* Background image */}
        <Image
          src="/hero-bg.png"
          alt=""
          fill
          className="object-cover invert opacity-20"
          priority
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-chalkboard/30 via-chalkboard/10 to-chalkboard/95" />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center px-6 pt-24">
          <p
            className="font-[family-name:var(--font-mono)] text-[11px] tracking-[3px] uppercase text-mustard mb-6 animate-fade-in"
            style={{ animationDelay: "0.2s" }}
          >
            Now in New York City
          </p>

          <h1
            className="font-[family-name:var(--font-display)] text-[clamp(56px,12vw,100px)] leading-[0.9] tracking-[4px] uppercase text-butcher-paper mb-6 animate-fade-up"
            style={{ animationDelay: "0.4s" }}
          >
            Skip the Line
          </h1>

          <p
            className="font-[family-name:var(--font-body)] text-[17px] md:text-[19px] text-butcher-paper/70 max-w-md leading-relaxed mb-10 animate-fade-up"
            style={{ animationDelay: "0.6s" }}
          >
            Someone&apos;s already in it. Let them order for you — or earn while you wait.
          </p>

          <div
            className="flex flex-col sm:flex-row gap-3 animate-fade-up"
            style={{ animationDelay: "0.8s" }}
          >
            <div className="flex flex-col items-center gap-2">
              <Link
                href="/onboarding/buyer"
                className="px-8 py-4 bg-ketchup text-ticket font-[family-name:var(--font-body)] text-[15px] font-semibold rounded-[6px] hover:opacity-90 transition-opacity text-center"
              >
                I&apos;m Hungry
              </Link>
              <span className="font-[family-name:var(--font-mono)] text-[10px] tracking-[2px] text-butcher-paper/40">
                See how it works
              </span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Link
                href="/onboarding/seller"
                className="px-8 py-4 border-[2px] border-butcher-paper/40 text-butcher-paper font-[family-name:var(--font-body)] text-[15px] font-semibold rounded-[6px] hover:bg-butcher-paper/10 transition-colors text-center"
              >
                I&apos;m In Line
              </Link>
              <span className="font-[family-name:var(--font-mono)] text-[10px] tracking-[2px] text-butcher-paper/40">
                Start earning
              </span>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div
          className="absolute bottom-8 flex flex-col items-center gap-2 animate-fade-in"
          style={{ animationDelay: "1.2s" }}
        >
          <div className="w-px h-8 bg-butcher-paper/30 origin-top" style={{ animation: "scrollLine 2s ease-in-out infinite" }} />
          <span className="font-[family-name:var(--font-mono)] text-[9px] tracking-[3px] text-butcher-paper/40 uppercase">
            Scroll
          </span>
        </div>
      </section>

      {/* Ticker */}
      <Ticker />

      {/* The Problem */}
      <section className="py-20 md:py-28 px-6 md:px-12 max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
          {/* Text */}
          <div>
            <p className="font-[family-name:var(--font-mono)] text-[11px] tracking-[3px] uppercase text-sidewalk mb-3">
              The Problem
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-[clamp(32px,5vw,48px)] tracking-[2px] leading-[0.95] mb-6">
              THE BEST FOOD HAS THE WORST LINES
            </h2>
            <p className="font-[family-name:var(--font-body)] text-[16px] text-sidewalk leading-relaxed max-w-lg">
              Forty-seven minutes for a sandwich. You&apos;ve done it. Everyone&apos;s done it. But right now, someone&apos;s already standing in that line — and they&apos;d happily grab yours too.
            </p>
          </div>

          {/* Queue visualization */}
          <div className="bg-chalkboard rounded-[10px] p-8 flex flex-col items-center justify-center min-h-[280px]">
            <div className="grid grid-cols-6 gap-3 mb-6">
              {Array.from({ length: 18 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-5 h-5 rounded-full ${
                    i < 3
                      ? "bg-ketchup"
                      : "bg-butcher-paper/20"
                  }`}
                  style={
                    i < 3
                      ? { animation: "pulse 2s ease-in-out infinite", animationDelay: `${i * 0.3}s` }
                      : undefined
                  }
                />
              ))}
            </div>
            <p className="font-[family-name:var(--font-mono)] text-[11px] tracking-[2px] text-butcher-paper/50 uppercase">
              Average wait: 47 min
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how" className="py-20 md:py-28 px-6 md:px-12">
        <div className="max-w-6xl mx-auto">
          {/* Dashed divider */}
          <div className="border-t border-dashed border-[#ddd4c4] mb-16" />

          <p className="font-[family-name:var(--font-mono)] text-[11px] tracking-[3px] uppercase text-sidewalk mb-3 text-center">
            How It Works
          </p>
          <h2 className="font-[family-name:var(--font-display)] text-[clamp(32px,5vw,48px)] tracking-[2px] leading-none text-center mb-14">
            TWO SIDES. ONE TRANSACTION.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Hungry side */}
            <div className="bg-ticket rounded-[10px] border border-[#eee6d8] overflow-hidden">
              <div className="h-1 bg-ketchup" />
              <div className="p-8">
                <h3 className="font-[family-name:var(--font-display)] text-[22px] tracking-[2px] mb-8 text-ketchup">
                  IF YOU&apos;RE HUNGRY
                </h3>
                <div className="flex flex-col gap-7">
                  {[
                    { num: "1", title: "BROWSE NEARBY LINES", desc: "See who's already waiting at your favorite spots." },
                    { num: "2", title: "PLACE YOUR ORDER", desc: "Pick your items. They order for you at the counter." },
                    { num: "3", title: "MEET OUTSIDE", desc: "Quick handoff. No line. You eat, they earn." },
                  ].map((step) => (
                    <div key={step.num} className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full border-[2.5px] border-ketchup flex items-center justify-center shrink-0">
                        <span className="font-[family-name:var(--font-display)] text-[20px] text-ketchup">
                          {step.num}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-[family-name:var(--font-display)] text-[16px] tracking-[1px] mb-1">
                          {step.title}
                        </h4>
                        <p className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk leading-relaxed">
                          {step.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* In-line side */}
            <div className="bg-chalkboard rounded-[10px] overflow-hidden">
              <div className="h-1 bg-mustard" />
              <div className="p-8">
                <h3 className="font-[family-name:var(--font-display)] text-[22px] tracking-[2px] mb-8 text-mustard">
                  IF YOU&apos;RE IN LINE
                </h3>
                <div className="flex flex-col gap-7">
                  {[
                    { num: "1", title: "POST YOUR SPOT", desc: "Share your position and how many orders you can carry." },
                    { num: "2", title: "GET REQUESTS", desc: "Accept orders from nearby hungry people." },
                    { num: "3", title: "EARN A TIP", desc: "Hand off the food. Get paid for waiting." },
                  ].map((step) => (
                    <div key={step.num} className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full border-[2.5px] border-mustard flex items-center justify-center shrink-0">
                        <span className="font-[family-name:var(--font-display)] text-[20px] text-mustard">
                          {step.num}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-[family-name:var(--font-display)] text-[16px] tracking-[1px] mb-1 text-butcher-paper">
                          {step.title}
                        </h4>
                        <p className="font-[family-name:var(--font-body)] text-[13px] text-butcher-paper/60 leading-relaxed">
                          {step.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof / Stats */}
      <section className="bg-chalkboard py-20 md:py-28 px-6 md:px-12">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
          <div>
            <p className="font-[family-name:var(--font-display)] text-[clamp(48px,8vw,72px)] leading-none text-ketchup">
              47 min
            </p>
            <p className="font-[family-name:var(--font-body)] text-[14px] text-sidewalk mt-2">
              Average line at Katz&apos;s
            </p>
          </div>
          <div>
            <p className="font-[family-name:var(--font-display)] text-[clamp(48px,8vw,72px)] leading-none text-mustard">
              $0
            </p>
            <p className="font-[family-name:var(--font-body)] text-[14px] text-sidewalk mt-2">
              No markup on food
            </p>
          </div>
          <div>
            <p className="font-[family-name:var(--font-display)] text-[clamp(48px,8vw,72px)] leading-none text-butcher-paper">
              1 block
            </p>
            <p className="font-[family-name:var(--font-body)] text-[14px] text-sidewalk mt-2">
              Average pickup distance
            </p>
          </div>
        </div>
      </section>

      {/* Launch Locations */}
      <section className="py-20 md:py-28 px-6 md:px-12 text-center">
        <div className="max-w-5xl mx-auto">
          <p className="font-[family-name:var(--font-mono)] text-[11px] tracking-[3px] uppercase text-sidewalk mb-3">
            Launch Locations
          </p>
          <h2 className="font-[family-name:var(--font-display)] text-[clamp(28px,5vw,42px)] tracking-[2px] leading-[0.95] mb-6">
            STARTING AT YOUR FAVORITE NYC SPOTS
          </h2>
          <p className="font-[family-name:var(--font-body)] text-[16px] text-sidewalk leading-relaxed mb-12">
            Joe&apos;s Pizza. Katz&apos;s Deli. Russ &amp; Daughters. The lines worth waiting for — so you don&apos;t have to.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {launchLocations.map((loc) => (
              <div key={loc.order} className="bg-ticket rounded-[10px] border border-[#eee6d8] shadow-[0_4px_20px_rgba(0,0,0,0.06)] p-8 text-left">
                <div className="border-b border-dashed border-[#ddd4c4] pb-4 mb-4">
                  <p className="font-[family-name:var(--font-mono)] text-[10px] tracking-[2px] text-sidewalk uppercase">
                    Order #{loc.order}
                  </p>
                  <p className="font-[family-name:var(--font-display)] text-[24px] tracking-[2px] mt-1 uppercase">
                    {loc.item}
                  </p>
                </div>
                <div className="border-b border-dashed border-[#ddd4c4] pb-4 mb-4">
                  <p className="font-[family-name:var(--font-display)] text-[14px] tracking-[1px] uppercase">
                    {loc.restaurant}
                  </p>
                  <p className="font-[family-name:var(--font-mono)] text-[10px] tracking-[2px] text-sidewalk mt-1">
                    {loc.address}
                  </p>
                </div>
                <div className="border-b border-dashed border-[#ddd4c4] pb-4 mb-4 flex justify-between">
                  <div>
                    <p className="font-[family-name:var(--font-mono)] text-[10px] tracking-[2px] text-sidewalk uppercase">
                      Wait
                    </p>
                    <p className="font-[family-name:var(--font-display)] text-[22px] text-ketchup">
                      0 MIN
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-[family-name:var(--font-mono)] text-[10px] tracking-[2px] text-sidewalk uppercase">
                      Via
                    </p>
                    <p className="font-[family-name:var(--font-display)] text-[22px] text-ketchup">
                      LINECUT
                    </p>
                  </div>
                </div>
                <p className="font-[family-name:var(--font-mono)] text-[10px] tracking-[2px] text-sidewalk text-center uppercase">
                  &#9986; &#8212; &#8212; &#8212; tear here &#8212; &#8212; &#8212; &#9986;
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="signup" className="bg-ketchup py-20 md:py-28 px-6 md:px-12">
        <div className="max-w-2xl mx-auto flex flex-col items-center text-center">
          <div className="mb-6">
            <Logo size="md" variant="on-ketchup" />
          </div>
          {features.waitlistMode ? (
            <>
              <h2 className="font-[family-name:var(--font-display)] text-[clamp(32px,6vw,52px)] tracking-[2px] text-ticket leading-none mb-4">
                GET EARLY ACCESS
              </h2>
              <p className="font-[family-name:var(--font-body)] text-[16px] text-ticket/70 mb-8 max-w-md">
                Be first in line when we launch. No irony intended.
              </p>
              <SignupForm />
            </>
          ) : (
            <>
              <h2 className="font-[family-name:var(--font-display)] text-[clamp(32px,6vw,52px)] tracking-[2px] text-ticket leading-none mb-4">
                READY TO EAT?
              </h2>
              <p className="font-[family-name:var(--font-body)] text-[16px] text-ticket/70 mb-8 max-w-md">
                Sign up and skip the line in minutes. No waiting required.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/auth/signup"
                  className="px-8 py-4 bg-ticket text-ketchup font-[family-name:var(--font-body)] text-[15px] font-semibold rounded-[6px] hover:opacity-90 transition-opacity text-center"
                >
                  Sign Up to Eat
                </Link>
                <Link
                  href="/auth/login"
                  className="px-8 py-4 border-[2px] border-ticket/40 text-ticket font-[family-name:var(--font-body)] text-[15px] font-semibold rounded-[6px] hover:bg-ticket/10 transition-colors text-center"
                >
                  Log In
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-chalkboard border-t-[2px] border-ketchup py-8 px-6 md:px-12">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center md:items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo size="sm" variant="light" />
          </div>
          <div className="text-center md:text-right">
            <p className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk">
              Skip the line. Someone&apos;s already in it.
            </p>
            <p className="font-[family-name:var(--font-mono)] text-[10px] tracking-[2px] text-sidewalk/50 mt-1">
              &copy; 2026 LINECUT &middot; NEW YORK CITY
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
