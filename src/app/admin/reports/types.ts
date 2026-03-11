export const statusColors: Record<string, string> = {
  pending: "bg-ketchup/20 text-ketchup",
  reviewed: "bg-mustard/20 text-mustard",
  dismissed: "bg-sidewalk/20 text-sidewalk",
  actioned: "bg-[#DDEFDD] text-[#2D6A2D]",
};

export const statusLabels: Record<string, string> = {
  pending: "PENDING",
  reviewed: "REVIEWED",
  dismissed: "DISMISSED",
  actioned: "ACTIONED",
};

export interface UserReport {
  id: string;
  reporterId: string;
  reportedId: string;
  reporterName: string;
  reportedName: string;
  orderId: string | null;
  reason: string;
  details: string | null;
  status: string;
  createdAt: string;
  reviewedAt: string | null;
  adminNotes: string | null;
}
