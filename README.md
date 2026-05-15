# BB Bracket — 賽程表產生器

高效能的線上賽事排程與即時觀戰系統，支援最多 1000 名參賽者與 5 種賽制。

**Live Demo:** [https://bb-bracket.web.app](https://bb-bracket.web.app)

---

## 功能特色

- **5 種賽制** — 單淘汰、雙敗淘汰、循環賽、瑞士制、多階段分組賽
- **最多 1000 人** — 高效能演算法與虛擬化渲染，大規模賽事也不卡頓
- **樹狀賽程圖** — 所有賽制皆以樹狀圖呈現，附 SVG 連線與縮放畫布
- **即時觀戰** — 透過 Firebase Realtime Database 跨裝置同步，延遲 <500ms
- **分享連結** — 一鍵產生觀戰連結，任何人打開即可即時觀看比賽進度
- **唯讀觀戰模式** — 觀眾端自動進入唯讀介面，不會誤觸比分

## 技術架構

| 分類 | 技術 |
|------|------|
| 前端框架 | React 19 + Vite |
| 狀態管理 | React Context + useReducer |
| 即時同步 | Firebase Realtime Database + BroadcastChannel + localStorage |
| 樣式 | Vanilla CSS（暗色主題、Glassmorphism） |
| 部署 | Firebase Hosting |

### 三層即時同步機制

| 層級 | 技術 | 範圍 | 延遲 |
|------|------|------|------|
| Layer 1 | BroadcastChannel | 同瀏覽器分頁 | <10ms |
| Layer 2 | localStorage | 同裝置 | ~2s |
| Layer 3 | Firebase RTDB | 跨裝置 / 外網 | ~200ms |

## 快速開始

### 前置需求

- [Node.js](https://nodejs.org/) v20+

### 安裝與啟動

```bash
# 1. 複製專案
git clone https://github.com/TWP970/BB_Bracket.git
cd BB_Bracket

# 2. 安裝依賴
npm install

# 3. 設定 Firebase（可選，不設定仍可本機使用）
cp .env.example .env.local
# 編輯 .env.local，填入你的 Firebase 憑證

# 4. 啟動開發伺服器
npm run dev
```

### Firebase 設定

若需要跨裝置即時觀戰功能：

1. 前往 [Firebase Console](https://console.firebase.google.com/) 建立專案
2. 啟用 **Realtime Database**（選擇測試模式）
3. 註冊 Web 應用程式，取得憑證
4. 將憑證填入 `.env.local`：

```
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebasedatabase.app
VITE_FIREBASE_PROJECT_ID=your-project-id
```

5. 重啟 dev server

### 部署

```bash
npm run build
firebase deploy --only hosting
```

## 專案結構

```
src/
├── components/
│   ├── Bracket/          # 單淘汰 / 雙敗淘汰樹狀圖
│   ├── RoundRobin/       # 循環賽檢視
│   ├── Swiss/            # 瑞士制檢視
│   ├── MultiStage/       # 多階段賽制（分組 + 淘汰）
│   ├── Spectator/        # 即時觀戰頁面
│   ├── Sidebar/          # 設定側邊欄
│   └── shared/           # 共用元件（MatchCard、BracketCanvas 等）
├── context/
│   ├── TournamentContext.jsx   # 全域賽事狀態管理
│   └── ReadOnlyContext.jsx     # 唯讀模式控制
├── hooks/
│   └── useBroadcast.js         # 三層即時同步 Hook
└── lib/
    ├── bracket.js        # 單淘汰 / 雙敗淘汰演算法
    ├── roundrobin.js     # 循環賽演算法
    ├── swiss.js          # 瑞士制演算法
    ├── multistage.js     # 多階段賽制邏輯
    ├── firebase.js       # Firebase 初始化
    └── utils.js          # 工具函數
```

## License

MIT
