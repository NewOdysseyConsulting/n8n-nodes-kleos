import type { IDataObject, ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { CHANNEL_OPTIONS, isRecord } from './shared/descriptions';
import { kleosApiRequest } from './shared/transport';

/** Every business in the workspace, by name. Follows the cursor so a workspace with many businesses lists them all. */
export async function getBusinesses(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const out: INodePropertyOptions[] = [];
	let cursor: string | undefined;
	do {
		const qs: IDataObject = { limit: 100 };
		if (cursor) qs.cursor = cursor;
		const page = await kleosApiRequest.call(this, 'GET', '/v1/products', qs);
		const data = Array.isArray(page.data) ? (page.data as IDataObject[]) : [];
		for (const p of data) {
			if (!isRecord(p) || typeof p.id !== 'string') continue;
			const name = typeof p.name === 'string' && p.name ? p.name : p.id;
			out.push({ name: p.domain ? `${name} (${String(p.domain)})` : name, value: p.id });
		}
		cursor =
			page.has_more === true && typeof page.next_cursor === 'string' ? page.next_cursor : undefined;
	} while (cursor);
	return out.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * The channels a business posts on, read from its calendar (the API has no channel list). When the business is not
 * chosen yet, or its calendar is empty, every channel Kleos supports is offered.
 */
export async function getChannels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	let business = '';
	try {
		business = String(this.getCurrentNodeParameter('business') ?? '');
	} catch {
		business = '';
	}
	if (!business) return CHANNEL_OPTIONS;
	const seen = new Set<string>();
	try {
		const page = await kleosApiRequest.call(this, 'GET', '/v1/calendar/slots', {
			product_id: business,
			limit: 100,
		});
		for (const slot of Array.isArray(page.data) ? (page.data as unknown[]) : []) {
			if (isRecord(slot) && typeof slot.channel === 'string') seen.add(slot.channel);
		}
	} catch {
		// A key without calendar access still gets the full list below.
	}
	if (!seen.size) return CHANNEL_OPTIONS;
	return CHANNEL_OPTIONS.filter((c) => seen.has(c.value)).concat(
		[...seen]
			.filter((v) => !CHANNEL_OPTIONS.some((c) => c.value === v))
			.map((v) => ({ name: v, value: v })),
	);
}
