# EchoSift Handoff

## 产品定位

EchoSift 是一个免费、轻量的用户评价分析工具。用户粘贴 Product Hunt、App Store 或 Google Play 链接后，可以通过 `/api/analyze` 发起真实评论抓取和 AI 分析，并看到情绪、痛点、需求请求和典型用户原话。

## 当前前端状态

- 页面采用深色模式和冷色渐变背景。
- 品牌已更新为 EchoSift。
- 右上角仅保留语言切换和“永久免费”状态。
- 已移除登录、注册、模型切换和订阅入口。
- Hero 区只保留链接输入和“开始分析”按钮。
- Dashboard 已绑定 `/api/analyze` 返回的真实 `analysis` 数据；`lib/mock-data.ts` 仍提供本地化文案、标签和图标。

## 关键文件

- `app/page.tsx`
- `app/layout.tsx`
- `components/Header.tsx`
- `components/EchoSiftLogo.tsx`
- `components/HeroAnalyzer.tsx`
- `components/Dashboard.tsx`
- `lib/analysis-types.ts`
- `lib/mock-data.ts`
- `docs/ai-handoff.md`
- `docs/issue.md`
- `docs/pr-description.md`
- `extension/`

## 备注

- 目前前端不依赖真实模型切换。
- `POST /api/analyze` 请求体为 `{ url, language }`；前端不直接暴露模型选择。
- 真实端到端测试需要有效 `SILICONFLOW_API_KEY`；Product Hunt 链接还需要 `PRODUCT_HUNT_API_TOKEN`。
- Product Hunt GraphQL 评论没有单条 `rating`；情绪分布必须使用 `lib/analyze-pipeline.ts` 的文本启发式逻辑，不能让无 rating 的 Product Hunt 评论默认全中性。App Store / Google Play 仍使用 rating 逻辑。
- Product Hunt 的 typical voices 应优先代表普通用户，不能只因为 maker/founder 置顶评论更长或 votes 更高就总选 maker 评论。
- App Store 抓取必须优先走 Apple RSS：先 `mostrecent` 后 `mosthelpful`，URL 国家后依次尝试 `us`、`cn`、`jp`、`gb`、`ca`、`au`，主国家需要继续扫描稀疏空页并重试空的末页；只有 RSS 完全没有可用评论正文时才使用 `apple-web-page` 兜底。
- App Store 网页兜底通常只能拿到产品页内嵌的少量可见评论，常见约 8 条；评分数量不等于可抓取评论正文数量。生产仍返回 8 条时先确认后端已部署且服务端缓存版本为 `analysis:v5`，插件 session cache 前缀为 `analysis:v4`。
- Chrome 插件位于 `extension/`；后台会合并同一 URL 的重复分析请求，成功结果会写入 `chrome.storage.session` 并以内存缓存兜底。
- 插件内容脚本通过 history/popstate/hashchange/focus/pageshow/visibilitychange 和点击后的短延迟检查识别 SPA URL 变化，不再全页面 MutationObserver 或 500ms 轮询。
- 根项目 `tsconfig.json` 排除 `extension/`；插件必须使用 `extension/tsconfig.json` 通过 `cd extension && npx tsc --noEmit` 单独校验。
- `.gitignore` 已按用途增加注释，并忽略本地缓存/工具产物目录，例如 `.echosift/`、`.playwright-cli/`、`.cache/` 和 `.npm-cache/`。
- `.echosift/` 和 `.playwright-cli/` 已通过 `git rm --cached` 停止跟踪；本地文件仍可保留，但后续不应再提交或 push。
