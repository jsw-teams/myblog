# Myblog

Private production site repository for `blog.js.gripe`, powered by Pagekiln.

This repository contains site configuration, content, static files, and the
active theme. The Pagekiln builder source lives in the public
`jsw-teams/pagekiln` repository.

## Commands

```bash
pnpm install
pnpm run server
pnpm run generate
pnpm run check
```

## Project Boundary

- Site metadata and operations settings live in `config.yml`.
- Posts and editable pages live in `content/`.
- Public static files live in `static/`.
- Theme templates, CSS, scripts, and source assets live in `themes/default/`.
- Generated output in `dist/` should not be edited by hand.

Production domains, robots policy, author identity, and site-specific content
belong in this private repository. Builder changes should be made in Pagekiln.
