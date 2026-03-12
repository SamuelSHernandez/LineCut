"use client";

import { useRouter } from "next/navigation";
import PullToRefresh from "./PullToRefresh";
import type { ReactNode } from "react";

export default function PullToRefreshWrapper({ children }: { children: ReactNode }) {
  const router = useRouter();

  return (
    <PullToRefresh onRefresh={async () => { router.refresh(); }}>
      {children}
    </PullToRefresh>
  );
}
