# Cloudflare 部署指南（免费套餐）

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

## 1. 创建 D1 数据库

```bash
cd worker
npm install
npx wrangler d1 create ai-intelligence
```

将输出的 `database_id` 填入 `worker/wrangler.toml` 的 `database_id`。

```bash
npx wrangler d1 migrations apply ai-intelligence --remote
```

## 2. 部署 Ingest Worker

```bash
cd worker
npx wrangler deploy
```

记录 Worker URL，例如 `https://ai-intelligence-ingest.<account>.workers.dev`。

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
4. 环境变量：
   - `ARTICLES_API_URL` = `https://ai-intelligence-ingest.<account>.workers.dev/api/articles`
5. 保存并部署

`prebuild` 会从 API 拉取文章写入 `src/data/intelligence/articles.json`，再执行 `astro build`。API 不可用时使用仓库内 seed 数据。

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
# 静态站（使用 seed 数据）
npm run dev

# Worker 本地调试
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
- **翻译失败：** Workers AI 需在账户中启用；查看 Worker 日志中的 fallback 信息
- **某个源抓取失败：** 查看 ingest 响应中的 `sourcesFailed`；官方 RSS URL 可能变更，编辑 `worker/src/sources.ts`
