import { invoke } from '@tauri-apps/api/core'
import type { Config, WallQuery, Wallpaper } from './types'

export function queryWallpapers(query: WallQuery, page: number) {
  return invoke<Wallpaper[]>('get_top_wallpapers', { params: { ...query, page } })
}

export function saveDownloadPath(path: string) {
  return invoke<void>('save_config', { path })
}

export function loadConfig() {
  return invoke<Config>('load_config')
}

export function downloadWallpaper(url: string, fileName: string) {
  return invoke<void>('download_wallpaper', { url, file_name: fileName })
}
