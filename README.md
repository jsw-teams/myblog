# Siteforge

[English README](README.en.md)

<p align="center">
  <img src="static/siteforge-icon.png" alt="Siteforge project icon" width="160">
</p>

Siteforge 是一个偏 Hexo 使用习惯的静态网站/博客构建器。站点配置放在
`config.yml`，文章和页面放在 `content/`，主题放在 `themes/<name>/`，
构建输出到 `dist/`。

Siteforge 的核心目标是：写博客时像普通 Markdown 博客一样直接改内容；需要二次开发时，再进入主题、配置和构建器扩展。

## 快速开始

```bash
npx @jsw-teams/siteforge@latest init my-site
cd my-site
npm install
npm run server
npm run generate
npm run check
```

- `siteforge init` 会复制 npm 包内的 `starter/` 中立模板。
- `npm run server` 类似 `hexo server`，用于本地实时预览。
- `npm run generate` 类似 `hexo generate`，生成 `dist/`。
- `npm run check` 检查生成结果、主题资源、sitemap、feed、Agent discovery 和 WebMCP bootstrap。

`starter/` 不包含生产/预览环境 secrets，不包含真实站点域名、真实作者身份、真实 analytics token 或特定生产 robots 策略。新项目创建后，请自行配置 `siteUrl`、站点名、analytics、robots、Cloudflare Pages 项目和 GitHub Secrets。

当前仓库根目录可以继续作为 Siteforge 的示例站和开发站；它不是 `siteforge init` 的复制来源。

## 初始化后的目录

```text
config.yml              # 站点级配置
content/posts/          # 文章 Markdown
content/pages/          # 页面 Markdown/HTML
static/                 # 项目静态文件
themes/default/         # 默认主题副本
src/                    # Siteforge 构建器
scripts/                # 本地预览与检查脚本
dist/                   # 生成产物，不要手改
```

默认内容很小：一个首页、关于页、归档页、分类页、标签页、搜索页和一篇 `hello-siteforge` 示例文章。

## 内容与页面

文章路径：

```text
content/posts/<slug>/index.<locale>.md
```

页面路径：

```text
content/pages/<slug>/index.<locale>.md
```

默认特殊页也走同一套 pages 规则：

```text
content/pages/home/index.<locale>.md        # /<locale>/
content/pages/archive/index.<locale>.md     # /<locale>/archive/
content/pages/categories/index.<locale>.md  # /<locale>/categories/
content/pages/tags/index.<locale>.md        # /<locale>/tags/
content/pages/search/index.<locale>.md      # /<locale>/search/
```

`content/pages` 里的 Markdown 可以直接写 HTML。你可以在页面里写 `<header>`、`<section>`、`<img>`，也可以把动态组件放到想出现的位置：

```html
<!-- siteforge:post-list -->
<!-- siteforge:pagination -->
<!-- siteforge:archive-list -->
<!-- siteforge:terms -->
<!-- siteforge:search-panel -->
<!-- siteforge:languages -->
```

把 slot 当成完整组件，不要在后面补重复说明。比如 `<!-- siteforge:search-panel -->` 已经包含输入框、空状态、结果数和错误状态。

## 站点配置

`config.yml` 是站点层入口。它不只是构建参数，也是二次开发和 agent 协作时最重要的结构化信息来源。

最小示例：

```yaml
siteUrl: https://example.com
defaultLocale: en
activeLocales:
  - en
siteName:
  en: Siteforge Starter
theme:
  name: default
```

适合放在 `config.yml` 的内容：

- `siteName`、`description`、`author`
- `defaultLocale`、`activeLocales`
- `nav.links`、`nav.utilityLinks`
- `footer`、`head`、`pwa`、`icons`
- `plugins`、`features`、`featureScripts`、`featureCategories`
- `robots`、`llms`、`feed`、`discovery`

构建器会根据这些配置生成 `robots.txt`、`llms.txt`、`llms-full.txt`、`feed.xml`、`sitemap.xml`、`openapi.json`、`.well-known/api-catalog`、`.well-known/mcp/server-card.json` 和 `_headers`。如果某个站务文件能从 `config.yml` 推导出来，就不要在 `static/` 里维护另一份手写版本。

## 主题与二次开发

只写博客时，优先修改 `config.yml` 和 `content/`。

需要改视觉、布局或脚本时，建议：

1. 复制 `themes/default` 到 `themes/<your-theme>`。
2. 在 `config.yml` 中设置 `theme.name: <your-theme>`。
3. 修改 `themes/<your-theme>/theme.yml`、`templates/`、`style.css`、`styles/`、`scripts/` 和 `source-assets/`。
4. 只有主题 API 表达不了需求时，才修改 `src/`。

修改新用户默认模板时，请改 `starter/`；修改当前仓库示例站时，才改根目录 `config.yml/content/static/themes`。不要把真实生产域名、真实 analytics token、Cloudflare 配置或部署 secrets 同步进 `starter/`。

## 插件与 Consent

插件是可选能力。简单站点可以不用插件；复杂站点可以按需启用搜索、评论、统计、广告、WebMCP 或自定义脚本。

默认主题只有 consent 入口无条件加载。评论、统计、广告和营销脚本应通过主题配置声明，并按 `necessary`、`preferences`、`analytics`、`marketing` 等分类加载。Cloudflare Web Analytics 默认关闭，token 使用 placeholder。

## 部署

Siteforge 可以部署到 Cloudflare Pages，也可以部署到任何能托管 `dist/` 的静态托管服务。

Cloudflare Pages Git 集成示例：

```text
Build command: npm install && npm run generate
Build output directory: dist
Node.js version: 22.12 或更新
```

仓库不会提交真实 Cloudflare credentials、account IDs、project names、zone IDs 或生产部署 secrets。fork 或二次开发者应创建自己的 Cloudflare 项目，并通过 GitHub Secrets 或 Cloudflare Dashboard 管理敏感配置。

## Agent 协作

根目录 `AGENTS.md` 是给 Codex、Claude 或其他代码代理看的项目说明。

只是写博客时，可以这样提示：

```text
请先阅读 README.md、AGENTS.md 和 config.yml。我只是使用 Siteforge 写博客，请优先修改 config.yml 和 content/ 下的文章或页面；除非我明确要求客制化主题或构建器能力，不要改 themes/ 或 src/。
```

做二次开发时，可以这样提示：

```text
请先阅读 AGENTS.md 和 config.yml。把 config.yml 当作站点名、多语言、导航、插件、consent、页脚、robots、llms、OpenAPI、API catalog、MCP server card、headers 和其他站务配置的结构化来源。优先修改 config.yml、content/pages 和主题目录；只有主题 API 无法表达需求时才修改 src/。
```

## 许可

Siteforge 使用 `AGPL-3.0-or-later`。基于 Siteforge 修改、分发、公开部署或二次开发的版本，应按 AGPL 要求继续开源对应源码。

请保留原作者标注：`Siteforge by JSW Teams`，并保留或等效展示仓库中的 `NOTICE` 信息与原始仓库链接。
