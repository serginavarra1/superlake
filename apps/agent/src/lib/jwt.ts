export function extractUserIdFromToken(authHeader: string | undefined): string | null {
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;

  const payloadBase64 = token.split('.')[1];
  if (!payloadBase64) return null;

  try {
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf-8'));
    return payload.sub ?? null;
  } catch {
    return null;
  }
}
