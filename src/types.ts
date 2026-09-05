export interface WallQuery {
  categories: number
  purity: number
  topRange: string
  sorting: string
  order: string
  ai_art_filter: number
  page: number
}

export interface Wallpaper {
  name: string
  url: string
  full_url: string
  width: number
  height: number
}

export interface Config {
  download_path: string
}
