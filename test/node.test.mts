import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { INodeProperties, INodePropertyOptions, INodePropertyRouting } from 'n8n-workflow';
import { KleosApi } from '../credentials/KleosApi.credentials.ts';
import { KleosLeadTrackingApi } from '../credentials/KleosLeadTrackingApi.credentials.ts';
import { Kleos } from '../nodes/Kleos/Kleos.node.ts';
import { EVENT_OPTIONS, KleosTrigger } from '../nodes/KleosTrigger/KleosTrigger.node.ts';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as {
	name: string;
	license: string;
	keywords: string[];
	dependencies?: unknown;
	n8n: { nodes: string[]; credentials: string[] };
};

const node = new Kleos();
const trigger = new KleosTrigger();
const props = node.description.properties;

const resourceOptions = (
	props.find((p) => p.name === 'resource')!.options as INodePropertyOptions[]
).map((o) => String(o.value));
const operationProps = props.filter((p) => p.name === 'operation');

type Op = INodePropertyOptions & { routing?: INodePropertyRouting };
function operations(resource: string): Op[] {
	const p = operationProps.find((o) =>
		(o.displayOptions?.show?.resource as string[]).includes(resource),
	);
	assert.ok(p, `no operations for ${resource}`);
	return p.options as Op[];
}

/** Every request a declarative operation builds, from the OpenAPI at https://app.getkleos.ai/v1/openapi.json. */
const EXPECTED: Record<string, Record<string, { method: string; url: string }>> = {
	aiVisibility: {
		get: { method: 'GET', url: '=/v1/geo/runs/{{ $parameter.runId }}' },
		getLatest: { method: 'GET', url: '/v1/geo/runs' },
		getAll: { method: 'GET', url: '/v1/geo/runs' },
		getResults: { method: 'GET', url: '=/v1/geo/runs/{{ $parameter.runId }}/results' },
	},
	article: {
		get: { method: 'GET', url: '=/v1/articles/{{ $parameter.articleId }}' },
		getAll: { method: 'GET', url: '/v1/articles' },
		recordPublished: { method: 'PATCH', url: '=/v1/articles/{{ $parameter.articleId }}' },
	},
	business: {
		get: { method: 'GET', url: '=/v1/products/{{ $parameter.business }}' },
		getCompetitors: { method: 'GET', url: '=/v1/products/{{ $parameter.business }}/competitors' },
		getAll: { method: 'GET', url: '/v1/products' },
	},
	campaign: {
		approvePlan: { method: 'POST', url: '=/v1/campaigns/{{ $parameter.campaignId }}/approve-plan' },
		get: { method: 'GET', url: '=/v1/campaigns/{{ $parameter.campaignId }}' },
		getAll: { method: 'GET', url: '/v1/campaigns' },
		plan: { method: 'POST', url: '/v1/campaigns/plan' },
	},
	knowledgeSource: {
		create: { method: 'POST', url: '/v1/knowledge-sources' },
		getAll: { method: 'GET', url: '/v1/knowledge-sources' },
	},
	lead: {
		recordDeal: { method: 'POST', url: '/' },
		recordLead: { method: 'POST', url: '/' },
	},
	post: {
		approve: { method: 'POST', url: '=/v1/posts/{{ $parameter.postId }}/approve' },
		requestDraft: { method: 'POST', url: '/v1/posts' },
		get: { method: 'GET', url: '=/v1/posts/{{ $parameter.postId }}' },
		getAll: { method: 'GET', url: '/v1/posts' },
		recordPublished: { method: 'PATCH', url: '=/v1/posts/{{ $parameter.postId }}' },
	},
	results: {
		getAttribution: { method: 'GET', url: '=/v1/products/{{ $parameter.business }}/attribution' },
		getUsage: { method: 'GET', url: '/v1/usage' },
	},
	reviewQueue: {
		getArticles: { method: 'GET', url: '/v1/articles' },
		getPosts: { method: 'GET', url: '/v1/posts' },
	},
	suggestion: {
		approve: { method: 'POST', url: '=/v1/recommendations/{{ $parameter.suggestionId }}/approve' },
		get: { method: 'GET', url: '=/v1/recommendations/{{ $parameter.suggestionId }}' },
		getAll: { method: 'GET', url: '/v1/recommendations' },
		getOutcome: {
			method: 'GET',
			url: '=/v1/recommendations/{{ $parameter.suggestionId }}/outcome',
		},
	},
};

/** Operations that return a Kleos list envelope and must unwrap `data`. */
const LISTS = new Set([
	'aiVisibility.getAll',
	'aiVisibility.getResults',
	'article.getAll',
	'business.getAll',
	'business.getCompetitors',
	'campaign.getAll',
	'knowledgeSource.getAll',
	'post.getAll',
	'reviewQueue.getArticles',
	'reviewQueue.getPosts',
	'suggestion.getAll',
]);

describe('Kleos node', () => {
	it('is usable as an AI agent tool, with one credential per resource family', () => {
		assert.equal(node.description.usableAsTool, true);
		assert.equal(node.description.name, 'kleos');
		assert.deepEqual(
			node.description.credentials?.map((c) => c.name),
			['kleosApi', 'kleosLeadTrackingApi'],
		);
		assert.deepEqual(node.description.credentials?.[0].displayOptions, {
			hide: { resource: ['lead'] },
		});
		assert.deepEqual(node.description.credentials?.[1].displayOptions, {
			show: { resource: ['lead'] },
		});
		assert.equal(node.description.requestDefaults?.baseURL, 'https://app.getkleos.ai');
	});

	it('has an operation list for every resource, and nothing else', () => {
		assert.deepEqual([...resourceOptions].sort(), Object.keys(EXPECTED).sort());
		for (const resource of resourceOptions) operations(resource);
	});

	it('builds the request the API documents for every operation', () => {
		for (const [resource, ops] of Object.entries(EXPECTED)) {
			const found = operations(resource);
			assert.deepEqual(found.map((o) => o.value).sort(), Object.keys(ops).sort(), resource);
			for (const op of found) {
				const want = ops[String(op.value)];
				const key = `${resource}.${String(op.value)}`;
				assert.equal(op.routing?.request?.method, want.method, key);
				assert.equal(op.routing?.request?.url, want.url, key);
				assert.ok(op.action, `${key} has no action`);
				assert.ok(op.description, `${key} has no description`);
			}
		}
	});

	it('unwraps list envelopes and leaves single objects alone', () => {
		for (const resource of resourceOptions) {
			for (const op of operations(resource)) {
				const key = `${resource}.${String(op.value)}`;
				const post = op.routing?.output?.postReceive ?? [];
				const unwraps = post.some(
					(a) =>
						typeof a === 'object' && a.type === 'rootProperty' && a.properties.property === 'data',
				);
				assert.equal(unwraps, LISTS.has(key), key);
			}
		}
	});

	it('pins the review queue to posts and articles awaiting approval', () => {
		for (const op of operations('reviewQueue')) {
			assert.deepEqual(op.routing?.request?.qs, { status: 'pending_approval' }, String(op.value));
		}
	});

	it('asks for the newest run only when getting the latest AI visibility report', () => {
		const latest = operations('aiVisibility').find((o) => o.value === 'getLatest')!;
		assert.deepEqual(latest.routing?.request?.qs, { limit: 1 });
		assert.equal(typeof latest.routing?.output?.postReceive?.[0], 'function');
	});

	it('marks lead and deal records with their type', () => {
		for (const op of operations('lead')) {
			assert.deepEqual(op.routing?.request?.body, {
				type: op.value === 'recordLead' ? 'lead' : 'deal',
			});
		}
	});

	it('shows every field only for a real resource and operation', () => {
		const seen = new Map<string, Set<string>>();
		for (const resource of resourceOptions)
			seen.set(resource, new Set(operations(resource).map((o) => String(o.value))));
		for (const p of props) {
			if (p.name === 'resource' || p.name === 'operation') continue;
			const show = p.displayOptions?.show as
				| { resource?: string[]; operation?: string[] }
				| undefined;
			assert.ok(show?.resource?.length, `${p.name} is not scoped to a resource`);
			assert.ok(show.operation?.length, `${p.name} is not scoped to an operation`);
			for (const r of show.resource) {
				assert.ok(seen.has(r), `${p.name}: unknown resource ${r}`);
				for (const o of show.operation)
					assert.ok(seen.get(r)!.has(o), `${p.name}: ${r} has no operation ${o}`);
			}
		}
	});

	it('paginates lists by cursor and caps the page at 100', () => {
		const returnAll = props.filter((p) => p.name === 'returnAll');
		assert.ok(returnAll.length >= 1);
		for (const p of returnAll) {
			const pagination = p.routing?.operations?.pagination as {
				type: string;
				properties: { continue: string; request: { qs: Record<string, string> } };
			};
			assert.equal(pagination.type, 'generic');
			assert.equal(pagination.properties.continue, '={{ $response.body.has_more === true }}');
			assert.equal(pagination.properties.request.qs.cursor, '={{ $response.body.next_cursor }}');
			assert.equal(p.routing?.send?.value, '100');
		}
		for (const p of props.filter((p) => p.name === 'limit')) {
			assert.equal(p.typeOptions?.maxValue, 100);
			assert.equal(p.routing?.send?.property, 'limit');
		}
	});

	it('sends every body and query field under the name the API expects', () => {
		const sent = new Set<string>();
		const walk = (list: INodeProperties[]) => {
			for (const p of list) {
				const send = p.routing?.send;
				if (send?.property) sent.add(send.property);
				if (Array.isArray(p.options)) walk(p.options as INodeProperties[]);
			}
		};
		walk(props);
		for (const name of [
			'product_id',
			'topic',
			'scheduled_at',
			'slot_id',
			'comment',
			'external_url',
			'request',
			'url',
			'title',
			'status',
			'channel',
			'days',
			'limit',
			'id',
			'landing_url',
			'utm',
			'stage',
			'amount',
			'currency',
			'won',
			'closed_at',
			'lead_id',
			'occurred_at',
		]) {
			assert.ok(sent.has(name), `nothing sends ${name}`);
		}
	});

	it('loads businesses and channels for the dropdowns', () => {
		assert.deepEqual(Object.keys(node.methods!.loadOptions!).sort(), [
			'getBusinesses',
			'getChannels',
		]);
		assert.deepEqual(Object.keys(node.methods!.credentialTest!), ['kleosLeadTrackingApiTest']);
	});
});

describe('Kleos Trigger', () => {
	it('offers exactly the events Kleos sends', () => {
		const fromApi = [
			'draft.created',
			'draft.approved',
			'draft.revision_requested',
			'post.scheduled',
			'post.published',
			'post.failed',
			'article.approved',
			'article.published',
			'newsletter.approved',
			'newsletter.sent',
			'calendar.replenished',
			'geo_report.ready',
			'recommendation.created',
			'recommendation.outcome',
			'lead.attributed',
			'campaign.planned',
			'usage.limit_reached',
			'automation.fired',
		];
		assert.deepEqual(EVENT_OPTIONS.map((e) => e.value).sort(), [...fromApi].sort());
		const names = EVENT_OPTIONS.map((e) => e.name);
		assert.deepEqual(names, [...names].sort(), 'events are listed alphabetically');
	});

	it('is a webhook trigger on the Kleos API credential', () => {
		assert.deepEqual(trigger.description.group, ['trigger']);
		assert.deepEqual(trigger.description.inputs, []);
		assert.deepEqual(
			trigger.description.credentials?.map((c) => c.name),
			['kleosApi'],
		);
		assert.equal(trigger.description.webhooks?.[0].httpMethod, 'POST');
		assert.deepEqual(Object.keys(trigger.webhookMethods!.default!).sort(), [
			'checkExists',
			'create',
			'delete',
		]);
		assert.equal(typeof trigger.webhook, 'function');
	});

	it('asks for the signing secret only when registering by hand', () => {
		const secret = trigger.description.properties.find((p) => p.name === 'secret')!;
		assert.deepEqual(secret.displayOptions, { show: { registration: ['manual'] } });
		assert.equal(secret.typeOptions?.password, true);
	});
});

describe('credentials', () => {
	it('send the API key as a bearer token and test it with a cheap read', () => {
		const c = new KleosApi();
		assert.equal(c.name, 'kleosApi');
		assert.deepEqual(c.authenticate.properties, {
			headers: { Authorization: '=Bearer {{$credentials.apiKey}}' },
		});
		assert.equal(c.test.request.baseURL, 'https://app.getkleos.ai');
		assert.equal(c.test.request.url, '/v1/usage');
		assert.equal(c.properties[0].typeOptions?.password, true);
	});

	it('sign lead-tracking requests in code', () => {
		const c = new KleosLeadTrackingApi();
		assert.equal(c.name, 'kleosLeadTrackingApi');
		assert.equal(typeof c.authenticate, 'function');
		assert.deepEqual(
			c.properties.map((p) => p.name),
			['endpointUrl', 'secret'],
		);
	});
});

describe('package.json', () => {
	it('registers both nodes and both credentials for n8n', () => {
		assert.equal(pkg.name, 'n8n-nodes-kleos');
		assert.ok(pkg.keywords.includes('n8n-community-node-package'));
		assert.deepEqual(pkg.n8n.nodes, [
			'dist/nodes/Kleos/Kleos.node.js',
			'dist/nodes/KleosTrigger/KleosTrigger.node.js',
		]);
		assert.deepEqual(pkg.n8n.credentials, [
			'dist/credentials/KleosApi.credentials.js',
			'dist/credentials/KleosLeadTrackingApi.credentials.js',
		]);
		assert.equal(pkg.dependencies, undefined, 'verified nodes carry no runtime dependencies');
		assert.equal(pkg.license, 'MIT');
	});
});
