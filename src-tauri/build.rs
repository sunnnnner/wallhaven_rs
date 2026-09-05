fn main() {
    let manifest = tauri_build::AppManifest::new().commands(&[
        "get_top_wallpapers",
        "save_config",
        "load_config",
        "download_wallpaper",
    ]);
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(manifest))
        .expect("failed to build Tauri application");
}
