
interface JwtPayload {
  exp?: unknown;
}

/**
 * Returns the JWT expiration timestamp in milliseconds.
 * Returns null if the token is malformed or has no valid exp.
 *
 * This only decodes the payload; it does not verify
 * the token signature.
 */
export function getTokenExpiryMs(
  token: string
): number | null {
  try {
    const parts = token.split('.');

    if (parts.length !== 3) {
      return null;
    }

    const base64 = parts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const padded = base64.padEnd(
      Math.ceil(base64.length / 4) * 4,
      '='
    );

    const payload = JSON.parse(
      atob(padded)
    ) as JwtPayload;

    if (
      typeof payload.exp !== 'number' ||
      !Number.isFinite(payload.exp) ||
      payload.exp <= 0
    ) {
      return null;
    }

    return payload.exp * 1000;
  } catch {
    return null;
  }
}

/**
 * Check whether a JWT is expired.
 * Uses a 5-second safety margin.
 */
export function isTokenExpired(
  token: string
): boolean {
  const expiresAt = getTokenExpiryMs(token);

  if (expiresAt === null) {
    return true;
  }

  return Date.now() >= expiresAt - 5000;
}
