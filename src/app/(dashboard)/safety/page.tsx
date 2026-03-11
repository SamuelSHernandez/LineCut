import { getBlockedUsers } from "./actions";
import SafetyPageClient from "./SafetyPageClient";

export default async function SafetyPage() {
  const blockedUsers = await getBlockedUsers();

  return <SafetyPageClient initialBlockedUsers={blockedUsers} />;
}
