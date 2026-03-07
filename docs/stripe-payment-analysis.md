# LineCut Stripe Payment Integration -- Full Analysis

## Before Anything Else: The Agent Configs Are Wrong

The existing agent configs (`stripe-connect-payments.md` and `stripe-payment-orchestrator.md`) assume a fixed "$8 tip + $2 platform fee" model. This is incorrect. The actual model is:

- **Seller fee**: variable, set per seller ($3-$5 range currently)
- **Platform fee**: 15% of item subtotal, min $1.00, max $8.00
- **Item prices**: known and fixed (not estimates despite the `priceEstimate` field name)

These configs must be corrected before any implementation agent touches Stripe code. The analysis below reflects the real model.

---

## 1. Payment Model: Authorize-Then-Capture with Manual Capture

**Decision: Use PaymentIntents with `capture_method: 'manual'`.**

Here is the timeline:

1. **Buyer taps "PLACE ORDER"** -- Create a PaymentIntent with `capture_method: 'manual'`. This places an authorization hold on the buyer's card for the full total (items + seller fee + platform fee). No money moves yet. The buyer sees "ORDER SENT."
2. **Seller accepts the order** -- Capture the PaymentIntent. Money moves. The order transitions to "accepted."
3. **Seller declines or order times out** -- Cancel the PaymentIntent. The hold is released. No charge.

Why this is right for LineCut:

- The buyer commits money before the seller commits effort. This is the trust contract: "I have verified this buyer can pay" before asking a stranger to buy food for them.
- If the seller declines, the buyer's card is never charged. Clean.
- The hold expires automatically after 7 days (Stripe's limit for most card networks). LineCut orders should resolve in under an hour, so this is a non-issue -- but the system should still handle expired holds gracefully.

Why NOT authorize at an earlier point (like when browsing sellers): Authorizing before the buyer has committed to specific items and a specific seller creates unnecessary holds and a worse experience. The buyer needs to see a price before committing.

Why NOT skip authorization and charge immediately on order placement: If the seller declines, you'd have to refund. Refunds take 5-10 business days to appear on the buyer's statement. Authorization holds release cleanly. Refunds also count against your dispute ratio with Stripe. Holds do not.

**The pricing-is-known fact simplifies this enormously.** Because item prices are fixed, the authorization amount equals the final charge amount. There is no estimate gap. No over-authorization needed. No adjustment after capture. The amount the buyer sees is the amount they pay. Period.

### One thing to rename

The `priceEstimate` field in `MenuItem` and `OrderItem` types should be renamed to `price`. Calling it an estimate when it is not creates confusion for every engineer (and every agent) that touches this code. The OrderConfirmation component's "Prices are estimates. Final amount may vary." disclaimer should also be removed or reworded.

---

## 2. Money Flow: Destination Charges via Stripe Connect

**Decision: Stripe Connect with Express accounts, using destination charges.**

Three options exist for Connect marketplace payments. Here is why destination charges win:

| Model | How it works | Who owns the customer relationship | Good for LineCut? |
|---|---|---|---|
| **Direct charges** | Charge is created on the connected account; platform takes an application fee | The seller owns the customer | No. LineCut owns the buyer relationship, not the seller. |
| **Destination charges** | Charge is created on the platform; funds are automatically transferred to connected account | The platform owns the customer | Yes. LineCut is the merchant of record. |
| **Separate charges and transfers** | Charge on platform, then manually create transfers later | The platform owns the customer | Overkill for MVP. Adds complexity with no benefit until you need multi-seller orders or delayed settlement. |

**Destination charges are the right call.** Here is the concrete flow:

1. Buyer pays LineCut (the platform). LineCut is the merchant of record on the buyer's credit card statement.
2. On capture, Stripe automatically transfers the seller's portion to the seller's Express account.
3. LineCut keeps the platform fee by setting `application_fee_amount`.

The PaymentIntent creation looks conceptually like this:

```
PaymentIntent:
  amount: total (items + seller fee + platform fee), in cents
  transfer_data.destination: seller's connected account ID
  application_fee_amount: platform fee, in cents
  capture_method: manual
  metadata: { order_id, buyer_id, seller_id, restaurant_id }
```

After capture, the seller's Express account receives `total - application_fee_amount`. That equals `items subtotal + seller fee`. Which is exactly what the seller should get: reimbursement for the food plus their fee.

**This is clean.** One charge, one transfer, one capture. No manual transfer logic needed.

---

## 3. Known Prices -- What This Simplifies

Since prices are known and fixed, the following complications disappear entirely:

- **No over-authorization buffer needed.** The hold amount = the capture amount.
- **No post-purchase reconciliation.** No receipt photo upload. No dispute over "I paid $27 but the app said $25."
- **No partial capture.** The full authorized amount is captured every time (assuming no item substitutions -- see edge cases below).
- **No "actual price" field on the order.** The price in the system is the price. One source of truth.
- **Server-side calculation is straightforward.** Look up item IDs, multiply by quantity, add seller fee, calculate platform fee. Deterministic. No ambiguity.

The one remaining risk: **prices go stale.** If Katz's raises the price of pastrami from $24.95 to $26.95 and the app's hardcoded data hasn't been updated, the seller pays more at the register than the buyer paid through the app. For MVP, this is acceptable -- you control the data and can update it. Longer term, this needs a price-update mechanism. But that is not a Stripe problem; it is a data management problem.

---

## 4. Seller Reimbursement Timing

**Decision: Sellers get paid when the order is captured (on acceptance). Stripe handles payout timing.**

The flow:

1. Seller accepts order. PaymentIntent is captured.
2. Stripe automatically transfers `items + seller fee` to the seller's Express account (this is the destination charge mechanic from section 2).
3. Stripe pays out from the seller's Express account to their bank on the seller's payout schedule.

**Default payout schedule for Express accounts is a 2-day rolling basis.** This means:

- Seller accepts order on Monday at noon.
- Funds land in the seller's Express account balance immediately on capture.
- Stripe initiates payout on Wednesday.
- Money hits seller's bank account Wednesday or Thursday depending on the bank.

**For MVP, the 2-day default is fine.** Do not build instant payouts. Here is why:

- Instant payouts cost an additional 1% (paid by either you or the seller).
- They require the seller to have a debit card on file, not just a bank account.
- They add implementation complexity for a feature that does not prove the core concept.
- At early stage, your sellers are doing this for a few bucks of fee income while they wait in line anyway. The 2-day payout is not a dealbreaker.

**What matters more than speed is clarity.** The seller should see in the app: "You earned $28.50 for this order. Payout arrives in ~2 days." If they cannot see what they earned and when it is coming, trust erodes fast -- regardless of whether it takes 2 days or 2 minutes.

**The seller fronting the cost.** This is the hard truth of LineCut's model: the seller pays at the register with their own money, and gets reimbursed days later. For small orders ($7-$30 range based on the menu data), this is tolerable. For larger orders, it becomes a real friction point. This is a fundamental constraint of the business model, not something Stripe can solve. It limits your order size ceiling until you figure out a pre-funding mechanism (which is not MVP).

---

## 5. Onboarding Friction: How to Not Kill Supply

Your memory notes correctly identify this: "Stripe Connect onboarding friction is a known supply-side killer for P2P apps."

Here is how to minimize it:

### Gate at action, not at browse

This aligns with the existing pattern noted in your memory ("block at action, not at browse"). A seller should be able to:
- Browse the app
- See the seller dashboard
- Understand how it works

...all before being asked to connect Stripe. The gate appears when they try to **go live** for the first time. Not before.

### Express accounts, not Standard or Custom

Express accounts give Stripe-hosted onboarding. The seller taps a button, gets redirected to Stripe's form, fills in their info (name, DOB, bank account, SSN last 4), and comes back. Stripe handles identity verification, compliance, and KYC. You do not build any of this UI yourself.

The Express onboarding flow takes 3-5 minutes for a US individual. It asks for:
- Legal name and DOB
- Last 4 of SSN (or full SSN if additional verification is needed)
- Home address
- Bank account or debit card for payouts

### Reduce perceived friction

- **Frame it as "set up payouts" not "verify your identity."** The seller cares about getting paid. They do not care about Stripe's compliance requirements. The CTA should be: "Set up payouts so you can start earning."
- **One-time gate.** Once onboarded, never again. Make it clear: "This takes 3 minutes. You only do it once."
- **Return handling.** If the seller abandons Stripe's form halfway, their account exists in a `pending` state. When they come back, generate a new Account Link and send them back to finish. Do not make them start over.

### What you cannot control

Stripe will sometimes require additional verification (full SSN, document upload). This happens for roughly 5-10% of new accounts. There is nothing you can do about it. Design the UI to handle the "pending verification" state gracefully -- "Stripe is verifying your info. This usually takes a few minutes but can take up to 2 days."

---

## 6. Trust and Safety: Disputes, Refunds, Holds

This is where LineCut's model has genuine risk. You are asking strangers to transact food purchases through a middleman. Things will go wrong.

### Scenario: Seller does not deliver

The seller accepts the order, the buyer is charged, and the seller disappears.

**Mitigation:** Do not capture the PaymentIntent on acceptance alone. Add an intermediate confirmation. The flow becomes:

1. Buyer places order (authorization hold)
2. Seller accepts (order moves to "accepted" -- hold remains, no capture yet)
3. Seller marks order as "ready for pickup" (capture happens HERE)

This way, money only moves when the seller claims the food is ready. If the seller goes silent after accepting, the hold eventually expires, or you can cancel it after a timeout (30-60 minutes of inactivity).

**HOWEVER -- for MVP, I would actually NOT do this.** The added state complexity is significant, and at early stage you will have so few orders that you can handle disputes manually. Capture on acceptance is simpler to build and reason about. Add the intermediate state when you have evidence that seller no-shows are a real problem, not before.

**MVP approach:** Capture on acceptance. If a seller no-shows, the buyer contacts support (which is you, the founder, via email or in-app). You issue a manual refund through the Stripe dashboard. This does not scale, but it does not need to yet.

### Scenario: Food is wrong

The seller bought the wrong items, or the restaurant was out of something.

**MVP approach:** Same as above. Manual refund for the affected items. At scale, you would build a dispute flow where the buyer can flag items, the seller can respond, and partial refunds are automated. That is not MVP.

### Scenario: Buyer disputes the charge with their bank (chargeback)

This is the most dangerous scenario. Because LineCut is the merchant of record (destination charges), LineCut absorbs the chargeback, not the seller. Stripe charges a $15 dispute fee on top of the reversed amount.

**Mitigation for MVP:**
- Keep order metadata thorough (buyer ID, seller ID, items, timestamps) so you can submit evidence if a dispute arises.
- Set `application_fee_amount` so your platform fee is returned to you if the charge is refunded (Stripe does this automatically for destination charges).
- Accept that at very low volume, chargebacks are a cost of learning. If your chargeback rate exceeds 0.75%, Stripe will flag your account. At MVP volume, it would take a pattern of fraud to hit that threshold.

### Scenario: Seller cancels mid-order

If the PaymentIntent has not been captured: cancel it. Hold is released. Buyer is notified. No money moved. Clean.

If the PaymentIntent HAS been captured (seller accepted, then bails): issue a full refund. The refund takes 5-10 business days to appear on the buyer's statement. Not ideal, but there is no alternative.

---

## 7. MVP Payment Flow -- What to Build First vs. What Can Wait

### Build Now (MVP)

1. **Stripe Customer creation** -- Create a Stripe Customer when a LineCut user first attempts to pay. Store the `stripe_customer_id` on the user's profile in Supabase.

2. **PaymentIntent with manual capture** -- On "PLACE ORDER," create a PaymentIntent server-side with `capture_method: 'manual'`. Return the `client_secret` to the frontend.

3. **Stripe Elements (PaymentElement)** -- Embed the PaymentElement in the order drawer for card input. Confirm the PaymentIntent client-side. This handles card entry, 3D Secure, Apple Pay, Google Pay -- all without you building any of that UI.

4. **Capture on seller acceptance** -- When the seller taps "accept," a server action captures the PaymentIntent. Money moves. Transfer to seller's Express account happens automatically.

5. **Cancel on decline/timeout** -- If the seller declines or does not respond within N minutes, cancel the PaymentIntent server-side. Hold is released.

6. **Stripe Connect Express onboarding** -- Account creation, AccountLink generation, return/refresh handling, and the `account.updated` webhook to track onboarding status.

7. **Webhook handler** -- One route, handling: `payment_intent.succeeded`, `payment_intent.payment_failed`, `account.updated`. Signature verification. Idempotency via event ID deduplication.

8. **Orders table in Supabase** -- With a `stripe_payment_intent_id` column linking orders to Stripe.

### Build Later

- **Saved cards / SetupIntents** -- Let buyers save cards for faster repeat purchases. Not MVP. The PaymentElement handles card entry fine each time.
- **Instant payouts for sellers** -- 2-day default is fine early on.
- **Automated partial refunds** -- Handle disputes manually through Stripe Dashboard.
- **Receipt/email confirmation** -- Stripe can send receipt emails automatically if you enable it, but custom order confirmation emails can wait.
- **In-app earnings dashboard for sellers** -- A simple "you earned $X" after each order is enough. A full earnings history with payout tracking is a later feature.
- **Dispute resolution flow** -- Build this when disputes are a pattern, not before.
- **Seller pre-funding / LineCut-issued payment cards** -- A future solution to the "seller fronts the cost" problem. Way beyond MVP.

---

## 8. Edge Cases

### Seller cancels after accepting but before buying the food
Cancel the PaymentIntent. If already captured, issue a full refund. Notify the buyer. Ideally, offer to re-match the buyer with another available seller at the same restaurant -- but auto-rematching is not MVP. For now, the buyer just gets refunded and can place a new order.

### Restaurant is out of an item
Two options:
- **MVP:** Seller messages the buyer (you need some in-app communication channel, even if it is just a text notification). If the buyer agrees to a substitution, the order continues at the same price. If the buyer wants to cancel, cancel/refund the PaymentIntent.
- **Later:** Build a modification flow where the seller can update the order items, the total recalculates, and the buyer approves the change before capture.

For MVP, treat this as a cancellation scenario. The friction of building an order modification flow is not justified until you know how often this happens.

### Buyer's card is declined on authorization
The PaymentElement handles this. The buyer sees an error message ("Your card was declined. Please try a different payment method.") and the order is not created. Straightforward.

### 3D Secure / authentication required
The PaymentElement and `confirmPayment` handle this automatically. If the buyer's bank requires 3DS, a modal pops up, the buyer authenticates, and the flow continues. No special handling needed from you -- this is one of the main reasons to use the PaymentElement instead of a raw CardElement.

### Authorization hold expires (7-day limit)
Should never happen because LineCut orders resolve in under an hour. But defensively: if you attempt to capture a PaymentIntent and it fails with `payment_intent_unexpected_state`, check if the status is `canceled` (expired hold). If so, notify the buyer that the order could not be completed and they need to re-order. Log this as an anomaly -- if it ever happens, something is deeply wrong with your order lifecycle.

### Seller's Stripe account gets deauthorized after they go live
The `account.updated` webhook fires. Check `charges_enabled` -- if it flips to `false`, mark the seller's payout account as `revoked` and prevent them from accepting new orders. Any in-flight orders should still complete (the capture will succeed as long as the authorization is valid), but no new orders should route to this seller.

### Multiple buyers try to order from the same seller simultaneously
This is not a payment problem -- it is an order management problem. The seller's `status` should flip to `busy` when they accept an order, preventing new orders. If two orders are placed in a race condition before the seller responds, the seller accepts one and the other is auto-declined (PaymentIntent canceled, hold released).

### Tax
For MVP, ignore it. LineCut is not selling the food -- the restaurant is. The buyer is reimbursing a stranger for a purchase. Tax obligations are murky and depend on how regulators classify this transaction. This is a legal question, not a Stripe question. Get a tax lawyer before you scale, but do not let it block the MVP.

---

## Summary of Decisions

| Question | Decision |
|---|---|
| Payment model | PaymentIntents with manual capture. Authorize on order placement, capture on seller acceptance. |
| Money flow | Stripe Connect Express with destination charges. Platform keeps fee via `application_fee_amount`. |
| Pricing | Known and fixed. Rename `priceEstimate` to `price`. Remove "estimates may vary" disclaimer. |
| Seller reimbursement | Automatic via destination charge on capture. 2-day payout to bank. |
| Onboarding friction | Express accounts (Stripe-hosted). Gate at "go live," not at browse. Frame as "set up payouts." |
| Trust/safety | MVP: capture on acceptance, manual refunds via Stripe Dashboard. No automated dispute flow yet. |
| MVP scope | Customer creation, PaymentIntent with manual capture, PaymentElement, Connect onboarding, basic webhook handler, orders table. |
| Edge cases | Treat most as cancellation+refund at MVP. Build modification flows later when data shows they are needed. |

---

## Biggest Risk in This Entire Plan

The seller fronting the cost of the food is the structural risk that Stripe cannot solve. A seller buys $25 of pastrami with their own money and waits 2+ days to get reimbursed. For casual, low-stakes usage (someone waiting in line anyway, picking up a few extra items), this works. For any order above ~$30-40, the friction becomes real. If a seller gets burned once (buyer disputes, refund is issued, seller is out the food cost AND their fee), they will never use the app again.

This is not a payment integration problem. It is a business model problem. The Stripe setup described above handles the mechanics correctly, but it cannot fix the fundamental trust asymmetry: the seller takes on all the risk (fronting cash, buying food, hoping the buyer does not dispute), while the buyer takes on very little.

At scale, this likely requires either: (a) pre-funding seller accounts so they do not use their own money, (b) LineCut-issued payment cards loaded per-order, or (c) limiting order sizes to keep the stakes low enough that the risk is tolerable. All of these are post-MVP.

---

## Immediate Action Items for the Agent Configs

The `stripe-connect-payments.md` and `stripe-payment-orchestrator.md` agent configs need to be updated to reflect:

1. **Fee model**: Variable seller fee (from `seller.fee`), not fixed $8. Platform fee is 15% of item subtotal with $1 min / $8 max, not fixed $2.
2. **Amount calculation**: `total = items_subtotal + seller_fee + platform_fee`. The `application_fee_amount` for Stripe equals the platform fee only. The seller receives `items_subtotal + seller_fee`.
3. **Capture timing**: Capture on seller acceptance (MVP). Not on a separate "order complete" step.
4. **Field naming**: The `priceEstimate` field should be treated as the actual price. A rename to `price` should be part of the first implementation PR.
