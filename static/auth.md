# Agent authentication

Blog.js.gripe is a public, read-only blog. Public pages, feeds, search indexes, `llms.txt`, and discovery metadata do not require agent registration or OAuth credentials.

## Registration

No registration is required for public access.

## Authentication

This site does not currently expose protected APIs. Agents should treat `/.well-known/oauth-protected-resource` and `/.well-known/oauth-authorization-server` as informational metadata that declares no supported OAuth grants or scopes.

## Contact

Use the public repository for site-level issues: https://github.com/jsw-teams/myblog
