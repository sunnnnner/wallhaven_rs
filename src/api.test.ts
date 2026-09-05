import { beforeEach, describe, expect, it, vi } from 'vitest'
import { invoke } from '@tauri-apps/api/core'
import { downloadWallpaper, loadConfig, queryWallpapers, saveDownloadPath } from './api'
import { appendWallpapers } from './wallpapers'
import type { Wallpaper } from './types'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))
beforeEach(() => vi.clearAllMocks())

const wallpaper = (name: string): Wallpaper => ({ name, url: `https://th.wallhaven.cc/small/ab/${name}`, full_url: `https://w.wallhaven.cc/full/ab/${name}`, width: 1920, height: 1080 })

describe('wallpaper IPC contract', () => {
  it('invokes the Rust command with the exact query field names and requested page', async () => {
    const query = {
      categories: 111,
      purity: 110,
      topRange: '6M',
      sorting: 'toplist',
      order: 'desc',
      ai_art_filter: 0,
      page: 1,
    }
    const response = [wallpaper('one.jpg')]
    vi.mocked(invoke).mockResolvedValueOnce(response)
    expect(await queryWallpapers(query, 3)).toBe(response)
    expect(invoke).toHaveBeenCalledWith('get_top_wallpapers', {
      params: { categories: 111, purity: 110, topRange: '6M', sorting: 'toplist', order: 'desc', ai_art_filter: 0, page: 3 },
    })
    expect(query.page).toBe(1)
  })

  it('keeps config and download command arguments compatible with Rust', async () => {
    await saveDownloadPath('/tmp/Wallpapers')
    await loadConfig()
    await downloadWallpaper('https://w.wallhaven.cc/full/ab/one.jpg', 'one.jpg')
    expect(invoke).toHaveBeenNthCalledWith(1, 'save_config', { path: '/tmp/Wallpapers' })
    expect(invoke).toHaveBeenNthCalledWith(2, 'load_config')
    expect(invoke).toHaveBeenNthCalledWith(3, 'download_wallpaper', { url: 'https://w.wallhaven.cc/full/ab/one.jpg', file_name: 'one.jpg' })
  })

  it('does not append duplicate wallpapers across pages', () => {
    const current = [wallpaper('one'), wallpaper('two')]
    const incoming = [wallpaper('two'), wallpaper('three'), wallpaper('three')]
    expect(appendWallpapers(current, incoming).map(({ name }) => name)).toEqual(['one', 'two', 'three'])
    expect(current.map(({ name }) => name)).toEqual(['one', 'two'])
  })
})
