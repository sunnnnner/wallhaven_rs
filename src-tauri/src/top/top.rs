#![allow(non_snake_case)]

use crate::api::http::Context;
use crate::top::interface::{WallhavenResponse, WallhavenResult};
use crate::utils::error::{Error, WallResult};
use scraper::Selector;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct TopTag {
    pub categories: i64,
    pub purity: i64,
    pub topRange: String,
    pub sorting: String,
    pub order: String,
    pub ai_art_filter: i64,
    pub page: i64,
}



impl TopTag {
    pub fn new(
        self
    ) -> Self {
        self
    }
    pub fn get_url(&self) -> String {
        if self.topRange.is_empty() {
            format!(
                "https://wallhaven.cc/search?categories={}&purity={}&sorting={}&order={}&ai_art_filter={}&page={}",
                self.categories, self.purity, self.sorting, self.order, self.ai_art_filter, self.page
            )
        } else {
            format!(
                "https://wallhaven.cc/search?categories={}&purity={}&topRange={}&sorting={}&order={}&ai_art_filter={}&page={}",
                self.categories, self.purity, self.topRange, self.sorting, self.order, self.ai_art_filter, self.page
            )
        }
        // format!("https://wallhaven.cc/search?categories={}&purity={}&topRange={}&sorting={}&order={}&ai_art_filter={}&page={}", self.categories, self.purity, self.topRange, self.sorting, self.order, self.ai_art_filter, self.page)
    }

    pub async fn get_top_page(&self, context: State<'_, Context>) -> WallResult<WallhavenResult> {
        let url = self.get_url();
        let client = context.http_client();
        let response = client.get(url).send().await?;
        if !response.status().is_success() {
            return Err(Error::new(&format!("Wallhaven 响应异常: HTTP {}", response.status())));
        }
        let body = response.text().await?;
        if body.contains("wallhaven.cc's taking a little nap") || body.contains("wallhaven.cc Status") {
            return Err(Error::new("Wallhaven 官方服务器维护中，请稍后再试"));
        }
        let document = scraper::Html::parse_document(&body);
        let main_selector = Selector::parse("main")?;
        let section_selector = Selector::parse("section")?;
        let ul_selector = Selector::parse("ul")?;
        let li_selector = Selector::parse("li")?;
        let main = document
            .select(&main_selector)
            .next()
            .ok_or(Error::new("Main not found"))?;
        let section = main
            .select(&section_selector)
            .next()
            .ok_or(Error::new("Section not found"))?;
        let ul = section
            .select(&ul_selector)
            .next()
            .ok_or(Error::new("Ul not found"))?;
        let mut response = WallhavenResult::new();
        for element in ul.select(&li_selector) {
            let img_selector = Selector::parse("img[data-src]")?;
            let img = element
                .select(&img_selector)
                .next()
                .ok_or(Error::new("Image not found"))?;
            let src = img
                .value()
                .attr("data-src")
                .ok_or(Error::new("Src not found"))?;
            let png_value = Selector::parse("span.png")?;
            let png = element.select(&png_value).next();
            let wall_res = Selector::parse("span.wall-res")?;
            let width_height_html = element
                .select(&wall_res)
                .next()
                .ok_or(Error::new("Wall res not found"))?;
            let width_height_collect = width_height_html.text().collect::<Vec<_>>();
            let width_height = width_height_collect[0]
                .split(" x ")
                .map(|x| {
                    x.parse::<i32>().unwrap_or_else(|_| {
                        panic!(
                            "{}",
                            Error::new("Failed to parse width and height").to_string()
                        )
                    })
                })
                .collect::<Vec<i32>>();

            let b_src = src.replace("th.wallhaven.cc/small", "w.wallhaven.cc/full");
            let parts: Vec<&str> = b_src.rsplitn(3, '/').collect();
            if parts.len() != 3 {
                println!("Invalid URL");
                continue;
            }
            let file_name = parts[0];
            let tag = parts[1];
            let new_file_name = format!("wallhaven-{}", file_name);

            if png.is_some() {
                let _new_file_name: Vec<&str> = new_file_name.rsplitn(2, '.').collect();
                let new_file_name = format!("{}.png", _new_file_name[1]);
                let new_url = format!("https://w.wallhaven.cc/full/{}/{}", tag, new_file_name);
                response.push(WallhavenResponse::new(
                    new_file_name.to_string(),
                    src.to_string(),
                    new_url.to_string(),
                    width_height[0],
                    width_height[1],
                ));
            } else {
                let new_url = format!("https://w.wallhaven.cc/full/{}/{}", tag, new_file_name);
                response.push(WallhavenResponse::new(
                    new_file_name.to_string(),
                    src.to_string(),
                    new_url.to_string(),
                    width_height[0],
                    width_height[1],
                ));
            }
        }
        Ok(response)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[ignore]
    fn test_fetch_real() {
        tauri::async_runtime::block_on(async {
        let tag = TopTag {
            categories: 111,
            purity: 110,
            topRange: "".to_string(),
            sorting: "date_added".to_string(),
            order: "desc".to_string(),
            ai_art_filter: 1,
            page: 1,
        };
        let context = Context::new(std::env::temp_dir(), Some("http://192.168.18.15:7890"));
        let client = context.http_client();
        let url = tag.get_url();
        println!("Fetching URL: {}", url);
        let resp = client.get(&url).send().await.expect("send failed");
        println!("Status: {:?}", resp.status());
        println!("Headers: {:?}", resp.headers());
        let body = resp.text().await.expect("text failed");
        println!("Body length: {}", body.len());
        let doc = scraper::Html::parse_document(&body);
        let main_sel = Selector::parse("main").unwrap();
        let main = doc.select(&main_sel).next().expect("Main not found");
        let section_sel = Selector::parse("section").unwrap();
        let section = main.select(&section_sel).next().expect("Section not found");
        let ul_sel = Selector::parse("ul").unwrap();
        let ul = section.select(&ul_sel).next().expect("Ul not found");
        let li_sel = Selector::parse("li").unwrap();
        let count = ul.select(&li_sel).count();
        println!("Parsed wallpaper count: {}", count);
        assert!(count > 0, "No wallpapers found in list!");
        });
    }
}

