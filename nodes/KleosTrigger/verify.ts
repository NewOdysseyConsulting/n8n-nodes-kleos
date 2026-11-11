import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Standard Webhooks (standardwebhooks.com) verification, as Kleos signs:
 *   webhook-id         the event id (the same on every retry)
 *   webhook-timestamp  unix seconds when this attempt was sent
 *   webhook-signature  "v1,<base64 HMAC-SHA256 of `${id}.${timestamp}.${body}`>", space-separated when two secrets
 *                      are valid (for a day after a rotation)
 * keyed with the base64-decoded part of the endpoint secret after "whsec_".
 */

export const TOLERANCE_SECONDS = 300;

const SECRET_PREFIX = 'whsec_';

export type WebhookHeaders = {
	id: string | null;
	timestamp: string | null;
	signature: string | null;
};

export type VerifyResult =
	| { ok: true }
	| { ok: false; reason: 'missing' | 'stale' | 'bad_signature' };

export const signingKey = (secret: string): Buffer =>
	Buffer.from(
		secret.startsWith(SECRET_PREFIX) ? secret.slice(SECRET_PREFIX.length) : secret,
		'base64',
	);

export const webhookSignature = (
	secret: string,
	id: string,
	timestamp: number | string,
	body: string,
): string =>
	`v1,${createHmac('sha256', signingKey(secret)).update(`${id}.${timestamp}.${body}`).digest('base64')}`;

/** Any one matching v1 signature, within five minutes of now, or why not. */
export function verifyWebhook(
	secret: string,
	headers: WebhookHeaders,
	body: string,
	nowSeconds = Math.floor(Date.now() / 1000),
): VerifyResult {
	if (!headers.id || !headers.timestamp || !headers.signature) {
		return { ok: false, reason: 'missing' };
	}
	const ts = Number(headers.timestamp);
	if (!Number.isInteger(ts) || Math.abs(nowSeconds - ts) > TOLERANCE_SECONDS) {
		return { ok: false, reason: 'stale' };
	}
	const want = Buffer.from(
		webhookSignature(secret, headers.id, headers.timestamp, body).slice(3),
		'base64',
	);
	for (const part of headers.signature.split(' ')) {
		const [version, sig] = part.split(',');
		if (version !== 'v1' || !sig) continue;
		const got = Buffer.from(sig, 'base64');
		if (got.length === want.length && timingSafeEqual(got, want)) return { ok: true };
	}
	return { ok: false, reason: 'bad_signature' };
}

/** A header value as one string (Node gives arrays for repeated headers). */
export const headerValue = (v: string | string[] | undefined): string | null =>
	v === undefined ? null : Array.isArray(v) ? (v[0] ?? null) : v;
