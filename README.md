# Wallhaven 壁纸下载器

一个使用 React、Ant Design、Tauri v2 和 Rust 构建的 Wallhaven 壁纸浏览与下载工具。

支持：

- 最新、排行榜、热门、随机壁纸浏览
- 无限滚动加载、图片预览和显示模式切换
- 单张下载和批量下载
- 自定义下载目录

## 开发

需要 Node.js 22 LTS、pnpm 11.5.0、Rust stable，以及对应平台的 [Tauri v2 系统依赖](https://v2.tauri.app/start/prerequisites/)。Ubuntu/Debian 使用 WebKitGTK 4.1：

```bash
sudo apt-get install libgtk-3-dev libwebkit2gtk-4.1-dev libayatana-appindicator3-dev librsvg2-dev patchelf
```

```bash
pnpm install --frozen-lockfile
pnpm dev
```

浏览器开发地址为 `http://localhost:1420`；抓取、下载、目录选择和窗口操作需要在 Tauri 桌面环境运行：

```bash
pnpm tauri dev
```

构建前端和桌面应用：

```bash
pnpm build
pnpm tauri build
```

前端使用 HashRouter，例如 `/#/index/latest`、`/#/index/top`，支持桌面刷新和独立设置窗口。设置表单当前仅持久化下载保存路径；其他设置项保留现有占位行为。

## 验证

```bash
pnpm test
pnpm build
cargo check --locked --manifest-path src-tauri/Cargo.toml
cargo test --locked --manifest-path src-tauri/Cargo.toml
pnpm exec playwright install chromium
pnpm test:e2e
pnpm tauri build -- --locked
```

Vitest 检查四个 IPC 命令的参数及分页去重；Playwright 使用模拟 IPC，覆盖路由、分页重试、选择、预览、下载和设置流程。真实桌面权限、目录对话框及文件写入还需在原生应用中验证。Linux、macOS（Intel/Apple Silicon）和 Windows 构建由 `.github/workflows/release.yml` 执行。

IPC 保持 Rust 字段名 `topRange`、`ai_art_filter`、`full_url` 等；`save_config` 只接收 `{ path }`，`load_config` 返回 `{ download_path }`。原有配置文件位置保持不变，为系统配置目录下的 `config.toml`。

## 未实现功能

- 壁纸搜索
- 分辨率和颜色筛选
- 热门列表筛选
