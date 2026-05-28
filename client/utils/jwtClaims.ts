import { getAccessToken } from "@/utils/apiFetch";

type AccessTokenClaims = {
  isAdmin?: boolean;
};

function decodeBase64Url(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const paddingLength = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + "=".repeat(paddingLength);
  return atob(padded);
}

export function getAccessTokenClaims(): AccessTokenClaims | null {
  const token = getAccessToken();
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length < 2) return null;

  try {
    const payloadJson = decodeBase64Url(parts[1]);
    const payload = JSON.parse(payloadJson) as AccessTokenClaims;
    return payload;
  } catch {
    return null;
  }
}

export function getIsAdminFromAccessToken(): boolean {
  return getAccessTokenClaims()?.isAdmin === true;
}
