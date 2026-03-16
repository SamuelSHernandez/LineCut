import "server-only";

export const features = {
  waitlistMode: true, // when true, all authenticated users are redirected to /waitlist
} as const;
