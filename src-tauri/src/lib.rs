pub mod api;
pub mod utils;
pub mod top;
pub mod download;
pub mod config;

use tauri::{AppHandle, Manager, State};
use crate::api::http::Context;
use crate::config::interface::Config;
use crate::download::download::Download;
use crate::top::top::TopTag;
use crate::utils::error::{Error, WallResult};
use crate::top::interface::{WallhavenResult};


pub type Result<T> = std::result::Result<T, Error>;


#[tauri::command(rename_all = "snake_case")]
async fn get_top_wallpapers(
    params: TopTag,
    context: State<'_, Context>) -> WallResult<WallhavenResult> {
    let top = TopTag::new(params);
    top.get_top_page(context).await
}

fn _construct_new_url(src: &str) -> Result<String> {
    let b_src = src.replace("th.wallhaven.cc/small", "w.wallhaven.cc/full");
    let parts: Vec<&str> = b_src.rsplitn(3, '/').collect();
    let file_name = format!("wallhaven-{}", parts[0]);
    let tag = parts[1];
    Ok(format!("https://w.wallhaven.cc/full/{}/{}", tag, file_name))
}

#[tauri::command(rename_all = "snake_case")]
async fn save_config(app: AppHandle, path: String) -> WallResult<()> {
    let config = Config::new(path);
    config.save(&app)
}

#[tauri::command(rename_all = "snake_case")]
async fn load_config(app: AppHandle) -> WallResult<Config> {
    Config::load(&app)
}

#[tauri::command(rename_all = "snake_case")]
async fn download_wallpaper(app: AppHandle, url: String, file_name: String, context: State<'_, Context>) -> WallResult<()> {
    println!("开始下载: {} -> {}", url, file_name);
    let download = Download::new(url, file_name);
    match download.save(&app, context).await {
        Ok(_) => {
            println!("下载完成");
            Ok(())
        }
        Err(e) => {
            eprintln!("下载失败: {:?}", e);
            Err(e)
        }
    }
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let cache_dir = app.path().cache_dir().unwrap_or_else(|_| std::env::temp_dir());
            app.manage(Context::new(cache_dir));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_top_wallpapers,
            save_config,
            load_config,
            download_wallpaper
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
