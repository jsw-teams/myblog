# Siteforge Agent Guide

Siteforge is a static site builder for Markdown content, YAML configuration, theme templates, local search, consent-aware plugin loading, feeds, sitemaps, and agent discovery.

## Useful Files

- `config.yml`: site-level settings such as site URL, locales, navigation, and selected theme.
- `content/posts/`: localized Markdown posts.
- `content/pages/`: localized Markdown pages.
- `themes/default/theme.yml`: default theme configuration.
- `themes/default/templates/`: page layout templates.
- `themes/default/styles/`: page and feature CSS.
- `themes/default/scripts/`: browser features loaded by the consent-aware theme entry script.
- `src/`: build-time content parsing, rendering, feed, sitemap, asset, and theme glue.
- `static/.well-known/api-catalog`: RFC 9727 linkset for machine-readable discovery.
- `static/.well-known/mcp/server-card.json`: WebMCP-oriented capability card.

## Build

Hexo users can treat `npm run generate` like `hexo generate`, and
`npm run server` like `hexo server`.

```bash
npm install
npm run generate
npm run check
npm run server
```

Build output goes to `dist/`.

## Frontend Extension Rules

- Put reusable theme configuration in `themes/<name>/theme.yml`.
- Put CSS in `themes/<name>/style.css` or `themes/<name>/styles/*.css`.
- Put browser feature scripts in `themes/<name>/scripts/*.js`.
- Keep optional third-party scripts behind consent categories.
- Necessary local features may load before a visitor saves consent choices.
- Do not put site-specific assets directly into builder code; expose them through the theme or `static/`.

## Agent Discovery

The homepage should expose RFC 8288 `Link` response headers for:

- `rel="api-catalog"` -> `/.well-known/api-catalog`
- `rel="service-desc"` -> `/openapi.json`
- `rel="service-doc"` -> `/AGENTS.md`
- `rel="describedby"` -> `/llms.txt`

The default theme also exposes WebMCP tools on page load when the browser supports `document.modelContext.registerTool()` or `navigator.modelContext.provideContext()`.

Current default tools:

- `search_public_posts`: search the local public post index.
- `list_discovery_resources`: return the agent-facing discovery resources.
