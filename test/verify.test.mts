import assert from 'node:assert/strict';
import { createHmac, randomBytes } from 'node:crypto';
import { describe, it } from 'node:test';
import { headerValue, verifyWebhook, webhookSignature } from '../nodes/KleosTrigger/verify.ts';

// Signs exactly as Kleos does (apps/clio/lib/webhooks/core.ts), independently of the code under test.
const secret = `whsec_${randomBytes(32).toString('base64')}`;
const sign = (s: string, id: string, ts: number | string, body: string) =>
	`v1,${createHmac('sha256', Buffer.from(s.slice('whsec_'.length), 'base64'))
		.update(`${id}.${ts}.${body}`)
		.digest('base64')}`;

const now = 1_762_900_000;
const body = JSON.stringify({ id: 'evt_1', type: 'post.published', data: { id: 'p1' } });
const headers = (
	overrides: Partial<{
		id: string | null;
		timestamp: string | null;
		signature: string | null;
	}> = {},
) => ({
	id: 'evt_1',
	timestamp: String(now),
	signature: sign(secret, 'evt_1', now, body),
	...overrides,
});

describe('verifyWebhook', () => {
	it('accepts a request Kleos signed', () => {
		assert.deepEqual(verifyWebhook(secret, headers(), body, now), { ok: true });
	});

	it('produces the same signature as Kleos', () => {
		assert.equal(webhookSignature(secret, 'evt_1', now, body), sign(secret, 'evt_1', now, body));
	});

	it('accepts either signature during a secret rotation', () => {
		const old = `whsec_${randomBytes(32).toString('base64')}`;
		const both = `${sign(old, 'evt_1', now, body)} ${sign(secret, 'evt_1', now, body)}`;
		assert.deepEqual(verifyWebhook(secret, headers({ signature: both }), body, now), { ok: true });
		assert.deepEqual(verifyWebhook(old, headers({ signature: both }), body, now), { ok: true });
	});

	it('refuses a missing header', () => {
		assert.deepEqual(verifyWebhook(secret, headers({ signature: null }), body, now), {
			ok: false,
			reason: 'missing',
		});
		assert.deepEqual(verifyWebhook(secret, headers({ id: null }), body, now), {
			ok: false,
			reason: 'missing',
		});
		assert.deepEqual(verifyWebhook(secret, headers({ timestamp: null }), body, now), {
			ok: false,
			reason: 'missing',
		});
	});

	it('refuses a timestamp more than five minutes off, either way', () => {
		const old = now - 301;
		assert.deepEqual(
			verifyWebhook(
				secret,
				headers({ timestamp: String(old), signature: sign(secret, 'evt_1', old, body) }),
				body,
				now,
			),
			{ ok: false, reason: 'stale' },
		);
		const ahead = now + 301;
		assert.deepEqual(
			verifyWebhook(
				secret,
				headers({ timestamp: String(ahead), signature: sign(secret, 'evt_1', ahead, body) }),
				body,
				now,
			),
			{ ok: false, reason: 'stale' },
		);
		assert.deepEqual(verifyWebhook(secret, headers({ timestamp: 'soon' }), body, now), {
			ok: false,
			reason: 'stale',
		});
	});

	it('accepts a timestamp within the tolerance', () => {
		const ts = now - 299;
		assert.deepEqual(
			verifyWebhook(
				secret,
				headers({ timestamp: String(ts), signature: sign(secret, 'evt_1', ts, body) }),
				body,
				now,
			),
			{ ok: true },
		);
	});

	it('refuses a wrong secret, a changed body and a tampered id', () => {
		const other = `whsec_${randomBytes(32).toString('base64')}`;
		assert.deepEqual(verifyWebhook(other, headers(), body, now), {
			ok: false,
			reason: 'bad_signature',
		});
		assert.deepEqual(verifyWebhook(secret, headers(), body.replace('p1', 'p2'), now), {
			ok: false,
			reason: 'bad_signature',
		});
		assert.deepEqual(verifyWebhook(secret, headers({ id: 'evt_2' }), body, now), {
			ok: false,
			reason: 'bad_signature',
		});
	});

	it('ignores signature versions it does not know, and malformed parts', () => {
		const sig = sign(secret, 'evt_1', now, body);
		assert.deepEqual(
			verifyWebhook(secret, headers({ signature: `v2,${sig.slice(3)}` }), body, now),
			{ ok: false, reason: 'bad_signature' },
		);
		assert.deepEqual(
			verifyWebhook(secret, headers({ signature: `garbage v1,${sig.slice(3)}` }), body, now),
			{ ok: true },
		);
		assert.deepEqual(verifyWebhook(secret, headers({ signature: 'v1,' }), body, now), {
			ok: false,
			reason: 'bad_signature',
		});
	});

	it('takes the secret with or without its whsec_ prefix', () => {
		assert.deepEqual(verifyWebhook(secret.slice('whsec_'.length), headers(), body, now), {
			ok: true,
		});
	});
});

describe('headerValue', () => {
	it('flattens Node header values', () => {
		assert.equal(headerValue(undefined), null);
		assert.equal(headerValue('a'), 'a');
		assert.equal(headerValue(['a', 'b']), 'a');
		assert.equal(headerValue([]), null);
	});
});
