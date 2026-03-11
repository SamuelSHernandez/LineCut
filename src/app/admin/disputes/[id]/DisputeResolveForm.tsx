"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DisputeResolveForm({
  disputeId,
}: {
  disputeId: string;
}) {
  const router = useRouter();
  const [resolution, setResolution] = useState("resolved_no_action");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/resolve-dispute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_SECRET ?? ""}`,
        },
        body: JSON.stringify({
          disputeId,
          resolution,
          notes: notes.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to resolve dispute.");
        return;
      }

      router.push("/admin/disputes");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      <h2 className="font-[family-name:var(--font-display)] text-[20px] tracking-[1px] text-chalkboard">
        RESOLVE DISPUTE
      </h2>

      {error && (
        <p className="font-[family-name:var(--font-body)] text-[13px] text-ketchup">
          {error}
        </p>
      )}

      <div>
        <label className="block font-[family-name:var(--font-mono)] text-[10px] tracking-[2px] text-sidewalk mb-1">
          RESOLUTION
        </label>
        <select
          value={resolution}
          onChange={(e) => setResolution(e.target.value)}
          className="w-full min-h-[44px] py-2.5 px-4 rounded-[6px] border border-[#ddd4c4] bg-ticket font-[family-name:var(--font-body)] text-[14px] text-chalkboard"
        >
          <option value="resolved_refund">Refund</option>
          <option value="resolved_no_action">No Action</option>
          <option value="resolved_warning">Warning</option>
        </select>
      </div>

      <div>
        <label className="block font-[family-name:var(--font-mono)] text-[10px] tracking-[2px] text-sidewalk mb-1">
          NOTES
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Resolution notes (optional)"
          className="w-full py-2.5 px-4 rounded-[6px] border border-[#ddd4c4] bg-ticket font-[family-name:var(--font-body)] text-[14px] text-chalkboard placeholder:text-sidewalk/50 resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="min-h-[44px] py-2.5 px-6 rounded-[6px] font-[family-name:var(--font-body)] text-[14px] font-semibold bg-ketchup text-ticket disabled:opacity-50 transition-opacity"
      >
        {submitting ? "Resolving..." : "Resolve Dispute"}
      </button>
    </form>
  );
}
