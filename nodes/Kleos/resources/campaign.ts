import type { INodeProperties } from 'n8n-workflow';
import {
	businessFilter,
	businessSelect,
	filters,
	idField,
	listFields,
	statusFilter,
	unwrapList,
} from '../shared/descriptions';

const resource = ['campaign'];

export const campaignDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource } },
		options: [
			{
				name: 'Approve Plan',
				value: 'approvePlan',
				action: 'Approve a campaign plan',
				description:
					'Put a planned campaign on the calendar. Nothing is scheduled until the plan is approved.',
				routing: {
					request: {
						method: 'POST',
						url: '=/v1/campaigns/{{ $parameter.campaignId }}/approve-plan',
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a campaign',
				description:
					'One campaign: its objective, dates, channels, how many pieces are planned, in review, approved and published, and any plan waiting for approval',
				routing: { request: { method: 'GET', url: '=/v1/campaigns/{{ $parameter.campaignId }}' } },
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many campaigns',
				description: 'Campaigns across the workspace, filtered by business or status',
				routing: { request: { method: 'GET', url: '/v1/campaigns' }, output: unwrapList },
			},
			{
				name: 'Plan From a Sentence',
				value: 'plan',
				action: 'Plan a campaign from a sentence',
				description:
					'Describe a campaign in a sentence and Kleos plans the posts: channels, dates, times and topics. The plan waits for approval.',
				routing: { request: { method: 'POST', url: '/v1/campaigns/plan' } },
			},
		],
		default: 'getAll',
	},
	idField(
		'Campaign ID',
		'campaignId',
		{ resource, operation: ['get', 'approvePlan'] },
		'The ID of the campaign (from Get Many, Plan From a Sentence or a campaign.planned event)',
	),
	businessSelect({ resource, operation: ['plan'] }, 'body'),
	{
		displayName: 'Request',
		name: 'request',
		type: 'string',
		default: '',
		required: true,
		typeOptions: { rows: 3 },
		placeholder:
			'e.g. Three LinkedIn posts and one newsletter over the two weeks before our 12 December webinar on year-end close',
		displayOptions: { show: { resource, operation: ['plan'] } },
		description: 'The campaign in a sentence: what, where, when and why (12 to 800 characters)',
		routing: { send: { type: 'body', property: 'request' } },
	},
	...listFields({ resource, operation: ['getAll'] }),
	businessFilter({ resource, operation: ['getAll'] }),
	filters({ resource, operation: ['getAll'] }, [
		statusFilter('Only campaigns with this status: draft, active, paused or completed'),
	]),
];
