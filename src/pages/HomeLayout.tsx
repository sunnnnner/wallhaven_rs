import {
  BorderOutlined,
  CloseOutlined,
  CompassOutlined,
  FireOutlined,
  GithubOutlined,
  HomeOutlined,
  MinusOutlined,
  ReloadOutlined,
  SearchOutlined,
  SettingOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import { Button, Input, Layout, Menu, message, Tooltip } from 'antd'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { open } from '@tauri-apps/plugin-shell'
import { useRef, useState } from 'react'
import appLogo from '../static/logo.png'

const items = [
  { key: '/index/latest', icon: <HomeOutlined aria-hidden />, label: '最新' },
  { key: '/index/top', icon: <ThunderboltOutlined aria-hidden />, label: '排行榜' },
  { key: '/index/hot', icon: <FireOutlined aria-hidden />, label: '热门' },
  { key: '/index/random', icon: <CompassOutlined aria-hidden />, label: '随机' },
]

export function HomeLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [search, setSearch] = useState('')
  const openingSettings = useRef(false)
  const activeKey = location.pathname.startsWith('/index/') ? location.pathname : '/index/latest'

  const refresh = () => {
    window.location.reload()
  }

  const openConfig = async () => {
    if (openingSettings.current) return
    openingSettings.current = true
    try {
      const isMobile = typeof navigator !== 'undefined' && (/android|iphone|ipad|ipod/i.test(navigator.userAgent) || window.innerWidth <= 768)
      if (isMobile) {
        navigate('/config')
        return
      }

      const existing = await WebviewWindow.getByLabel('theUniqueLabel')
      if (existing) {
        await existing.show()
        await existing.setFocus()
        return
      }
      const settings = new WebviewWindow('theUniqueLabel', {
        url: 'index.html#/config',
        title: '应用设置',
        width: 800,
        height: 600,
        resizable: true,
        center: true,
      })
      await new Promise<void>((resolve, reject) => {
        void settings.once('tauri://created', () => resolve())
        void settings.once('tauri://error', (event) => reject(event.payload))
      })
    } catch {
      navigate('/config')
    } finally {
      openingSettings.current = false
    }
  }

  const searchWallpapers = () => {
    if (search.trim()) message.info(`搜索功能开发中: ${search.trim()}`)
  }

  const appWindow = getCurrentWindow()

  const minimizeWindow = () => {
    appWindow.minimize().catch(() => {})
  }

  const toggleMaximizeWindow = () => {
    appWindow.toggleMaximize().catch(() => {})
  }

  const closeWindow = () => {
    appWindow.close().catch(() => {})
  }

  return (
    <Layout className="app-layout min-h-screen">
      <Layout.Header
        data-tauri-drag-region
        onDoubleClick={toggleMaximizeWindow}
        className="app-header select-none cursor-default"
      >
        <div className="brand-section flex items-center gap-2.5 select-none cursor-pointer group" onClick={() => navigate('/index/latest')} data-tauri-drag-region="false">
          <div className="brand-mark flex items-center justify-center transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105">
            <img
              src={appLogo}
              alt="Wallhaven"
              className="w-8 h-8 object-contain select-none pointer-events-none transition-opacity duration-300 group-hover:opacity-90"
            />
          </div>
          <div className="flex flex-col">
            <div className="app-title text-[13px] font-semibold tracking-tight text-white/95 group-hover:text-white transition-colors duration-200">Wallhaven</div>
            <div className="app-subtitle text-[10px] text-white/45 font-medium tracking-wide">壁纸画廊</div>
          </div>
        </div>

        <Menu
          mode="horizontal"
          selectedKeys={[activeKey]}
          items={items}
          onClick={({ key }) => navigate(key)}
          className="nav-menu !border-0 !bg-transparent flex items-center justify-center"
          data-tauri-drag-region="false"
        />

        <div className="action-section flex items-center gap-2" data-tauri-drag-region="false">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onPressEnter={searchWallpapers}
            allowClear
            prefix={<SearchOutlined className="text-white/50 text-xs" />}
            placeholder="搜索壁纸..."
            className="search-input !h-9 !text-xs !bg-[#161921] hover:!bg-[#1C2028] focus:!bg-[#222630] !border-white/12 focus:!border-[#A8C7FA]/60 !rounded-full transition-all duration-300 focus:!shadow-[0_0_0_2px_rgba(168,199,250,0.2)]"
          />

          <Tooltip title="刷新">
            <Button
              aria-label="刷新"
              icon={<ReloadOutlined className="text-sm text-white/80" />}
              onClick={refresh}
              className="!h-9 !w-9 !min-w-9 !p-0 !rounded-full !border-white/10 !bg-white/6 hover:!bg-white/12 active:!scale-95 transition-all duration-300"
            />
          </Tooltip>

          <Tooltip title="设置">
            <Button
              aria-label="设置"
              icon={<SettingOutlined className="text-sm text-white/80" />}
              onClick={openConfig}
              className="!h-9 !w-9 !min-w-9 !p-0 !rounded-full !border-white/10 !bg-white/6 hover:!bg-white/12 active:!scale-95 transition-all duration-300"
            />
          </Tooltip>

          <Tooltip title="GitHub">
            <Button
              aria-label="GitHub"
              icon={<GithubOutlined className="text-sm text-white/80" />}
              onClick={() => open('https://github.com/sunnnnner/wallhaven_rs').catch((error) => message.error(`打开链接失败：${String(error)}`))}
              className="!h-9 !w-9 !min-w-9 !p-0 !rounded-full !border-white/10 !bg-white/6 hover:!bg-white/12 active:!scale-95 transition-all duration-300"
            />
          </Tooltip>

          {/* 沉浸式一体化窗口控制按钮组 */}
          <div className="window-controls flex items-center gap-1.5 pl-2 ml-1 border-l border-white/10" data-tauri-drag-region="false">
            <Tooltip title="最小化">
              <Button
                aria-label="最小化"
                icon={<MinusOutlined className="text-xs text-white/70" />}
                onClick={minimizeWindow}
                className="!h-7 !w-7 !min-w-7 !p-0 !rounded-full !border-transparent !bg-white/4 hover:!bg-white/10 !text-white/70 hover:!text-white active:!scale-95 transition-all duration-200"
              />
            </Tooltip>

            <Tooltip title="最大化 / 还原">
              <Button
                aria-label="最大化"
                icon={<BorderOutlined className="text-xs text-white/70" />}
                onClick={toggleMaximizeWindow}
                className="!h-7 !w-7 !min-w-7 !p-0 !rounded-full !border-transparent !bg-white/4 hover:!bg-white/10 !text-white/70 hover:!text-white active:!scale-95 transition-all duration-200"
              />
            </Tooltip>

            <Tooltip title="关闭">
              <Button
                aria-label="关闭窗口"
                icon={<CloseOutlined className="text-xs text-white/70" />}
                onClick={closeWindow}
                className="!h-7 !w-7 !min-w-7 !p-0 !rounded-full !border-transparent !bg-white/4 hover:!bg-red-500/80 !text-white/70 hover:!text-white active:!scale-95 transition-all duration-200"
              />
            </Tooltip>
          </div>
        </div>
      </Layout.Header>

      <Layout.Content className="app-content min-h-0 flex-1 overflow-hidden bg-transparent">
        <Outlet />
      </Layout.Content>

      {/* 移动端专属 M3 沉浸式底部导航栏 (Navigation Bar 规范，带胶囊指示器) */}
      <nav aria-label="移动端底部导航" className="mobile-bottom-nav fixed bottom-0 inset-x-0 z-40 flex items-center justify-around bg-[#161921]/95 backdrop-blur-2xl border-t border-white/8 select-none">
        {items.map((item) => {
          const isActive = activeKey === item.key
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => navigate(item.key)}
              className="flex-1 flex flex-col items-center justify-center py-1 transition-all duration-200 border-0 bg-transparent cursor-pointer group"
            >
              <div
                className={`w-14 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isActive
                    ? 'bg-[#1E3A5F] text-[#D3E3FD] shadow-xs'
                    : 'text-white/50 group-hover:text-white/80 group-hover:bg-white/4'
                }`}
              >
                <div className={`text-base leading-none transition-transform duration-200 ${isActive ? 'scale-105' : ''}`}>
                  {item.icon}
                </div>
              </div>
              <span
                className={`text-[11px] leading-none mt-1 transition-colors duration-200 ${
                  isActive ? 'font-semibold text-[#D3E3FD]' : 'font-medium text-white/50'
                }`}
              >
                {item.label}
              </span>
            </button>
          )
        })}
        <button
          type="button"
          onClick={openConfig}
          className="flex-1 flex flex-col items-center justify-center py-1 transition-all duration-200 border-0 bg-transparent cursor-pointer group"
        >
          <div className="w-14 h-8 rounded-full flex items-center justify-center text-white/50 group-hover:text-white/80 group-hover:bg-white/4 transition-all duration-300">
            <div className="text-base leading-none">
              <SettingOutlined />
            </div>
          </div>
          <span className="text-[11px] font-medium leading-none mt-1 text-white/50">设置</span>
        </button>
      </nav>
    </Layout>
  )
}
