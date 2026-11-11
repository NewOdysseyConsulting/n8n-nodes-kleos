import type { IDataObject, INodeProperties, INodePropertyRouting } from 'n8n-workflow';

type Show = { resource: string[]; operation: string[] };

export const DYNAMIC_OPTIONS_HINT =
	'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>';

/** Lists come back as {object: "list", data: [...], has_more, next_cursor}; the node returns the items. */
export const unwrapList: INodePropertyRouting['output'] = {
	postReceive: [{ type: 'rootProperty', properties: { property: 'data' } }],
};

/** The business dropdown. `send` says where its ID goes: the query string, the body, or nowhere (the URL reads it). */
export function businessSelect(
	show: Show,
	send: 'query' | 'body' | 'none',
	options: { required?: boolean; name?: string } = {},
): INodeProperties {
	const name = options.name ?? 'business';
	const required = options.required ?? true;
	const property: INodeProperties = {
		displayName: 'Business Name or ID',
		name,
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getBusinesses' },
		default: '',
		required,
		displayOptions: { show },
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	};
	if (send !== 'none') {
		property.routing = { send: { type: send, property: 'product_id' } };
	}
	return property;
}

/** An ID typed or passed in by expression. */
export function idField(
	displayName: string,
	name: string,
	show: Show,
	description: string,
): INodeProperties {
	return {
		displayName,
		name,
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show },
		description,
	};
}

/** Return All and Limit, with Kleos's cursor pagination. */
export function listFields(show: Show): INodeProperties[] {
	return [
		{
			displayName: 'Return All',
			name: 'returnAll',
			type: 'boolean',
			default: false,
			displayOptions: { show },
			description: 'Whether to return all results or only up to a given limit',
			routing: {
				send: { paginate: '={{ $value }}', type: 'query', property: 'limit', value: '100' },
				operations: {
					pagination: {
						type: 'generic',
						properties: {
							continue: '={{ $response.body.has_more === true }}',
							request: { qs: { cursor: '={{ $response.body.next_cursor }}' } },
						},
					},
				},
			},
		},
		{
			displayName: 'Limit',
			name: 'limit',
			type: 'number',
			default: 50,
			typeOptions: { minValue: 1, maxValue: 100 },
			displayOptions: { show: { ...show, returnAll: [false] } },
			description: 'Max number of results to return',
			routing: {
				send: { type: 'query', property: 'limit' },
				output: { maxResults: '={{ $value }}' },
			},
		},
	];
}

/** An optional business filter on a list, as a query parameter. */
export function businessFilter(show: Show): INodeProperties {
	return businessSelect(show, 'query', { required: false });
}

/** A collection of optional query-string filters. */
export function filters(show: Show, options: INodeProperties[]): INodeProperties {
	return {
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show },
		options: options.map((o) => ({
			...o,
			routing: { send: { type: 'query', property: o.name } },
		})),
	};
}

export const statusFilter = (description: string): INodeProperties => ({
	displayName: 'Status',
	name: 'status',
	type: 'string',
	default: '',
	description,
});

export const CHANNEL_OPTIONS = [
	{ name: 'Facebook', value: 'facebook' },
	{ name: 'Google Business Profile', value: 'google_business_profile' },
	{ name: 'Instagram', value: 'instagram' },
	{ name: 'LinkedIn', value: 'linkedin' },
	{ name: 'Newsletter (Email)', value: 'email' },
	{ name: 'Pinterest', value: 'pinterest' },
	{ name: 'Threads', value: 'threads' },
	{ name: 'X', value: 'x' },
];

export function channelFilter(): INodeProperties {
	return {
		displayName: 'Channel Name or ID',
		name: 'channel',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getChannels', loadOptionsDependsOn: ['business'] },
		default: '',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	};
}

export const isRecord = (v: unknown): v is IDataObject =>
	typeof v === 'object' && v !== null && !Array.isArray(v);
