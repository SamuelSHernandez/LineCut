import "server-only";

export const features = {
  waitlistMode: false, // when true, all authenticated users are redirected to /waitlist
} as const;
