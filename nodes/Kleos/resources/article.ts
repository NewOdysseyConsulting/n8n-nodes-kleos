import type { INodeProperties } from 'n8n-workflow';
import {
	businessFilter,
	filters,
	idField,
	listFields,
	statusFilter,
	unwrapList,
} from '../shared/descriptions';

const resource = ['article'];

export const articleDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource } },
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get an article',
				description:
					'One article with its full text as Markdown, title, slug, keyword, meta title and description and FAQ',
				routing: { request: { method: 'GET', url: '=/v1/articles/{{ $parameter.articleId }}' } },
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many articles',
				description: 'Articles across the workspace, filtered by business or status',
				routing: { request: { method: 'GET', url: '/v1/articles' }, output: unwrapList },
			},
			{
				name: 'Record as Published',
				value: 'recordPublished',
				action: 'Record an article as published',
				description:
					'Tell Kleos an approved article is live on your website, with its address. Kleos marks it published and starts checking that Google indexes it.',
				routing: { request: { method: 'PATCH', url: '=/v1/articles/{{ $parameter.articleId }}' } },
			},
		],
		default: 'getAll',
	},

	idField(
		'Article ID',
		'articleId',
		{ resource, operation: ['get', 'recordPublished'] },
		'The ID of the article (from Get Many, the review queue or an article.approved event)',
	),
	{
		displayName: 'Live URL',
		name: 'externalUrl',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'https://example.com/blog/…',
		displayOptions: { show: { resource, operation: ['recordPublished'] } },
		description: 'The https address of the page on your website',
		routing: { send: { type: 'body', property: 'external_url' } },
	},

	...listFields({ resource, operation: ['getAll'] }),
	businessFilter({ resource, operation: ['getAll'] }),
	filters({ resource, operation: ['getAll'] }, [
		statusFilter(
			'Only articles with this status, for example pending_approval, approved or published',
		),
	]),
];
