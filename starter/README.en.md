# Siteforge Starter

This project was created by `siteforge init` from the neutral `starter/`
template bundled in the Siteforge npm package.

## Start

```bash
npm install
npm run server
```

## Generate And Check

```bash
npm run generate
npm run check
```

## Common Edits

- `config.yml`: site name, `siteUrl`, locales, navigation, robots, feed, analytics, and discovery metadata.
- `content/posts/`: posts.
- `content/pages/`: homepage, about page, archive, categories, tags, search, and other pages.
- `themes/default/`: theme templates, CSS, assets, and optional scripts.

The starter uses neutral placeholders and contains no production or preview
secrets. Configure your own domain, Cloudflare project, GitHub Secrets,
analytics token, and robots policy before deploying.

Cloudflare Pages example:

```text
Build command: npm install && npm run generate
Build output directory: dist
Node.js version: 22.12 or newer
```
