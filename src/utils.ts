/**
 * 将壁纸远程图床 URL 转换为 Tauri 内置图片代理协议 URL
 * 仅在 Tauri 运行环境下且目标为 wallhaven 域名时转换，避免系统原生 Webview 无法直连 GFW 阻断的图床
 */
export function toDisplayImageUrl(url: string): string {
  if (!url) return ''
  if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ && url.includes('wallhaven.cc')) {
    return `wh-img://localhost?url=${encodeURIComponent(url)}`
  }
  return url
}
