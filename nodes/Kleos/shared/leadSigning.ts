import { createHmac } from 'crypto';
import type {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IHttpRequestOptions,
	INodeCredentialTestResult,
} from 'n8n-workflow';

/**
 * Signing for the inbound lead-tracking endpoint: X-Kleos-Timestamp (unix seconds) and
 * X-Kleos-Signature "v1=<hex HMAC-SHA256 of `${timestamp}.${rawBody}`>" keyed with the endpoint's secret.
 * The body is serialised here and sent as that exact string, so the bytes signed are the bytes sent.
 */
export const leadSignature = (
	secret: string,
	timestamp: number | string,
	rawBody: string,
): string => `v1=${createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex')}`;

export type LeadCredentials = { endpointUrl: string; secret: string };

export function signLeadRequest(
	credentials: LeadCredentials,
	requestOptions: IHttpRequestOptions,
	nowSeconds = Math.floor(Date.now() / 1000),
): IHttpRequestOptions {
	const rawBody =
		typeof requestOptions.body === 'string'
			? requestOptions.body
			: JSON.stringify(requestOptions.body ?? {});
	return {
		...requestOptions,
		baseURL: undefined,
		url: credentials.endpointUrl.trim(),
		body: rawBody,
		headers: {
			...(requestOptions.headers ?? {}),
			'Content-Type': 'application/json',
			'X-Kleos-Timestamp': String(nowSeconds),
			'X-Kleos-Signature': leadSignature(credentials.secret.trim(), nowSeconds, rawBody),
		},
	};
}

/**
 * What a reply from the endpoint means for the credential. The endpoint only takes events, so the test sends an empty
 * list: a correctly signed request is refused with 400 "No events" (the credential works); 401 is a wrong secret; 404
 * a wrong or disabled endpoint.
 */
export function leadTestVerdict(status: number, body: unknown): INodeCredentialTestResult {
	const message =
		typeof body === 'object' &&
		body !== null &&
		typeof (body as { error?: unknown }).error === 'string'
			? (body as { error: string }).error
			: '';
	if (status === 400 && /no events/i.test(message))
		return { status: 'OK', message: 'Connection successful' };
	if (status === 401)
		return {
			status: 'Error',
			message: `Kleos refused the signature: ${message || 'check the secret'}`,
		};
	if (status === 404)
		return {
			status: 'Error',
			message:
				'Kleos does not know this endpoint address. Copy it again from Results → Leads → Lead tracking, and check the endpoint is enabled.',
		};
	if (status >= 200 && status < 300) return { status: 'OK', message: 'Connection successful' };
	return { status: 'Error', message: `Unexpected reply ${status}${message ? `: ${message}` : ''}` };
}

export async function kleosLeadTrackingApiTest(
	this: ICredentialTestFunctions,
	credential: ICredentialsDecrypted,
): Promise<INodeCredentialTestResult> {
	const data = credential.data ?? {};
	const endpointUrl = String(data.endpointUrl ?? '').trim();
	const secret = String(data.secret ?? '').trim();
	if (!/^https:\/\//.test(endpointUrl)) {
		return { status: 'Error', message: 'The endpoint URL must start with https://' };
	}
	if (!secret) return { status: 'Error', message: 'Enter the signing secret' };
	const signed = signLeadRequest(
		{ endpointUrl, secret },
		{ method: 'POST', url: endpointUrl, body: { events: [] } },
	);
	// The credential-test context offers no httpRequest helper, so the one call uses Node's own fetch.
	try {
		const response = await fetch(signed.url, {
			method: 'POST',
			headers: signed.headers as Record<string, string>,
			body: signed.body as string,
			signal: AbortSignal.timeout(10_000),
		});
		const text = await response.text();
		let body: unknown;
		try {
			body = JSON.parse(text);
		} catch {
			body = { error: text };
		}
		return leadTestVerdict(response.status, body);
	} catch (error) {
		this.logger.warn(`Kleos lead tracking credential test failed: ${String(error)}`);
		return { status: 'Error', message: `Could not reach Kleos: ${String(error)}` };
	}
}
