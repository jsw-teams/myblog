# Myblog

Private production site repository for `blog.js.gripe`, powered by Pagekiln.

This repository contains site configuration, content, static files, and the
active theme. The Pagekiln builder source lives in the public
`jsw-teams/pagekiln` repository.

## Commands

```bash
pnpm install
npx pagekiln server
npx pagekiln generate
npx pagekiln check
```

`pnpm run generate/server/check` remain compatibility wrappers. Site identity
asset crops can be refreshed with `pnpm run assets:site`.

## Project Boundary

- Site metadata and operations settings live in `config.yml`.
- Posts, editable pages, and site identity assets live in `content/`.
- `content/assets/` owns favicon, PWA icon, and default Open Graph sources plus
  their derived crops.
- Public static files live in `static/`.
- Theme templates, CSS, scripts, and theme-owned source assets live in
  `themes/default/`.
- Generated output in `dist/` should not be edited by hand.

Production domains, robots policy, author identity, and site-specific content
belong in this private repository. Builder changes should be made in Pagekiln.
