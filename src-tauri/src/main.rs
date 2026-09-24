// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    #[cfg(target_os = "linux")]
    {
        // 强制开启 WebKitGTK 硬件加速合成模式 (GPU Compositing)
        if std::env::var("WEBKIT_FORCE_COMPOSITING_MODE").is_err() {
            std::env::set_var("WEBKIT_FORCE_COMPOSITING_MODE", "1");
        }

        // 规避 NVIDIA 专有驱动下 WebKitGTK DMABuf 渲染器通信 Bug，确保稳定走 GPU 硬件加速
        if std::env::var("WEBKIT_DISABLE_DMABUF_RENDERER").is_err() {
            std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
        }
    }

    wallhaven_rs::run();
}
