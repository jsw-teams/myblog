# Siteforge

[English README](README.en.md)

一个偏 Hexo 思路的静态网站/博客构建器：站点配置放在根目录 `config.yml`，主题样式、布局、脚本和主题级 i18n 放在 `themes/<name>/`，内容来自 `content/`，构建输出到 `dist/`。

目标是降低普通内容站点的前端开发成本。开发者可以把大部分工作放在 Markdown、YAML 和主题文件上，而不是每个站点都重新搭页面结构、SEO、sitemap、feed、本地搜索和第三方脚本加载逻辑。默认主题内置本地搜索和合规友好的 Cookie/Consent 偏好选择器，可按需启用评论、统计、RUM 或其他插件脚本。

## 当前检查结果

Google PageSpeed 原始报告：
[https://pagespeed.web.dev/analysis/https-blog-js-gripe-en/ifrxjzn6xy?hl=zh-cn](https://pagespeed.web.dev/analysis/https-blog-js-gripe-en/ifrxjzn6xy?hl=zh-cn)

当前部署在桌面端达到性能、无障碍、最佳做法、SEO 全 100，智能体浏览检查 3/3；移动端性能 98，其余项目 100，说明默认主题在轻量渲染、可访问性、搜索引擎基础信息和 Agent discovery 方面已经处于很稳的状态。

![PageSpeed desktop report](https://picture.js.gripe/api/images/9a4790a6-9af9-4872-ba5c-07a98412752a.png)

![PageSpeed mobile report](https://picture.js.gripe/api/images/38c6d074-b7c3-4da0-b183-aae87e100787.png)

Cloudflare Agent 检查同样通过，验证站点已暴露适合代理读取的发现入口。

![cloudflare agent check](https://picture.js.gripe/api/images/692e1a39-3a94-4ac6-a6b4-b4afab049eff.png)

## 给模型协作使用

根目录 `AGENTS.md` 是给 Codex、Claude 或其他代码代理看的项目说明。用 Siteforge 开新项目或新主题时，先让模型阅读它，再明确要求：

```text
请基于 Siteforge 的主题架构开展二次开发。先读取 config.yml，把站点名、多语言、导航、插件、consent、页脚、robots、llms、OpenAPI、API catalog、MCP server card、headers 和其他站务配置当作二次开发参考，不要让用户反复口头补充这些结构化信息。复制默认主题后，必须把主题目录名和 theme.name 改成适合当前项目的名称，不要沿用 default、myblog 或其他来源项目名称。优先修改 config.yml、content/pages 和 themes/<project-theme>/ 下的 theme.yml、templates/、style.css、styles/、scripts/ 和 source-assets/；只有主题 API 无法表达需求时才修改 src/。
```

可选搭配两个 skill 仓库使用：

- [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail)：用于压低复杂度。调用时可以对模型说 `使用 ponytail full`、`使用 ponytail lite` 或 `使用 ponytail ultra`，让它优先复用现有结构、少加抽象、少加依赖。
- [anthropics/skills](https://github.com/anthropics/skills/)：用于给模型补充专业工作流。按需要安装其中的写作、前端、文档、测试或其他 skills，然后在任务里点名使用对应 skill。

这两个 skill 不是 Siteforge 的运行依赖，只是协作约束。推荐提示：

```text
请先阅读 AGENTS.md 和 config.yml。使用 ponytail full 控制复杂度；如果已安装 anthropics/skills 中相关技能，请结合对应 skill 工作。目标是基于 Siteforge 开发当前项目自己的站点配置、内容页面和前端主题，而不是复制当前博客。插件、评论、统计、广告、搜索等能力都按 config.yml 和项目需要选择，可多可少，也可以完全不启用。
```

## 快速开始

如果你熟悉 Hexo，可以把 Siteforge 的常用命令按下面理解：

- 安装依赖：仍然是 `npm install`，相当于先把主题、构建器和内容处理依赖装好。
- 生成静态站点：`npm run generate`，对应 Hexo 里的 `hexo generate` / `hexo g`。
- 本地预览：`npm run server`，对应 Hexo 里的 `hexo server` / `hexo s`。
- 发布前检查：`npm run check`，用于确认 `dist/`、sitemap、feed、Agent discovery 和主题资源都生成正常。

```bash
npm install
npm run generate
npm run check
npm run server
```

本地预览默认运行在：

```text
http://127.0.0.1:4173/
```

`npm run server` 会启动实时预览：每 10 秒扫描 `content/`、`themes/`、`src/`、`static/`、`config.yml` 和 `astro.config.mjs`，检测到变更才重新生成并刷新浏览器。构建出错时预览进程不会退出，浏览器页面会显示错误提示；修好文件后会自动重新构建，直到你在终端里主动停止。预览模式下，`content/pages/<slug>/index.<locale>.md` 的变更会优先只重建对应页面；文章、主题、配置或构建器源码这类会影响多页面的变更仍走全量生成。构建期间访问尚未生成的新路径时，预览页会显示“正在生成页面”，构建完成后自动刷新，而不是直接把临时状态当成正式 404。

如果 PowerShell 执行策略阻止 `npm.ps1`，可以使用：

```powershell
npm.cmd install
npm.cmd run generate
npm.cmd run check
npm.cmd run server
```

## 目录结构

```text
config.yml              # 站点级配置
content/posts/          # 文章 Markdown
content/pages/          # 普通页面 Markdown
src/                    # 构建器、内容解析、站务渲染
static/                 # 站点静态文件，会复制到 dist/
themes/default/         # 默认主题
dist/                   # 构建产物
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
content/pages/<slug>/index.<locale>.md
```

首页和默认博客索引页也可以用同一套 pages 规则定制：

```text
content/pages/home/index.<locale>.md        # /<locale>/
content/pages/archive/index.<locale>.md     # /<locale>/archive/
content/pages/categories/index.<locale>.md  # /<locale>/categories/
content/pages/tags/index.<locale>.md        # /<locale>/tags/
content/pages/search/index.<locale>.md      # /<locale>/search/
```

`content/pages` 里的 Markdown 支持直接书写静态 HTML，适合把页面结构、组件位置和少量页面脚本直接放在内容文件里维护。frontmatter 仍负责页面 `title`、`description`、`translationKey` 等元信息。这个设计让非前端用户也能用较低成本调整首页、归档页、分类页、标签页、搜索页和普通页面，不必每次都进入主题模板或构建器源码。

默认主题会把这些 pages 的正文作为页面主体渲染；特殊页面可用 Siteforge 占位符插入构建器生成的动态组件：

```html
<!-- siteforge:post-list -->
<!-- siteforge:pagination -->
<!-- siteforge:archive-list -->
<!-- siteforge:terms -->
<!-- siteforge:search-panel -->
<!-- siteforge:languages -->
```

例如首页可以在 `content/pages/home/index.zh-CN.md` 里直接写 `<section>`、`<img>`、`<script>`，再把 `<!-- siteforge:post-list -->` 放在想显示文章列表的位置。普通页面可以用 `<!-- siteforge:languages -->` 放置语言切换区域。这样比 Hexo 常见的“改主题模板才能挪组件”更低成本；普通用户改 Markdown 文件就能调整页面布局。

写作和 agent 协作时，把 slot 当成已经完成的动态组件，不要在它下面补重复说明。反例是：

```html
<!-- siteforge:search-panel -->
<p>输入关键词开始搜索。</p>
```

搜索框、空状态、结果数和错误提示已经由 `<!-- siteforge:search-panel -->` 输出；额外补一句会让页面重复、显得像临时注释。更好的做法是在 slot 前方用页面自己的 `<header>` 写清楚页面意图，然后直接放置动态组件。

### 开发新的动态 slot

当页面需要“用户能在 Markdown/HTML 里决定位置，但内容由构建器生成”的区域时，才新增 `<!-- siteforge:xxx -->`。它适合文章列表、分页、归档列表、标签集合、语言切换、搜索面板这类需要结构化数据或脚本状态的组件；如果只是固定文案、静态链接或一次性 HTML，直接写在 `content/pages` 里即可，不要加 slot。

新增 slot 的推荐流程：

1. 先确定 slot 名称，使用短横线小写：`<!-- siteforge:related-posts -->`。在代码里对应 camelCase key：`relatedPosts`。
2. 在 `src/lib/theme-html.mjs` 的页面渲染函数里生成组件 HTML，然后传给 `replaceSlots(pageContent.html, { relatedPosts })`。`replaceSlots` 会同时识别 `<!-- siteforge:related-posts -->` 和 `{{ siteforge.relatedPosts }}`。
3. 如果 `src/templates.mjs` 里也有 fallback 渲染路径，同步加入同名 slot，避免没有 HTML 主题模板时行为不一致。
4. 如果组件需要主题模板包裹，在 `themes/default/templates/*.html` 里保留 `{{{content}}}`，让页面正文和 slot 替换结果进入模板；不要把某个站点的布局硬编码进 `src/`。
5. 如果组件需要文案，放进 `themes/default/i18n.yml`，并同步 `src/i18n.mjs` 的默认值。
6. 如果组件需要样式或脚本，通过 `themes/default/theme.yml` 的 `pageStyles`、`pageScripts`、`featureScripts` 或 `featureStyles` 挂载，不要在 Markdown 里写大段 CSS。
7. 更新 README、`AGENTS.md` 和 `static/AGENTS.md` 的 slot 列表，让用户和 agent 都知道这个组件可用。
8. 运行 `npm run generate` 和 `npm run check`。如果这是新的框架契约，也要补充检查脚本，避免后续主题回退。

最小示例：

```js
const relatedPosts = renderPostList(posts.slice(0, 3), locale);
const content = replaceSlots(pageContent.html, { relatedPosts });
```

页面里使用：

```html
<section aria-labelledby="related-title">
  <h2 id="related-title">相关文章</h2>
  <!-- siteforge:related-posts -->
</section>
```

slot 组件应该自己输出完整、可访问、可运行的内部状态。不要要求用户在 slot 后面补“这里会显示结果”“输入关键词开始搜索”之类说明；这些属于组件自身的空状态、错误状态或加载状态。

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

二次开发或让 agent 接手新站点时，`config.yml` 应该和主题一起作为开发参考。它不是“构建参数附录”，而是可以动态生成页面外壳和站务内容的结构化来源，例如：

- `siteName`、`description`、`author` 生成 `<title>`、SEO 摘要、JSON-LD、feed 和默认页面文案。
- `defaultLocale`、`activeLocales` 决定多语言路由、语言切换和 hreflang。
- `nav.links`、`nav.utilityLinks` 生成主导航、搜索入口、归档入口或其他站点级链接。
- `footer`、`head`、`pwa`、`icons` 生成页脚、头部元信息、PWA 和图标资源。
- `plugins`、`features`、`featureScripts`、`featureCategories` 决定搜索、评论、统计、广告、WebMCP 和 consent 加载策略。
- `robots`、`llms`、`feed`、`discovery` 生成 `robots.txt`、`llms.txt`、`llms-full.txt`、`feed.xml`、`openapi.json`、`.well-known/api-catalog`、`.well-known/mcp/server-card.json` 和 `_headers`。

这类信息适合由 YAML 驱动，而不是让前端模板或 static 站务文件硬编码。开发者和 agent 做二次开发时，应先把站点名、语言、导航、页脚、插件开关、第三方脚本、爬虫策略和 agent discovery 信息整理进 `config.yml` / `theme.yml`，再调整 `content/pages` 和主题样式。这样用户只需要填结构化站务数据，构建器就能生成对应 UI 和站务文件，前端沟通成本会低很多。

注意：如果某个站务文件能从 `config.yml` 推导出来，就不要在 `static/` 里维护另一份手写版本。二次开发时如果发现 `robots.txt`、`llms.txt`、`openapi.json`、API catalog、MCP server card 或 `_headers` 还需要手改，应优先补动态生成逻辑，再更新 README 和 AGENTS 说明。

新项目不建议长期沿用 `default` 作为主题名。复制默认主题后，把目录改成当前项目合适的名称，例如 `themes/company-docs/`、`themes/product-site/` 或 `themes/portfolio/`，再把 `theme.name` 改成同名值。

不要把主题 CSS、主题 JS 或布局配置写进根配置；这些属于主题目录。

## 主题配置

`themes/default/theme.yml` 是当前部署使用的主题配置；`themes/default/theme.example.yml` 是给新主题或新站点复制参考的示例配置。

`theme.yml` 管理主题资源、页面布局、可选插件和第三方脚本。默认主题把页面拆成独立模板与样式，方便开发者只改需要的部分：

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
  webMcp: true

featureScripts:
  search: scripts/search.js
  comments: scripts/comments.js

featureStyles:
  consent: styles/consent.css

pageStyles:
  home:
    - styles/home.css
  archive: styles/archive.css
  categories: styles/terms.css
  tags: styles/terms.css
  term: styles/terms.css
  page: styles/page.css
```

构建器会复制主题资源到 `dist/assets/theme/<theme>/`，并按文件内容自动生成版本号查询串，不需要手写 `?v=...`。

`scripts/consent.js` 是默认主题唯一无条件加载的外部入口脚本。未保存隐私偏好前，它只加载 consent 自身需要的样式并锁定页面交互；搜索、评论、媒体增强、统计或 RUM 等功能脚本会在用户保存选择后按分类加载。WebMCP 是例外：它由构建器内联一个小型注册脚本，不额外加载 `web-mcp.js`，用于让浏览器代理在页面加载时发现站点工具。

导航入口也由主题配置控制。分类、标签、搜索、归档或任意 pages 入口都只是默认主题示例，可以用 `enabled: false` 关闭，或直接从 `nav.links` / `nav.utilityLinks` 删除。

默认主题当前自带这些偏博客的页面层。其他项目不必照搬，可以按业务模型改成产品页、文档页、作品页、案例页、工具页、落地页或其他页面类型：

- `home`：首页与分页列表。
- `archive`：归档页。
- `categories` / `tags`：分类、标签索引页。
- `term`：单个分类或标签详情页。
- `page`：普通 pages 页。
- `post`：文章页。

## 插件与 Consent

插件是可选能力，不是每个站点都必须启用。简单站点可以完全不用插件；复杂站点可以按需要启用评论、统计、RUM、广告、地图、搜索、表单、商务或自定义脚本。评论、统计、RUM 等第三方能力放在主题的 `plugins` 下：

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

推送到 `main` 后，GitHub Actions 会运行 `.github/workflows/cloudflare-pages.yml`，执行安装、生成、检查，然后发布 `dist/` 到 Cloudflare Pages。这里的“生成”对应 Hexo 用户熟悉的 `hexo generate`，实际命令是 `npm run generate`。

### Cloudflare Pages

[Cloudflare Pages](https://www.cloudflare.com/products/pages/) 是 Cloudflare 的静态/前端部署平台，官方说明支持从 Git 构建并免费开始使用。如果直接使用 Cloudflare Pages 的 Git 集成，项目配置可以按下面填写：

```text
Build command: pnpm install --frozen-lockfile && pnpm run generate
Build output directory: dist
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

CLOUDFLARE_PAGES_PROJECT_NAME = Cloudflare Pages 项目名，建议 siteforge
```

不要把 Cloudflare API Token 写入代码、README、issue 或聊天记录。Token 泄露后应立即在 Cloudflare Dashboard 里撤销并重新创建。

部署后在 Cloudflare Pages 项目里绑定自定义域名。`_headers` 会随 `dist/` 一起发布，用来保证站点地图、`feed.xml`、`llms.txt` 等文件的 Content-Type。

### AWS CloudFront / Amplify

AWS 没有名为 “CloudFront Pages” 的 Pages 产品。静态站点通常有两种做法：

- `S3 + CloudFront`：把 `dist/` 上传到 S3，用 [CloudFront](https://aws.amazon.com/cloudfront/pricing/) 分发。CloudFront Flat-rate Free plan 当前标为 `$0/month`，并说明无 overage charges；配额包括每月 1M requests、100GB data transfer、5GB S3 storage。适合想自己控制 bucket、缓存和分发策略的部署。
- `AWS Amplify Hosting`：更像 Pages 的 Git 连接部署体验。[Amplify Hosting](https://aws.amazon.com/amplify/pricing/) 官方价格页说明可部署前端应用，免费层包含每月 1,000 build minutes、5GB storage、15GB data transfer out，超出后按量计费。

Amplify 配置可以使用：

```text
Build command: npm ci && npm run generate
Output directory: dist
```

如果前面套 Cloudflare CDN，建议缓存策略：

- `/assets/*`：长缓存。
- `*.xml`、`*.txt`、`*.json`：短缓存。
- HTML：短缓存或默认缓存，避免文章更新后长时间不刷新。
