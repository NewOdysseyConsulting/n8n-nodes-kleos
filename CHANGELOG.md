# Changelog

## 0.1.0

First release.

- **Kleos** node (declarative, usable as an AI agent tool): Business, Post, Article, Review Queue, Lead, Result, AI Visibility, Campaign, Suggestion and Knowledge Source resources over the Kleos API v1, with cursor pagination, business and channel dropdowns.
- **Kleos Trigger** node: Standard Webhooks signature verification, automatic endpoint registration through `/v1/webhooks` or manual registration with a pasted secret, business filter, test-event handling.
- **Kleos API** credential (bearer key, tested with `GET /v1/usage`) and **Kleos Lead Tracking** credential (per-business endpoint signed with HMAC-SHA256).
