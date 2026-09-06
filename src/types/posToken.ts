const POS_TOKEN_KEY = "rhea_pos_auth_token";

export function getPosToken(): string | null {
  try {
    const token = localStorage.getItem(POS_TOKEN_KEY);
    return token && token.trim() ? token : null;
  } catch {
    return null;
  }
}

export function savePosToken(token: string): void {
  localStorage.setItem(POS_TOKEN_KEY, token);
}

export function clearPosToken(): void {
  localStorage.removeItem(POS_TOKEN_KEY);
}

export function posAuthHeaders(
  includeJsonContentType = false
): Record<string, string> {
  const token = getPosToken();

  if (!token) {
    throw new Error("POS authentication token is missing.");
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };

  if (includeJsonContentType) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
}
