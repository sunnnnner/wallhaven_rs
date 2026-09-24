import { expect, test, type Page } from '@playwright/test'

async function mockDesktop(page: Page) {
  await page.addInitScript(() => {
    const state = { calls: [] as { command: string; args: Record<string, any> }[], windows: ['main'], failed: false, clipboard: '' }
    Object.assign(window, { desktopMock: state })
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (value: string) => { state.clipboard = value } } })
    Object.assign(window, {
      __TAURI_INTERNALS__: {
        metadata: { currentWindow: { label: 'main' }, currentWebview: { label: 'main' } },
        invoke: async (command: string, args: Record<string, any> = {}) => {
          state.calls.push({ command, args })
          if (command === 'get_top_wallpapers') {
            const params = args.params
            if (params.page > 1) await new Promise((resolve) => setTimeout(resolve, location.search.includes('stale') ? 800 : 120))
            if (location.search.includes(`failPage=${params.page}`) && !state.failed) {
              state.failed = true
              throw new Error('network unavailable')
            }
            if (params.page > 2) return []
            const wallpapers = Array.from({ length: 8 }, (_, index) => {
              const name = `${params.sorting}-${(params.page - 1) * 8 + index + 1}.png`
              return { name, url: '/src/static/2222.png', full_url: `/src/static/2222.png?name=${name}`, width: 1024, height: 1024 }
            })
            return params.page === 2 ? [wallpapers[0], ...wallpapers] : wallpapers
          }
          if (command === 'load_config') return { download_path: localStorage.getItem('test-download-path') || '/tmp/Pictures' }
          if (command === 'save_config') { localStorage.setItem('test-download-path', args.path); return }
          if (command === 'plugin:dialog|open') return '/tmp/Wallpapers'
          if (command === 'plugin:app|version') return '2.0.0'
          if (command === 'plugin:window|get_all_windows') return state.windows
          if (command === 'plugin:webview|create_webview_window') { state.windows.push(args.options.label); return }
          if (command === 'download_wallpaper' || command === 'set_as_wallpaper') {
            await new Promise((resolve) => setTimeout(resolve, 150))
            if (location.search.includes('failDownload') && args.file_name.endsWith('-2.png')) throw new Error('download failed')
            return
          }
          if (['plugin:window|show', 'plugin:window|set_focus', 'plugin:window|close', 'plugin:shell|open', 'plugin:window|minimize', 'plugin:window|toggle_maximize', 'plugin:window|internal_toggle_maximize', 'plugin:window|start_dragging'].includes(command)) return
          throw new Error(`Unexpected IPC command: ${command}`)
        },
      },
    })
  })
}

async function calls(page: Page) {
  return page.evaluate(() => (window as any).desktopMock.calls as { command: string; args: Record<string, any> }[])
}

async function scrollToEnd(page: Page) {
  await page.locator('.infinite-list').evaluate((list) => {
    list.scrollTop = list.scrollHeight
    list.dispatchEvent(new Event('scroll'))
    list.dispatchEvent(new Event('scroll'))
  })
}

test.beforeEach(async ({ page }) => {
  await mockDesktop(page)
  page.on('pageerror', (error) => { throw error })
})

test('routes, refresh and settings window retain their desktop contracts', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/#\/index\/latest$/)
  const routes = [['排行榜', 'top', 'toplist'], ['热门', 'hot', 'hot'], ['随机', 'random', 'random'], ['最新', 'latest', 'date_added']]
  for (const [label, route, sorting] of routes) {
    await page.getByRole('menuitem', { name: label, exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`#/index/${route}$`))
    await expect(page.getByRole('button', { name: `查看 ${sorting}-1.png`, exact: true })).toBeVisible()
  }
  await page.getByRole('button', { name: '刷新', exact: true }).click()
  await expect(page.getByRole('button', { name: '查看 date_added-1.png', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '设置', exact: true }).click()
  await page.getByRole('button', { name: '设置', exact: true }).click()
  const requests = await calls(page)
  expect(requests.filter(({ command }) => command === 'plugin:webview|create_webview_window')).toHaveLength(1)
  expect(requests.find(({ command }) => command === 'plugin:webview|create_webview_window')?.args.options.url).toBe('index.html#/config')
  expect(requests.some(({ command }) => command === 'plugin:window|set_focus')).toBe(true)
})

test('pagination retains selection, retries the failed page and stops after an empty page', async ({ page }) => {
  await page.goto('/?failPage=2#/index/latest')
  await expect(page.locator('.thumbnail-container')).toHaveCount(8)
  await page.getByRole('button', { name: '查看 date_added-1.png', exact: true }).click()
  await page.getByRole('checkbox', { name: '选择 date_added-1.png', exact: true }).check()
  await scrollToEnd(page)
  await expect(page.getByRole('alert')).toContainText('network unavailable')
  await page.getByRole('button', { name: '重试', exact: true }).click()
  await expect(page.locator('.thumbnail-container')).toHaveCount(16)
  await expect(page.getByRole('checkbox', { name: '选择 date_added-1.png', exact: true })).toBeChecked()
  await expect(page.locator('.toolbar')).toContainText('date_added-1.png')
  await scrollToEnd(page)
  await expect(page.getByLabel('加载中', { exact: true })).toHaveCount(0)
  await scrollToEnd(page)
  const pages = (await calls(page)).filter(({ command }) => command === 'get_top_wallpapers').map(({ args }) => args.params.page)
  expect(pages.filter((value) => value === 2)).toHaveLength(2)
  expect(pages.filter((value) => value === 3)).toHaveLength(1)
  expect(pages).not.toContain(4)
})

test('late pagination responses cannot populate another route', async ({ page }) => {
  await page.goto('/?stale#/index/latest')
  await expect(page.locator('.thumbnail-container')).toHaveCount(8)
  await scrollToEnd(page)
  await page.getByRole('menuitem', { name: '热门', exact: true }).click()
  await expect(page.getByRole('button', { name: '查看 hot-1.png', exact: true })).toBeVisible()
  await page.waitForTimeout(1000)
  await expect(page.locator('.thumbnail-container')).toHaveCount(8)
  expect(await page.locator('.thumbnail-select').evaluateAll((nodes) => nodes.every((node) => node.getAttribute('aria-label')?.includes('hot-')))).toBe(true)
})

test('image controls, preview, downloads and responsive layout work', async ({ page }) => {
  await page.goto('/?failDownload#/index/latest')
  await page.getByRole('button', { name: '查看 date_added-1.png', exact: true }).click()
  await page.getByRole('button', { name: '下一张', exact: true }).click()
  await expect(page.locator('.toolbar')).toContainText('date_added-2.png')
  await page.getByRole('button', { name: '上一张', exact: true }).click()
  for (const [label, fit] of [['填充', 'cover'], ['拉伸', 'fill'], ['缩小', 'scale-down'], ['适应', 'contain']]) {
    await page.locator('.ant-radio-button-wrapper').filter({ hasText: label }).click()
    await expect(page.locator('.full-image')).toHaveCSS('object-fit', fit)
  }
  await page.locator('.full-image').click()
  await expect(page.locator('.ant-image-preview')).toBeVisible()
  await page.getByRole('dialog').locator('button').first().click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: '复制链接', exact: true }).click()
  expect(await page.evaluate(() => (window as any).desktopMock.clipboard)).toContain('date_added-1.png')
  await page.getByRole('button', { name: '打开链接', exact: true }).click()
  await page.getByRole('button', { name: '下载', exact: true }).click()
  await expect(page.getByText('图片下载成功！', { exact: true })).toBeVisible()
  await page.getByRole('checkbox', { name: '选择 date_added-1.png', exact: true }).check()
  await page.getByRole('checkbox', { name: '选择 date_added-2.png', exact: true }).check()
  await page.getByRole('button', { name: '下载选中 (2)', exact: true }).click()
  await expect(page.getByText('下载完成！成功: 1 张, 失败: 1 张', { exact: true })).toBeVisible()
  const downloads = (await calls(page)).filter(({ command }) => command === 'download_wallpaper')
  expect(downloads.map(({ args }) => args.file_name)).toEqual(['date_added-1.png', 'date_added-1.png', 'date_added-2.png'])
  await page.getByRole('separator', { name: '侧边栏宽度' }).press('ArrowRight')
  await expect(page.getByRole('separator')).toHaveAttribute('aria-valuenow', '330')
  await expect(page.locator('.ant-message-notice')).toHaveCount(0)
  for (const [width, height] of [[1280, 800], [800, 750], [390, 844]]) {
    await page.setViewportSize({ width, height })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const image = page.locator('.full-image')
    await expect(image).toBeVisible()
    expect(await image.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0)).toBe(true)
    await page.screenshot({ path: `test-results/browser-${width}.png`, animations: 'disabled' })
  }
})

test('settings load, select, save only the path, reopen, reset and cancel', async ({ page }) => {
  await page.goto('/#/config')
  await expect(page.getByRole('textbox', { name: '下载保存路径', exact: true })).toHaveValue('/tmp/Pictures')
  await page.getByRole('button', { name: '选择路径', exact: true }).click()
  await page.getByRole('radio', { name: '自定义前缀', exact: true }).check()
  await page.getByPlaceholder('例如: wallpaper_').fill('example_')
  await page.getByRole('tab', { name: '界面设置', exact: true }).click()
  await page.getByRole('button', { name: '保存设置', exact: true }).click()
  await expect(page.getByText('下载保存路径已保存', { exact: true })).toBeVisible()
  expect((await calls(page)).find(({ command }) => command === 'save_config')?.args).toEqual({ path: '/tmp/Wallpapers' })
  await page.reload()
  await expect(page.getByRole('textbox', { name: '下载保存路径', exact: true })).toHaveValue('/tmp/Wallpapers')
  await page.getByRole('button', { name: '恢复默认', exact: true }).click()
  await page.getByRole('button', { name: '确定', exact: true }).click()
  await page.getByRole('tab', { name: '关于', exact: true }).click()
  await page.getByRole('button', { name: '保存设置', exact: true }).click()
  await expect(page.getByRole('tab', { name: '基础设置', exact: true })).toHaveAttribute('aria-selected', 'true')
  await page.getByRole('button', { name: '取消', exact: true }).click()
  expect((await calls(page)).some(({ command }) => command === 'plugin:window|close')).toBe(true)
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/settings-mobile.png' })
})
