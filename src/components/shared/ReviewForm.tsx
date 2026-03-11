"use client";

import { useState, useEffect } from "react";
import StarRating from "./StarRating";
import { SELLER_TAGS, BUYER_TAGS } from "@/lib/review-tags";
import { createClient } from "@/lib/supabase/client";

interface ReviewFormProps {
  orderId: string;
  otherPartyName: string;
  role: "buyer" | "seller";
  onSubmitted?: () => void;
}

export default function ReviewForm({ orderId, otherPartyName, role, onSubmitted }: ReviewFormProps) {
  const [stars, setStars] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [existingStars, setExistingStars] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tags = role === "buyer" ? SELLER_TAGS : BUYER_TAGS;

  // Check if already reviewed
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("reviews")
      .select("stars")
      .eq("order_id", orderId)
      .eq("role", role)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setExistingStars(data.stars);
          setSubmitted(true);
        }
      });
  }, [orderId, role]);

  if (submitted || existingStars !== null) {
    return (
      <div className="bg-butcher-paper rounded-[6px] p-4 text-center">
        <StarRating value={existingStars ?? stars} size="sm" />
        <p className="font-[family-name:var(--font-body)] text-[12px] text-sidewalk mt-1">
          You rated {otherPartyName}
        </p>
      </div>
    );
  }

  async function handleSubmit() {
    if (stars === 0) {
      setError("Please select a rating.");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const { submitBuyerReview } = await import("@/app/(dashboard)/buyer/review-actions");
      const { submitSellerReview } = await import("@/app/(dashboard)/seller/review-actions");

      const action = role === "buyer" ? submitBuyerReview : submitSellerReview;
      const result = await action(orderId, stars, comment || undefined, selectedTags.length > 0 ? selectedTags : undefined);

      if (result.error) {
        setError(result.error);
      } else {
        setExistingStars(stars);
        setSubmitted(true);
        onSubmitted?.();
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  return (
    <div className="bg-butcher-paper rounded-[6px] p-4 space-y-3">
      <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[2px] text-sidewalk">
        RATE {otherPartyName.toUpperCase()}
      </p>

      <StarRating value={stars} onChange={setStars} />

      {/* Tag pills */}
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => toggleTag(tag)}
            aria-pressed={selectedTags.includes(tag)}
            className={`px-2.5 py-1.5 min-h-[36px] rounded-full font-[family-name:var(--font-body)] text-[11px] transition-colors ${
              selectedTags.includes(tag)
                ? "bg-mustard text-chalkboard"
                : "bg-ticket border border-[#ddd4c4] text-sidewalk hover:border-mustard"
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      <label htmlFor="review-comment" className="sr-only">Review comment</label>
      <textarea
        id="review-comment"
        value={comment}
        onChange={(e) => setComment(e.target.value.slice(0, 200))}
        placeholder="Optional comment..."
        rows={2}
        className="w-full bg-ticket rounded-[6px] border border-[#ddd4c4] px-3 py-2 font-[family-name:var(--font-body)] text-[12px] text-chalkboard placeholder:text-sidewalk focus:outline-none focus:border-mustard focus:ring-2 focus:ring-mustard/50 transition-colors resize-none"
      />
      <p className="font-[family-name:var(--font-mono)] text-[10px] text-sidewalk text-right">
        {comment.length}/200
      </p>

      {error && (
        <p className="font-[family-name:var(--font-body)] text-[12px] text-ketchup" role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting || stars === 0}
        className="w-full min-h-[44px] py-2.5 bg-ketchup text-ticket font-[family-name:var(--font-body)] text-[13px] font-semibold rounded-[6px] transition-all hover:bg-ketchup/90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? "Submitting..." : "SUBMIT RATING"}
      </button>
    </div>
  );
}
