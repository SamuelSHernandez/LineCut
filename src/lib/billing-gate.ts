import type { Profile } from "@/lib/profile-context";

export function checkBillingReady(
  profile: Profile,
  role: "buyer" | "seller"
): { ready: boolean; redirectUrl: string | null } {
  if (role === "buyer") {
    if (!profile.paymentMethodLast4) {
      return { ready: false, redirectUrl: "/profile?gate=buyer#billing" };
    }

    // Check if card is expired
    const now = new Date();
    if (
      profile.paymentMethodExpYear != null &&
      profile.paymentMethodExpMonth != null &&
      (profile.paymentMethodExpYear < now.getFullYear() ||
        (profile.paymentMethodExpYear === now.getFullYear() &&
          profile.paymentMethodExpMonth < now.getMonth() + 1))
    ) {
      return { ready: false, redirectUrl: "/profile?gate=buyer#billing" };
    }

    return { ready: true, redirectUrl: null };
  }

  if (role === "seller") {
    if (profile.stripeConnectStatus !== "active") {
      return { ready: false, redirectUrl: "/profile?gate=seller#payouts" };
    }
    return { ready: true, redirectUrl: null };
  }

  return { ready: true, redirectUrl: null };
}
