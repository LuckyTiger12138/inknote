# InkNote 前端设计系统（摘要）

- 完整 token / 组件规范：`design-system/MASTER.md`
- 交互预览：打开 `index.html`（深/浅色、命令面板、编辑/预览/分栏）

## 已锁定决策

| 项 | 选择 |
|----|------|
| 产品名 | InkNote |
| 壳 | Tauri 2 |
| 编辑 | Markdown 源码 + 预览（可分栏） |
| 存储 | SQLite |

## 定位

精致极简的 Windows 本地生产力工具：三栏（导航 / 列表 / 编辑），默认深色，长时间写作友好。

## 快速色板

**Dark：** `#0F1115` / `#12151C` / `#161A22` · 字 `#E8EAED` · 强调 `#5B8DEF`  
**Light：** `#F7F8FA` / `#EEF1F6` / `#FFFFFF` · 字 `#1E293B` · 强调 `#2563EB`

## 字体与尺度

- UI：Inter / Segoe UI · 14px
- 正文：16px / 1.7 · 标题 28px
- 代码：JetBrains Mono
- 布局：`220 | 300 | 1fr` · 圆角 ≤ 8px · 动效 150–250ms

