import "server-only";

const DIDIT_BASE_URL = "https://verification.didit.me/v3";

function getApiKey(): string {
  const key = process.env.DIDIT_API_KEY;
  if (!key) throw new Error("DIDIT_API_KEY is not set");
  return key;
}

export function getWorkflowId(): string {
  const id = process.env.DIDIT_WORKFLOW_ID;
  if (!id) throw new Error("DIDIT_WORKFLOW_ID is not set");
  return id;
}

interface CreateSessionParams {
  vendorData: string; // user ID
  callbackUrl: string;
}

interface CreateSessionResponse {
  session_id: string;
  session_number: number;
  session_token: string;
  vendor_data: string;
  status: string;
  url: string;
}

/**
 * Create a Didit verification session.
 * Returns the session URL to redirect the seller to.
 */
export async function createVerificationSession(
  params: CreateSessionParams
): Promise<CreateSessionResponse> {
  const res = await fetch(`${DIDIT_BASE_URL}/session/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": getApiKey(),
    },
    body: JSON.stringify({
      workflow_id: getWorkflowId(),
      vendor_data: params.vendorData,
      callback: params.callbackUrl,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Didit create session failed (${res.status}): ${text}`);
  }

  return res.json();
}

interface SessionDecision {
  session_id: string;
  status: string; // "Approved", "Declined", "In Review"
  vendor_data: string;
  features: Array<{
    feature: string;
    status: string;
    data?: Record<string, unknown>;
  }>;
}

/**
 * Retrieve the verification result for a session.
 */
export async function getSessionDecision(
  sessionId: string
): Promise<SessionDecision> {
  const res = await fetch(
    `${DIDIT_BASE_URL}/session/${sessionId}/decision/`,
    {
      method: "GET",
      headers: {
        "x-api-key": getApiKey(),
      },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Didit get session failed (${res.status}): ${text}`);
  }

  return res.json();
}

/**
 * Verify a Didit webhook signature using HMAC-SHA256.
 */
export async function verifyWebhookSignature(
  payload: string,
  signature: string
): Promise<boolean> {
  const secret = process.env.DIDIT_WEBHOOK_SECRET;
  if (!secret) throw new Error("DIDIT_WEBHOOK_SECRET is not set");

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const computed = Buffer.from(sig).toString("hex");

  // Constant-time comparison
  if (computed.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < computed.length; i++) {
    mismatch |= computed.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}
