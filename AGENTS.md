# Myblog Agent Guide

This is the private production site for `blog.js.gripe`, powered by Pagekiln.

## Boundaries

- Edit `config.yml` for site metadata, locales, navigation, robots, LLM
  discovery, feeds, headers, icons, PWA settings, head metadata, and plugin
  settings.
- Edit `content/` for posts, user-editable pages, and site identity assets.
- Edit `content/assets/` for favicon, PWA icon, and default Open Graph sources
  plus their derived crops. Refresh derived crops with `pnpm run assets:site`.
- Edit `themes/default/` for this site's theme templates, CSS, scripts, and
  theme-owned source assets.
- Edit `static/` for public files that must be copied as-is.
- Do not edit `dist/` by hand.
- Do not add Pagekiln builder source code here; use the public Pagekiln
  repository for framework changes.

## Commands

```bash
pnpm install
npx pagekiln generate
npx pagekiln check
npx pagekiln server
```

`pnpm run generate/server/check` remain compatibility wrappers for environments
that prefer npm scripts.

Keep real deployment credentials out of the repository. Use GitHub Secrets,
Cloudflare Dashboard settings, or local environment variables for tokens and
account identifiers.
