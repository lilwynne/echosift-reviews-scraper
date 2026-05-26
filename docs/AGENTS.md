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

## 备注

- 目前前端不依赖真实模型切换。
- `POST /api/analyze` 请求体为 `{ url, language }`；前端不直接暴露模型选择。
- 真实端到端测试需要有效 `SILICONFLOW_API_KEY`；Product Hunt 链接还需要 `PRODUCT_HUNT_API_TOKEN`。
