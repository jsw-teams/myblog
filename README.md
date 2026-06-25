# Static Site Builder

一个偏 Hexo 思路的静态网站/博客构建器：站点配置放在根目录 `config.yml`，主题样式、布局、脚本和主题级 i18n 放在 `themes/<name>/`，内容来自 `content/`，构建输出到 `public/`。

目标是降低普通内容站点的前端开发成本。开发者可以把大部分工作放在 Markdown、YAML 和主题文件上，而不是每个站点都重新搭页面结构、SEO、sitemap、feed、本地搜索和第三方脚本加载逻辑。默认主题内置本地搜索和合规友好的 Cookie/Consent 偏好选择器，可按需启用评论、统计、RUM 或其他插件脚本。

## 快速开始

```bash
npm install
npm run build
npm run check
npm run serve
```

本地预览默认运行在：

```text
http://127.0.0.1:4173/
```

如果 PowerShell 执行策略阻止 `npm.ps1`，可以使用：

```powershell
npm.cmd install
npm.cmd run build
npm.cmd run check
npm.cmd run serve
```

## 目录结构

```text
config.yml              # 站点级配置
content/posts/          # 文章 Markdown
content/pages/          # 普通页面 Markdown
src/                    # 构建器、内容解析、站务渲染
static/                 # 站点静态文件，会复制到 public/
themes/default/         # 默认主题
public/                 # 构建产物
```

主题目录：

```text
themes/default/theme.yml        # 主题配置
themes/default/theme.example.yml # 可复制的主题配置示例
themes/default/i18n.yml         # 主题文案
themes/default/style.css        # 全局主题 CSS
themes/default/styles/*.css     # 页面/功能级 CSS
themes/default/templates/*.html # 页面布局模板
themes/default/scripts/*.js     # consent 入口与按需功能脚本
themes/default/source-assets/   # 主题最终图片源文件，构建时原样输出 favicon、OG 与 mascot 资源
```

## 内容写作

文章路径：

```text
content/posts/<slug>/index.<locale>.md
```

页面路径：

```text
content/pages/<page>.<locale>.md
```

frontmatter 示例：

```yaml
---
title: "文章标题"
description: "SEO 摘要"
date: "2026-04-27"
updated: "2026-04-27"
translationKey: "welcome"
tags: ["站点公告"]
category: "公告"
draft: false
sitemap: true
cover: ""
---
```

`draft: true` 的内容不会进入公开页面、搜索索引、sitemap、feed 或 llms 文件。`sitemap: false` 可单独排除某篇文章或页面。

## 站点配置

根目录 `config.yml` 只负责站点层信息，例如：

```yaml
siteUrl: https://blog.js.gripe
defaultLocale: zh-CN
activeLocales:
  - zh-CN
  - zh-TW
  - en
theme:
  name: default
```

不要把主题 CSS、主题 JS 或布局配置写进根配置；这些属于主题目录。

## 主题配置

`themes/default/theme.yml` 是当前部署使用的主题配置；`themes/default/theme.example.yml` 是给新主题或新站点复制参考的示例配置。

`theme.yml` 管理主题资源、页面布局、插件和第三方脚本。默认主题把通用页面拆成独立模板与样式，方便开发者只改需要的部分：

```yaml
style: style.css
script: scripts/consent.js
templates: templates
i18n: i18n.yml

features:
  search: true
  lightbox: true
  media: true
  comments: true

featureScripts:
  search: scripts/search.js
  comments: scripts/comments.js

featureStyles:
  consent: styles/consent.css

pageStyles:
  home: styles/home.css
  archive: styles/archive.css
  categories: styles/terms.css
  tags: styles/terms.css
  term: styles/terms.css
  page: styles/page.css
```

构建器会复制主题资源到 `public/assets/theme/<theme>/`，并按文件内容自动生成版本号查询串，不需要手写 `?v=...`。

`scripts/consent.js` 是默认主题唯一无条件加载的入口脚本。未保存隐私偏好前，它只加载 consent 自身需要的样式并锁定页面交互；搜索、评论、媒体增强、统计或 RUM 等功能脚本会在用户保存选择后按分类加载。

导航入口也由主题配置控制。分类、标签、搜索、归档或任意 pages 入口都可以用 `enabled: false` 关闭，或直接从 `nav.links` / `nav.utilityLinks` 删除。

默认主题自带这些页面层：

- `home`：首页与分页列表。
- `archive`：归档页。
- `categories` / `tags`：分类、标签索引页。
- `term`：单个分类或标签详情页。
- `page`：普通 pages 页。
- `post`：文章页。

## 插件与 Consent

评论、统计、RUM 等第三方能力放在主题的 `plugins` 下：

```yaml
plugins:
  comments:
    enabled: false
    # Only one comments provider can be active at a time.
    # Supported providers: twikoo, waline, giscus, utterances, disqus, custom, none.
    provider: twikoo
    twikoo:
      envId: https://api-comments.example.com
      script: https://example.com/twikoo.min.js
    waline:
      serverURL: https://waline.example.com
      script: https://unpkg.com/@waline/client@v3/dist/waline.js
      css: https://unpkg.com/@waline/client@v3/dist/waline.css
      lang: zh-CN
    giscus:
      script: https://giscus.app/client.js
      repo: owner/repo
      repo-id: REPO_ID
      category: General
      category-id: CATEGORY_ID
      mapping: pathname
      reactions-enabled: "1"
      emit-metadata: "0"
      input-position: bottom
      theme: preferred_color_scheme
      lang: zh-CN
      crossorigin: anonymous
    utterances:
      script: https://utteranc.es/client.js
      repo: owner/repo
      issue-term: pathname
      theme: github-light
      crossorigin: anonymous
    disqus:
      shortname: example
    custom:
      script: https://example.com/comments.js
      attrs:
        data-site-id: example
  analytics:
    cloudflareWebAnalytics:
      enabled: false
      src: https://static.cloudflareinsights.com/beacon.min.js
      token: YOUR_CLOUDFLARE_WEB_ANALYTICS_TOKEN
      defer: true
      consent: analytics
      beacon:
        spa: false
        send_page_view: true
    plausible:
      enabled: false
      src: https://plausible.io/js/script.js
      domain: example.com
      defer: true
      consent: analytics
    umami:
      enabled: false
      src: https://analytics.example.com/script.js
      websiteId: 00000000-0000-0000-0000-000000000000
      defer: true
      consent: analytics
      attrs:
        data-auto-track: "true"
    googleAnalytics:
      enabled: false
      measurementId: G-XXXXXXXXXX
      async: true
      consent: analytics
    custom:
      - enabled: false
        src: https://example.com/analytics.js
        defer: true
        consent: analytics
        attrs:
          data-site: example
  advertising:
    googleAdsense:
      enabled: false
      client: ca-pub-0000000000000000
      host: ca-host-pub-0000000000000000
      async: true
      crossorigin: anonymous
      consent: marketing
    custom:
      - enabled: false
        src: https://example.com/ad-network.js
        defer: true
        consent: marketing
        attrs:
          data-zone: sidebar
```

`plugins.comments.enabled` 默认为 `false`。需要评论时设为 `true`，并用 `provider` 选择唯一一家评论服务；未被选中的 provider 配置只作为备用配置，不会被加载。

可选第三方脚本会按 consent 分类延迟加载。默认分类包括 `necessary`、`preferences`、`analytics`、`marketing`。Consent UI 的 CSS 是独立功能样式：`themes/default/styles/consent.css`。

未保存选择前，页面只加载默认主题入口 `scripts/consent.js` 和 consent 样式；用户保存 Cookie/Consent 偏好后，构建器才按分类加载本地搜索、评论、统计、RUM 或其他功能脚本。这个默认行为用于帮助站点更容易满足 GDPR、ePrivacy、CCPA/CPRA 等地区对可选第三方脚本的告知和选择要求；具体合规仍取决于站点实际使用的服务、文案和隐私政策。

## 页面与索引

当前构建会生成：

- 首页与分页
- 文章页
- 归档页
- 分类页与分类详情页
- 标签页与标签详情页
- 普通 pages 页
- 搜索页与搜索索引
- `feed.xml`
- `sitemap.xml`（由 `@astrojs/sitemap` 生成，最终产物只保留统一的 URL 列表入口）
- `robots.txt`
- `llms.txt`

站点地图由 `@astrojs/sitemap` 生成标准 XML，不依赖自定义 XSL。浏览器应显示 XML 文档树或原始 XML，而不是被当成普通文本页面。

## 部署

推送到 `main` 后，GitHub Actions 会运行 `.github/workflows/cloudflare-pages.yml`，执行安装、构建、检查，然后发布 `public/` 到 Cloudflare Pages。

### Cloudflare Pages

[Cloudflare Pages](https://www.cloudflare.com/products/pages/) 是 Cloudflare 的静态/前端部署平台，官方说明支持从 Git 构建并免费开始使用。如果直接使用 Cloudflare Pages 的 Git 集成，项目配置可以按下面填写：

```text
Build command: pnpm install --frozen-lockfile && pnpm run build
Build output directory: public
Node.js version: 22.12 或更新
```

当前仓库也内置了 GitHub Actions 直传部署，使用 Cloudflare 官方推荐的 Wrangler Direct Upload。需要在 GitHub 仓库设置里添加：

```text
Settings -> Secrets and variables -> Actions -> Secrets

CLOUDFLARE_ACCOUNT_ID = Cloudflare 账号 ID
CLOUDFLARE_API_TOKEN  = 具有 Account / Cloudflare Pages / Edit 权限的 API token
```

可选仓库变量：

```text
Settings -> Secrets and variables -> Actions -> Variables

CLOUDFLARE_PAGES_PROJECT_NAME = Cloudflare Pages 项目名，默认 myblog
```

不要把 Cloudflare API Token 写入代码、README、issue 或聊天记录。Token 泄露后应立即在 Cloudflare Dashboard 里撤销并重新创建。

部署后在 Cloudflare Pages 项目里绑定自定义域名。`_headers` 会随 `public/` 一起发布，用来保证站点地图、`feed.xml`、`llms.txt` 等文件的 Content-Type。

### AWS CloudFront / Amplify

AWS 没有名为 “CloudFront Pages” 的 Pages 产品。静态站点通常有两种做法：

- `S3 + CloudFront`：把 `public/` 上传到 S3，用 [CloudFront](https://aws.amazon.com/cloudfront/pricing/) 分发。CloudFront Flat-rate Free plan 当前标为 `$0/month`，并说明无 overage charges；配额包括每月 1M requests、100GB data transfer、5GB S3 storage。适合想自己控制 bucket、缓存和分发策略的部署。
- `AWS Amplify Hosting`：更像 Pages 的 Git 连接部署体验。[Amplify Hosting](https://aws.amazon.com/amplify/pricing/) 官方价格页说明可部署前端应用，免费层包含每月 1,000 build minutes、5GB storage、15GB data transfer out，超出后按量计费。

Amplify 配置可以使用：

```text
Build command: npm ci && npm run build
Output directory: public
```

如果前面套 Cloudflare CDN，建议缓存策略：

- `/assets/*`：长缓存。
- `*.xml`、`*.txt`、`*.json`：短缓存。
- HTML：短缓存或默认缓存，避免文章更新后长时间不刷新。
