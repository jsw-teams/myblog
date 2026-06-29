# Pagekiln Agent Guide

Pagekiln is a static site builder for Markdown content, YAML configuration, theme templates, local search, consent-aware plugin loading, feeds, sitemaps, and agent discovery.

## Useful Files

- `config.yml`: site-level settings such as site URL, locales, navigation, and selected theme.
- `content/posts/`: localized Markdown posts.
- `content/pages/`: localized Markdown pages.
- `themes/default/theme.yml`: default theme configuration.
- `themes/default/templates/`: page layout templates.
- `themes/default/styles/`: page and feature CSS.
- `themes/default/scripts/`: browser features loaded by the consent-aware theme entry script.
- `src/`: build-time content parsing, rendering, feed, sitemap, asset, and theme glue.

Discovery files such as `_headers`, `llms.txt`, `llms-full.txt`, `openapi.json`,
API catalog, and MCP server card are generated from `config.yml`; do not maintain
separate handwritten copies under `static/`.

## License And Attribution

Pagekiln is licensed under `AGPL-3.0-or-later`. Modified, redistributed,
publicly deployed, or downstream versions should keep their corresponding source
code open under the AGPL.

Preserve the original author attribution: `Pagekiln by JSW Teams`. Keep the
repository `NOTICE` file, or provide equivalent visible attribution with a link
to the original repository.

## Config As Secondary-Development Source

Use `config.yml` as a secondary-development reference before changing frontend files. It is
structured site-operations data, not just a build setting file. Site name,
description, locales, navigation, utility links, footer, icons, PWA settings,
plugin toggles, consent categories, comments, analytics, ads, search, and WebMCP
settings, robots rules, LLM discovery metadata, OpenAPI/API catalog data, MCP
server card metadata, and response headers should be represented in config
whenever possible.

This lowers frontend coordination cost: users can provide YAML values once, and
Pagekiln can generate headers, navigation, language links, metadata, feeds,
sitemaps, robots.txt, llms.txt, llms-full.txt, OpenAPI, API catalog, MCP server
card, consent behavior, footer content, and discovery resources from those
values.

If a site-operations file can be derived from `config.yml`, do not keep a
separate handwritten copy under `static/`. Prefer dynamic generation for
OpenAPI, API catalog, MCP server card, `_headers`, robots, and LLM discovery
outputs, then document the generated contract.

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

- Put site-level migration data in `config.yml` before hardcoding it in
  templates.
- Put reusable theme configuration in `themes/<name>/theme.yml`.
- Put baseline and small reusable page CSS in `themes/<name>/style.css`.
- Use `themes/<name>/styles/*.css` with `theme.yml` `pageStyles` only for
  substantial, low-reuse, page-specific CSS or clearly bounded feature styles
  such as consent, search, comments, ads, gallery, or docs toc.
- Do not put production CSS in Markdown/HTML. Page Markdown controls structure
  and dynamic slot placement; theme CSS controls visual language.
- Put browser feature scripts in `themes/<name>/scripts/*.js`.
- Keep optional third-party scripts behind consent categories.
- Necessary local features may load before a visitor saves consent choices.
- Do not put site-specific assets directly into builder code; expose them through the theme or `static/`.

## Page Customization

Localized pages live at `content/pages/<slug>/index.<locale>.md`. These files may
contain static HTML directly, so agents and developers can adjust page structure,
copy, component placement, and small page-level markup without editing builder
source. The default special pages are content-owned too:

- `content/pages/home/index.<locale>.md` -> `/<locale>/`
- `content/pages/archive/index.<locale>.md` -> `/<locale>/archive/`
- `content/pages/categories/index.<locale>.md` -> `/<locale>/categories/`
- `content/pages/tags/index.<locale>.md` -> `/<locale>/tags/`
- `content/pages/search/index.<locale>.md` -> `/<locale>/search/`

Use Pagekiln dynamic slots inside page Markdown/HTML when the builder should
insert interactive or generated UI:

```html
<!-- pagekiln:post-list -->
<!-- pagekiln:pagination -->
<!-- pagekiln:archive-list -->
<!-- pagekiln:terms -->
<!-- pagekiln:search-panel -->
<!-- pagekiln:languages -->
```

Do not duplicate what a slot already renders. For example, avoid adding a line
like "输入关键词开始搜索。" after `<!-- pagekiln:search-panel -->`; the search
panel already owns its input, empty state, result count, and error state. Put
durable page explanation in the header, then place the slot where the component
belongs.

To develop a new slot, use kebab-case in content
(`<!-- pagekiln:related-posts -->`) and camelCase in renderer code
(`relatedPosts`). Generate the component in `src/lib/theme-html.mjs`, mirror it
in `src/templates.mjs` when fallback rendering applies, keep UI strings in
theme i18n, and attach CSS/JS through `theme.yml`. Add slots only for generated
or interactive components; static copy should stay directly in `content/pages`.
A slot is not another syntax for inserting static HTML; if content can live
directly in Markdown/HTML, keep it there.

When zh-CN content has been edited first, treat it as the source of truth for the
page structure and meaning, then sync zh-TW and en with the same structure.

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
