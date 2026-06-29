# Myblog Agent Guide

This is the private production site for `blog.js.gripe`, powered by Pagekiln.

## Boundaries

- Edit `config.yml` for site metadata, locales, navigation, robots, LLM
  discovery, feeds, headers, and plugin settings.
- Edit `content/` for posts and user-editable pages.
- Edit `themes/default/` for this site's theme templates, CSS, scripts, and
  source assets.
- Edit `static/` for public files that must be copied as-is.
- Do not edit `dist/` by hand.
- Do not add Pagekiln builder source code here; use the public Pagekiln
  repository for framework changes.

## Commands

```bash
pnpm install
pnpm run generate
pnpm run check
pnpm run server
```

Keep real deployment credentials out of the repository. Use GitHub Secrets,
Cloudflare Dashboard settings, or local environment variables for tokens and
account identifiers.
