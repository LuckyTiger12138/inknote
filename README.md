# InkNote 1.0.1

Windows **本地优先** Markdown 笔记工具（可发布版）。

**技术栈：** Tauri 2 · React · TypeScript · SQLite(FTS5) · CodeMirror 6 · Tailwind CSS

## 下载（Windows）

安装包发布在 **GitHub Releases**：

- [Releases 页面](https://github.com/LuckyTiger12138/inknote/releases)
- [v1.0.1 · setup.exe](https://github.com/LuckyTiger12138/inknote/releases/download/v1.0.1/InkNote_1.0.1_x64-setup.exe)（推荐，构建后可用）
- [v1.0.0 · setup.exe](https://github.com/LuckyTiger12138/inknote/releases/download/v1.0.0/InkNote_1.0.0_x64-setup.exe)

## 功能一览

- 三栏工作台：导航 / 虚拟化列表 / 编辑器
- Markdown 源码（CodeMirror）+ 预览 / 分栏
- SQLite 持久化 + FTS 全文搜索
- 分组、收藏、置顶、回收站
- 自动保存 + 关闭前落盘
- 导出 / 导入 Markdown 目录
- 数据库备份 / 恢复
- 便携模式（`portable.flag` + `data/`）
- 深色 / 浅色 / 跟随系统
- 命令面板与完整设置

## 开发

```bash
cd inknote
npm install

# 浏览器预览（localStorage）
npm run dev

# 桌面端（SQLite）
npm run tauri dev

# 单元测试
npm test
cd src-tauri && cargo test

# 打 Windows 安装包（NSIS + MSI）
npm run release
```

产物一般在：`src-tauri/target/release/bundle/`

## 快捷键

| 键 | 作用 |
|----|------|
| `Ctrl+K` | 命令面板 |
| `Ctrl+N` | 新建 |
| `Ctrl+S` | 保存 |
| `Ctrl+/` | 编辑模式循环 |
| `Ctrl+,` | 设置 |
| `Esc` | 关闭弹层 |

## 便携模式

1. 设置 → **启用便携模式**，或手动在 exe 旁创建空文件 `portable.flag`
2. 数据写入 `./data/inknote.db`
3. 也可设置环境变量 `INKNOTE_DATA_DIR` 指定目录

## 导出格式

```
export-dir/
  _inknote_export.json
  工作/
    标题__abcd1234.md
```

Markdown 含 YAML frontmatter（id / tags / notebook / pinned 等）。

## 数据位置（标准安装）

`%APPDATA%\com.luckytiger.inknote\inknote.db`（以设置页显示为准）

## 版本

**1.0.1** — 托盘、分组、右键菜单与窗口控制修复  
安装包见 [Releases](https://github.com/LuckyTiger12138/inknote/releases)。
