import {
	NodeConnectionTypes,
	NodeOperationError,
	type IDataObject,
	type IHookFunctions,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookFunctions,
	type IWebhookResponseData,
} from 'n8n-workflow';
import { getBusinesses } from '../Kleos/loadOptions';
import { isRecord } from '../Kleos/shared/descriptions';
import { kleosApiRequest } from '../Kleos/shared/transport';
import { headerValue, verifyWebhook } from './verify';

/** The events Kleos sends (Settings → API → Webhooks). Grouped as the app groups them. */
export const EVENT_OPTIONS = [
	{
		name: 'Article Approved',
		value: 'article.approved',
		description:
			'An article was approved and is ready to publish, with its full text, so your website can create the page',
	},
	{
		name: 'Article Published',
		value: 'article.published',
		description: 'An article was published to the website, with its full text and live address',
	},
	{
		name: 'Automation Fired',
		value: 'automation.fired',
		description: 'An automation with a "Send a webhook" action ran',
	},
	{
		name: 'Calendar Replenished',
		value: 'calendar.replenished',
		description: "Kleos added planned posts to a channel's calendar",
	},
	{
		name: 'Campaign Planned',
		value: 'campaign.planned',
		description: 'Kleos planned a campaign from a sentence; the plan waits for approval',
	},
	{
		name: 'Draft Approved',
		value: 'draft.approved',
		description: 'A post draft was approved, by a person or by auto-approve',
	},
	{
		name: 'Draft Created',
		value: 'draft.created',
		description: 'A new post draft is ready for review',
	},
	{
		name: 'Draft Revision Requested',
		value: 'draft.revision_requested',
		description: 'A reviewer asked for changes to a post draft',
	},
	{
		name: 'Geo Report Ready',
		value: 'geo_report.ready',
		description: 'An AI visibility run finished and its report is ready',
	},
	{
		name: 'Lead Attributed',
		value: 'lead.attributed',
		description: 'A new lead from your CRM or form was traced to a piece of Kleos content',
	},
	{
		name: 'Newsletter Approved',
		value: 'newsletter.approved',
		description: 'A newsletter issue was approved and is ready to send, with its sections',
	},
	{
		name: 'Newsletter Sent',
		value: 'newsletter.sent',
		description: 'A newsletter issue was sent, or scheduled in your email platform',
	},
	{
		name: 'Post Failed',
		value: 'post.failed',
		description: "A post couldn't be published; the post's status and reason say why",
	},
	{
		name: 'Post Published',
		value: 'post.published',
		description: 'A post went out on its channel',
	},
	{
		name: 'Post Scheduled',
		value: 'post.scheduled',
		description: 'An approved post was scheduled to publish',
	},
	{
		name: 'Recommendation Created',
		value: 'recommendation.created',
		description: 'Kleos made a new growth suggestion',
	},
	{
		name: 'Recommendation Outcome',
		value: 'recommendation.outcome',
		description: 'A suggestion you carried out was measured (at 14, 30 or 60 days)',
	},
	{
		name: 'Usage Limit Reached',
		value: 'usage.limit_reached',
		description: 'The workspace used all of an allowance for this billing period',
	},
];

const TEST_EVENT = 'webhook.test';

type StaticData = { endpointId?: string; secret?: string };

export class KleosTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Kleos Trigger',
		name: 'kleosTrigger',
		icon: { light: 'file:kleos.svg', dark: 'file:kleos.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{ $parameter["events"].join(", ") }}',
		description:
			'Starts the workflow when something happens in Kleos: a draft is ready for review, a post goes out, an article is approved with its full text, a lead is traced to content, an AI visibility report is ready, and more',
		defaults: { name: 'Kleos Trigger' },
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'kleosApi', required: true }],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				default: [],
				options: EVENT_OPTIONS,
				description: 'Which Kleos events start this workflow',
			},
			{
				displayName: 'Registration',
				name: 'registration',
				type: 'options',
				default: 'automatic',
				options: [
					{
						name: 'Automatic (API Key Adds the Endpoint)',
						value: 'automatic',
						description:
							'When the workflow is activated, Kleos is told about this webhook address through the API. Needs a write key from an admin or owner.',
					},
					{
						name: 'Manual (Added Under Settings → API → Webhooks)',
						value: 'manual',
						description:
							'You add this webhook address in Kleos yourself and paste its signing secret below. For keys that cannot manage webhooks.',
					},
				],
				description: 'How Kleos learns about this webhook address',
			},
			{
				displayName: 'Signing Secret',
				name: 'secret',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				required: true,
				placeholder: 'whsec_…',
				displayOptions: { show: { registration: ['manual'] } },
				description:
					'The secret Kleos showed once when you added the endpoint. Every event is checked against it; unsigned requests are dropped.',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				options: [
					{
						displayName: 'Business Name or ID',
						name: 'business',
						type: 'options',
						typeOptions: { loadOptionsMethod: 'getBusinesses' },
						default: '',
						description:
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
					},
					{
						displayName: 'Include Test Events',
						name: 'includeTest',
						type: 'boolean',
						default: false,
						description:
							'Whether "Send test event" from Kleos Settings → API → Webhooks starts the workflow too (type webhook.test)',
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			getBusinesses,
		},
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				if (this.getNodeParameter('registration') === 'manual') return true;
				const data = this.getWorkflowStaticData('node') as StaticData;
				if (!data.endpointId) return false;
				try {
					const endpoint = await kleosApiRequest.call(
						this,
						'GET',
						`/v1/webhooks/${data.endpointId}`,
					);
					const url = this.getNodeWebhookUrl('default');
					if (endpoint.url !== url) {
						throw new NodeOperationError(this.getNode(), 'The endpoint points elsewhere.');
					}
					return true;
				} catch {
					// Removed in Kleos, or the address changed: register afresh.
					delete data.endpointId;
					delete data.secret;
					return false;
				}
			},

			async create(this: IHookFunctions): Promise<boolean> {
				if (this.getNodeParameter('registration') === 'manual') return true;
				const url = this.getNodeWebhookUrl('default');
				if (!url || !url.startsWith('https://')) {
					throw new NodeOperationError(
						this.getNode(),
						`Kleos only sends webhooks to public https addresses, and this n8n's webhook address is ${url ?? 'not set'}. Set WEBHOOK_URL on your n8n (or use a tunnel for testing), or choose manual registration.`,
					);
				}
				const events = this.getNodeParameter('events') as string[];
				if (!Array.isArray(events) || !events.length) {
					throw new NodeOperationError(this.getNode(), 'Choose at least one event.');
				}
				const workflowName = this.getWorkflow().name ?? 'workflow';
				const endpoint = await kleosApiRequest.call(
					this,
					'POST',
					'/v1/webhooks',
					{},
					{
						url,
						events,
						description: `n8n: ${workflowName}`.slice(0, 200),
					},
				);
				if (typeof endpoint.id !== 'string' || typeof endpoint.secret !== 'string') {
					throw new NodeOperationError(
						this.getNode(),
						'Kleos did not return the new endpoint with its secret.',
					);
				}
				const data = this.getWorkflowStaticData('node') as StaticData;
				data.endpointId = endpoint.id;
				data.secret = endpoint.secret;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				if (this.getNodeParameter('registration') === 'manual') return true;
				const data = this.getWorkflowStaticData('node') as StaticData;
				if (data.endpointId) {
					try {
						await kleosApiRequest.call(this, 'DELETE', `/v1/webhooks/${data.endpointId}`);
					} catch (error) {
						// Already gone, or the key lost access: nothing left to remove here, but say so.
						this.logger.warn(
							`Kleos Trigger: could not remove webhook endpoint ${data.endpointId}: ${String(error)}`,
						);
					}
				}
				delete data.endpointId;
				delete data.secret;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const res = this.getResponseObject();
		const headers = this.getHeaderData();

		const secret =
			this.getNodeParameter('registration') === 'manual'
				? String(this.getNodeParameter('secret') ?? '')
				: ((this.getWorkflowStaticData('node') as StaticData).secret ?? '');
		if (!secret) {
			res
				.status(500)
				.send('This trigger has no signing secret. Deactivate and activate the workflow again.');
			return { noWebhookResponse: true };
		}

		// The bytes Kleos signed: the raw body when n8n kept it, otherwise the parsed body serialised again.
		const raw = (req as unknown as { rawBody?: Buffer }).rawBody;
		const body = raw ? raw.toString('utf8') : JSON.stringify(this.getBodyData());
		const verdict = verifyWebhook(
			secret,
			{
				id: headerValue(headers['webhook-id']),
				timestamp: headerValue(headers['webhook-timestamp']),
				signature: headerValue(headers['webhook-signature']),
			},
			body,
		);
		if (!verdict.ok) {
			res.status(401).send(`Signature check failed: ${verdict.reason}.`);
			return { noWebhookResponse: true };
		}

		const event = this.getBodyData();
		const options = this.getNodeParameter('options', {}) as IDataObject;
		if (event.type === TEST_EVENT && options.includeTest !== true) {
			res
				.status(200)
				.send('Test event received; not started (turn on "Include test events" to start on it).');
			return { noWebhookResponse: true };
		}
		if (
			typeof options.business === 'string' &&
			options.business &&
			isRecord(event) &&
			event.business_id !== options.business
		) {
			res.status(200).send('Event is for another business.');
			return { noWebhookResponse: true };
		}

		return { workflowData: [this.helpers.returnJsonArray(event)] };
	}
}
