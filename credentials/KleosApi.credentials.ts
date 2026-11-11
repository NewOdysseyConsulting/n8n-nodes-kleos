import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class KleosApi implements ICredentialType {
	name = 'kleosApi';

	displayName = 'Kleos API';

	icon: Icon = { light: 'file:../icons/kleos.svg', dark: 'file:../icons/kleos.svg' };

	documentationUrl = 'https://github.com/NewOdysseyConsulting/n8n-nodes-kleos#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			placeholder: 'kleos_…',
			description:
				'A workspace API key from Kleos: Settings → API → Create key (admins and owners on Growth and Pro plans). A read key can list and get; a write key can also ask for drafts, approve, record what was published and manage webhooks.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	// The API has no GET /me; usage is the cheapest authenticated read that every key scope can make.
	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://app.getkleos.ai',
			url: '/v1/usage',
			method: 'GET',
		},
	};
}
