import type { INodeProperties } from 'n8n-workflow';
import {
	businessFilter,
	filters,
	idField,
	listFields,
	statusFilter,
	unwrapList,
} from '../shared/descriptions';

const resource = ['suggestion'];

/** Growth suggestions (the API calls them recommendations). */
export const suggestionDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource } },
		options: [
			{
				name: 'Do This for Me',
				value: 'approve',
				action: 'Carry out a suggestion',
				description:
					'Approve a growth suggestion so Kleos carries it out. Only suggestions with can_do_for_me set can be approved; the rest are things to do yourself.',
				routing: {
					request: {
						method: 'POST',
						url: '=/v1/recommendations/{{ $parameter.suggestionId }}/approve',
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a suggestion',
				description:
					'One growth suggestion with its rationale, evidence, expected impact, effort and outcome so far',
				routing: {
					request: { method: 'GET', url: '=/v1/recommendations/{{ $parameter.suggestionId }}' },
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many suggestions',
				description: 'Growth suggestions Kleos has made, highest priority first',
				routing: { request: { method: 'GET', url: '/v1/recommendations' }, output: unwrapList },
			},
			{
				name: 'Get Outcome',
				value: 'getOutcome',
				action: 'Get the outcome of a suggestion',
				description:
					'What happened after a suggestion was carried out: the metric, its baseline and the verdict at 14, 30 and 60 days',
				routing: {
					request: {
						method: 'GET',
						url: '=/v1/recommendations/{{ $parameter.suggestionId }}/outcome',
					},
				},
			},
		],
		default: 'getAll',
	},
	idField(
		'Suggestion ID',
		'suggestionId',
		{ resource, operation: ['get', 'approve', 'getOutcome'] },
		'The ID of the suggestion (from Get Many or a recommendation.created event)',
	),
	...listFields({ resource, operation: ['getAll'] }),
	businessFilter({ resource, operation: ['getAll'] }),
	filters({ resource, operation: ['getAll'] }, [
		statusFilter(
			'Only suggestions with this status: proposed, approved, executing, rejected or superseded',
		),
	]),
];
