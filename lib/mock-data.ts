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

export const productName = "FeatureMap";

export const languages = [
  { code: "zh-CN", label: "简体中文" },
  { code: "zh-TW", label: "繁體中文" },
  { code: "en", label: "English" }
] as const;

export type Language = (typeof languages)[number]["code"];

export const analysisModels = [
  {
    id: "deepseek",
    labels: {
      "zh-CN": "DeepSeek-V3 (免费)",
      "zh-TW": "DeepSeek-V3 (免費)",
      en: "DeepSeek-V3 (Free)"
    }
  },
  {
    id: "claude",
    labels: {
      "zh-CN": "Claude 3.5 Sonnet (Pro)",
      "zh-TW": "Claude 3.5 Sonnet (Pro)",
      en: "Claude 3.5 Sonnet (Pro)"
    }
  },
  {
    id: "gpt4o",
    labels: {
      "zh-CN": "GPT-4o (Pro)",
      "zh-TW": "GPT-4o (Pro)",
      en: "GPT-4o (Pro)"
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
      login: "登录",
      signup: "注册"
    },
    hero: {
      badge: "Product Hunt / App Store / Google Play 评价分析",
      title: "FeatureMap 帮你看懂用户评价和竞品反馈",
      description:
        "粘贴一个产品链接，模拟抓取真实评价，用 AI 汇总情绪、痛点、功能请求和竞品差异，帮助运营人员、小企业主和产品经理快速做判断。",
      placeholder: "在此粘贴 Product Hunt 或商店链接...",
      button: "开始分析",
      modelLabel: "分析模型",
      currentModel: "当前模型：",
      previewTitle: "实时洞察预览",
      previewSubtitle: "从零散评论到可执行的分析结果",
      sourceHint: "支持 Product Hunt、App Store、Google Play",
      chips: [
        { label: "定价敏感", icon: Flame },
        { label: "导出受阻", icon: Star },
        { label: "团队协作", icon: MessageSquare }
      ]
    },
    showcase: {
      eyebrow: "像 AI 助手一样轻，像产品系统一样稳",
      title: "一个入口，覆盖用户评价分析和竞品调研的完整链路",
      description:
        "FeatureMap 将评价来源、AI 模型、洞察看板和竞品对比集中在同一条工作流里，让用户从进入页面到理解价值都更顺畅。",
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
        "正在调取 Apify 接口抓取评价...",
        "正在使用大模型进行情感降噪...",
        "正在整理结构化分析结果..."
      ]
    },
    dashboard: {
      complete: "分析完成",
      title: "FeatureMap 用户评价分析结果",
      sourceLabel: "数据源",
      modelLabel: "模型",
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
        detail: "正向口碑稳定，但高频付费摩擦明显",
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
              title: "免费模型等待较久",
              summary:
                "DeepSeek 免费档分析时间被认为偏长，需要更清晰的进度反馈。",
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
        "FeatureMap 面向多角色协作，把评价证据、需求主题和竞品信息组织到一起，方便快速决策。",
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
    auth: {
      loginTitle: "登录 FeatureMap",
      signupTitle: "创建 FeatureMap 账号",
      emailLabel: "邮箱",
      passwordLabel: "密码",
      emailPlaceholder: "you@example.com",
      passwordPlaceholder: "输入密码",
      loginButton: "登录",
      signupButton: "注册",
      switchToSignup: "还没有账号？立即注册",
      switchToLogin: "已有账号？去登录",
      closeLabel: "关闭",
      helper: "这是 MVP 原型入口，暂不连接真实认证服务。"
    },
    subscription: {
      eyebrow: "订阅早期访问",
      title: "每周收到一份真实产品评价洞察样例",
      description:
        "留下邮箱，我们会发送 MVP 进展、示例报告和可复用的评价分析模板。",
      placeholder: "you@example.com",
      button: "订阅更新",
      success: "已加入订阅列表，下一版报告会优先发给你。",
      privacy: "不会发送垃圾邮件，可随时取消订阅。",
      benefits: ["示例分析报告", "新模型体验通知", "产品迭代模板"]
    }
  },
  "zh-TW": {
    header: {
      tagline: "使用者評價分析與競品調研",
      languageLabel: "選擇語言",
      login: "登入",
      signup: "註冊"
    },
    hero: {
      badge: "Product Hunt / App Store / Google Play 評價分析",
      title: "FeatureMap 幫你看懂使用者評價和競品回饋",
      description:
        "貼上一個產品連結，模擬抓取真實評價，用 AI 彙整情緒、痛點、功能請求和競品差異，幫助營運人員、小企業主和產品經理快速做判斷。",
      placeholder: "在此貼上 Product Hunt 或商店連結...",
      button: "開始分析",
      modelLabel: "分析模型",
      currentModel: "目前模型：",
      previewTitle: "即時洞察預覽",
      previewSubtitle: "從零散評論到可執行的分析結果",
      sourceHint: "支援 Product Hunt、App Store、Google Play",
      chips: [
        { label: "定價敏感", icon: Flame },
        { label: "匯出受阻", icon: Star },
        { label: "團隊協作", icon: MessageSquare }
      ]
    },
    showcase: {
      eyebrow: "像 AI 助手一樣輕，像產品系統一樣穩",
      title: "一個入口，覆蓋使用者評價分析和競品調研的完整鏈路",
      description:
        "FeatureMap 將評價來源、AI 模型、洞察看板和競品對比集中在同一條工作流裡，讓使用者從進入頁面到理解價值都更順暢。",
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
        "正在調取 Apify 介面抓取評價...",
        "正在使用大模型進行情緒降噪...",
        "正在整理結構化分析結果..."
      ]
    },
    dashboard: {
      complete: "分析完成",
      title: "FeatureMap 使用者評價分析結果",
      sourceLabel: "資料來源",
      modelLabel: "模型",
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
        detail: "正向口碑穩定，但高頻付費摩擦明顯",
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
              title: "免費模型等待較久",
              summary:
                "DeepSeek 免費檔分析時間被認為偏長，需要更清楚的進度回饋。",
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
        "FeatureMap 面向多角色協作，把評價證據、需求主題和競品資訊組織到一起，方便快速決策。",
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
    auth: {
      loginTitle: "登入 FeatureMap",
      signupTitle: "建立 FeatureMap 帳號",
      emailLabel: "信箱",
      passwordLabel: "密碼",
      emailPlaceholder: "you@example.com",
      passwordPlaceholder: "輸入密碼",
      loginButton: "登入",
      signupButton: "註冊",
      switchToSignup: "還沒有帳號？立即註冊",
      switchToLogin: "已有帳號？去登入",
      closeLabel: "關閉",
      helper: "這是 MVP 原型入口，暫不連接真實認證服務。"
    },
    subscription: {
      eyebrow: "訂閱早期存取",
      title: "每週收到一份真實產品評價洞察樣例",
      description:
        "留下信箱，我們會發送 MVP 進展、範例報告和可複用的評價分析模板。",
      placeholder: "you@example.com",
      button: "訂閱更新",
      success: "已加入訂閱列表，下一版報告會優先發給你。",
      privacy: "不會發送垃圾郵件，可隨時取消訂閱。",
      benefits: ["範例分析報告", "新模型體驗通知", "產品迭代模板"]
    }
  },
  en: {
    header: {
      tagline: "Review analysis and competitor research",
      languageLabel: "Select language",
      login: "Log in",
      signup: "Sign up"
    },
    hero: {
      badge: "Product Hunt / App Store / Google Play review analysis",
      title: "FeatureMap turns user reviews into clear insights",
      description:
        "Paste one product link, simulate review collection, and let AI summarize sentiment, pain points, feature requests, and competitor differences for faster decisions.",
      placeholder: "Paste a Product Hunt or store link here...",
      button: "Start analysis",
      modelLabel: "Analysis model",
      currentModel: "Current model: ",
      previewTitle: "Live insight preview",
      previewSubtitle: "From scattered comments to an actionable analysis result",
      sourceHint: "Supports Product Hunt, App Store, and Google Play",
      chips: [
        { label: "Pricing sensitivity", icon: Flame },
        { label: "Export friction", icon: Star },
        { label: "Team workflow", icon: MessageSquare }
      ]
    },
    showcase: {
      eyebrow: "Light like an AI assistant, structured like a product system",
      title: "One workflow from review collection to competitor-aware insights",
      description:
        "FeatureMap brings review sources, AI models, dashboards, and competitor comparison into one focused flow so visitors understand the product value faster.",
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
        "Fetching reviews through the Apify pipeline...",
        "Denoising sentiment with the selected model...",
        "Organizing the structured analysis result..."
      ]
    },
    dashboard: {
      complete: "Analysis complete",
      title: "FeatureMap user review analysis result",
      sourceLabel: "Source",
      modelLabel: "Model",
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
        detail: "Positive momentum is steady, while pricing friction is frequent",
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
              title: "Free model feels slow",
              summary:
                "DeepSeek free-tier analysis is perceived as slow and needs clearer progress feedback.",
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
        "FeatureMap is designed for multi-role collaboration, organizing review evidence, demand themes, and competitor information for faster decisions.",
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
    auth: {
      loginTitle: "Log in to FeatureMap",
      signupTitle: "Create your FeatureMap account",
      emailLabel: "Email",
      passwordLabel: "Password",
      emailPlaceholder: "you@example.com",
      passwordPlaceholder: "Enter password",
      loginButton: "Log in",
      signupButton: "Sign up",
      switchToSignup: "No account yet? Sign up",
      switchToLogin: "Already have an account? Log in",
      closeLabel: "Close",
      helper: "This is an MVP prototype entry and is not connected to real authentication."
    },
    subscription: {
      eyebrow: "Subscribe for early access",
      title: "Get one real product-review insight sample every week",
      description:
        "Leave your email to receive MVP updates, sample reports, and reusable review-analysis templates.",
      placeholder: "you@example.com",
      button: "Subscribe",
      success: "You are on the list. The next report will reach you first.",
      privacy: "No spam. Unsubscribe anytime.",
      benefits: ["Sample insight reports", "New model previews", "Analysis templates"]
    }
  }
};

export type LocaleContent = (typeof localizedContent)[Language];
