use reqwest::{
    header::{HeaderMap, HeaderValue, ACCEPT, ACCEPT_LANGUAGE, USER_AGENT},
    Client,
};

use reqwest_middleware::{ClientBuilder, ClientWithMiddleware};
use http_cache_reqwest::{Cache, CacheMode, CACacheManager, HttpCache, HttpCacheOptions};
use std::path::PathBuf;
use std::sync::RwLock;
use std::time::Instant;
use crate::utils::error::{Error, WallResult};

fn default_headers() -> HeaderMap {
    let mut headers = HeaderMap::new();
    headers.insert(
        USER_AGENT,
        HeaderValue::from_str(
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) \
        AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0",
        )
        .expect("Failed to create user agent header"),
    );
    headers.insert(ACCEPT, HeaderValue::from_str("text/html,application/xhtml+xml,\
    application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;\
    v=b3;q=0.7").expect("Failed to create accept header"));
    headers.insert(
        ACCEPT_LANGUAGE,
        HeaderValue::from_str("zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6")
            .expect("Failed to create accept language header"),
    );
    headers.insert("sec-ch-ua", HeaderValue::from_str("\"Chromium\";v=\"94\", \";Not A Brand\";v=\"99\"")
        .expect("Failed to create sec-ch-ua header"));
    headers.insert("sec-ch-ua-mobile", HeaderValue::from_str("?0")
        .expect("Failed to create sec-ch-ua-mobile header"));
    headers.insert("sec-ch-ua-platform", HeaderValue::from_str("\"macOS\"")
        .expect("Failed to create sec-ch-ua-platform header"));
    headers.insert("sec-fetch-dest", HeaderValue::from_str("empty")
        .expect("Failed to create sec-fetch-dest header"));
    headers.insert("sec-fetch-mode", HeaderValue::from_str("cors")
        .expect("Failed to create sec-fetch-mode header"));
    headers.insert("sec-fetch-site", HeaderValue::from_str("same-origin")
        .expect("Failed to create sec-fetch-site header"));
    headers
}

fn build_client(cache_path: &PathBuf, proxy: Option<&str>) -> WallResult<ClientWithMiddleware> {
    let mut builder = Client::builder().default_headers(default_headers());

    if let Some(proxy_str) = proxy {
        let trimmed = proxy_str.trim();
        if !trimmed.is_empty() {
            let reqwest_proxy = reqwest::Proxy::all(trimmed)
                .map_err(|e| Error::new(&format!("代理地址格式无效: {e}")))?;
            builder = builder.proxy(reqwest_proxy);
        }
    }

    let raw_client = builder
        .build()
        .map_err(|e| Error::new(&format!("创建 HTTP 客户端失败: {e}")))?;

    let client = ClientBuilder::new(raw_client)
        .with(Cache(HttpCache {
            mode: CacheMode::Default,
            manager: CACacheManager {
                path: cache_path.clone(),
            },
            options: HttpCacheOptions::default(),
        }))
        .build();

    Ok(client)
}

#[derive(Debug)]
pub struct Context {
    cache_path: PathBuf,
    client: RwLock<ClientWithMiddleware>,
}

impl Context {
    pub fn new(base_cache_path: PathBuf, proxy: Option<&str>) -> Self {
        let cache_path = base_cache_path.join("wallhaven_rs").join("http-cache");

        if let Err(e) = std::fs::create_dir_all(&cache_path) {
            eprintln!("创建缓存目录失败: {}", e);
        }

        println!("HTTP 缓存目录: {:?}, 代理设置: {:?}", cache_path, proxy);

        let initial_client = build_client(&cache_path, proxy)
            .unwrap_or_else(|e| {
                eprintln!("初始化代理客户端失败，回退到无代理: {}", e);
                build_client(&cache_path, None).expect("默认 HTTP 客户端创建失败")
            });

        Self {
            cache_path,
            client: RwLock::new(initial_client),
        }
    }

    pub fn http_client(&self) -> ClientWithMiddleware {
        self.client.read().unwrap().clone()
    }

    pub fn update_proxy(&self, proxy: Option<&str>) -> WallResult<()> {
        let new_client = build_client(&self.cache_path, proxy)?;
        let mut client_lock = self.client.write().unwrap();
        *client_lock = new_client;
        println!("HTTP 客户端代理已更新为: {:?}", proxy);
        Ok(())
    }

    pub async fn test_proxy_connection(proxy: &str) -> WallResult<u64> {
        let trimmed = proxy.trim();
        if trimmed.is_empty() {
            return Err(Error::new("代理地址不能为空"));
        }

        let reqwest_proxy = reqwest::Proxy::all(trimmed)
            .map_err(|e| Error::new(&format!("代理地址格式无效: {e}")))?;

        let client = Client::builder()
            .default_headers(default_headers())
            .proxy(reqwest_proxy)
            .timeout(std::time::Duration::from_secs(6))
            .build()
            .map_err(|e| Error::new(&format!("创建测试客户端失败: {e}")))?;

        let start = Instant::now();
        let res = client
            .get("https://wallhaven.cc")
            .send()
            .await
            .map_err(|e| Error::new(&format!("代理连接测试失败: {e}")))?;

        if res.status().is_success() || res.status().is_redirection() {
            let elapsed = start.elapsed().as_millis() as u64;
            Ok(elapsed)
        } else {
            Err(Error::new(&format!("代理连接异常，状态码: {}", res.status())))
        }
    }
}
