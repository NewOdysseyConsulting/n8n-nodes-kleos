import type { INodeProperties } from 'n8n-workflow';
import {
	businessFilter,
	businessSelect,
	channelFilter,
	filters,
	idField,
	listFields,
	statusFilter,
	unwrapList,
} from '../shared/descriptions';

const resource = ['post'];

export const postDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource } },
		options: [
			{
				name: 'Approve',
				value: 'approve',
				action: 'Approve a post',
				description:
					'Approve a post that is awaiting review. Kleos then schedules it on its connected channel, or leaves it for you to publish.',
				routing: {
					request: { method: 'POST', url: '=/v1/posts/{{ $parameter.postId }}/approve' },
				},
			},
			{
				name: 'Ask Kleos to Draft',
				value: 'requestDraft',
				action: 'Request a post draft',
				description:
					'Ask Kleos to write a post about a topic for a business. Returns a calendar slot ID; the draft appears on the slot (post_id) within a few minutes and is announced by the draft.created webhook.',
				routing: { request: { method: 'POST', url: '/v1/posts' } },
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a post',
				description: 'One post with its hook, body, hashtags, call to action, status and schedule',
				routing: { request: { method: 'GET', url: '=/v1/posts/{{ $parameter.postId }}' } },
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many posts',
				description: 'Posts across the workspace, filtered by business, status or channel',
				routing: { request: { method: 'GET', url: '/v1/posts' }, output: unwrapList },
			},
			{
				name: 'Record as Published',
				value: 'recordPublished',
				action: 'Record a post as published',
				description:
					'Tell Kleos an approved post went out somewhere Kleos does not publish itself, with its live address',
				routing: { request: { method: 'PATCH', url: '=/v1/posts/{{ $parameter.postId }}' } },
			},
		],
		default: 'getAll',
	},

	// get, approve, recordPublished
	idField(
		'Post ID',
		'postId',
		{ resource, operation: ['get', 'approve', 'recordPublished'] },
		'The ID of the post (from Get Many, the review queue or a Kleos Trigger event)',
	),
	{
		displayName: 'Comment',
		name: 'comment',
		type: 'string',
		default: '',
		displayOptions: { show: { resource, operation: ['approve'] } },
		description: 'A note kept with the approval, up to 1000 characters',
		routing: { send: { type: 'body', property: 'comment' } },
	},
	{
		displayName: 'Live URL',
		name: 'externalUrl',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'https://www.linkedin.com/posts/…',
		displayOptions: { show: { resource, operation: ['recordPublished'] } },
		description: 'The https address of the published post',
		routing: { send: { type: 'body', property: 'external_url' } },
	},

	// requestDraft
	businessSelect({ resource, operation: ['requestDraft'] }, 'body'),
	{
		displayName: 'Topic',
		name: 'topic',
		type: 'string',
		default: '',
		required: true,
		typeOptions: { rows: 3 },
		placeholder: 'e.g. Why month-end closes slip, and the one habit that fixes it',
		displayOptions: { show: { resource, operation: ['requestDraft'] } },
		description: 'What the post should be about, in your own words (up to 500 characters)',
		routing: { send: { type: 'body', property: 'topic' } },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource, operation: ['requestDraft'] } },
		options: [
			{
				displayName: 'Scheduled At',
				name: 'scheduled_at',
				type: 'dateTime',
				default: '',
				description:
					'When the post should go out. Defaults to tomorrow. Ignored when a Slot ID is given.',
				routing: { send: { type: 'body', property: 'scheduled_at' } },
			},
			{
				displayName: 'Slot ID',
				name: 'slot_id',
				type: 'string',
				default: '',
				description: 'Draft into an existing planned calendar slot instead of adding a new one',
				routing: { send: { type: 'body', property: 'slot_id' } },
			},
		],
	},

	// getAll
	...listFields({ resource, operation: ['getAll'] }),
	businessFilter({ resource, operation: ['getAll'] }),
	filters({ resource, operation: ['getAll'] }, [
		channelFilter(),
		statusFilter(
			'Only posts with this status, for example pending_approval, approved, scheduled, published, needs_revision or validation_failed',
		),
	]),
];
