# Cloudflare 部署指南（免费套餐）

> **Agent 部署状态（2026-09-16）：** 本仓库 Worker 代码已就绪，但 **Eden 的 Cloudflare 账户尚未在 CI/Agent 环境完成认证**，因此 **生产 Worker 尚未部署到 Eden 账户**。请按下方「0. 认证」完成登录后运行 `bash scripts/deploy-worker.sh`。临时预览账户（`wrangler deploy --temporary`）无法绑定 Cron、无法使用 Workers AI，**不能**替代正式部署。

AI 中文情报站由两部分组成：

1. **Ingest Worker** — 每日 Cron 抓取 RSS、Workers AI 翻译、写入 D1
2. **Pages 静态站** — Astro 构建，从 Worker API 同步文章 JSON 后发布

## 免费套餐用量参考

| 服务           | 免费额度（约）         | 本站用法                                    |
| -------------- | ---------------------- | ------------------------------------------- |
| **Workers**    | 100,000 请求/天        | Cron 1 次/天 + 少量 API                     |
| **Workers AI** | 10,000 Neurons/天      | 每篇 2 次翻译（标题+摘要），每日约 30–60 篇 |
| **D1**         | 5 GB 存储、500 万读/天 | 文章元数据，远低于上限                      |
| **Pages**      | 500 次构建/月          | 每日 1 次 deploy hook 重建 ≈ 30 次/月       |

无需付费翻译 API 或 Netlify。

## 抓取策略（每日 Cron）

| 配置项                  | 默认值         | 说明                                             |
| ----------------------- | -------------- | ------------------------------------------------ |
| `INGEST_ITEMS_PER_FEED` | **8**          | 每个来源每次最多抓取最新 N 篇（Worker 环境变量） |
| `lookbackDays`          | **90**         | 忽略早于 90 天的 RSS 条目                        |
| `maxArticlesInExport`   | **120**        | 静态 JSON / API 最多导出篇数                     |
| 去重                    | `original_url` | 已入库 URL 跳过，Cron 每日只插入**新**文章       |

每个来源在一次 Cron 中会遍历 RSS 中最多 8 条**新**文章（非仅 1 条）。若某天某源发布 3 篇新文，则 3 篇全部入库。

来源列表见根目录 `ingest.config.json`（与 `worker/src/sources.ts` 同步）。Anthropic / Meta AI / xAI 无官方 RSS，使用 [Olshansk/rss-feeds](https://github.com/Olshansk/rss-feeds) 社区镜像并在页面标注。

### 本地一次性抓取（无需 Cloudflare 登录）

```bash
npm install
npm run ingest          # RSS → 翻译 → src/data/intelligence/articles.json
npm run build
```

本地翻译顺序：若设置 `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_TOKEN` 则使用 **Workers AI**；否则使用 MyMemory 免费机翻（仅用于本地/CI 生成静态 JSON）。**线上 Cron 始终使用 Workers AI。**

跳过翻译（仅测 RSS）：`INGEST_SKIP_TRANSLATE=1 npm run ingest`

## 0. 认证（Eden 必须完成其一）

### 方式 A — Wrangler OAuth（推荐，本机终端）

```bash
cd worker
npx wrangler login
```

在浏览器完成 Cloudflare 登录；OAuth 回调需能访问本机 `localhost:8976`。

### 方式 B — API Token（适合 CI / 无浏览器环境）

1. [Cloudflare Dashboard → API Tokens](https://dash.cloudflare.com/profile/api-tokens) → Create Token
2. 模板 **Edit Cloudflare Workers**，并包含：**Workers Scripts**、**D1**、**Workers AI**
3. 导出：

```bash
export CLOUDFLARE_API_TOKEN="your-token"
export CLOUDFLARE_ACCOUNT_ID="your-account-id"
```

### 方式 C — Cursor Cloudflare MCP

Cursor → Settings → MCP → **Cloudflare-bindings** → Authenticate。

验证：`cd worker && npx wrangler whoami`

## 1. 一键部署 Worker

```bash
cd worker
npm install
bash ../scripts/deploy-worker.sh
```

或手动：

```bash
cd worker
npx wrangler d1 create ai-intelligence --update-config --binding DB
npx wrangler d1 migrations apply ai-intelligence --remote
npx wrangler deploy
```

记录 Worker URL，例如 `https://ai-intelligence-ingest.<account-subdomain>.workers.dev`。

**Cron：** `0 8 * * *`（每天 08:00 UTC）。免费套餐 **1 个** Cron；部署后在 Dashboard → Triggers 确认。

### 可选：首次手动抓取

```bash
curl -X POST "https://ai-intelligence-ingest.<account>.workers.dev/api/ingest"
```

### 可选：每日构建后自动发布 Pages

1. Cloudflare Dashboard → Pages → 你的项目 → Settings → Builds → Deploy hooks → Create
2. 将 hook URL 设为 Worker 密钥 `DEPLOY_HOOK_URL`：

```bash
cd worker
npx wrangler secret put DEPLOY_HOOK_URL
# 粘贴 deploy hook URL
```

Cron 默认每天 **08:00 UTC** 运行（见 `worker/wrangler.toml`）。

## 3. 部署 Pages 静态站

### 方式 A — 连接 Git（推荐）

1. Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git
2. 选择本仓库分支
3. 构建设置：
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Node.js version:** 22（与 `package.json` engines 一致）
4. 环境变量（Production + Preview 建议都设）：
   - `ARTICLES_API_URL` = `https://ai-intelligence-ingest.<account-subdomain>.workers.dev/api/articles`
5. 保存并部署

部署 Worker 并跑过首次 ingest 后，将上述 URL 写入 Pages 环境变量；`prebuild` 会从 API 拉取 D1 中的文章。

`prebuild` 优先从 Worker API 同步；若无 `ARTICLES_API_URL`，则自动运行 `npm run ingest` 抓取真实 RSS 并写入 `src/data/intelligence/articles.json`。

### 方式 B — Wrangler 直传

```bash
npm ci
ARTICLES_API_URL=https://... npm run build
npx wrangler pages deploy dist --project-name=ai-intelligence
```

## 4. 更新站点 URL

部署后，将 `src/config.yaml` 中 `site.site` 改为你的 Pages 域名（如 `https://ai-intelligence.pages.dev`），重新构建。

## 5. 本地开发

```bash
npm run ingest   # 抓取最新 RSS 并更新 articles.json
npm run dev

# Worker 本地调试（需 wrangler login + D1）
cd worker && npm run dev
```

## 架构示意

```
RSS (OpenAI, Anthropic, Cursor, xAI, …)
        ↓  Cron / POST /api/ingest
  Ingest Worker + Workers AI (翻译)
        ↓
      D1 数据库
        ↓  GET /api/articles
  Pages build (sync-articles.mjs → Astro)
        ↓
   静态 HTML (dist/)
```

## 故障排查

- **首页无新文章：** 检查 Cron 日志、`curl /api/articles` 是否有数据、`ARTICLES_API_URL` 是否配置
- **翻译失败：** Workers AI 需在账户中启用；Worker 会依次尝试 m2m100 → GLM-4.7-Flash → MyMemory 免费机翻
- **Agent 无法部署：** 需 Eden 完成上文「0. 认证」；不要使用 `wrangler deploy --temporary` 作为生产环境（无 Cron、预览域名有 Bot 挑战、临时账户无 Workers AI）
- **某个源抓取失败：** 查看 ingest 响应中的 `sourcesFailed`；官方 RSS URL 可能变更，编辑 `worker/src/sources.ts`
