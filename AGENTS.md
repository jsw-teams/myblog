# Siteforge Agent Guide

This file is for AI agents and developers who want to build sites or custom
themes on top of Siteforge with minimal project-specific knowledge.

Siteforge is a small static site builder inspired by Hexo's separation of site
content, theme configuration, layouts, assets, and plugins. Treat it as a
frontend framework for content sites: customize themes first, change the core
builder only when the theme API cannot express the needed behavior.

## Fast Orientation

- `config.yml` is the site-level entry point. It selects a theme, declares site
  metadata, locales, navigation, content behavior, and optional plugins.
- `themes/<name>/` is the theme boundary. A new project should usually start by
  copying `themes/default` and changing the copy.
- `themes/default/theme.yml` is the active default theme configuration.
- `themes/default/theme.example.yml` is the copyable reference for theme users.
- `themes/default/templates/` contains HTML template fragments for page types.
- `themes/default/style.css` is the theme baseline stylesheet.
- `themes/default/styles/` contains page or feature styles loaded by theme
  configuration.
- `themes/default/scripts/` contains behavior and plugin scripts. Optional
  third-party features should be loaded through consent-aware feature scripts.
- `themes/default/source-assets/` contains theme-owned images and icons.
- `static/` contains site-public files copied as-is, including `_headers`,
  `llms.txt`, `openapi.json`, and the deployed `/AGENTS.md`.
- `src/` contains the builder. Avoid changing it for purely visual or
  project-specific theme work.
- `dist/` is generated output. Do not edit it by hand.

## Theme-First Workflow

1. Copy `themes/default` to `themes/<your-theme>`.
2. Set `theme.name: <your-theme>` in `config.yml`.
3. Change global visual language in `themes/<your-theme>/style.css`.
4. Change page-specific layout and polish in `themes/<your-theme>/styles/`.
5. Change HTML structure in `themes/<your-theme>/templates/`.
6. Add images, icons, and other theme-owned assets under
   `themes/<your-theme>/source-assets/`.
7. Add optional behavior under `themes/<your-theme>/scripts/`, then expose it
   from `theme.yml` through `featureScripts` and `featureCategories`.
8. Run `npm run build` and `npm run check`.

If a requested customization can be done by changing theme config, templates,
CSS, or theme scripts, do that instead of editing `src/`.

## Theme Contracts

The default theme shows the expected shape for custom themes:

- `theme.yml` declares CSS, JS, page style mapping, feature scripts, icons,
  footer content, plugin defaults, and consent categories.
- `i18n.yml` contains theme-owned UI strings. Site content should not need to
  carry theme interface text.
- `templates/home.html` renders the homepage content surface.
- `templates/archive.html` renders archive listings.
- `templates/terms-index.html` renders category and tag index pages.
- `templates/terms-page.html` renders one category or tag page.
- `templates/page.html` renders ordinary pages such as About.

When adding a new reusable page type, prefer adding a theme template and a small
builder hook that passes structured data into it. Do not hardcode one site's
layout into `src/templates.mjs`.

## CSS Guidance

- Keep the theme baseline in `style.css`.
- Keep page or feature-specific rules in `styles/*.css`.
- Use stable layout constraints such as `max-width`, grid tracks, aspect ratios,
  and predictable spacing so content cannot overlap on mobile or desktop.
- Prefer CSS custom properties for colors, spacing, borders, and typography that
  a downstream theme may want to override.
- Keep consent UI styles separate from unrelated page styles.
- Do not rely on JavaScript to fix basic layout.
- Do not bake one site's brand, mascot, palette, or copy into reusable theme
  names unless the theme is explicitly brand-specific.

## JavaScript Guidance

- JavaScript should provide behavior and plugin loading, not layout rendering.
- `scripts/consent.js` is the minimal consent entry point. Before the user has
  made a cookie choice, optional analytics, comments, ads, and marketing scripts
  must not load.
- Optional scripts should be mapped in `theme.yml` and gated by consent
  categories.
- Only one comments provider should be active at a time. Keep provider examples
  in example config, not as mandatory defaults.
- Analytics providers such as Cloudflare Web Analytics should be configurable
  through `plugins.analytics`, including token, source URL, consent category, and
  provider-specific beacon options.
- WebMCP discovery is intentionally inline in the document shell so agent tools
  can be detected on page load without an extra external script.

## Builder Boundary

Edit `src/` only when you are improving the framework itself:

- loading or merging site and theme config
- adding a reusable page type
- exposing new structured data to theme templates
- improving generated feeds, sitemap, headers, or agent discovery files
- changing asset copying or build output behavior
- adding checks that protect all downstream themes

Do not edit `src/` to change colors, spacing, a single site's hero layout, a
footer label, comment provider preference, analytics token, or mascot image.

## Agent Discovery

Siteforge exposes agent-facing resources for deployed sites:

- `static/_headers` defines RFC 8288 `Link` headers for useful resources.
- `static/AGENTS.md` is the deployed site-level guide.
- `static/llms.txt` gives a compact model-readable project summary.
- `static/openapi.json` and `static/.well-known/api-catalog` describe public
  discovery endpoints.

Keep repository guidance in this root `AGENTS.md`. Keep deployed-site guidance
in `static/AGENTS.md`.

## Build And Verify

Use Node 22 or newer.

```bash
npm install
npm run build
npm run check
```

The build output directory is `dist/`.

`npm run check` verifies important generated files, theme assets, sitemap shape,
agent discovery headers, and WebMCP bootstrap behavior. If you add new framework
contracts, extend the check script so future themes do not silently regress.

## What Not To Do

- Do not edit generated files in `dist/`.
- Do not put theme assets in `src/`.
- Do not make optional third-party scripts unconditional.
- Do not reintroduce a `public/` build output directory unless the deployment
  contract is intentionally changed.
- Do not add XSL styling to sitemap output just to make it look nicer in a
  browser. The sitemap should remain valid XML that browsers can inspect as an
  XML tree.
- Do not copy large chunks of another static-site generator. Reuse design ideas,
  not source code.
- Do not commit real API tokens, Cloudflare tokens, analytics secrets, or AWS
  keys.

## Recommended Agent Routine

When asked to build a custom site or theme with Siteforge:

1. Read `config.yml`, `themes/default/theme.yml`, and the relevant template.
2. Decide whether the request belongs in theme config, templates, CSS, scripts,
   content, or builder core.
3. Prefer the smallest theme-level change that works.
4. Run `npm run build` and `npm run check`.
5. Summarize changed files and explain whether the change is reusable theme work
   or framework work.
