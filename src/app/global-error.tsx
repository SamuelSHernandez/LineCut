"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          backgroundColor: "#F5EDE0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, -apple-system, sans-serif",
          padding: "24px",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: "360px" }}>
          <h1
            style={{
              fontSize: "32px",
              color: "#1A1A18",
              textTransform: "uppercase",
              margin: "0 0 8px",
              letterSpacing: "1px",
            }}
          >
            Something went wrong
          </h1>
          <p style={{ fontSize: "15px", color: "#8C8778", margin: "0 0 24px" }}>
            Hit a snag. Give it another shot.
          </p>
          <button
            onClick={reset}
            style={{
              display: "block",
              width: "100%",
              padding: "12px 24px",
              backgroundColor: "#C4382A",
              color: "#FFFDF5",
              border: "none",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
              marginBottom: "12px",
            }}
          >
            Try again
          </button>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            style={{
              fontSize: "14px",
              color: "#C4382A",
              textDecoration: "none",
            }}
          >
            Go home
          </a>
        </div>
      </body>
    </html>
  );
}
