import type { INodeProperties } from 'n8n-workflow';
import { businessSelect } from '../shared/descriptions';

const resource = ['results'];

export const resultsDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource } },
		options: [
			{
				name: 'Get Attribution',
				value: 'getAttribution',
				action: 'Get the attribution summary of a business',
				description:
					'Sessions, engaged sessions, key events, revenue, leads and deals traced to Kleos content, in total and per campaign, over a period',
				routing: {
					request: { method: 'GET', url: '=/v1/products/{{ $parameter.business }}/attribution' },
				},
			},
			{
				name: 'Get Usage',
				value: 'getUsage',
				action: 'Get the workspace usage',
				description:
					'The plan and what the workspace has used of each allowance this billing period',
				routing: { request: { method: 'GET', url: '/v1/usage' } },
			},
		],
		default: 'getAttribution',
	},
	businessSelect({ resource, operation: ['getAttribution'] }, 'none'),
	{
		displayName: 'Days',
		name: 'days',
		type: 'number',
		default: 90,
		typeOptions: { minValue: 7, maxValue: 365 },
		displayOptions: { show: { resource, operation: ['getAttribution'] } },
		description: 'How far back to look, 7 to 365 days',
		routing: { send: { type: 'query', property: 'days' } },
	},
];
