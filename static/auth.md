# Auth.md

Agent authentication and registration metadata for Blog.js.gripe.

Blog.js.gripe is a public, read-only blog. Public pages, feeds, search indexes, `llms.txt`, and discovery metadata do not require agent registration or OAuth credentials.

## Agent Registration

Registration endpoint: https://blog.js.gripe/auth.md

Registration required: no

Supported identity types:

- anonymous
- none

Credential types:

- none

Agents may access public resources without creating an account, presenting a token, or completing an out-of-band registration step.

## Standalone Registration Flow

1. Read this Auth.md document.
2. Use the `public:read` scope for public pages, feeds, search indexes, and discovery metadata.
3. Do not request credentials. This site does not issue client IDs, secrets, API keys, bearer tokens, or signed agent credentials for public access.
4. Follow the linked discovery metadata below when a client requires machine-readable authentication metadata.

## Authentication

This site does not currently expose protected APIs. Agents should treat `/.well-known/oauth-protected-resource` and `/.well-known/oauth-authorization-server` as informational metadata that declares the public read scope and no OAuth credential grant flow.

Protected resource metadata: https://blog.js.gripe/.well-known/oauth-protected-resource

Authorization server metadata: https://blog.js.gripe/.well-known/oauth-authorization-server

Agent auth metadata: https://blog.js.gripe/.well-known/oauth-authorization-server#agent_auth

Scopes supported:

- `public:read`: read public blog pages, feeds, search indexes, and discovery metadata.

## Claims

No claims are required for public access.

Claims endpoint: https://blog.js.gripe/auth.md#claims

## Revocation

No revocation action is required because Blog.js.gripe does not issue credentials for public access.

Revocation endpoint: https://blog.js.gripe/auth.md#revocation

## Contact

Use the public repository for site-level issues: https://github.com/jsw-teams/siteforge
