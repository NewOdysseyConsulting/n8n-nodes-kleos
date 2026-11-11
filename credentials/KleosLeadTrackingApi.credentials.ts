import type {
	IAuthenticate,
	Icon,
	ICredentialDataDecryptedObject,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';
import { signLeadRequest } from '../nodes/Kleos/shared/leadSigning';

/**
 * The per-business "send leads and revenue from any CRM or form" endpoint (Kleos: Results → Leads → Lead tracking).
 * It is not an API-key endpoint: each request is signed with the endpoint's own secret, so this is its own credential.
 */
export class KleosLeadTrackingApi implements ICredentialType {
	name = 'kleosLeadTrackingApi';

	displayName = 'Kleos Lead Tracking API';

	icon: Icon = { light: 'file:../icons/kleos.svg', dark: 'file:../icons/kleos.svg' };

	documentationUrl = 'https://github.com/NewOdysseyConsulting/n8n-nodes-kleos#lead-tracking-credential';

	properties: INodeProperties[] = [
		{
			displayName: 'Endpoint URL',
			name: 'endpointUrl',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'https://app.getkleos.ai/api/inbound/leads/…',
			description:
				'The endpoint address shown in Kleos under Results → Leads → Lead tracking when you add an endpoint for the business',
		},
		{
			displayName: 'Signing Secret',
			name: 'secret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			placeholder: 'whsec_…',
			description:
				'The secret Kleos showed once when the endpoint was created or its secret rotated',
		},
	];

	authenticate: IAuthenticate = async (
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> =>
		signLeadRequest(
			{
				endpointUrl: String(credentials.endpointUrl ?? ''),
				secret: String(credentials.secret ?? ''),
			},
			requestOptions,
		);
}
