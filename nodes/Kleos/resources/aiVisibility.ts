import type {
	IExecuteSingleFunctions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import {
	businessFilter,
	businessSelect,
	idField,
	isRecord,
	listFields,
	unwrapList,
} from '../shared/descriptions';
import { kleosApiRequest } from '../shared/transport';

const resource = ['aiVisibility'];

/** The newest run came back as a one-item list; fetch its detail so the item carries the summary (mentioned, recommended, cited, competitors). */
async function latestRunDetail(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const body = response.body;
	const first = isRecord(body) && Array.isArray(body.data) ? body.data[0] : undefined;
	if (!isRecord(first) || typeof first.id !== 'string') return [];
	const detail = await kleosApiRequest.call(this, 'GET', `/v1/geo/runs/${first.id}`);
	return [{ json: detail }];
}

export const aiVisibilityDescription: INodeProperties[] = [
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
				action: 'Get an AI visibility run',
				description:
					'One run with its summary: how often AI assistants mentioned, recommended and cited the business, and which competitors came up',
				routing: { request: { method: 'GET', url: '=/v1/geo/runs/{{ $parameter.runId }}' } },
			},
			{
				name: 'Get Latest',
				value: 'getLatest',
				action: 'Get the latest AI visibility run of a business',
				description:
					'The most recent run for a business, with its summary. Empty when the business has not been checked yet.',
				routing: {
					request: { method: 'GET', url: '/v1/geo/runs', qs: { limit: 1 } },
					output: { postReceive: [latestRunDetail] },
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many AI visibility runs',
				description: 'Runs across the workspace, newest first',
				routing: { request: { method: 'GET', url: '/v1/geo/runs' }, output: unwrapList },
			},
			{
				name: 'Get Results',
				value: 'getResults',
				action: 'Get the results of an AI visibility run',
				description:
					'Every question checked in a run: which assistant answered, whether it mentioned, recommended or cited the business, and which competitors and domains it named',
				routing: {
					request: { method: 'GET', url: '=/v1/geo/runs/{{ $parameter.runId }}/results' },
					output: unwrapList,
				},
			},
		],
		default: 'getLatest',
	},
	idField(
		'Run ID',
		'runId',
		{ resource, operation: ['get', 'getResults'] },
		'The ID of the run (from Get Many, Get Latest or a geo_report.ready event)',
	),
	businessSelect({ resource, operation: ['getLatest'] }, 'query'),
	...listFields({ resource, operation: ['getAll', 'getResults'] }),
	businessFilter({ resource, operation: ['getAll'] }),
];
