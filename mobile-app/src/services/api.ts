/**
 * RiteDoc Mobile App — API Service
 *
 * Handles the single online call to verify a mobile access code.
 * After successful verification, the app works fully offline.
 */

// Update this URL after deploying the Cloudflare Worker
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  'https://readycompliant-api.workers.dev';

export interface VerifyCodeResponse {
  success: true;
  activation_token: string;
  agency_name: string;
  message: string;
}

export interface VerifyCodeError {
  error: string;
}

/**
 * Verify a mobile access code against the ReadyCompliant API.
 * This is the ONLY online call the app makes — after success, everything is offline.
 *
 * @param code - The access code entered by the support worker (e.g. MAC-XXXX-XXXX-XXXX)
 * @param deviceId - Optional device identifier for audit trail
 */
export async function verifyAccessCode(
  code: string,
  deviceId?: string
): Promise<VerifyCodeResponse> {
  const url = `${API_BASE_URL}/api/mobile/verify-code`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      code: code.trim().toUpperCase(),
      device_id: deviceId,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const errData = data as VerifyCodeError;
    throw new Error(errData.error || `Server error: ${response.status}`);
  }

  return data as VerifyCodeResponse;
}
