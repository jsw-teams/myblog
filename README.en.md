# Siteforge

[简体中文 README](README.md)

<p align="center">
  <img src="static/siteforge-icon.png" alt="Siteforge project icon" width="160">
</p>

Siteforge is a Hexo-oriented static site and blog builder. Site config lives in
`config.yml`, posts and pages live in `content/`, themes live in
`themes/<name>/`, and generated output goes to `dist/`.

The goal is simple: if you only want to blog, edit Markdown content; if you need
secondary development, move into themes, config, and builder extensions.

## Quick Start

```bash
npx @jsw-teams/siteforge@latest init my-site
cd my-site
npm install
npm run server
npm run generate
npm run check
```

- `siteforge init` copies the neutral `starter/` template from the npm package.
- `npm run server` maps to `hexo server` for local live preview.
- `npm run generate` maps to `hexo generate` and writes `dist/`.
- `npm run check` verifies generated output, theme assets, sitemap, feed, agent discovery, and WebMCP bootstrap.

The starter contains no production or preview secrets, no real site domain, no
real author identity, no real analytics token, and no production-specific robots
policy. After initialization, configure your own `siteUrl`, site name,
analytics, robots policy, Cloudflare Pages project, and GitHub Secrets.

The repository root may continue to serve as the Siteforge example/development
site. It is not the source copied by `siteforge init`.

## Created Project Layout

```text
config.yml              # Site-level config
content/posts/          # Post Markdown
content/pages/          # Page Markdown/HTML
static/                 # Project static files
themes/default/         # Default theme copy
src/                    # Siteforge builder
scripts/                # Local preview and check scripts
dist/                   # Generated output; do not edit by hand
```

The starter is intentionally small: a homepage, about page, archive page,
categories page, tags page, search page, and one `hello-siteforge` post.

## Content And Pages

Posts:

```text
content/posts/<slug>/index.<locale>.md
```

Pages:

```text
content/pages/<slug>/index.<locale>.md
```

Default special pages use the same page system:

```text
content/pages/home/index.<locale>.md        # /<locale>/
content/pages/archive/index.<locale>.md     # /<locale>/archive/
content/pages/categories/index.<locale>.md  # /<locale>/categories/
content/pages/tags/index.<locale>.md        # /<locale>/tags/
content/pages/search/index.<locale>.md      # /<locale>/search/
```

Markdown under `content/pages` may contain HTML directly. You can write
`<header>`, `<section>`, `<img>`, and place dynamic components exactly where
they should render:

```html
<!-- siteforge:post-list -->
<!-- siteforge:pagination -->
<!-- siteforge:archive-list -->
<!-- siteforge:terms -->
<!-- siteforge:search-panel -->
<!-- siteforge:languages -->
```

Treat slots as complete components. For example,
`<!-- siteforge:search-panel -->` already owns its input, empty state, result
count, and error state.

## Site Config

`config.yml` is the site-level entry point. It is not just a build-parameter
file; it is the main structured source for secondary development and agent
collaboration.

Minimal example:

```yaml
siteUrl: https://example.com
defaultLocale: en
activeLocales:
  - en
siteName:
  en: Siteforge Starter
theme:
  name: default
```

Good `config.yml` responsibilities:

- `siteName`, `description`, and `author`
- `defaultLocale` and `activeLocales`
- `nav.links` and `nav.utilityLinks`
- `footer`, `head`, `pwa`, and `icons`
- `plugins`, `features`, `featureScripts`, and `featureCategories`
- `robots`, `llms`, `feed`, and `discovery`

The builder uses config to generate `robots.txt`, `llms.txt`, `llms-full.txt`,
`feed.xml`, `sitemap.xml`, `openapi.json`, `.well-known/api-catalog`,
`.well-known/mcp/server-card.json`, and `_headers`. If a site-operations file
can be derived from `config.yml`, do not maintain a second handwritten copy
under `static/`.

## Themes And Secondary Development

For simple blogging, prefer `config.yml` and `content/`.

For visual, layout, or script changes:

1. Copy `themes/default` to `themes/<your-theme>`.
2. Set `theme.name: <your-theme>` in `config.yml`.
3. Edit `themes/<your-theme>/theme.yml`, `templates/`, `style.css`, `styles/`, `scripts/`, and `source-assets/`.
4. Edit `src/` only when the theme API cannot express the behavior.

Change `starter/` when changing the default template for new users. Change the
repository-root `config.yml/content/static/themes` only when changing this
repository's example/development site. Do not sync real production domains,
real analytics tokens, Cloudflare config, or deployment secrets into `starter/`.

## Plugins And Consent

Plugins are optional. A simple site may use none; a larger site may enable
search, comments, analytics, ads, WebMCP, or custom scripts.

The default theme loads only the consent entry unconditionally. Comments,
analytics, ads, and marketing scripts should be declared in theme config and
loaded through categories such as `necessary`, `preferences`, `analytics`, and
`marketing`. Cloudflare Web Analytics is disabled by default and uses a
placeholder token.

## Deployment

Siteforge can deploy to Cloudflare Pages or any static hosting service that can
serve `dist/`.

Cloudflare Pages Git integration example:

```text
Build command: npm install && npm run generate
Build output directory: dist
Node.js version: 22.12 or newer
```

This repository does not commit real Cloudflare credentials, account IDs,
project names, zone IDs, or production deployment secrets. Forks and downstream
projects should create their own Cloudflare projects and manage sensitive values
through GitHub Secrets or the Cloudflare Dashboard.

## Agent Collaboration

Root `AGENTS.md` is the project guide for Codex, Claude, and other coding
agents.

For blogging:

```text
Please read README.md, AGENTS.md, and config.yml first. I am using Siteforge as
a blog. Prefer config.yml and content/ edits; do not edit themes/ or src/ unless
I explicitly ask for theme customization or builder behavior.
```

For secondary development:

```text
Please read AGENTS.md and config.yml first. Treat config.yml as the structured
source for site name, locales, navigation, plugins, consent, footer, robots,
llms, OpenAPI, API catalog, MCP server card, headers, and other site operations.
Prefer config.yml, content/pages, and theme-level changes before editing src/.
```

## License

Siteforge is licensed under `AGPL-3.0-or-later`. Modified, redistributed,
publicly deployed, or downstream versions based on Siteforge should keep their
corresponding source code open under the AGPL.

Please preserve the original author attribution: `Siteforge by JSW Teams`, and
keep or equivalently display the `NOTICE` information and original repository
link.
