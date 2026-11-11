# Submitting n8n-nodes-kleos for n8n verification

Internal notes for the owner. Not shipped in the npm package.

## Before submitting (in this order)

1. **Public GitHub repository `NewOdysseyConsulting/n8n-nodes-kleos`.** The verification scanner reads the source from the commit the npm provenance attests, so the repository must be public and the `repository.url` in `package.json` must match it exactly (it is set to `https://github.com/NewOdysseyConsulting/n8n-nodes-kleos.git`; change both if the org name differs). Copy this folder into it as the repository root (not a subfolder) and commit `package-lock.json`: the publish workflow runs `npm ci`.
2. **npm account and the first publish.** The package name `n8n-nodes-kleos` must be free (check `npm view n8n-nodes-kleos`). Create a Granular Access Token on npmjs.com ("Read and write", with "bypass 2FA" so CI can use it) and add it as the `NPM_TOKEN` secret on the GitHub repository (Settings → Secrets and variables → Actions). Then publish a GitHub release for tag `0.1.0`: `.github/workflows/publish.yml` lints, tests, builds and runs `npm publish --provenance`. After the first version exists, you can switch to npm Trusted Publishing (npmjs.com → package → Settings → Publish access → Trusted Publishers → GitHub Actions, workflow `publish.yml`) and delete the token.
3. **Run the scanner against the published package**: `npx @n8n/scan-community-package n8n-nodes-kleos`. It checks provenance, downloads the attested commit from GitHub and lints both the source and the tarball. Exit code 0 is required. (Locally, `npm run lint` runs the same rules and is clean.)
4. **Record the demo video** (script below).
5. **Submit** at https://creators.n8n.io/nodes (sign in with the account that will own the listing). Reviews take up to four weeks; n8n emails as it progresses.

## Creator Portal fields

- **npm package name:** `n8n-nodes-kleos`
- **Integration name:** Kleos
- **Short description (no pricing, no superlatives):** Kleos is an AI marketing employee for small businesses. This node reads and acts on a Kleos workspace: businesses, posts, articles, the review queue, campaigns, growth suggestions, knowledge sources, results and AI visibility; asks Kleos for drafts; approves work; records what was published; sends leads and deals for attribution. The Kleos Trigger starts workflows on signed Kleos webhook events. Both nodes work as AI agent tools.
- **Categories:** Marketing & Content, Sales
- **Website:** https://getkleos.ai
- **Documentation URL:** https://github.com/NewOdysseyConsulting/n8n-nodes-kleos#readme
- **Source repository:** https://github.com/NewOdysseyConsulting/n8n-nodes-kleos
- **Icon:** the square Kleos tile (`icons/kleos.svg`, from the brand kit).
- **Credential documentation:** https://github.com/NewOdysseyConsulting/n8n-nodes-kleos#credentials
- **Contact:** support@getkleos.ai
- **Demo video:** the unlisted YouTube or Loom link from the script below.

## Verification requirements and how this package meets them

| Requirement | Status |
| --- | --- |
| Package name starts with `n8n-nodes-` and has the `n8n-community-node-package` keyword | Yes |
| MIT licence | `LICENSE.md`, `"license": "MIT"` |
| No runtime dependencies; only Node built-ins (`crypto`) | `package.json` has no `dependencies`; the unit test asserts it |
| Published from GitHub Actions with npm provenance (required from 1 May 2026) | `.github/workflows/publish.yml`, `npm publish --provenance` |
| npm `repository.url` matches the public GitHub repo; author matches | Set in `package.json`; verify after the repo exists |
| One third-party service per package; trigger in programmatic style, actions declarative | Kleos only; `KleosTrigger` programmatic, `Kleos` declarative |
| Does not read environment variables or files | Confirmed by lint and by reading: everything comes from node parameters and credentials |
| Lint passes (`eslint-plugin-n8n-nodes-base`, `@n8n/eslint-plugin-community-nodes`, strict and Cloud-compatible) | `npm run lint`: 0 errors, 0 warnings; `"n8n": { "strict": true }` kept |
| Codex categories valid | `Marketing & Content`, `Sales` |
| Themed icons | Light and dark variants both point at the tile (it carries its own background) |
| Credentials have a test | API key: `GET /v1/usage`; Lead tracking: signed empty request via `testedBy` |
| `usableAsTool` with descriptions an agent can act on | On the Kleos node; every resource and operation has a description |
| English-only interface and docs | Yes |
| README with install, credentials, operations, examples | `README.md` |
| Not a duplicate of an existing node, not logic or flow control | No Kleos node exists on npm |
| Does not compete with n8n paid or enterprise features | It does not |

Scaffolding note: n8n "strongly suggests" starting from `npm create @n8n/node`. This package uses the same layout, `@n8n/node-cli` (0.56.2, above the 0.23.0 minimum), `tsconfig`, `eslint.config.mjs` and scripts as the current `n8n-nodes-starter`, so it is equivalent; `n8n-node lint`, `build`, `dev` and `release` all work.

## Demo video script

n8n asks for one continuous recording on a self-hosted n8n, no cuts, showing install, credential, two operations and the node used as an AI agent tool. About 5 minutes.

**Setup before recording**

- A self-hosted n8n at a public https address (Docker image `n8nio/n8n:<exact version, e.g. 1.121.0>` with `WEBHOOK_URL` set), signed in. Say the version out loud and show it under Settings → About.
- A Kleos workspace with at least one business, a post awaiting review and an AI visibility run. A write API key ready to paste (make it just before; revoke it after).
- A chat model credential for the AI Agent (OpenAI, Anthropic or Google).
- `npm view n8n-nodes-kleos version` open in a terminal, to show the published version.

**Recording**

1. *(0:00)* "This is n8n-nodes-kleos, version 0.1.0, on self-hosted n8n [version]." Show Settings → About.
2. *(0:20)* **Install.** Settings → Community nodes → Install → type `n8n-nodes-kleos` → tick the risk acknowledgement → Install. Wait for "Installed". Show the two nodes in the panel by searching "Kleos".
3. *(1:10)* **Credential.** Credentials → Add → "Kleos API" → paste the key → Save. Show the green "Connection tested successfully" (it calls `GET /v1/usage`).
4. *(1:50)* **Operation 1.** New workflow → Manual trigger → Kleos node → Resource "Review Queue", Operation "Get Posts Awaiting Review" → choose a Business from the dropdown (point out it was loaded from Kleos) → Execute step. Show the items: channel, hook, body, status `pending_approval`.
5. *(2:40)* **Operation 2.** Add a second Kleos node → Resource "AI Visibility", Operation "Get Latest" → same business → Execute. Show the summary: checked, mentioned, recommended, cited, competitors.
6. *(3:20)* **Trigger (short).** Add "Kleos Trigger" → events `draft.created`, `post.published` → Save and Activate. Switch to Kleos → Settings → API → Webhooks and show the endpoint n8n registered, with the n8n address. Click "Send test event"; back in n8n show Executions: none started (test events are ignored by default), and say the signature was checked. Deactivate; show the endpoint is gone.
7. *(4:10)* **AI agent tool.** New workflow → Chat Trigger → AI Agent → choose the chat model → under Tools add "Kleos" → Resource "Review Queue", Operation "Get Posts Awaiting Review", Business set to "Let the model decide" (or the dropdown). Open the chat and type: "What is waiting for my approval in Kleos? Summarise each in one line." Show the agent calling the Kleos tool and the answer.
8. *(5:00)* "Source and README at github.com/NewOdysseyConsulting/n8n-nodes-kleos." Stop.

Afterwards revoke the API key used on camera.

## Where the API falls short (so the listing does not promise them)

- No `GET /me`: the credential test uses `GET /v1/usage`.
- No endpoint to write a post in your own words, to re-schedule a drafted post, to draft or approve an article, or to start an AI visibility run. The node leaves these out rather than pretend; the README says so.
- No channel list endpoint: the Channel dropdown reads the business's calendar slots and falls back to the eight channels Kleos supports.
- Leads are not under the API key: they use the per-business lead-tracking endpoint with its own secret, so the Lead resource has its own credential.
- The trigger's automatic registration needs a key with the `workspace` capability (admin or owner write key). Other keys use manual registration.
