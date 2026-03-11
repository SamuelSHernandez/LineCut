/**
 * Email template functions for LineCut transactional emails.
 * Each returns { subject, html, text } suitable for any email provider.
 *
 * HTML is inline-styled for maximum email client compatibility.
 * Brand color: ketchup red #C4382A, white background, clean layout.
 */

interface OrderForEmail {
  id: string;
  items: { name: string; quantity: number; price: number }[];
  itemsSubtotal: number; // cents
  sellerFee: number; // cents
  platformFee: number; // cents
  total: number; // cents
  specialInstructions?: string;
  createdAt: string;
}

function cents(amount: number): string {
  return `$${(amount / 100).toFixed(2)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function itemsTable(items: OrderForEmail["items"]): string {
  return items
    .map(
      (item) =>
        `<tr>
          <td style="padding:6px 0;font-family:'Courier New',Courier,monospace;font-size:14px;color:#1A0E06;border-bottom:1px solid #f0e8d8;">
            ${item.name} x${item.quantity}
          </td>
          <td style="padding:6px 0;font-family:'Courier New',Courier,monospace;font-size:14px;color:#1A0E06;text-align:right;border-bottom:1px solid #f0e8d8;">
            ${cents(item.price * item.quantity * 100)}
          </td>
        </tr>`
    )
    .join("\n");
}

function itemsPlainText(items: OrderForEmail["items"]): string {
  return items
    .map((item) => `  ${item.name} x${item.quantity} — ${cents(item.price * item.quantity * 100)}`)
    .join("\n");
}

/** Shared HTML wrapper with LineCut branding */
function wrapHtml(bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f0e6;font-family:'Courier New',Courier,monospace;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f0e6;">
    <tr><td align="center" style="padding:24px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:10px;border:1px solid #eee6d8;overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="background-color:#C4382A;padding:20px 24px;text-align:center;">
            <span style="font-family:'Courier New',Courier,monospace;font-size:24px;font-weight:bold;color:#ffffff;letter-spacing:2px;">LINECUT</span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:24px;">
            ${bodyContent}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:16px 24px;background-color:#f5f0e6;border-top:1px solid #eee6d8;text-align:center;">
            <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:11px;color:#8a7e6b;">
              LineCut -- Skip the line, not the food.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Order Confirmation (sent to buyer after order is placed)
// ---------------------------------------------------------------------------

export function orderConfirmationEmail(
  order: OrderForEmail,
  buyerName: string,
  sellerName: string,
  restaurantName: string
): { subject: string; html: string; text: string } {
  const subject = `Order confirmed at ${restaurantName} -- LineCut`;

  const html = wrapHtml(`
    <h1 style="margin:0 0 8px;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#1A0E06;">
      Order Confirmed
    </h1>
    <p style="margin:0 0 16px;font-family:'Courier New',Courier,monospace;font-size:14px;color:#8a7e6b;">
      ${formatDate(order.createdAt)}
    </p>

    <p style="margin:0 0 16px;font-family:'Courier New',Courier,monospace;font-size:14px;color:#1A0E06;">
      Hey ${buyerName}, your order at <strong>${restaurantName}</strong> has been placed.
      <strong>${sellerName}</strong> is in line and will pick it up for you.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      ${itemsTable(order.items)}
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:4px 0;font-family:'Courier New',Courier,monospace;font-size:13px;color:#8a7e6b;">Subtotal</td>
        <td style="padding:4px 0;font-family:'Courier New',Courier,monospace;font-size:13px;color:#8a7e6b;text-align:right;">${cents(order.itemsSubtotal)}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;font-family:'Courier New',Courier,monospace;font-size:13px;color:#8a7e6b;">Seller tip</td>
        <td style="padding:4px 0;font-family:'Courier New',Courier,monospace;font-size:13px;color:#8a7e6b;text-align:right;">${cents(order.sellerFee)}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;font-family:'Courier New',Courier,monospace;font-size:13px;color:#8a7e6b;">Service fee</td>
        <td style="padding:4px 0;font-family:'Courier New',Courier,monospace;font-size:13px;color:#8a7e6b;text-align:right;">${cents(order.platformFee)}</td>
      </tr>
      <tr>
        <td style="padding:8px 0 0;font-family:'Courier New',Courier,monospace;font-size:15px;font-weight:bold;color:#1A0E06;border-top:2px solid #1A0E06;">Total</td>
        <td style="padding:8px 0 0;font-family:'Courier New',Courier,monospace;font-size:15px;font-weight:bold;color:#1A0E06;text-align:right;border-top:2px solid #1A0E06;">${cents(order.total)}</td>
      </tr>
    </table>

    ${order.specialInstructions ? `<p style="margin:16px 0 0;font-family:'Courier New',Courier,monospace;font-size:13px;color:#8a7e6b;"><strong>Special instructions:</strong> ${escapeHtml(order.specialInstructions)}</p>` : ""}

    <p style="margin:20px 0 0;font-family:'Courier New',Courier,monospace;font-size:12px;color:#8a7e6b;">
      Order #${order.id.slice(0, 8)}
    </p>
  `);

  const text = `ORDER CONFIRMED -- LineCut

Hey ${buyerName}, your order at ${restaurantName} has been placed.
${sellerName} is in line and will pick it up for you.

${formatDate(order.createdAt)}

Items:
${itemsPlainText(order.items)}

Subtotal: ${cents(order.itemsSubtotal)}
Seller tip: ${cents(order.sellerFee)}
Service fee: ${cents(order.platformFee)}
Total: ${cents(order.total)}
${order.specialInstructions ? `\nSpecial instructions: ${order.specialInstructions}` : ""}

Order #${order.id.slice(0, 8)}
`;

  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// Order Completed (sent to both buyer and seller)
// ---------------------------------------------------------------------------

export function orderCompletedEmail(
  order: OrderForEmail,
  buyerName: string,
  sellerName: string,
  restaurantName: string
): { subject: string; html: string; text: string } {
  const subject = `Order complete at ${restaurantName} -- LineCut`;

  const html = wrapHtml(`
    <h1 style="margin:0 0 8px;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#1A0E06;">
      Order Complete
    </h1>

    <p style="margin:0 0 16px;font-family:'Courier New',Courier,monospace;font-size:14px;color:#1A0E06;">
      The order at <strong>${restaurantName}</strong> between
      <strong>${buyerName}</strong> and <strong>${sellerName}</strong>
      has been completed.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      ${itemsTable(order.items)}
    </table>

    <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:15px;font-weight:bold;color:#1A0E06;">
      Total: ${cents(order.total)}
    </p>

    <p style="margin:20px 0 0;font-family:'Courier New',Courier,monospace;font-size:12px;color:#8a7e6b;">
      Order #${order.id.slice(0, 8)}
    </p>
  `);

  const text = `ORDER COMPLETE -- LineCut

The order at ${restaurantName} between ${buyerName} and ${sellerName} has been completed.

Items:
${itemsPlainText(order.items)}

Total: ${cents(order.total)}

Order #${order.id.slice(0, 8)}
`;

  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// Order Cancelled (sent to affected party)
// ---------------------------------------------------------------------------

export function orderCancelledEmail(
  order: OrderForEmail,
  recipientName: string,
  reason: string
): { subject: string; html: string; text: string } {
  const subject = `Order cancelled -- LineCut`;

  const html = wrapHtml(`
    <h1 style="margin:0 0 8px;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#C4382A;">
      Order Cancelled
    </h1>

    <p style="margin:0 0 16px;font-family:'Courier New',Courier,monospace;font-size:14px;color:#1A0E06;">
      Hey ${recipientName}, your order has been cancelled.
    </p>

    <p style="margin:0 0 16px;font-family:'Courier New',Courier,monospace;font-size:14px;color:#8a7e6b;">
      <strong>Reason:</strong> ${escapeHtml(reason)}
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      ${itemsTable(order.items)}
    </table>

    <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:14px;color:#8a7e6b;">
      Total: ${cents(order.total)} (refund will be processed automatically)
    </p>

    <p style="margin:20px 0 0;font-family:'Courier New',Courier,monospace;font-size:12px;color:#8a7e6b;">
      Order #${order.id.slice(0, 8)}
    </p>
  `);

  const text = `ORDER CANCELLED -- LineCut

Hey ${recipientName}, your order has been cancelled.

Reason: ${reason}

Items:
${itemsPlainText(order.items)}

Total: ${cents(order.total)} (refund will be processed automatically)

Order #${order.id.slice(0, 8)}
`;

  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// Payout Summary (sent to sellers)
// ---------------------------------------------------------------------------

export function payoutSummaryEmail(
  sellerName: string,
  periodLabel: string,
  totalEarnings: number, // cents
  orderCount: number
): { subject: string; html: string; text: string } {
  const subject = `Your ${periodLabel} payout summary -- LineCut`;

  const html = wrapHtml(`
    <h1 style="margin:0 0 8px;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#1A0E06;">
      Payout Summary
    </h1>

    <p style="margin:0 0 16px;font-family:'Courier New',Courier,monospace;font-size:14px;color:#1A0E06;">
      Hey ${sellerName}, here's your earnings summary for <strong>${escapeHtml(periodLabel)}</strong>.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:16px;width:100%;background-color:#f5f0e6;border-radius:8px;">
      <tr>
        <td style="padding:20px;text-align:center;">
          <p style="margin:0 0 4px;font-family:'Courier New',Courier,monospace;font-size:12px;color:#8a7e6b;text-transform:uppercase;letter-spacing:1px;">Total Earnings</p>
          <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:bold;color:#1A0E06;">${cents(totalEarnings)}</p>
        </td>
        <td style="padding:20px;text-align:center;">
          <p style="margin:0 0 4px;font-family:'Courier New',Courier,monospace;font-size:12px;color:#8a7e6b;text-transform:uppercase;letter-spacing:1px;">Orders</p>
          <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:bold;color:#1A0E06;">${orderCount}</p>
        </td>
      </tr>
    </table>

    <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:13px;color:#8a7e6b;">
      Payouts are sent to your connected Stripe account. Check your Stripe dashboard for details.
    </p>
  `);

  const text = `PAYOUT SUMMARY -- LineCut

Hey ${sellerName}, here's your earnings summary for ${periodLabel}.

Total Earnings: ${cents(totalEarnings)}
Orders: ${orderCount}

Payouts are sent to your connected Stripe account. Check your Stripe dashboard for details.
`;

  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
