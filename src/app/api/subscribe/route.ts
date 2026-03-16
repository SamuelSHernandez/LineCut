import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getAdminClient } from "@/lib/supabase/admin";

function getSubscriberHash(email: string): string {
  return crypto
    .createHash("md5")
    .update(email.toLowerCase().trim())
    .digest("hex");
}

function generateReferralCode(): string {
  return crypto.randomBytes(4).toString("base64url"); // e.g. "x7k9mQ2r"
}

// Simple in-memory rate limit: max 3 requests per IP per minute
const rateMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  entry.count++;
  return entry.count > 3;
}

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Try again in a minute." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, ref } = body;

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.MAILCHIMP_API_KEY;
    const server = process.env.MAILCHIMP_SERVER_PREFIX;
    const listId = process.env.MAILCHIMP_AUDIENCE_ID;

    if (!apiKey || !server || !listId) {
      console.error("[Subscribe] Missing Mailchimp env vars");
      return NextResponse.json(
        { error: "Newsletter service not configured" },
        { status: 500 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const subscriberHash = getSubscriberHash(normalizedEmail);

    // --- Mailchimp ---
    const mcUrl = `https://${server}.api.mailchimp.com/3.0/lists/${listId}/members/${subscriberHash}`;
    const mcAuth = `Basic ${Buffer.from(`anystring:${apiKey}`).toString("base64")}`;

    const mcResponse = await fetch(mcUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: mcAuth },
      body: JSON.stringify({
        email_address: normalizedEmail,
        status_if_new: "subscribed",
      }),
    });

    if (!mcResponse.ok) {
      const errorData = await mcResponse.json().catch(() => ({}));
      console.error(
        "[Subscribe] Mailchimp error:",
        mcResponse.status,
        errorData
      );

      const detail = (errorData.detail as string) || "";
      if (detail.includes("looks fake or invalid")) {
        return NextResponse.json(
          { error: "That email doesn't look right. Try a different one." },
          { status: 400 }
        );
      }
      if (detail.includes("comply with anti-spam")) {
        return NextResponse.json(
          { error: "That email can't be added. Try a different one." },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "Failed to subscribe. Please try again." },
        { status: mcResponse.status }
      );
    }

    // Add Mailchimp tags (non-critical)
    try {
      const now = new Date();
      const dateTag = `signup_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      await fetch(
        `https://${server}.api.mailchimp.com/3.0/lists/${listId}/members/${subscriberHash}/tags`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: mcAuth,
          },
          body: JSON.stringify({
            tags: [
              { name: "waitlist", status: "active" },
              { name: "linecut", status: "active" },
              { name: dateTag, status: "active" },
            ],
          }),
        }
      );
    } catch (tagError) {
      console.warn("[Subscribe] Failed to add tags:", tagError);
    }

    // --- Supabase waitlist entry ---
    const supabase = getAdminClient();
    const referralCode = generateReferralCode();

    // Check if this email already exists
    const { data: existing } = await supabase
      .from("waitlist_entries")
      .select("referral_code, referral_count, credit_earned")
      .eq("email", normalizedEmail)
      .single();

    if (existing) {
      // Already signed up — return their existing data
      const { count: totalCount } = await supabase
        .from("waitlist_entries")
        .select("*", { count: "exact", head: true });

      const { count: aheadCount } = await supabase
        .from("waitlist_entries")
        .select("*", { count: "exact", head: true })
        .lt("created_at", (await supabase.from("waitlist_entries").select("created_at").eq("email", normalizedEmail).single()).data?.created_at ?? new Date().toISOString());

      const rawPosition = (aheadCount ?? 0) + 1;
      const position = Math.max(1, rawPosition - existing.referral_count * 5);

      return NextResponse.json({
        success: true,
        referral_code: existing.referral_code,
        referral_count: existing.referral_count,
        credit_earned: existing.credit_earned,
        position,
        total: totalCount ?? 0,
      });
    }

    // Validate referral code if provided
    let validRef: string | null = null;
    if (ref) {
      const { data: referrer } = await supabase
        .from("waitlist_entries")
        .select("referral_code")
        .eq("referral_code", ref)
        .single();
      if (referrer) {
        validRef = ref;
      }
    }

    // Insert new entry (trigger handles incrementing referrer's count)
    const { error: insertError } = await supabase
      .from("waitlist_entries")
      .insert({
        email: normalizedEmail,
        referral_code: referralCode,
        referred_by: validRef,
      });

    if (insertError) {
      console.error("[Subscribe] Supabase insert error:", insertError);
      // Mailchimp succeeded, so email is captured. Don't fail the request.
    }

    // Calculate position
    const { count: totalCount } = await supabase
      .from("waitlist_entries")
      .select("*", { count: "exact", head: true });

    const position = totalCount ?? 1; // They're last (just inserted)

    return NextResponse.json({
      success: true,
      referral_code: insertError ? null : referralCode,
      referral_count: 0,
      credit_earned: false,
      position,
      total: totalCount ?? 0,
    });
  } catch (error) {
    console.error("[Subscribe] Error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
