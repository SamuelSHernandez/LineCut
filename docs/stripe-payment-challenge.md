# Challenge: The Case Against This Payment Plan

## The Weakest Point: Capture on Acceptance Is Too Early

The analysis recommends capturing payment when the seller accepts the order. This is the moment money moves from the buyer's card to LineCut, and from LineCut to the seller's Express account. The argument is that it is simpler than adding intermediate states like "in-progress" or "ready."

Here is the problem: **acceptance is not fulfillment.**

When the seller taps "accept," they have committed to buying the food -- but they have not done it yet. They are still standing in line. The food has not been ordered from the restaurant, has not been prepared, and has not been handed to the buyer. The seller could accept the order, get a phone call, and walk out of the restaurant. The seller could accept the order and then the restaurant could close unexpectedly. The seller could accept and then realize they do not have enough personal cash to front the purchase.

In all of these cases, the buyer has been charged, and LineCut must issue a refund. Refunds are:
- Slow (5-10 business days to appear on the buyer's statement)
- Visible (shows as a charge + refund, not as "nothing happened")
- Costly to trust (a buyer who sees "charged then refunded" twice will not use the app again)
- Potentially problematic for Stripe account health if they happen frequently

The analysis acknowledges this but dismisses it as manageable at MVP scale. That may be correct. But the counterargument is: **the order lifecycle already has the states needed to defer capture.** The `OrderStatus` type includes `in-progress` and `ready` -- these exist precisely to model the gap between acceptance and delivery. Adding capture at `ready` instead of `accepted` costs very little implementation effort (it is the same server action, triggered by a different status transition) and eliminates an entire category of refunds.

### What Would Have to Change

If capture moves from "accepted" to "ready" (seller confirms food is in hand):
- The authorization hold persists longer (minutes to an hour, still well within the 7-day limit)
- The buyer sees their card is "held" but not charged until the food is confirmed ready
- Seller no-shows after acceptance result in a canceled hold (clean) rather than a refund (messy)
- The seller dashboard needs a "mark as ready" button, which the current status flow already implies

The cost is one additional state transition in the seller flow. The benefit is that money never moves until food actually exists.

**Recommendation:** Seriously consider capturing at "ready" rather than "accepted," even for MVP. The complexity cost is minimal and the trust benefit is significant. The analysis is right that manual refunds work at tiny scale, but a pattern of charge-then-refund will poison early user trust before you have enough volume to learn anything useful.

---

## Secondary Weakness: The Seller-Fronts-Cash Problem Is Dismissed Too Quickly

The analysis identifies this as the "biggest risk" but then says it is "not a payment integration problem" and defers it to post-MVP. This framing is convenient but potentially wrong.

If your first 50 sellers each have one bad experience where they front $25 and do not get reimbursed (due to a buyer dispute, a bug, a timeout), you do not have a scaling problem -- you have a dead product. The seller side of the marketplace is the constrained side. Sellers are harder to acquire than buyers. Losing even a few early sellers to a reimbursement failure could kill the supply side before you learn anything.

The question is not "can Stripe handle the mechanics?" (it can). The question is: **should the MVP launch with a mechanism that requires sellers to trust strangers with their own money, knowing that the first failure will be catastrophic to retention?**

### What Would Have to Change

At minimum, consider a maximum order value for MVP (e.g., $30 cap including fees). This limits the seller's financial exposure to a tolerable amount. A seller losing $30 is annoying. A seller losing $80 on a large order is relationship-ending.

This is not a Stripe change. It is a business rule enforced in the order creation flow. But it directly affects the payment plan because it constrains what gets authorized.

---

## Third Weakness: No Communication Channel Exists

The edge case section says "seller messages the buyer" for out-of-stock items, but **no messaging system exists in the app.** Without a communication channel, the only options when something goes wrong mid-order are:
- Seller cancels the entire order (bad for buyer)
- Seller guesses at a substitution (bad for buyer, potential dispute)
- Seller calls/texts the buyer outside the app (requires sharing phone numbers, which is a safety issue)

The payment plan assumes a happy path where orders proceed cleanly from placement to completion. The moment something deviates -- wrong item, out of stock, restaurant changed the menu -- there is no mechanism to negotiate. The only tool available is "cancel and refund."

This is not strictly a payment problem, but it directly affects payment outcomes (refund rate, dispute rate, seller satisfaction).

### What Would Have to Change

Before launching real payments, there should be at minimum a simple one-way notification system: seller can send a predefined message to the buyer ("item unavailable -- cancel or keep the rest?") with the buyer responding via a button tap. This does not need to be a full chat system. It needs to be enough to handle the 3-4 most common mid-order problems without forcing a cancellation.
