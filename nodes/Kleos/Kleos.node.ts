import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { getBusinesses, getChannels } from './loadOptions';
import { aiVisibilityDescription } from './resources/aiVisibility';
import { articleDescription } from './resources/article';
import { businessDescription } from './resources/business';
import { campaignDescription } from './resources/campaign';
import { knowledgeSourceDescription } from './resources/knowledgeSource';
import { leadDescription } from './resources/lead';
import { postDescription } from './resources/post';
import { resultsDescription } from './resources/results';
import { reviewQueueDescription } from './resources/reviewQueue';
import { suggestionDescription } from './resources/suggestion';
import { kleosLeadTrackingApiTest } from './shared/leadSigning';
import { KLEOS_BASE_URL } from './shared/transport';

export class Kleos implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Kleos',
		name: 'kleos',
		icon: { light: 'file:kleos.svg', dark: 'file:kleos.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
		description:
			'Kleos is an AI marketing employee for small businesses: it plans, writes, checks and publishes posts, articles and newsletters, tracks results and AI visibility. Read businesses, posts, articles, campaigns, suggestions and results; ask for drafts; approve work; record what was published; send leads and deals for attribution.',
		defaults: { name: 'Kleos' },
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'kleosApi',
				required: true,
				displayOptions: { hide: { resource: ['lead'] } },
			},
			{
				name: 'kleosLeadTrackingApi',
				required: true,
				testedBy: 'kleosLeadTrackingApiTest',
				displayOptions: { show: { resource: ['lead'] } },
			},
		],
		requestDefaults: {
			baseURL: KLEOS_BASE_URL,
			headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'AI Visibility',
						value: 'aiVisibility',
						description:
							'How often AI assistants (ChatGPT, Claude, Gemini, Perplexity) mention, recommend and cite the business',
					},
					{
						name: 'Article',
						value: 'article',
						description: 'Long-form articles Kleos writes for the website',
					},
					{
						name: 'Business',
						value: 'business',
						description: 'The brands, products or clients in the workspace',
					},
					{
						name: 'Campaign',
						value: 'campaign',
						description: 'Multi-post campaigns planned from a sentence',
					},
					{
						name: 'Knowledge Source',
						value: 'knowledgeSource',
						description: 'Pages and documents Kleos is allowed to write from',
					},
					{
						name: 'Lead',
						value: 'lead',
						description:
							'Leads and deals from your CRM or forms, for attribution (uses the Lead Tracking credential)',
					},
					{
						name: 'Post',
						value: 'post',
						description: 'Social and email posts: LinkedIn, X, Instagram, Facebook and more',
					},
					{
						name: 'Result',
						value: 'results',
						description: 'Attribution (sessions, leads, deals, revenue) and plan usage',
					},
					{
						name: 'Review Queue',
						value: 'reviewQueue',
						description: 'Posts and articles waiting for a person to approve them',
					},
					{
						name: 'Suggestion',
						value: 'suggestion',
						description: 'Growth suggestions Kleos makes, and their measured outcomes',
					},
				],
				default: 'post',
			},
			...aiVisibilityDescription,
			...articleDescription,
			...businessDescription,
			...campaignDescription,
			...knowledgeSourceDescription,
			...leadDescription,
			...postDescription,
			...resultsDescription,
			...reviewQueueDescription,
			...suggestionDescription,
		],
	};

	methods = {
		loadOptions: {
			getBusinesses,
			getChannels,
		},
		credentialTest: {
			kleosLeadTrackingApiTest,
		},
	};
}
