"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function isSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

export interface PushNotificationState {
  isSupported: boolean;
  permission: NotificationPermission | "loading";
  isSubscribed: boolean;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

export function usePushNotifications(): PushNotificationState {
  const [permission, setPermission] = useState<
    NotificationPermission | "loading"
  >("loading");
  const [isSubscribed, setIsSubscribed] = useState(false);

  const supported = isSupported();

  // On mount: register SW, check existing subscription and permission
  useEffect(() => {
    if (!supported) {
      setPermission("denied");
      return;
    }

    setPermission(Notification.permission);

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        return registration.pushManager.getSubscription();
      })
      .then((subscription) => {
        setIsSubscribed(!!subscription);
      })
      .catch((err) => {
        console.error("[push] SW registration failed:", err);
      });
  }, [supported]);

  async function subscribe(): Promise<void> {
    if (!supported) return;

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      console.error("[push] NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set");
      return;
    }

    let registration: ServiceWorkerRegistration;
    try {
      registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
    } catch (err) {
      console.error("[push] SW registration error:", err);
      return;
    }

    let subscription: PushSubscription;
    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
    } catch (err) {
      // User denied or browser error
      setPermission(Notification.permission);
      console.error("[push] pushManager.subscribe error:", err);
      return;
    }

    setPermission("granted");

    const { endpoint, keys } = subscription.toJSON() as {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    };

    const supabase = createClient();
    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      { onConflict: "user_id,endpoint" }
    );

    if (error) {
      console.error("[push] Failed to save subscription:", error.message);
      return;
    }

    setIsSubscribed(true);
  }

  async function unsubscribe(): Promise<void> {
    if (!supported) return;

    let registration: ServiceWorkerRegistration | undefined;
    try {
      registration = await navigator.serviceWorker.getRegistration("/sw.js");
    } catch {
      return;
    }
    if (!registration) return;

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      setIsSubscribed(false);
      return;
    }

    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();

    const supabase = createClient();
    await supabase
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", endpoint);

    setIsSubscribed(false);
  }

  return {
    isSupported: supported,
    permission,
    isSubscribed,
    subscribe,
    unsubscribe,
  };
}
