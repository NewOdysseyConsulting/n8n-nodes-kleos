import type {
	IDataObject,
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-workflow';

export const KLEOS_BASE_URL = 'https://app.getkleos.ai';

/** One authenticated call to the Kleos API, for the parts that are not declarative (dropdowns, the trigger, follow-up reads). */
export async function kleosApiRequest(
	this:
		| IHookFunctions
		| IExecuteFunctions
		| IExecuteSingleFunctions
		| ILoadOptionsFunctions
		| IWebhookFunctions,
	method: IHttpRequestMethods,
	path: string,
	qs: IDataObject = {},
	body?: IDataObject,
): Promise<IDataObject> {
	const options: IHttpRequestOptions = {
		method,
		url: `${KLEOS_BASE_URL}${path}`,
		qs,
		json: true,
		headers: { Accept: 'application/json' },
	};
	if (body !== undefined) options.body = body;
	return (await this.helpers.httpRequestWithAuthentication.call(
		this,
		'kleosApi',
		options,
	)) as IDataObject;
}
