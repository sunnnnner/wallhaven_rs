import type { Wallpaper } from './types'

export function appendWallpapers(current: Wallpaper[], incoming: Wallpaper[]) {
  const seen = new Set(current.map((wallpaper) => wallpaper.name))
  return current.concat(incoming.filter((wallpaper) => {
    if (seen.has(wallpaper.name)) return false
    seen.add(wallpaper.name)
    return true
  }))
}
