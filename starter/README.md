# Siteforge Starter

这个项目由 `siteforge init` 创建，使用的是 Siteforge npm 包内的中立 `starter/` 模板。

## 开始

```bash
npm install
npm run server
```

## 生成与检查

```bash
npm run generate
npm run check
```

## 常改位置

- `config.yml`：站点名、`siteUrl`、语言、导航、robots、feed、analytics 和 discovery 元数据。
- `content/posts/`：文章。
- `content/pages/`：首页、关于页、归档页、分类页、标签页、搜索页和其他页面。
- `themes/default/`：主题模板、CSS、资源和可选脚本。

starter 使用中立 placeholder，不包含生产或预览 secrets。部署前请配置自己的域名、Cloudflare 项目、GitHub Secrets、analytics token 和 robots 策略。

Cloudflare Pages 示例：

```text
Build command: npm install && npm run generate
Build output directory: dist
Node.js version: 22.12 或更新
```
