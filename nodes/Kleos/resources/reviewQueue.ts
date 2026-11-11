import type { INodeProperties } from 'n8n-workflow';
import {
	businessFilter,
	channelFilter,
	filters,
	listFields,
	unwrapList,
} from '../shared/descriptions';

const resource = ['reviewQueue'];

/** What is waiting for a person: posts and articles with status pending_approval. */
export const reviewQueueDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource } },
		options: [
			{
				name: 'Get Articles Awaiting Review',
				value: 'getArticles',
				action: 'Get articles awaiting review',
				description: 'Articles that are drafted and waiting for someone to approve them',
				routing: {
					request: { method: 'GET', url: '/v1/articles', qs: { status: 'pending_approval' } },
					output: unwrapList,
				},
			},
			{
				name: 'Get Posts Awaiting Review',
				value: 'getPosts',
				action: 'Get posts awaiting review',
				description: 'Posts that are drafted and waiting for someone to approve them',
				routing: {
					request: { method: 'GET', url: '/v1/posts', qs: { status: 'pending_approval' } },
					output: unwrapList,
				},
			},
		],
		default: 'getPosts',
	},
	...listFields({ resource, operation: ['getPosts', 'getArticles'] }),
	businessFilter({ resource, operation: ['getPosts', 'getArticles'] }),
	filters({ resource, operation: ['getPosts'] }, [channelFilter()]),
];
