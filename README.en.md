# Siteforge

[简体中文 README](README.md)

Siteforge is a Hexo-inspired static site builder. Site-level configuration lives
in `config.yml`; theme styles, layouts, scripts, and theme i18n live in
`themes/<name>/`; content lives in `content/`; generated output goes to `dist/`.

The goal is to make ordinary content sites cheaper to customize. Most work can
stay in Markdown, YAML, and theme files instead of rebuilding page structure,
SEO, sitemap, feeds, local search, and third-party script loading for every
site.

## Quick Start

For Hexo users:

- `npm run generate` maps to `hexo generate` / `hexo g`.
- `npm run server` maps to `hexo server` / `hexo s`.
- `npm run check` verifies generated files, theme assets, sitemap, feed, agent
  discovery, and WebMCP bootstrap behavior.

```bash
npm install
npm run generate
npm run check
npm run server
```

Local preview runs at:

```text
http://127.0.0.1:4173/
```

`npm run server` polls source files every 10 seconds and rebuilds only after a
detected change. Build errors stay visible in the browser and do not stop the
preview process. During preview, changes to
`content/pages/<slug>/index.<locale>.md` prefer page-level incremental output
for the matching URL; posts, themes, config, static assets, or builder code may
still require a full generation pass. If a new path is requested while it is
still being generated, the preview shows a temporary "building page" screen and
refreshes after the build succeeds.

## Project Layout

```text
config.yml              # Site-level config
content/posts/          # Localized Markdown posts
content/pages/          # Localized Markdown/HTML pages
src/                    # Builder, content parsing, rendering, site outputs
static/                 # Static files copied to dist/
themes/default/         # Default theme
dist/                   # Generated output
```

Theme layout:

```text
themes/default/theme.yml         # Theme configuration
themes/default/theme.example.yml # Copyable reference config
themes/default/i18n.yml          # Theme UI strings
themes/default/style.css         # Global theme CSS
themes/default/styles/*.css      # Page or feature CSS
themes/default/templates/*.html  # Page layout fragments
themes/default/scripts/*.js      # Consent entry and feature scripts
themes/default/source-assets/    # Theme-owned source assets
```

## Content Pages

Posts live at:

```text
content/posts/<slug>/index.<locale>.md
```

Pages live at:

```text
content/pages/<slug>/index.<locale>.md
```

Default special pages use the same content-page system:

```text
content/pages/home/index.<locale>.md        # /<locale>/
content/pages/archive/index.<locale>.md     # /<locale>/archive/
content/pages/categories/index.<locale>.md  # /<locale>/categories/
content/pages/tags/index.<locale>.md        # /<locale>/tags/
content/pages/search/index.<locale>.md      # /<locale>/search/
```

Markdown under `content/pages` may contain static HTML directly. This lets users
edit page structure, copy, component placement, and small page-level markup
without changing theme templates or builder source. Frontmatter still owns page
metadata such as `title`, `description`, and `translationKey`.

Siteforge dynamic slots insert generated or interactive UI into page
Markdown/HTML:

```html
<!-- siteforge:post-list -->
<!-- siteforge:pagination -->
<!-- siteforge:archive-list -->
<!-- siteforge:terms -->
<!-- siteforge:search-panel -->
<!-- siteforge:languages -->
```

Treat slots as complete components. Do not duplicate what a slot already
renders. For example, avoid this:

```html
<!-- siteforge:search-panel -->
<p>Enter a query to start searching.</p>
```

The search panel already owns its input, empty state, result count, and error
state. Put durable page explanation in the page header, then place the slot
where the component should render.

### Developing New Dynamic Slots

Add a new `<!-- siteforge:xxx -->` slot only when users should control the
placement in Markdown/HTML while the builder owns the generated output. Slots
fit components such as post lists, pagination, archive lists, term collections,
language links, related posts, or search panels. If the content is fixed copy,
static links, or one-off HTML, write it directly in `content/pages` instead of
adding a slot.

Recommended workflow:

1. Choose a kebab-case slot name such as `<!-- siteforge:related-posts -->`.
   Use the matching camelCase key in code, such as `relatedPosts`.
2. Generate the component HTML in the relevant page renderer in
   `src/lib/theme-html.mjs`, then pass it to `replaceSlots(pageContent.html, {
   relatedPosts })`. `replaceSlots` supports both
   `<!-- siteforge:related-posts -->` and `{{ siteforge.relatedPosts }}`.
3. If `src/templates.mjs` has a fallback rendering path for the same page type,
   add the same slot there so HTML-template and fallback themes behave the same.
4. If a theme template wraps the page, keep `{{{content}}}` in
   `themes/default/templates/*.html` and let page Markdown plus slot output flow
   into that template. Do not hardcode a single site's layout into `src/`.
5. Put component UI strings in `themes/default/i18n.yml` and sync defaults in
   `src/i18n.mjs`.
6. Attach component CSS or JS through `themes/default/theme.yml` using
   `pageStyles`, `pageScripts`, `featureScripts`, or `featureStyles`. Avoid
   large CSS blocks in Markdown.
7. Update README, `AGENTS.md`, and `static/AGENTS.md` so users and agents know
   the slot exists.
8. Run `npm run generate` and `npm run check`. If the slot is a new framework
   contract, extend the check script to prevent regressions.

Minimal renderer example:

```js
const relatedPosts = renderPostList(posts.slice(0, 3), locale);
const content = replaceSlots(pageContent.html, { relatedPosts });
```

Page usage:

```html
<section aria-labelledby="related-title">
  <h2 id="related-title">Related posts</h2>
  <!-- siteforge:related-posts -->
</section>
```

A slot component should own its accessible markup, loading state, empty state,
error state, and runtime behavior. Do not require users to add text such as
"results will appear here" or "enter a query to start searching" after the slot.

When Chinese content has been edited first, treat `zh-CN` as the source of
truth for page structure and meaning, then sync `zh-TW` and `en` with the same
structure unless a locale-specific variation is intentional.

## Theme-First Customization

Start new projects by copying `themes/default` to `themes/<your-theme>`, then
set `theme.name: <your-theme>` in `config.yml`.

Prefer this order:

1. Edit `content/pages` for page copy, static HTML structure, and dynamic slot
   placement.
2. Edit `themes/<name>/theme.yml` for theme configuration, page styles, feature
   scripts, consent categories, and plugin defaults.
3. Edit `themes/<name>/templates/` for reusable page shells.
4. Edit `themes/<name>/style.css` and `themes/<name>/styles/` for styling.
5. Edit `themes/<name>/scripts/` for browser behavior.
6. Edit `src/` only when improving the framework itself.

## Agent Collaboration

Root `AGENTS.md` is the project guide for Codex, Claude, and other coding
agents. Ask agents to read it before changing a Siteforge project.

Useful prompt:

```text
Please read AGENTS.md first. Prefer content/pages Markdown/HTML and theme-level
changes before editing builder source. Use Siteforge dynamic slots instead of
hardcoding generated UI, and keep zh-CN as the source of truth when syncing
localized pages.
```

Agents should avoid putting implementation notes into public page copy. Explain
features in README or AGENTS documents; keep user-facing pages focused on the
site itself.

## Config

Minimal `config.yml` example:

```yaml
siteUrl: https://example.com
defaultLocale: zh-CN
activeLocales:
  - zh-CN
  - zh-TW
  - en
theme:
  name: default
```

Do not keep `default` as the long-term theme name for a new project. Copy the
theme, rename it for the project, then update `theme.name`.

## Consent And Plugins

Plugins are optional. A simple site may use none; a larger site may enable
search, comments, analytics, ads, maps, commerce, or custom integrations.

Optional third-party scripts should be mapped through theme config and gated by
consent categories such as `necessary`, `preferences`, `analytics`, and
`marketing`. The default theme loads only its consent entry script
unconditionally. Search, comments, analytics, RUM, ads, and other feature
scripts load after the relevant consent choice, except necessary local features
and the inline WebMCP discovery bootstrap.

Only one comments provider should be active at a time.

## Generated Outputs

The build generates:

- Home and paginated index pages
- Posts
- Archive
- Categories and category detail pages
- Tags and tag detail pages
- Normal pages
- Search page and search indexes
- `feed.xml`
- `sitemap.xml`
- `robots.txt`
- `llms.txt`
- Agent discovery files and headers

Do not edit `dist/` by hand.

## Deploy

GitHub Actions can generate and publish `dist/` to Cloudflare Pages from
`main`. For Cloudflare Pages Git integration:

```text
Build command: pnpm install --frozen-lockfile && pnpm run generate
Build output directory: dist
Node.js version: 22.12 or newer
```

Required GitHub secrets for Wrangler direct upload:

```text
CLOUDFLARE_ACCOUNT_ID = Cloudflare account ID
CLOUDFLARE_API_TOKEN  = API token with Account / Cloudflare Pages / Edit access
```

Never commit Cloudflare tokens, analytics secrets, AWS keys, or real API
secrets.
