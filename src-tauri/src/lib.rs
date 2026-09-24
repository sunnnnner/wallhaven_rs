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
async fn save_config(app: AppHandle, path: String, proxy: Option<String>, context: State<'_, Context>) -> WallResult<()> {
    let config = Config::new(path, proxy.clone());
    config.save(&app)?;
    let _ = context.update_proxy(proxy.as_deref());
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
async fn load_config(app: AppHandle) -> WallResult<Config> {
    Config::load(&app)
}

#[tauri::command(rename_all = "snake_case")]
async fn test_proxy_connection(proxy: String) -> WallResult<u64> {
    Context::test_proxy_connection(&proxy).await
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

#[tauri::command(rename_all = "snake_case")]
async fn set_as_wallpaper(app: AppHandle, url: String, file_name: String, context: State<'_, Context>) -> WallResult<()> {
    println!("设置为桌面壁纸: {} -> {}", url, file_name);
    let download = Download::new(url, file_name);
    let file_path = download.save(&app, context).await?;

    let path_str = file_path.to_str().ok_or_else(|| {
        crate::utils::error::Error::new("无效的文件路径")
    })?;

    wallpaper::set_from_path(path_str).map_err(|e| {
        eprintln!("设置壁纸失败: {:?}", e);
        crate::utils::error::Error::new(&format!("设置壁纸失败: {:?}", e))
    })?;

    let _ = wallpaper::set_mode(wallpaper::Mode::Crop);

    println!("成功设置为桌面壁纸: {:?}", file_path);
    Ok(())
}

pub fn run() {
    #[cfg(target_os = "linux")]
    {
        if std::env::var("WEBKIT_FORCE_COMPOSITING_MODE").is_err() {
            std::env::set_var("WEBKIT_FORCE_COMPOSITING_MODE", "1");
        }
        if std::env::var("WEBKIT_DISABLE_DMABUF_RENDERER").is_err() {
            std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
        }
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .register_asynchronous_uri_scheme_protocol("wh-img", |ctx, request, responder| {
            let app_handle = ctx.app_handle().clone();
            tauri::async_runtime::spawn(async move {
                let target_url = request.uri().query().and_then(|q| {
                    url::form_urlencoded::parse(q.as_bytes())
                        .find(|(k, _)| k == "url")
                        .map(|(_, v)| v.into_owned())
                });

                let Some(img_url) = target_url else {
                    let resp = http::Response::builder()
                        .status(400)
                        .body(Vec::new())
                        .unwrap();
                    responder.respond(resp);
                    return;
                };

                let context = app_handle.state::<Context>();
                let client = context.http_client();
                match client.get(&img_url).send().await {
                    Ok(res) => {
                        let content_type = res
                            .headers()
                            .get(reqwest::header::CONTENT_TYPE)
                            .and_then(|v| v.to_str().ok())
                            .unwrap_or("image/jpeg")
                            .to_string();
                        let status = res.status().as_u16();
                        match res.bytes().await {
                            Ok(bytes) => {
                                let resp = http::Response::builder()
                                    .status(status)
                                    .header("Content-Type", content_type)
                                    .header("Access-Control-Allow-Origin", "*")
                                    .body(bytes.to_vec())
                                    .unwrap();
                                responder.respond(resp);
                            }
                            Err(_) => {
                                let resp = http::Response::builder().status(502).body(Vec::new()).unwrap();
                                responder.respond(resp);
                            }
                        }
                    }
                    Err(_) => {
                        let resp = http::Response::builder().status(502).body(Vec::new()).unwrap();
                        responder.respond(resp);
                    }
                }
            });
        })
        .setup(|app| {
            let cache_dir = app.path().cache_dir().unwrap_or_else(|_| std::env::temp_dir());
            let initial_proxy = Config::load(app.handle()).ok().and_then(|c| c.proxy);
            app.manage(Context::new(cache_dir, initial_proxy.as_deref()));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_top_wallpapers,
            save_config,
            load_config,
            test_proxy_connection,
            download_wallpaper,
            set_as_wallpaper
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
