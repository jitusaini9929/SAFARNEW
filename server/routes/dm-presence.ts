const onlineUserIds = new Set<string>();

export function markDmUserOnline(userId: string) {
  if (!userId) return;
  onlineUserIds.add(userId);
}

export function markDmUserOffline(userId: string) {
  if (!userId) return;
  onlineUserIds.delete(userId);
}

export function isDmUserOnline(userId: string): boolean {
  if (!userId) return false;
  return onlineUserIds.has(userId);
}
