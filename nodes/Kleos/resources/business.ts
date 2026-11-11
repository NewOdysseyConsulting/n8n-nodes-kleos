import type { INodeProperties } from 'n8n-workflow';
import { businessSelect, listFields, unwrapList } from '../shared/descriptions';

const resource = ['business'];

export const businessDescription: INodeProperties[] = [
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
				action: 'Get a business',
				description:
					'One business: its name, domain, positioning, target markets and autopilot settings',
				routing: { request: { method: 'GET', url: '=/v1/products/{{ $parameter.business }}' } },
			},
			{
				name: 'Get Competitors',
				value: 'getCompetitors',
				action: 'Get the competitors of a business',
				description:
					'The competitors Kleos tracks for a business, with how many keywords each ranks for',
				routing: {
					request: { method: 'GET', url: '=/v1/products/{{ $parameter.business }}/competitors' },
					output: unwrapList,
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many businesses',
				description: 'Every business (brand, product or client) in the workspace',
				routing: { request: { method: 'GET', url: '/v1/products' }, output: unwrapList },
			},
		],
		default: 'getAll',
	},
	businessSelect({ resource, operation: ['get', 'getCompetitors'] }, 'none'),
	...listFields({ resource, operation: ['getAll'] }),
];
