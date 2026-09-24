use crate::config::interface::Config;
use crate::utils::error::{WallResult, Error};
use toml::Table;
use tauri::{AppHandle, Manager};


impl Config {
    pub fn new(download_path: String, proxy: Option<String>) -> Self {
        Self {
            download_path,
            proxy: proxy.and_then(|p| {
                let trimmed = p.trim();
                if trimmed.is_empty() {
                    None
                } else {
                    Some(trimmed.to_string())
                }
            }),
        }
    }

    pub fn save(&self, app: &AppHandle) -> WallResult<()> {
        let config_dir = app.path().config_dir().map_err(|e| Error::new(&format!("配置路径错误: {e}")))?;
        std::fs::create_dir_all(&config_dir)?;
        let config_path = config_dir.join("config.toml");
        std::fs::create_dir_all(&self.download_path)?;
        let toml_config = toml::to_string(self)?;
        std::fs::write(config_path, toml_config)?;
        Ok(())
    }

    // 从本机配置文件读取配置
    pub fn load(app: &AppHandle) -> WallResult<Self> {
        let config_dir = app.path().config_dir().map_err(|e| Error::new(&format!("获取配置目录失败: {e}")))?;
        let config_path = config_dir.join("config.toml");
        
        // 判断config_path是否存在
        if !config_path.exists() {
            // 创建默认配置
            let default_config = Self::default_for(app);
            default_config.save(app)?;
            return Ok(default_config);
        }
        
        // 读取配置文件
        let config_str = std::fs::read_to_string(&config_path)
            .map_err(|e| Error::new(&format!("读取配置文件失败: {}", e)))?;
        
        let config: Table = toml::from_str(&config_str)
            .map_err(|e| Error::new(&format!("解析配置文件失败: {}", e)))?;
        
        let download_path = config
            .get("download_path")
            .and_then(|v| v.as_str())
            .ok_or(Error::new("配置文件中缺少 download_path 字段"))?
            .to_string();

        let proxy = config
            .get("proxy")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

        Ok(Self::new(download_path, proxy))
    }
}

impl Config {
    pub fn default_for(app: &AppHandle) -> Self {
        let download_path = app.path().picture_dir()
            .ok()
            .and_then(|p| p.to_str().map(|s| s.to_string()))
            .unwrap_or_else(|| {
                // 如果获取图片目录失败，使用用户主目录下的 Pictures
                let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
                format!("{}/Pictures", home)
            });

        Self::new(download_path, None)
    }
}
