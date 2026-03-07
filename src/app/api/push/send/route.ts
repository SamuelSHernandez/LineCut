import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

// Service-role client to read push_subscriptions bypassing RLS
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export interface SendPushBody {
  userId: string;
  title: string;
  body: string;
  url: string;
  orderId?: string;
}

export async function POST(req: NextRequest) {
  let payload: SendPushBody;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { userId, title, body, url, orderId } = payload;

  if (!userId || !title || !body) {
    return NextResponse.json(
      { error: "Missing required fields: userId, title, body" },
      { status: 400 }
    );
  }

  // Set VAPID details at request time so the build doesn't fail when env vars
  // are absent (e.g., during `next build` in CI).
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );

  const supabase = getAdminClient();

  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (error) {
    console.error("[push/send] DB error:", error.message);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  if (!subscriptions || subscriptions.length === 0) {
    // No subscriptions — not an error, user just hasn't opted in
    return NextResponse.json({ sent: 0 });
  }

  const notification = JSON.stringify({ title, body, url, orderId });

  const staleIds: string[] = [];
  let sent = 0;

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          notification
        );
        sent++;
      } catch (err: unknown) {
        const statusCode =
          err && typeof err === "object" && "statusCode" in err
            ? (err as { statusCode: number }).statusCode
            : null;

        if (statusCode === 410 || statusCode === 404) {
          // Subscription is expired or gone — clean it up
          staleIds.push(sub.id);
        } else {
          console.error(
            "[push/send] Failed to send to endpoint",
            sub.endpoint,
            err
          );
        }
      }
    })
  );

  // Fire-and-forget cleanup of expired subscriptions
  if (staleIds.length > 0) {
    supabase
      .from("push_subscriptions")
      .delete()
      .in("id", staleIds)
      .then(({ error: delErr }) => {
        if (delErr) {
          console.error("[push/send] Failed to clean stale subscriptions:", delErr.message);
        }
      });
  }

  return NextResponse.json({ sent, cleaned: staleIds.length });
}
