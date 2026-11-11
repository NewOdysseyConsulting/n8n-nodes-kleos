import type { INodeProperties } from 'n8n-workflow';
import { businessFilter, businessSelect, listFields, unwrapList } from '../shared/descriptions';

const resource = ['knowledgeSource'];

export const knowledgeSourceDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource } },
		options: [
			{
				name: 'Add Web Page',
				value: 'create',
				action: 'Add a web page as a knowledge source',
				description:
					'Give Kleos a public web page to write from. It stays unverified until someone verifies it in the app; Kleos writes only from verified sources.',
				routing: { request: { method: 'POST', url: '/v1/knowledge-sources' } },
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many knowledge sources',
				description:
					'The pages, documents and notes Kleos can write from, and whether each is verified',
				routing: { request: { method: 'GET', url: '/v1/knowledge-sources' }, output: unwrapList },
			},
		],
		default: 'getAll',
	},
	businessSelect({ resource, operation: ['create'] }, 'body'),
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'https://example.com/guides/…',
		displayOptions: { show: { resource, operation: ['create'] } },
		description: 'A public http or https page',
		routing: { send: { type: 'body', property: 'url' } },
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		displayOptions: { show: { resource, operation: ['create'] } },
		description: "A name for the source. Defaults to the page's own title.",
		routing: { send: { type: 'body', property: 'title' } },
	},
	...listFields({ resource, operation: ['getAll'] }),
	businessFilter({ resource, operation: ['getAll'] }),
];
