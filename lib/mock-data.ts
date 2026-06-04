import {
  AlertTriangle,
  Bug,
  Flame,
  HeartPulse,
  Layers3,
  Lightbulb,
  MessageSquare,
  Route,
  SearchCheck,
  ShieldCheck,
  Star,
  Tags,
  Users
} from "lucide-react";

export const productName = "EchoSift";

export const languages = [
  { code: "zh-CN", label: "简体中文" },
  { code: "zh-TW", label: "繁體中文" },
  { code: "en", label: "English" }
] as const;

export type Language = (typeof languages)[number]["code"];

export const analysisModels = [
  {
    id: "free",
    labels: {
      "zh-CN": "EchoSift 免费分析",
      "zh-TW": "EchoSift 免費分析",
      en: "EchoSift Free Analysis"
    }
  }
] as const;

export type AnalysisModel = (typeof analysisModels)[number]["id"];

export const getModelLabel = (model: AnalysisModel, language: Language) =>
  analysisModels.find((item) => item.id === model)?.labels[language] ??
  analysisModels[0].labels[language];

export const trendData = [
  { date: "5/13", positive: 54, neutral: 32, negative: 14 },
  { date: "5/14", positive: 59, neutral: 26, negative: 15 },
  { date: "5/15", positive: 61, neutral: 24, negative: 15 },
  { date: "5/16", positive: 58, neutral: 29, negative: 13 },
  { date: "5/17", positive: 64, neutral: 22, negative: 14 },
  { date: "5/18", positive: 67, neutral: 20, negative: 13 },
  { date: "5/19", positive: 62, neutral: 24, negative: 14 }
];

export const localizedContent = {
  "zh-CN": {
    header: {
      tagline: "用户评价分析与竞品调研",
      languageLabel: "选择语言",
      githubLabel: "GitHub",
      githubAriaLabel: "在 GitHub 打开 EchoSift 仓库"
    },
    hero: {
      badge: "Product Hunt / App Store / Google Play 评价分析",
      title: "EchoSift 轻量筛出用户评价里的真实信号",
      description:
        "粘贴一个产品链接，EchoSift 会用免费的轻量流程汇总情绪、痛点、功能请求和竞品差异。无需账号、无需选择模型，打开就能分析。",
      placeholder: "在此粘贴 Product Hunt 或商店链接...",
      button: "开始分析",
      previewTitle: "Codex 示例洞察预览",
      previewSubtitle: "先看到情绪、痛点和需求优先级，再开始分析",
      sourceHint: "支持 Product Hunt、App Store、Google Play",
      previewMetric: {
        label: "综合情绪",
        value: 84,
        suffix: "/100",
        description: "当前示例来源的情绪得分"
      },
      previewCards: [
        {
          title: "权限信任",
          priority: "P0",
          detail: "用户希望审批文案、diff 和回滚路径更清楚",
          value: 88
        },
        {
          title: "移动端衔接",
          priority: "P1",
          detail: "商店评论反复提到跨设备会话连续性",
          value: 74
        },
        {
          title: "长任务进度",
          priority: "P2",
          detail: "大型仓库任务需要更丰富的过程反馈",
          value: 63
        }
      ],
      previewMockReport: {
        badge: "Codex 示例分析",
        product: "Codex",
        timeframe: "模拟近 30 天评论",
        sampleNote: "示例数据",
        sourceCountLabel: "条评价",
        readyLabel: "Codex 示例报告已载入",
        scanningLabel: "正在分析真实链接",
        revealedLabel: "洞察卡片已生成",
        preparingLabel: "准备展示",
        signalLabel: "信号强度",
        sourceTabLabel: "选择示例来源",
        sourceTabs: [
          { id: "product-hunt", label: "Product Hunt" },
          { id: "app-store", label: "App Store" },
          { id: "google-play", label: "Google Play" }
        ],
        sourceReports: [
          {
            id: "product-hunt",
            summary:
              "这份 Product Hunt 示例报告只基于一个 Product Hunt 产品链接生成。评论集中称赞 Codex 能理解项目上下文、改动前会解释计划，也提醒新用户需要更直观的权限说明。",
            metrics: [
              {
                label: "模拟评价",
                value: "642",
                detail: "来自当前 Product Hunt 链接"
              },
              {
                label: "高价值信号",
                value: "238",
                detail: "可聚类为痛点、需求和购买阻力"
              },
              {
                label: "正向占比",
                value: "68%",
                detail: "围绕开发效率与代码解释能力"
              }
            ],
            source: {
              name: "Product Hunt",
              count: "642",
              sentiment: "86%",
              signal: "独立开发者称赞终端协作、代码审查和快速修复流程。",
              value: 86
            },
            sentimentMix: [
              { label: "正向", value: 68, color: "#10b981" },
              { label: "中立", value: 21, color: "#38bdf8" },
              { label: "负向", value: 11, color: "#f97316" }
            ],
            sections: [
              {
                title: "高频痛点",
                items: [
                  "审批权限与回滚说明不够直观",
                  "首次运行前对会修改哪些文件缺少预期",
                  "长任务等待期间的进度反馈偏少"
                ]
              },
              {
                title: "功能请求",
                items: [
                  "改动前自动列出影响范围",
                  "一键生成 PR 评论草稿和测试摘要",
                  "保存项目记忆快照，便于下次继续"
                ]
              }
            ],
            reviewSnippets: [
              {
                source: "Product Hunt",
                sentiment: "正向",
                quote:
                  "Codex 像一个会先说明计划的资深搭档，能把小修复和测试补齐交给它。"
              },
              {
                source: "Product Hunt",
                sentiment: "中立",
                quote:
                  "它的效率很高，但我希望在授权前更清楚知道哪些文件会被改动。"
              },
              {
                source: "Product Hunt",
                sentiment: "负向",
                quote:
                  "大仓库任务跑很久时，我想知道它卡在哪一步，以及是否可以安全暂停。"
              }
            ]
          },
          {
            id: "app-store",
            summary:
              "这份 App Store 示例报告只基于一个 App Store 应用链接生成。移动端用户认可随时查看任务进度，但反复提到 iPad 与桌面会话衔接还不够顺畅。",
            metrics: [
              {
                label: "模拟评价",
                value: "438",
                detail: "来自当前 App Store 链接"
              },
              {
                label: "高价值信号",
                value: "164",
                detail: "可聚类为移动体验和协作阻力"
              },
              {
                label: "正向占比",
                value: "61%",
                detail: "围绕任务查看与通知体验"
              }
            ],
            source: {
              name: "App Store",
              count: "438",
              sentiment: "81%",
              signal: "移动端用户喜欢随时查看任务，但希望 iPad 和桌面会话更顺畅。",
              value: 81
            },
            sentimentMix: [
              { label: "正向", value: 61, color: "#10b981" },
              { label: "中立", value: 27, color: "#38bdf8" },
              { label: "负向", value: 12, color: "#f97316" }
            ],
            sections: [
              {
                title: "高频痛点",
                items: [
                  "从桌面切到 iPad 后需要重新确认上下文",
                  "手机端查看任务时缺少完整 diff",
                  "后台任务通知有时不够及时"
                ]
              },
              {
                title: "功能请求",
                items: [
                  "跨设备同步当前任务状态",
                  "移动端展示更完整的 diff 摘要",
                  "允许收藏常用项目入口"
                ]
              }
            ],
            reviewSnippets: [
              {
                source: "App Store",
                sentiment: "正向",
                quote:
                  "在外面也能看任务进度很方便，尤其是等待测试跑完的时候。"
              },
              {
                source: "App Store",
                sentiment: "中立",
                quote:
                  "从桌面切到 iPad 后需要重新确认上下文，这一步有点打断。"
              },
              {
                source: "App Store",
                sentiment: "负向",
                quote:
                  "手机上看不到完整 diff 时，我很难判断这次修改是否可以继续。"
              }
            ]
          },
          {
            id: "google-play",
            summary:
              "这份 Google Play 示例报告只基于一个 Google Play 应用链接生成。Android 用户认可通知和代码摘要，同时集中要求离线队列、登录稳定性和长任务可见性。",
            metrics: [
              {
                label: "模拟评价",
                value: "346",
                detail: "来自当前 Google Play 链接"
              },
              {
                label: "高价值信号",
                value: "110",
                detail: "可聚类为稳定性和移动执行需求"
              },
              {
                label: "正向占比",
                value: "57%",
                detail: "围绕通知、摘要和远程跟进"
              }
            ],
            source: {
              name: "Google Play",
              count: "346",
              sentiment: "78%",
              signal: "Android 用户认可通知和代码摘要，集中要求离线队列和登录稳定性。",
              value: 78
            },
            sentimentMix: [
              { label: "正向", value: 57, color: "#10b981" },
              { label: "中立", value: 29, color: "#38bdf8" },
              { label: "负向", value: 14, color: "#f97316" }
            ],
            sections: [
              {
                title: "高频痛点",
                items: [
                  "弱网环境下任务状态刷新不稳定",
                  "登录过期后恢复流程不够顺畅",
                  "长任务只显示摘要，缺少过程节点"
                ]
              },
              {
                title: "功能请求",
                items: [
                  "移动端离线排队，恢复网络后继续执行",
                  "失败任务提供可复制的错误摘要",
                  "长任务按步骤显示当前进度"
                ]
              }
            ],
            reviewSnippets: [
              {
                source: "Google Play",
                sentiment: "正向",
                quote:
                  "通知和代码摘要很有用，我可以先判断要不要回到电脑处理。"
              },
              {
                source: "Google Play",
                sentiment: "中立",
                quote:
                  "网络不稳定时希望命令能先排队，恢复后自动继续。"
              },
              {
                source: "Google Play",
                sentiment: "负向",
                quote:
                  "登录失效后任务状态不清楚，我不知道之前的分析是否还在继续。"
              }
            ]
          }
        ]
      },
      chips: [
        { label: "权限信任", icon: Flame },
        { label: "移动端衔接", icon: Star },
        { label: "任务进度", icon: MessageSquare }
      ]
    },
    showcase: {
      eyebrow: "像筛子一样轻，把噪声留在外面",
      title: "一个免费入口，完成评价筛选、痛点归类和竞品观察",
      description:
        "EchoSift 把评价来源、需求聚类和竞品线索放进一条轻量工作流，减少设置成本，让用户更快看到可执行信号。",
      platformLabel: "支持的评价来源",
      platforms: ["Product Hunt", "App Store", "Google Play"],
      stats: [
        { value: "1,284", label: "模拟评价" },
        { value: "426", label: "高价值反馈" },
        { value: "7.8", label: "情感得分" }
      ],
      capabilities: [
        {
          title: "全渠道评价归并",
          description: "统一收集不同平台评论，保留来源与原始证据。",
          icon: Layers3
        },
        {
          title: "AI 需求聚类",
          description: "把重复反馈压缩为 Bug、功能请求和体验吐槽。",
          icon: SearchCheck
        },
        {
          title: "竞品差异对比",
          description: "把用户反馈和竞品表现放在一起，快速看出差异和机会点。",
          icon: Route
        }
      ]
    },
    loading: {
      title: "正在分析评价",
      messages: [
        "正在调取评论接口抓取评价...",
        "正在用免费分析流程过滤噪声...",
        "正在整理结构化分析结果..."
      ]
    },
    dashboard: {
      complete: "分析完成",
      title: "EchoSift 用户评价分析结果",
      sourceLabel: "数据源",
      modeLabel: "免费模式",
      reset: "重新分析"
    },
    kpis: [
      {
        label: "总评价数",
        value: "1,284",
        detail: "覆盖 Product Hunt 与应用商店评论",
        accent: "text-cyan-200",
        icon: MessageSquare
      },
      {
        label: "整体情感得分",
        value: "7.8/10",
        detail: "正向口碑稳定，导出和上手摩擦仍高频出现",
        accent: "text-emerald-200",
        icon: HeartPulse
      },
      {
        label: "核心痛点标签",
        value: "导出体验",
        detail: "被 31% 的负面反馈重复提及",
        accent: "text-amber-200",
        icon: Tags
      }
    ],
    sentiment: {
      title: "用户情绪占比",
      subtitle: "基于 1,284 条评价聚合",
      badge: "正向 62%",
      tooltipMetric: "占比",
      labels: { positive: "正面", neutral: "中立", negative: "负面" },
      trendTitle: "近 7 日情绪趋势",
      trendSubtitle: "观察口碑变化，定位发布后的体验波动。",
      data: [
        { name: "正面", value: 62, color: "#10b981" },
        { name: "中立", value: 24, color: "#38bdf8" },
        { name: "负面", value: 14, color: "#f97316" }
      ]
    },
    kanban: {
      title: "需求优先级看板",
      description: "AI 将原始评价压缩成可执行的产品改进线索。",
      clustered: "已聚类 426 条高价值反馈",
      evidence: "查看证据",
      columns: [
        {
          title: "🔥 严重 Bug",
          tone: "border-orange-300/25 bg-orange-400/10",
          icon: Bug,
          cards: [
            {
              title: "同步后历史评论丢失",
              summary:
                "多位用户反馈连接 App Store 后旧评论只显示近 30 天，影响复盘完整性。",
              count: "87 条提及",
              priority: "P0"
            },
            {
              title: "CSV 导出字段错位",
              summary:
                "中文评论和 emoji 内容会导致列偏移，PM 无法直接导入 Notion 或 Sheets。",
              count: "52 条提及",
              priority: "P1"
            }
          ]
        },
        {
          title: "✨ 新功能请求 (Feature Request)",
          tone: "border-cyan-300/25 bg-cyan-400/10",
          icon: Lightbulb,
          cards: [
            {
              title: "按用户画像自动聚类",
              summary: "希望把独立开发者、团队 PM、客服运营等人群需求分开查看。",
              count: "113 条提及",
              priority: "High"
            },
            {
              title: "生成 Linear/Jira 任务",
              summary:
                "用户希望从洞察卡片一键创建 issue，并自动带上原始评论证据。",
              count: "74 条提及",
              priority: "High"
            },
            {
              title: "同类产品情绪对比",
              summary: "输入多个产品链接后，对比痛点、价格敏感度和功能缺口。",
              count: "41 条提及",
              priority: "Medium"
            }
          ]
        },
        {
          title: "💬 体验吐槽",
          tone: "border-slate-400/20 bg-white/5",
          icon: AlertTriangle,
          cards: [
            {
              title: "首屏价值不够明确",
              summary: "部分新用户不确定分析结果会包含哪些内容，期待看到示例报告。",
              count: "68 条提及",
              priority: "UX"
            },
            {
              title: "分析等待感偏长",
              summary:
                "用户认为等待期间缺少进度反馈，需要更清楚地展示正在处理哪些内容。",
              count: "46 条提及",
              priority: "UX"
            },
            {
              title: "情绪标签解释不足",
              summary: "用户希望看到判断为负面的原始语句，方便确认 AI 是否误判。",
              count: "33 条提及",
              priority: "UX"
            }
          ]
        }
      ]
    },
    useCases: {
      eyebrow: "为高频产品决策场景而设计",
      title: "运营人员、小企业主和产品经理可以在同一页面上对齐",
      description:
        "EchoSift 面向轻量协作，把评价证据、需求主题和竞品信息组织到一起，方便快速决策。",
      personas: [
        {
          role: "小企业主",
          title: "快速判断用户最在意什么",
          description: "不用逐条读评论，直接看到高频请求、吐槽点和转化阻力。",
          icon: Users
        },
        {
          role: "产品经理",
          title: "把用户原话转成分析依据",
          description: "每张卡片都保留提及量和证据入口，方便写 PRD 和做判断。",
          icon: Route
        },
        {
          role: "运营人员",
          title: "识别影响口碑和转化的关键摩擦",
          description: "用情绪趋势和痛点标签判断哪些问题会影响留存、推荐和成交。",
          icon: ShieldCheck
        }
      ]
    },
    footer: {
      githubLabel: "在 GitHub 查看项目",
      githubRepo: "lilwynne/echosift-reviews-scraper",
      githubAriaLabel: "在 GitHub 打开 EchoSift 仓库"
    }
  },
  "zh-TW": {
    header: {
      tagline: "使用者評價分析與競品調研",
      languageLabel: "選擇語言",
      githubLabel: "GitHub",
      githubAriaLabel: "在 GitHub 開啟 EchoSift repo"
    },
    hero: {
      badge: "Product Hunt / App Store / Google Play 評價分析",
      title: "EchoSift 輕量篩出使用者評價裡的真實訊號",
      description:
        "貼上一個產品連結，EchoSift 會用免費的輕量流程彙整情緒、痛點、功能請求和競品差異。無需帳號、無需選擇模型，打開就能分析。",
      placeholder: "在此貼上 Product Hunt 或商店連結...",
      button: "開始分析",
      previewTitle: "Codex 範例洞察預覽",
      previewSubtitle: "先看到情緒、痛點和需求優先級，再開始分析",
      sourceHint: "支援 Product Hunt、App Store、Google Play",
      previewMetric: {
        label: "綜合情緒",
        value: 84,
        suffix: "/100",
        description: "目前範例來源的情緒分數"
      },
      previewCards: [
        {
          title: "權限信任",
          priority: "P0",
          detail: "使用者希望審批文案、diff 和回滾路徑更清楚",
          value: 88
        },
        {
          title: "行動端銜接",
          priority: "P1",
          detail: "商店評論反覆提到跨裝置會話連續性",
          value: 74
        },
        {
          title: "長任務進度",
          priority: "P2",
          detail: "大型 repo 任務需要更豐富的過程回饋",
          value: 63
        }
      ],
      previewMockReport: {
        badge: "Codex 範例分析",
        product: "Codex",
        timeframe: "模擬近 30 天評論",
        sampleNote: "範例資料",
        sourceCountLabel: "則評價",
        readyLabel: "Codex 範例報告已載入",
        scanningLabel: "正在分析真實連結",
        revealedLabel: "洞察卡片已產生",
        preparingLabel: "準備展示",
        signalLabel: "訊號強度",
        sourceTabLabel: "選擇範例來源",
        sourceTabs: [
          { id: "product-hunt", label: "Product Hunt" },
          { id: "app-store", label: "App Store" },
          { id: "google-play", label: "Google Play" }
        ],
        sourceReports: [
          {
            id: "product-hunt",
            summary:
              "這份 Product Hunt 範例報告只基於一個 Product Hunt 產品連結產生。評論集中稱讚 Codex 能理解專案上下文、改動前會解釋計畫，也提醒新使用者需要更直觀的權限說明。",
            metrics: [
              {
                label: "模擬評價",
                value: "642",
                detail: "來自目前 Product Hunt 連結"
              },
              {
                label: "高價值訊號",
                value: "238",
                detail: "可聚類為痛點、需求和購買阻力"
              },
              {
                label: "正向占比",
                value: "68%",
                detail: "圍繞開發效率與程式碼解釋能力"
              }
            ],
            source: {
              name: "Product Hunt",
              count: "642",
              sentiment: "86%",
              signal: "獨立開發者稱讚終端協作、程式碼審查和快速修復流程。",
              value: 86
            },
            sentimentMix: [
              { label: "正向", value: 68, color: "#10b981" },
              { label: "中立", value: 21, color: "#38bdf8" },
              { label: "負向", value: 11, color: "#f97316" }
            ],
            sections: [
              {
                title: "高頻痛點",
                items: [
                  "審批權限與回滾說明不夠直觀",
                  "首次執行前對會修改哪些檔案缺少預期",
                  "長任務等待期間的進度回饋偏少"
                ]
              },
              {
                title: "功能請求",
                items: [
                  "改動前自動列出影響範圍",
                  "一鍵產生 PR 評論草稿和測試摘要",
                  "保存專案記憶快照，便於下次繼續"
                ]
              }
            ],
            reviewSnippets: [
              {
                source: "Product Hunt",
                sentiment: "正向",
                quote:
                  "Codex 像一個會先說明計畫的資深搭檔，能把小修復和測試補齊交給它。"
              },
              {
                source: "Product Hunt",
                sentiment: "中立",
                quote:
                  "它的效率很高，但我希望在授權前更清楚知道哪些檔案會被改動。"
              },
              {
                source: "Product Hunt",
                sentiment: "負向",
                quote:
                  "大 repo 任務跑很久時，我想知道它卡在哪一步，以及是否可以安全暫停。"
              }
            ]
          },
          {
            id: "app-store",
            summary:
              "這份 App Store 範例報告只基於一個 App Store 應用連結產生。行動端使用者認可隨時查看任務進度，但反覆提到 iPad 與桌面會話銜接還不夠順暢。",
            metrics: [
              {
                label: "模擬評價",
                value: "438",
                detail: "來自目前 App Store 連結"
              },
              {
                label: "高價值訊號",
                value: "164",
                detail: "可聚類為行動體驗和協作阻力"
              },
              {
                label: "正向占比",
                value: "61%",
                detail: "圍繞任務查看與通知體驗"
              }
            ],
            source: {
              name: "App Store",
              count: "438",
              sentiment: "81%",
              signal: "行動端使用者喜歡隨時查看任務，但希望 iPad 和桌面會話更順暢。",
              value: 81
            },
            sentimentMix: [
              { label: "正向", value: 61, color: "#10b981" },
              { label: "中立", value: 27, color: "#38bdf8" },
              { label: "負向", value: 12, color: "#f97316" }
            ],
            sections: [
              {
                title: "高頻痛點",
                items: [
                  "從桌面切到 iPad 後需要重新確認上下文",
                  "手機端查看任務時缺少完整 diff",
                  "背景任務通知有時不夠即時"
                ]
              },
              {
                title: "功能請求",
                items: [
                  "跨裝置同步目前任務狀態",
                  "行動端展示更完整的 diff 摘要",
                  "允許收藏常用專案入口"
                ]
              }
            ],
            reviewSnippets: [
              {
                source: "App Store",
                sentiment: "正向",
                quote:
                  "在外面也能看任務進度很方便，尤其是等待測試跑完的時候。"
              },
              {
                source: "App Store",
                sentiment: "中立",
                quote:
                  "從桌面切到 iPad 後需要重新確認上下文，這一步有點打斷。"
              },
              {
                source: "App Store",
                sentiment: "負向",
                quote:
                  "手機上看不到完整 diff 時，我很難判斷這次修改是否可以繼續。"
              }
            ]
          },
          {
            id: "google-play",
            summary:
              "這份 Google Play 範例報告只基於一個 Google Play 應用連結產生。Android 使用者認可通知和程式碼摘要，同時集中要求離線佇列、登入穩定性和長任務可見性。",
            metrics: [
              {
                label: "模擬評價",
                value: "346",
                detail: "來自目前 Google Play 連結"
              },
              {
                label: "高價值訊號",
                value: "110",
                detail: "可聚類為穩定性和行動執行需求"
              },
              {
                label: "正向占比",
                value: "57%",
                detail: "圍繞通知、摘要和遠端跟進"
              }
            ],
            source: {
              name: "Google Play",
              count: "346",
              sentiment: "78%",
              signal: "Android 使用者認可通知和程式碼摘要，集中要求離線佇列和登入穩定性。",
              value: 78
            },
            sentimentMix: [
              { label: "正向", value: 57, color: "#10b981" },
              { label: "中立", value: 29, color: "#38bdf8" },
              { label: "負向", value: 14, color: "#f97316" }
            ],
            sections: [
              {
                title: "高頻痛點",
                items: [
                  "弱網環境下任務狀態刷新不穩定",
                  "登入過期後恢復流程不夠順暢",
                  "長任務只顯示摘要，缺少過程節點"
                ]
              },
              {
                title: "功能請求",
                items: [
                  "行動端離線排隊，恢復網路後繼續執行",
                  "失敗任務提供可複製的錯誤摘要",
                  "長任務按步驟顯示目前進度"
                ]
              }
            ],
            reviewSnippets: [
              {
                source: "Google Play",
                sentiment: "正向",
                quote:
                  "通知和程式碼摘要很有用，我可以先判斷要不要回到電腦處理。"
              },
              {
                source: "Google Play",
                sentiment: "中立",
                quote:
                  "網路不穩定時希望命令能先排隊，恢復後自動繼續。"
              },
              {
                source: "Google Play",
                sentiment: "負向",
                quote:
                  "登入失效後任務狀態不清楚，我不知道之前的分析是否還在繼續。"
              }
            ]
          }
        ]
      },
      chips: [
        { label: "權限信任", icon: Flame },
        { label: "行動端銜接", icon: Star },
        { label: "任務進度", icon: MessageSquare }
      ]
    },
    showcase: {
      eyebrow: "像篩子一樣輕，把噪聲留在外面",
      title: "一個免費入口，完成評價篩選、痛點歸類和競品觀察",
      description:
        "EchoSift 把評價來源、需求聚類和競品線索放進一條輕量工作流，減少設定成本，讓使用者更快看到可執行訊號。",
      platformLabel: "支援的評價來源",
      platforms: ["Product Hunt", "App Store", "Google Play"],
      stats: [
        { value: "1,284", label: "模擬評價" },
        { value: "426", label: "高價值回饋" },
        { value: "7.8", label: "情緒分數" }
      ],
      capabilities: [
        {
          title: "全渠道評價歸併",
          description: "統一收集不同平台評論，保留來源與原始證據。",
          icon: Layers3
        },
        {
          title: "AI 需求聚類",
          description: "把重複回饋壓縮為 Bug、功能請求和體驗吐槽。",
          icon: SearchCheck
        },
        {
          title: "競品差異對比",
          description: "把使用者回饋和競品表現放在一起，快速看出差異和機會點。",
          icon: Route
        }
      ]
    },
    loading: {
      title: "正在分析評價",
      messages: [
        "正在調取評論介面抓取評價...",
        "正在用免費分析流程過濾噪聲...",
        "正在整理結構化分析結果..."
      ]
    },
    dashboard: {
      complete: "分析完成",
      title: "EchoSift 使用者評價分析結果",
      sourceLabel: "資料來源",
      modeLabel: "免费模式",
      reset: "重新分析"
    },
    kpis: [
      {
        label: "總評價數",
        value: "1,284",
        detail: "涵蓋 Product Hunt 與應用商店評論",
        accent: "text-cyan-200",
        icon: MessageSquare
      },
      {
        label: "整體情緒分數",
        value: "7.8/10",
        detail: "正向口碑穩定，匯出和上手摩擦仍高頻出現",
        accent: "text-emerald-200",
        icon: HeartPulse
      },
      {
        label: "核心痛點標籤",
        value: "匯出體驗",
        detail: "被 31% 的負面回饋重複提及",
        accent: "text-amber-200",
        icon: Tags
      }
    ],
    sentiment: {
      title: "使用者情緒占比",
      subtitle: "基於 1,284 條評價聚合",
      badge: "正向 62%",
      tooltipMetric: "占比",
      labels: { positive: "正面", neutral: "中立", negative: "負面" },
      trendTitle: "近 7 日情緒趨勢",
      trendSubtitle: "觀察口碑變化，定位發布後的體驗波動。",
      data: [
        { name: "正面", value: 62, color: "#10b981" },
        { name: "中立", value: 24, color: "#38bdf8" },
        { name: "負面", value: 14, color: "#f97316" }
      ]
    },
    kanban: {
      title: "需求優先級看板",
      description: "AI 將原始評價壓縮成可執行的產品改進線索。",
      clustered: "已聚類 426 條高價值回饋",
      evidence: "查看證據",
      columns: [
        {
          title: "🔥 嚴重 Bug",
          tone: "border-orange-300/25 bg-orange-400/10",
          icon: Bug,
          cards: [
            {
              title: "同步後歷史評論遺失",
              summary:
                "多位使用者回饋連接 App Store 後舊評論只顯示近 30 天，影響復盤完整性。",
              count: "87 條提及",
              priority: "P0"
            },
            {
              title: "CSV 匯出欄位錯位",
              summary:
                "中文評論和 emoji 內容會導致欄位偏移，PM 無法直接匯入 Notion 或 Sheets。",
              count: "52 條提及",
              priority: "P1"
            }
          ]
        },
        {
          title: "✨ 新功能請求 (Feature Request)",
          tone: "border-cyan-300/25 bg-cyan-400/10",
          icon: Lightbulb,
          cards: [
            {
              title: "按使用者輪廓自動聚類",
              summary: "希望把獨立開發者、團隊 PM、客服營運等人群需求分開查看。",
              count: "113 條提及",
              priority: "High"
            },
            {
              title: "產生 Linear/Jira 任務",
              summary:
                "使用者希望從洞察卡片一鍵建立 issue，並自動帶上原始評論證據。",
              count: "74 條提及",
              priority: "High"
            },
            {
              title: "競品情緒對比",
              summary: "輸入多個產品連結後，對比痛點、價格敏感度和功能缺口。",
              count: "41 條提及",
              priority: "Medium"
            }
          ]
        },
        {
          title: "💬 體驗吐槽",
          tone: "border-slate-400/20 bg-white/5",
          icon: AlertTriangle,
          cards: [
            {
              title: "首屏價值不夠明確",
              summary: "部分新使用者不確定分析結果會包含哪些內容，期待看到範例報告。",
              count: "68 條提及",
              priority: "UX"
            },
            {
              title: "分析等待感偏長",
              summary:
                "使用者認為等待期間缺少進度回饋，需要更清楚地展示正在處理哪些內容。",
              count: "46 條提及",
              priority: "UX"
            },
            {
              title: "情緒標籤解釋不足",
              summary: "使用者希望看到判斷為負面的原始語句，方便確認 AI 是否誤判。",
              count: "33 條提及",
              priority: "UX"
            }
          ]
        }
      ]
    },
    useCases: {
      eyebrow: "為高頻產品決策場景而設計",
      title: "營運人員、小企業主和產品經理可以在同一頁上對齊",
      description:
        "EchoSift 面向輕量協作，把評價證據、需求主題和競品資訊組織到一起，方便快速決策。",
      personas: [
        {
          role: "小企業主",
          title: "快速判斷使用者最在意什麼",
          description: "不用逐條讀評論，直接看到高頻請求、吐槽點和轉化阻力。",
          icon: Users
        },
        {
          role: "產品經理",
          title: "把使用者原話轉成分析依據",
          description: "每張卡片都保留提及量和證據入口，方便寫 PRD 和做判斷。",
          icon: Route
        },
        {
          role: "營運人員",
          title: "識別影響口碑和轉化的關鍵摩擦",
          description: "用情緒趨勢和痛點標籤判斷哪些問題會影響留存、推薦和成交。",
          icon: ShieldCheck
        }
      ]
    },
    footer: {
      githubLabel: "在 GitHub 查看專案",
      githubRepo: "lilwynne/echosift-reviews-scraper",
      githubAriaLabel: "在 GitHub 開啟 EchoSift repo"
    }
  },
  en: {
    header: {
      tagline: "Review analysis and competitor research",
      languageLabel: "Select language",
      githubLabel: "GitHub",
      githubAriaLabel: "Open the EchoSift repository on GitHub"
    },
    hero: {
      badge: "Product Hunt / App Store / Google Play review analysis",
      title: "EchoSift sifts real product signals from user reviews",
      description:
        "Paste one product link and EchoSift runs a free, lightweight pass over sentiment, pain points, feature requests, and competitor differences. No account, no model picker, just the analysis flow.",
      placeholder: "Paste a Product Hunt or store link here...",
      button: "Start analysis",
      previewTitle: "Codex sample insight preview",
      previewSubtitle: "See sentiment, pain points, and priority signals before you analyze",
      sourceHint: "Supports Product Hunt, App Store, and Google Play",
      previewMetric: {
        label: "Sentiment score",
        value: 84,
        suffix: "/100",
        description: "Score for the selected sample source"
      },
      previewCards: [
        {
          title: "Permission trust",
          priority: "P0",
          detail: "Users want clearer approvals, diffs, and rollback paths",
          value: 88
        },
        {
          title: "Mobile handoff",
          priority: "P1",
          detail: "Store reviews repeat cross-device session continuity needs",
          value: 74
        },
        {
          title: "Long task progress",
          priority: "P2",
          detail: "Large repository work needs richer process feedback",
          value: 63
        }
      ],
      previewMockReport: {
        badge: "Codex sample analysis",
        product: "Codex",
        timeframe: "Simulated last 30 days",
        sampleNote: "Sample data",
        sourceCountLabel: "reviews",
        readyLabel: "Codex sample report loaded",
        scanningLabel: "Analyzing real link",
        revealedLabel: "Insight cards generated",
        preparingLabel: "Preparing reveal",
        signalLabel: "Signal strength",
        sourceTabLabel: "Select sample source",
        sourceTabs: [
          { id: "product-hunt", label: "Product Hunt" },
          { id: "app-store", label: "App Store" },
          { id: "google-play", label: "Google Play" }
        ],
        sourceReports: [
          {
            id: "product-hunt",
            summary:
              "This Product Hunt sample report is generated from one Product Hunt product link only. Reviews praise Codex for understanding project context and explaining its plan before editing, while new users want clearer permission language.",
            metrics: [
              {
                label: "Mock reviews",
                value: "642",
                detail: "From the selected Product Hunt link"
              },
              {
                label: "High-value signals",
                value: "238",
                detail: "Clustered into pain points, requests, and blockers"
              },
              {
                label: "Positive share",
                value: "68%",
                detail: "Driven by coding speed and clear code explanations"
              }
            ],
            source: {
              name: "Product Hunt",
              count: "642",
              sentiment: "86%",
              signal:
                "Indie developers praise terminal collaboration, code review, and fast fix loops.",
              value: 86
            },
            sentimentMix: [
              { label: "Positive", value: 68, color: "#10b981" },
              { label: "Neutral", value: 21, color: "#38bdf8" },
              { label: "Negative", value: 11, color: "#f97316" }
            ],
            sections: [
              {
                title: "Pain points",
                items: [
                  "Approval permissions and rollback language need more clarity",
                  "First runs need clearer expectations about changed files",
                  "Long waits need more granular progress feedback"
                ]
              },
              {
                title: "Feature requests",
                items: [
                  "Show affected scope before editing",
                  "Generate PR review drafts and test summaries in one click",
                  "Save project memory snapshots for later sessions"
                ]
              }
            ],
            reviewSnippets: [
              {
                source: "Product Hunt",
                sentiment: "Positive",
                quote:
                  "Codex feels like a senior teammate that explains the plan first, then handles small fixes and tests."
              },
              {
                source: "Product Hunt",
                sentiment: "Neutral",
                quote:
                  "It is fast, but I want to know which files it will change before I approve it."
              },
              {
                source: "Product Hunt",
                sentiment: "Negative",
                quote:
                  "When a large repo task runs for a while, I need to know what step it is on and whether I can pause safely."
              }
            ]
          },
          {
            id: "app-store",
            summary:
              "This App Store sample report is generated from one App Store app link only. Mobile users value checking task progress anywhere, but repeatedly ask for smoother handoff between iPad and desktop sessions.",
            metrics: [
              {
                label: "Mock reviews",
                value: "438",
                detail: "From the selected App Store link"
              },
              {
                label: "High-value signals",
                value: "164",
                detail: "Clustered into mobile UX and collaboration blockers"
              },
              {
                label: "Positive share",
                value: "61%",
                detail: "Driven by task status and notification value"
              }
            ],
            source: {
              name: "App Store",
              count: "438",
              sentiment: "81%",
              signal:
                "Mobile users like checking task status anywhere but want smoother iPad and desktop handoff.",
              value: 81
            },
            sentimentMix: [
              { label: "Positive", value: 61, color: "#10b981" },
              { label: "Neutral", value: 27, color: "#38bdf8" },
              { label: "Negative", value: 12, color: "#f97316" }
            ],
            sections: [
              {
                title: "Pain points",
                items: [
                  "Moving from desktop to iPad forces users to re-confirm context",
                  "Mobile task views do not always expose the full diff",
                  "Background task notifications can arrive late"
                ]
              },
              {
                title: "Feature requests",
                items: [
                  "Sync the current task state across devices",
                  "Show richer diff summaries on mobile",
                  "Let users pin frequent project entry points"
                ]
              }
            ],
            reviewSnippets: [
              {
                source: "App Store",
                sentiment: "Positive",
                quote:
                  "Checking progress away from my desk is useful, especially while I wait for tests to finish."
              },
              {
                source: "App Store",
                sentiment: "Neutral",
                quote:
                  "Moving from desktop to iPad makes me re-confirm context, which breaks the flow."
              },
              {
                source: "App Store",
                sentiment: "Negative",
                quote:
                  "When I cannot see the full diff on my phone, I cannot tell whether the change should continue."
              }
            ]
          },
          {
            id: "google-play",
            summary:
              "This Google Play sample report is generated from one Google Play app link only. Android users value notifications and code summaries, while asking for offline queueing, steadier sign-in, and clearer long-task visibility.",
            metrics: [
              {
                label: "Mock reviews",
                value: "346",
                detail: "From the selected Google Play link"
              },
              {
                label: "High-value signals",
                value: "110",
                detail: "Clustered into stability and mobile execution needs"
              },
              {
                label: "Positive share",
                value: "57%",
                detail: "Driven by notifications, summaries, and remote follow-up"
              }
            ],
            source: {
              name: "Google Play",
              count: "346",
              sentiment: "78%",
              signal:
                "Android users value notifications and code summaries, with requests for offline queueing and steadier sign-in.",
              value: 78
            },
            sentimentMix: [
              { label: "Positive", value: 57, color: "#10b981" },
              { label: "Neutral", value: 29, color: "#38bdf8" },
              { label: "Negative", value: 14, color: "#f97316" }
            ],
            sections: [
              {
                title: "Pain points",
                items: [
                  "Task status refresh is unstable on weak networks",
                  "Expired sign-in recovery interrupts the flow",
                  "Long tasks show summaries but not enough process steps"
                ]
              },
              {
                title: "Feature requests",
                items: [
                  "Queue mobile commands offline and resume when connected",
                  "Provide copyable error summaries for failed tasks",
                  "Show long-running work step by step"
                ]
              }
            ],
            reviewSnippets: [
              {
                source: "Google Play",
                sentiment: "Positive",
                quote:
                  "Notifications and code summaries help me decide whether I need to return to my computer."
              },
              {
                source: "Google Play",
                sentiment: "Neutral",
                quote:
                  "When the network is unstable, commands should queue and resume automatically."
              },
              {
                source: "Google Play",
                sentiment: "Negative",
                quote:
                  "After sign-in expires, I cannot tell whether the previous analysis is still running."
              }
            ]
          }
        ]
      },
      chips: [
        { label: "Permission trust", icon: Flame },
        { label: "Mobile handoff", icon: Star },
        { label: "Task progress", icon: MessageSquare }
      ]
    },
    showcase: {
      eyebrow: "Lightweight by design, focused on signal",
      title: "One free entry point for review sifting and competitor-aware notes",
      description:
        "EchoSift keeps review sources, demand clusters, and competitor signals in one lightweight flow so users reach useful evidence faster.",
      platformLabel: "Supported review sources",
      platforms: ["Product Hunt", "App Store", "Google Play"],
      stats: [
        { value: "1,284", label: "Mock reviews" },
        { value: "426", label: "High-value signals" },
        { value: "7.8", label: "Sentiment score" }
      ],
      capabilities: [
        {
          title: "Multi-source review intake",
          description: "Unify comments from different platforms while preserving source evidence.",
          icon: Layers3
        },
        {
          title: "AI demand clustering",
          description: "Compress repeated feedback into bugs, feature requests, and UX complaints.",
          icon: SearchCheck
        },
        {
          title: "Competitor difference analysis",
          description: "Compare user feedback with competitor performance to spot gaps and opportunities.",
          icon: Route
        }
      ]
    },
    loading: {
      title: "Analyzing reviews",
      messages: [
        "Fetching reviews through the review APIs...",
        "Filtering noisy comments with the free analysis flow...",
        "Organizing the structured analysis result..."
      ]
    },
    dashboard: {
      complete: "Analysis complete",
      title: "EchoSift user review analysis result",
      sourceLabel: "Source",
      modeLabel: "Free mode",
      reset: "Run again"
    },
    kpis: [
      {
        label: "Total reviews",
        value: "1,284",
        detail: "Covers Product Hunt and app store reviews",
        accent: "text-cyan-200",
        icon: MessageSquare
      },
      {
        label: "Sentiment score",
        value: "7.8/10",
        detail: "Positive momentum is steady, with export and onboarding friction still frequent",
        accent: "text-emerald-200",
        icon: HeartPulse
      },
      {
        label: "Top pain point",
        value: "Export flow",
        detail: "Repeated in 31% of negative feedback",
        accent: "text-amber-200",
        icon: Tags
      }
    ],
    sentiment: {
      title: "Sentiment mix",
      subtitle: "Aggregated from 1,284 reviews",
      badge: "Positive 62%",
      tooltipMetric: "Share",
      labels: { positive: "Positive", neutral: "Neutral", negative: "Negative" },
      trendTitle: "7-day sentiment trend",
      trendSubtitle: "Track reputation shifts and post-release experience changes.",
      data: [
        { name: "Positive", value: 62, color: "#10b981" },
        { name: "Neutral", value: 24, color: "#38bdf8" },
        { name: "Negative", value: 14, color: "#f97316" }
      ]
    },
    kanban: {
      title: "Demand priority board",
      description: "AI condenses raw reviews into actionable product signals.",
      clustered: "426 high-value feedback items clustered",
      evidence: "View evidence",
      columns: [
        {
          title: "🔥 Critical Bugs",
          tone: "border-orange-300/25 bg-orange-400/10",
          icon: Bug,
          cards: [
            {
              title: "Historical reviews disappear after sync",
              summary:
                "Several users report that App Store connections only show the last 30 days, hurting retrospectives.",
              count: "87 mentions",
              priority: "P0"
            },
            {
              title: "CSV export columns shift",
              summary:
                "Chinese reviews and emoji content can offset columns, blocking direct import into Notion or Sheets.",
              count: "52 mentions",
              priority: "P1"
            }
          ]
        },
        {
          title: "✨ Feature Requests",
          tone: "border-cyan-300/25 bg-cyan-400/10",
          icon: Lightbulb,
          cards: [
            {
              title: "Auto-cluster by persona",
              summary:
                "Users want separate views for indie makers, product managers, and support teams.",
              count: "113 mentions",
              priority: "High"
            },
            {
              title: "Create Linear/Jira tasks",
              summary:
                "Teams want one-click issue creation from insight cards with original review evidence attached.",
              count: "74 mentions",
              priority: "High"
            },
            {
              title: "Competitor sentiment comparison",
              summary:
                "Paste multiple product links to compare pain points, price sensitivity, and feature gaps.",
              count: "41 mentions",
              priority: "Medium"
            }
          ]
        },
        {
          title: "💬 Experience Complaints",
          tone: "border-slate-400/20 bg-white/5",
          icon: AlertTriangle,
          cards: [
            {
              title: "First-screen value is unclear",
              summary:
                "Some new users are unsure what the report includes and expect a sample output.",
              count: "68 mentions",
              priority: "UX"
            },
            {
              title: "Analysis wait feels long",
              summary:
                "Users perceive the wait as slow and need clearer feedback about what is being processed.",
              count: "46 mentions",
              priority: "UX"
            },
            {
              title: "Sentiment labels need explanation",
              summary:
                "Users want to see original negative snippets to confirm whether AI made the right call.",
              count: "33 mentions",
              priority: "UX"
            }
          ]
        }
      ]
    },
    useCases: {
      eyebrow: "Designed for high-frequency product decisions",
      title: "Operators, small business owners, and PMs align in one place",
      description:
        "EchoSift is designed for lightweight collaboration, organizing review evidence, demand themes, and competitor information for faster decisions.",
      personas: [
        {
          role: "Small business owner",
          title: "Quickly see what users care about most",
          description: "Skip manual review reading and focus on high-frequency requests, complaints, and conversion blockers.",
          icon: Users
        },
        {
          role: "Product manager",
          title: "Turn user quotes into analysis evidence",
          description: "Every card preserves mention volume and evidence access for PRDs and decisions.",
          icon: Route
        },
        {
          role: "Operator",
          title: "Spot reputation and conversion friction",
          description: "Use sentiment trends and pain-point tags to protect retention, referrals, and sales.",
          icon: ShieldCheck
        }
      ]
    },
    footer: {
      githubLabel: "View project on GitHub",
      githubRepo: "lilwynne/echosift-reviews-scraper",
      githubAriaLabel: "Open the EchoSift repository on GitHub"
    }
  }
};

export type LocaleContent = (typeof localizedContent)[Language];
