# n8n-nodes-kleos

An [n8n](https://n8n.io) community node for [Kleos](https://getkleos.ai), the AI marketing employee for small businesses. Kleos plans, writes, checks and publishes posts, articles and newsletters, tracks what they bring in, and checks how often AI assistants recommend you.

The package has two nodes:

- **Kleos**: read and act on your workspace (businesses, posts, articles, the review queue, campaigns, suggestions, knowledge sources, results, AI visibility) and send leads and deals for attribution. Usable as a tool by n8n AI agents.
- **Kleos Trigger**: start a workflow when something happens in Kleos (a draft is ready, a post went out, an article was approved with its full text, a lead was traced to content, and more). Every event is signature-checked.

It uses the public Kleos API at `https://app.getkleos.ai/v1` ([OpenAPI](https://app.getkleos.ai/v1/openapi.json)) and has no runtime dependencies.

## Install

**n8n Cloud and self-hosted (recommended):** Settings → Community nodes → Install → enter `n8n-nodes-kleos` → Install. Once the node is verified by n8n it also appears in the nodes panel without this step.

**Self-hosted, by hand:**

```bash
cd ~/.n8n/nodes   # or wherever N8N_USER_FOLDER/nodes is
npm install n8n-nodes-kleos
# restart n8n
```

Needs n8n 1.x or later. The trigger needs n8n's webhook address to be a public `https://` URL (set `WEBHOOK_URL`), because Kleos only sends events to public https addresses.

## Credentials

### Kleos API

1. In Kleos go to **Settings → API** (admins and owners, Growth and Pro plans) and create a key. A **read** key can list and get; a **write** key can also ask for drafts, approve, record what was published and, for the trigger, add webhook endpoints.
2. In n8n add a **Kleos API** credential and paste the key (`kleos_…`). The test calls `GET /v1/usage`.

Keys are limited to 60 requests per minute. Rate-limited requests fail with `429` and a `Retry-After` header; n8n's retry settings on the node handle this.

### Kleos Lead Tracking (for the Lead resource only)

Leads and deals go to a per-business endpoint signed with its own secret, not with the API key.

1. In Kleos go to **Results → Leads → Lead tracking** for the business and add an endpoint. Copy its **URL** and its **secret** (shown once).
2. In n8n add a **Kleos Lead Tracking** credential with both. The test sends a signed, empty request; Kleos answers "No events in the request", which proves the signature.

Kleos keeps no names or contact details. Send your CRM's own ID and the campaign tags, nothing personal; anything that looks like personal data is dropped and never stored.

## Kleos node: resources and operations

| Resource | Operation | What it does | API |
| --- | --- | --- | --- |
| Business | Get Many | Every business in the workspace | `GET /v1/products` |
| Business | Get | One business with its settings | `GET /v1/products/{id}` |
| Business | Get Competitors | Competitors Kleos tracks for it | `GET /v1/products/{id}/competitors` |
| Post | Ask Kleos to Draft | Draft a post about a topic (returns the calendar slot; the draft follows within minutes) | `POST /v1/posts` |
| Post | Get Many | Posts, filtered by business, status, channel | `GET /v1/posts` |
| Post | Get | One post | `GET /v1/posts/{id}` |
| Post | Approve | Approve a post awaiting review | `POST /v1/posts/{id}/approve` |
| Post | Record as Published | Tell Kleos where a post went live | `PATCH /v1/posts/{id}` |
| Article | Get Many | Articles, filtered by business, status | `GET /v1/articles` |
| Article | Get | One article with its Markdown body and FAQ | `GET /v1/articles/{id}` |
| Article | Record as Published | Tell Kleos the article's live URL | `PATCH /v1/articles/{id}` |
| Review Queue | Get Posts Awaiting Review | Posts with status `pending_approval` | `GET /v1/posts?status=pending_approval` |
| Review Queue | Get Articles Awaiting Review | Articles with status `pending_approval` | `GET /v1/articles?status=pending_approval` |
| Lead | Record Lead | A lead from your CRM or form, for attribution | lead-tracking endpoint |
| Lead | Record Deal | A deal, its value and whether it was won | lead-tracking endpoint |
| Result | Get Attribution | Sessions, leads, deals and revenue traced to content, per campaign | `GET /v1/products/{id}/attribution` |
| Result | Get Usage | Plan allowances used this period | `GET /v1/usage` |
| AI Visibility | Get Latest | The newest run for a business, with its summary | `GET /v1/geo/runs` + `GET /v1/geo/runs/{id}` |
| AI Visibility | Get Many | Runs across the workspace | `GET /v1/geo/runs` |
| AI Visibility | Get | One run with its summary | `GET /v1/geo/runs/{id}` |
| AI Visibility | Get Results | Every question checked in a run | `GET /v1/geo/runs/{id}/results` |
| Campaign | Plan From a Sentence | Kleos plans the posts; the plan waits for approval | `POST /v1/campaigns/plan` |
| Campaign | Approve Plan | Put the plan on the calendar | `POST /v1/campaigns/{id}/approve-plan` |
| Campaign | Get Many / Get | Campaigns and their counts | `GET /v1/campaigns`, `GET /v1/campaigns/{id}` |
| Suggestion | Get Many / Get | Growth suggestions, highest priority first | `GET /v1/recommendations`, `…/{id}` |
| Suggestion | Do This for Me | Kleos carries the suggestion out | `POST /v1/recommendations/{id}/approve` |
| Suggestion | Get Outcome | What changed at 14, 30 and 60 days | `GET /v1/recommendations/{id}/outcome` |
| Knowledge Source | Add Web Page / Get Many | Pages Kleos may write from | `POST`/`GET /v1/knowledge-sources` |

Lists return one item per record. **Return All** follows Kleos's cursor pagination; **Limit** caps the count (up to 100 per page). The **Business** dropdown lists the workspace's businesses; the **Channel** dropdown shows the channels on the chosen business's calendar.

### Not in the API yet

These are deliberately absent because Kleos has no endpoint for them. They are done in the Kleos app:

- Writing a post in your own words (the API drafts from a topic; "Ask Kleos to Draft" is the closest).
- Scheduling a post at a new time after it was drafted (choose **Scheduled At** when asking for the draft; approving an approved post schedules it per the business's settings).
- Drafting or approving an **article** (approve under Review in the app; the trigger's `article.approved` event then hands you the full text).
- Starting an AI visibility run (runs happen on Kleos's schedule; `geo_report.ready` tells you when one is done).

## Use as an AI agent tool

The Kleos node has `usableAsTool` set, so it appears under **Tools** when you build an **AI Agent** workflow. Add it as a tool, choose a resource and operation, and let the agent fill the parameters (use *Let the model decide* on fields such as Topic, Business or Post ID). Every operation carries a plain-English description, so an agent given "what is waiting for my approval in Kleos?" picks Review Queue → Get Posts Awaiting Review, and "ask Kleos for a LinkedIn post about our new pricing" picks Post → Ask Kleos to Draft.

Give the agent a **read** key unless you want it to approve or draft; writes cost the same credits as in the app.

## Kleos Trigger

Add **Kleos Trigger**, choose the events, and activate the workflow. The node receives one item per event: the envelope `{ id, type, version, created_at, workspace_id, business_id, data }` where `data` is the post, article (with full text), newsletter, lead, run or suggestion the event is about.

Events: `draft.created`, `draft.approved`, `draft.revision_requested`, `post.scheduled`, `post.published`, `post.failed`, `article.approved`, `article.published`, `newsletter.approved`, `newsletter.sent`, `calendar.replenished`, `geo_report.ready`, `recommendation.created`, `recommendation.outcome`, `lead.attributed`, `campaign.planned`, `usage.limit_reached`, `automation.fired`.

**Registration**

- **Automatic** (default): when the workflow is activated the node calls `POST /v1/webhooks` with its own address and the chosen events, keeps the endpoint's id and signing secret in the workflow's static data, and removes the endpoint when the workflow is deactivated. Needs a write key from an admin or owner (the `workspace` capability).
- **Manual**: add n8n's webhook URL yourself under Kleos **Settings → API → Webhooks**, choose the events there, and paste the endpoint's secret into the node. Use this when the key cannot manage webhooks, or when several workflows share one endpoint.

**Signature check.** Every request must carry valid [Standard Webhooks](https://www.standardwebhooks.com) headers (`webhook-id`, `webhook-timestamp`, `webhook-signature`, HMAC-SHA256 with the endpoint secret). Requests with a bad or missing signature, or a timestamp more than five minutes off, are answered `401` and never start the workflow. During a secret rotation Kleos signs with both secrets, and either is accepted.

**Options.** *Business* starts the workflow only for events about one business. *Include Test Events* lets "Send test event" in Kleos (type `webhook.test`) start it too; by default a test event is acknowledged but ignored.

Kleos retries undelivered events for about a day (the same `webhook-id` each time), so a workflow that fails can see an event twice. Use `{{ $json.id }}` to skip ones you have handled.

## Example workflows

**Publish every approved article to your website**

1. Kleos Trigger: `article.approved`.
2. Your CMS node (WordPress, Ghost, Webflow, Notion, a database): create the page from `{{ $json.data.title }}`, `{{ $json.data.body_html }}` (or `body_md`), `{{ $json.data.meta_description }}`, `{{ $json.data.slug }}`.
3. Kleos → Article → Record as Published with the article ID `{{ $('Kleos Trigger').item.json.data.id }}` and the page's URL. Kleos marks it published, sends `article.published`, and checks that Google indexes it.

**A morning message with what is waiting for you**

1. Schedule Trigger (weekdays, 08:00).
2. Kleos → Review Queue → Get Posts Awaiting Review (Return All).
3. Slack or email: one line per item with `{{ $json.channel }}`, `{{ $json.hook }}` and a link to `https://app.getkleos.ai/review`.

**Leads from HubSpot to Kleos attribution**

1. HubSpot Trigger: contact created.
2. Kleos → Lead → Record Lead with External ID `{{ $json.id }}`, Landing URL `{{ $json.properties.hs_analytics_first_url }}` (and Stage if you have it).
3. Later, for deals: Kleos → Lead → Record Deal with the amount, currency and whether it was won. Results → Get Attribution then shows revenue by the content that brought the lead.

**An AI agent that runs your marketing inbox**

1. Chat Trigger → AI Agent (any chat model).
2. Tools: Kleos (read key) for Review Queue, Post Get, Article Get, Result Get Attribution, AI Visibility Get Latest; a second Kleos tool (write key) for Post Approve.
3. Ask: "Show me what's waiting, summarise each, and approve the LinkedIn one if it has no claims we can't back up."

## Development

```bash
npm install
npm run dev        # builds, links the package into a local n8n (http://localhost:5678) and reloads on change
npm run lint       # n8n's community-node lint (eslint-plugin-n8n-nodes-base, @n8n/eslint-plugin-community-nodes)
npm run typecheck
npm test           # unit tests: request builders, signature verification, lead signing
npm run build
```

Release: bump the version (`npm version minor`), push the commit and its tag, then publish a GitHub release. `.github/workflows/publish.yml` publishes to npm with a provenance attestation; nothing is published from a laptop.

## Support

- Kleos API reference: https://app.getkleos.ai/v1/openapi.json
- Webhooks guide: https://getkleos.ai/integrations/webhooks
- Issues with this node: https://github.com/NewOdysseyConsulting/n8n-nodes-kleos/issues
- Email: support@getkleos.ai

## Licence

[MIT](LICENSE.md)
