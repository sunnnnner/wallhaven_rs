import { test } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const artifactDir = process.env.ARTIFACT_DIR || path.join(process.cwd(), 'test-artifacts')

if (!fs.existsSync(artifactDir)) {
  fs.mkdirSync(artifactDir, { recursive: true })
}

async function mockDesktop(page: any) {
  await page.addInitScript(() => {
    const state = { calls: [] as any[], windows: ['main'], failed: false, clipboard: '' }
    Object.assign(window, { desktopMock: state })
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (value: string) => { state.clipboard = value } } })
    Object.assign(window, {
      __TAURI_INTERNALS__: {
        metadata: { currentWindow: { label: 'main' }, currentWebview: { label: 'main' } },
        invoke: async (command: string, args: Record<string, any> = {}) => {
          state.calls.push({ command, args })
          if (command === 'get_top_wallpapers') {
            const params = args.params
            const wallpapers = Array.from({ length: 8 }, (_, index) => {
              const name = `${params.sorting}-${(params.page - 1) * 8 + index + 1}.png`
              return { name, url: '/src/static/2222.png', full_url: `/src/static/2222.png?name=${name}`, width: 1024, height: 1024 }
            })
            return wallpapers
          }
          if (command === 'load_config') return { download_path: '/tmp/Pictures' }
          if (command === 'test_proxy_connection') return 48
          if (command === 'save_config') return
          if (command === 'plugin:dialog|open') return '/tmp/Wallpapers'
          if (command === 'plugin:app|version') return '2.0.0'
          if (command === 'plugin:window|get_all_windows') return state.windows
          if (command === 'plugin:webview|create_webview_window') { state.windows.push(args.options.label); return }
          if (command === 'download_wallpaper' || command === 'set_as_wallpaper') return
          return
        },
      },
    })
  })
}

test('capture responsive screenshots', async ({ page }) => {
  await mockDesktop(page)

  // 1. 桌面端 1280 - 纯平铺网格画廊模式 (HaoWallpaper 风格全量卡片入场)
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/#/index/latest')
  await page.waitForTimeout(800)
  await page.screenshot({ path: path.join(artifactDir, 'browser-grid.png') })
  await page.locator('.brand-section').screenshot({ path: path.join(artifactDir, 'brand_logo_header_squircle.png') })
  await page.locator('.app-header').screenshot({ path: path.join(artifactDir, 'app_header_squircle.png') })

  // 1.1 鼠标悬停卡片光影浮现效果截图 (微徽章、多层投影与光晕)
  await page.locator('.thumbnail-container').first().hover()
  await page.waitForTimeout(400)
  await page.screenshot({ path: path.join(artifactDir, 'browser-hover.png') })

  // 2. 桌面端 1280 - 点击卡片展开详情展台模式
  await page.getByRole('button', { name: '查看 date_added-1.png' }).click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: path.join(artifactDir, 'browser-1280.png') })

  // 2.1 右键点击遮罩层大图展示右键菜单 (保存图片到本地 / 设置为桌面壁纸)
  await page.locator('.full-image-container').click({ button: 'right' })
  await page.waitForTimeout(400)
  await page.screenshot({ path: path.join(artifactDir, 'browser-context-menu.png') })
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)

  // 2. 平板端 800
  await page.setViewportSize({ width: 800, height: 600 })
  await page.waitForTimeout(300)
  await page.screenshot({ path: path.join(artifactDir, 'browser-800.png') })

  // 3. 移动端 390
  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForTimeout(300)
  await page.screenshot({ path: path.join(artifactDir, 'browser-390.png') })

  // 4. 设置页
  await page.setViewportSize({ width: 800, height: 600 })
  await page.goto('/#/config')
  await page.waitForTimeout(300)
  await page.screenshot({ path: path.join(artifactDir, 'settings-preview.png') })

  // 5. 设置页 - 网络代理 Tab
  await page.getByRole('tab', { name: '网络代理', exact: true }).click()
  await page.waitForTimeout(200)
  await page.getByRole('switch').click()
  await page.waitForTimeout(200)
  await page.getByRole('button', { name: 'Clash (7890)' }).click()
  await page.waitForTimeout(200)
  await page.getByRole('button', { name: '测试连接' }).click()
  await page.waitForTimeout(400)
  await page.screenshot({ path: path.join(artifactDir, 'settings-proxy.png') })

  // 6. 设置页 - 关于 Tab (GPU加速检测展示)
  await page.getByRole('tab', { name: '关于', exact: true }).click()
  await page.waitForTimeout(300)
  await page.screenshot({ path: path.join(artifactDir, 'settings-about.png') })
})
