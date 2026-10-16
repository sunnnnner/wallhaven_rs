/**
 * 将壁纸远程图床 URL 转换为 Tauri 内置图片代理协议 URL
 * 仅在 Tauri 运行环境下且目标为 wallhaven 域名时转换，避免系统原生 Webview 无法直连 GFW 阻断的图床
 *
 * 跨平台协议说明：
 * - Android & Windows: Wry 将自定义 URI scheme 映射为 http://<scheme>.localhost/
 * - macOS & Linux & iOS: 原生自定义 scheme <scheme>://localhost/
 */
export function toDisplayImageUrl(url: string): string {
  if (!url) return ''
  if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ && url.includes('wallhaven.cc')) {
    const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent)
    const isWindows = typeof navigator !== 'undefined' && /Windows/i.test(navigator.userAgent)
    if (isAndroid || isWindows) {
      return `http://wh-img.localhost/?url=${encodeURIComponent(url)}`
    }
    return `wh-img://localhost?url=${encodeURIComponent(url)}`
  }
  return url
}
