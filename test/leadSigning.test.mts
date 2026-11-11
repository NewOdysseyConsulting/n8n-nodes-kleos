import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { describe, it } from 'node:test';
import {
	leadSignature,
	leadTestVerdict,
	signLeadRequest,
} from '../nodes/Kleos/shared/leadSigning.ts';

const secret = 'whsec_test-secret';
const endpointUrl =
	'https://app.getkleos.ai/api/inbound/leads/5f6e0c2e-0000-4000-8000-000000000001';

// As Kleos verifies (apps/clio/lib/domain/inbound-leads.ts): v1=<hex HMAC-SHA256 of "<timestamp>.<raw body>">.
const expected = (ts: number, raw: string) =>
	`v1=${createHmac('sha256', secret).update(`${ts}.${raw}`).digest('hex')}`;

describe('signLeadRequest', () => {
	it('signs the exact bytes it sends, and sends them to the credential endpoint', () => {
		const signed = signLeadRequest(
			{ endpointUrl, secret },
			{
				method: 'POST',
				baseURL: 'https://app.getkleos.ai',
				url: '/',
				headers: { Accept: 'application/json' },
				body: { type: 'lead', id: 'crm-42', utm: { source: 'linkedin' } },
			},
			1_762_900_000,
		);
		assert.equal(signed.url, endpointUrl);
		assert.equal(signed.baseURL, undefined);
		assert.equal(typeof signed.body, 'string');
		const raw = signed.body as string;
		assert.deepEqual(JSON.parse(raw), { type: 'lead', id: 'crm-42', utm: { source: 'linkedin' } });
		assert.equal(signed.headers?.['X-Kleos-Timestamp'], '1762900000');
		assert.equal(signed.headers?.['X-Kleos-Signature'], expected(1_762_900_000, raw));
		assert.equal(signed.headers?.['Content-Type'], 'application/json');
		assert.equal(signed.headers?.Accept, 'application/json');
	});

	it('leaves a body that is already a string untouched', () => {
		const raw = '{"type":"lead","id":"x"}';
		const signed = signLeadRequest(
			{ endpointUrl, secret },
			{ method: 'POST', url: '/', body: raw },
			7,
		);
		assert.equal(signed.body, raw);
		assert.equal(signed.headers?.['X-Kleos-Signature'], expected(7, raw));
	});

	it('trims the pasted endpoint and secret', () => {
		const signed = signLeadRequest(
			{ endpointUrl: ` ${endpointUrl}\n`, secret: `${secret} ` },
			{ method: 'POST', url: '/', body: {} },
			7,
		);
		assert.equal(signed.url, endpointUrl);
		assert.equal(signed.headers?.['X-Kleos-Signature'], expected(7, '{}'));
	});

	it('matches leadSignature', () => {
		assert.equal(leadSignature(secret, 7, '{}'), expected(7, '{}'));
	});
});

describe('leadTestVerdict', () => {
	it('reads a signed-but-empty request as success', () => {
		assert.equal(leadTestVerdict(400, { error: 'No events in the request.' }).status, 'OK');
	});
	it('reads 401 as a wrong secret and 404 as a wrong endpoint', () => {
		assert.equal(leadTestVerdict(401, { error: 'Missing or invalid signature.' }).status, 'Error');
		assert.match(
			leadTestVerdict(401, { error: 'Missing or invalid signature.' }).message,
			/signature/,
		);
		assert.match(leadTestVerdict(404, { error: 'Unknown endpoint.' }).message, /Lead tracking/);
	});
	it('reports anything else with its status', () => {
		assert.match(leadTestVerdict(500, 'oops').message, /500/);
		assert.match(leadTestVerdict(400, { error: 'The body isn’t valid JSON.' }).message, /400/);
	});
});
