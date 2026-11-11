import type { INodeProperties } from 'n8n-workflow';

const resource = ['lead'];
const show = { resource, operation: ['recordLead', 'recordDeal'] };

/**
 * Leads and deals go to the business's lead-tracking endpoint (Kleos Lead Tracking credential), not the API key.
 * Kleos keeps no names or contact details: send your CRM's own ID and the campaign tags, nothing personal.
 */
export const leadDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource } },
		options: [
			{
				name: 'Record Deal',
				value: 'recordDeal',
				action: 'Record a deal',
				description:
					'Record a deal (an opportunity, with its value and whether it was won) so Kleos can trace revenue to the content that brought the lead',
				routing: {
					request: { method: 'POST', url: '/', body: { type: 'deal' } },
				},
			},
			{
				name: 'Record Lead',
				value: 'recordLead',
				action: 'Record a lead',
				description:
					'Record a new lead from your CRM or form so Kleos can trace it to the post, article or newsletter it came from',
				routing: {
					request: { method: 'POST', url: '/', body: { type: 'lead' } },
				},
			},
		],
		default: 'recordLead',
	},
	{
		displayName: 'External ID',
		name: 'externalId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show },
		description:
			"Your CRM's or form's own ID for this lead or deal. The same ID sent again updates the record instead of adding another.",
		routing: { send: { type: 'body', property: 'id' } },
	},
	{
		displayName: 'Landing URL',
		name: 'landingUrl',
		type: 'string',
		default: '',
		displayOptions: { show },
		description:
			'The page the person first landed on, with its utm_ tags. Kleos reads utm_source, utm_medium, utm_campaign and utm_content from it; anything else in the address is dropped.',
		routing: { send: { type: 'body', property: 'landing_url' } },
	},
	{
		displayName: 'Campaign Tags',
		name: 'utm',
		type: 'collection',
		placeholder: 'Add Tag',
		default: {},
		displayOptions: { show },
		description: 'The utm_ tags on the visit, when you have them separately from the landing URL',
		options: [
			{
				displayName: 'Campaign',
				name: 'campaign',
				type: 'string',
				default: '',
				description: 'The utm_campaign value',
			},
			{
				displayName: 'Content',
				name: 'content',
				type: 'string',
				default: '',
				description:
					'The utm_content value: the code Kleos puts on every link, which names the piece of content',
			},
			{
				displayName: 'Medium',
				name: 'medium',
				type: 'string',
				default: '',
				description: 'The utm_medium value',
			},
			{
				displayName: 'Source',
				name: 'source',
				type: 'string',
				default: '',
				description: 'The utm_source value',
			},
		],
		routing: { send: { type: 'body', property: 'utm' } },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show },
		options: [
			{
				displayName: 'Amount',
				name: 'amount',
				type: 'number',
				default: 0,
				description: "The deal's value in major units, for example 1200.50 (deals only)",
				routing: { send: { type: 'body', property: 'amount' } },
			},
			{
				displayName: 'Closed At',
				name: 'closed_at',
				type: 'dateTime',
				default: '',
				description: 'When the deal closed (deals only)',
				routing: { send: { type: 'body', property: 'closed_at' } },
			},
			{
				displayName: 'Currency',
				name: 'currency',
				type: 'string',
				default: '',
				placeholder: 'USD',
				description: 'A three-letter currency code (deals only)',
				routing: { send: { type: 'body', property: 'currency' } },
			},
			{
				displayName: 'Lead External ID',
				name: 'lead_id',
				type: 'string',
				default: '',
				description: 'The external ID of the lead this deal belongs to (deals only)',
				routing: { send: { type: 'body', property: 'lead_id' } },
			},
			{
				displayName: 'Occurred At',
				name: 'occurred_at',
				type: 'dateTime',
				default: '',
				description: 'When the lead or deal was created in your CRM. Defaults to now.',
				routing: { send: { type: 'body', property: 'occurred_at' } },
			},
			{
				displayName: 'Stage',
				name: 'stage',
				type: 'string',
				default: '',
				description:
					'The pipeline stage, for example new, qualified or closed_won (up to 60 characters)',
				routing: { send: { type: 'body', property: 'stage' } },
			},
			{
				displayName: 'Won',
				name: 'won',
				type: 'boolean',
				default: false,
				description: 'Whether the deal was won (deals only; a stage of closed_won also counts)',
				routing: { send: { type: 'body', property: 'won' } },
			},
		],
	},
];
