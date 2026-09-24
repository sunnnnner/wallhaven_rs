import { invoke } from '@tauri-apps/api/core'
import type { Config, WallQuery, Wallpaper } from './types'

export function queryWallpapers(query: WallQuery, page: number) {
  return invoke<Wallpaper[]>('get_top_wallpapers', { params: { ...query, page } })
}

export function saveDownloadPath(path: string, proxy?: string) {
  const payload: { path: string; proxy?: string } = { path }
  if (proxy && proxy.trim()) {
    payload.proxy = proxy.trim()
  }
  return invoke<void>('save_config', payload)
}

export function testProxyConnection(proxy: string) {
  return invoke<number>('test_proxy_connection', { proxy })
}

export function loadConfig() {
  return invoke<Config>('load_config')
}

export function downloadWallpaper(url: string, fileName: string) {
  return invoke<void>('download_wallpaper', { url, file_name: fileName })
}

export function setAsWallpaper(url: string, fileName: string) {
  return invoke<void>('set_as_wallpaper', { url, file_name: fileName })
}

