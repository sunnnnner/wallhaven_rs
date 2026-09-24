import {
  BorderOutlined,
  CloseOutlined,
  GithubOutlined,
  HomeOutlined,
  MenuOutlined,
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
  { key: '/index/latest', icon: <HomeOutlined aria-hidden className="text-white/50" />, label: '最新' },
  { key: '/index/top', icon: <ThunderboltOutlined aria-hidden className="text-white/50" />, label: '排行榜' },
  { key: '/index/hot', icon: <MenuOutlined aria-hidden className="text-white/50" />, label: '热门' },
  { key: '/index/random', icon: <ThunderboltOutlined aria-hidden className="text-white/50" />, label: '随机' },
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
    } catch (error) {
      message.error(`打开设置失败：${String(error)}`)
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
          <div className="brand-mark flex items-center justify-center transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-108">
            <img
              src={appLogo}
              alt="Wallhaven"
              className="w-8 h-8 object-contain select-none pointer-events-none drop-shadow-[0_2px_10px_rgba(228,184,99,0.3)] transition-all duration-500 group-hover:drop-shadow-[0_4px_16px_rgba(228,184,99,0.5)]"
            />
          </div>
          <div className="flex flex-col">
            <div className="app-title text-[13px] font-semibold tracking-tight text-white/90 group-hover:text-[#E4B863] transition-colors duration-300">Wallhaven</div>
            <div className="app-subtitle text-[10px] text-white/40 font-medium tracking-wide">壁纸管理器</div>
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
            prefix={<SearchOutlined className="text-white/40 text-xs" />}
            placeholder="搜索壁纸..."
            className="search-input !h-8 !text-xs !bg-white/6 hover:!bg-white/10 focus:!bg-white/12 !border-white/10 focus:!border-[#E4B863]/50 !rounded-2xl transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] focus:!shadow-[0_0_0_2px_rgba(228,184,99,0.15)]"
          />

          <Tooltip title="刷新">
            <Button
              aria-label="刷新"
              icon={<ReloadOutlined className="text-sm text-white/80" />}
              onClick={refresh}
              className="!h-8 !w-8 !min-w-8 !p-0 !rounded-2xl !border-white/10 !bg-white/6 hover:!bg-white/12 active:!scale-95 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
            />
          </Tooltip>

          <Tooltip title="设置">
            <Button
              aria-label="设置"
              icon={<SettingOutlined className="text-sm text-white/80" />}
              onClick={openConfig}
              className="!h-8 !w-8 !min-w-8 !p-0 !rounded-2xl !border-white/10 !bg-white/6 hover:!bg-white/12 active:!scale-95 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
            />
          </Tooltip>

          <Tooltip title="GitHub">
            <Button
              aria-label="GitHub"
              icon={<GithubOutlined className="text-sm text-white/80" />}
              onClick={() => open('https://github.com/sunnnnner/wallhaven_rs').catch((error) => message.error(`打开链接失败：${String(error)}`))}
              className="!h-8 !w-8 !min-w-8 !p-0 !rounded-2xl !border-white/10 !bg-white/6 hover:!bg-white/12 active:!scale-95 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
            />
          </Tooltip>

          {/* 沉浸式一体化窗口控制按钮组 */}
          <div className="window-controls flex items-center gap-1.5 pl-2 ml-1 border-l border-white/10" data-tauri-drag-region="false">
            <Tooltip title="最小化">
              <Button
                aria-label="最小化"
                icon={<MinusOutlined className="text-xs text-white/70" />}
                onClick={minimizeWindow}
                className="!h-7 !w-7 !min-w-7 !p-0 !rounded-xl !border-transparent !bg-white/4 hover:!bg-white/10 !text-white/70 hover:!text-white active:!scale-95 transition-all duration-300"
              />
            </Tooltip>

            <Tooltip title="最大化 / 还原">
              <Button
                aria-label="最大化"
                icon={<BorderOutlined className="text-xs text-white/70" />}
                onClick={toggleMaximizeWindow}
                className="!h-7 !w-7 !min-w-7 !p-0 !rounded-xl !border-transparent !bg-white/4 hover:!bg-white/10 !text-white/70 hover:!text-white active:!scale-95 transition-all duration-300"
              />
            </Tooltip>

            <Tooltip title="关闭">
              <Button
                aria-label="关闭窗口"
                icon={<CloseOutlined className="text-xs text-white/70" />}
                onClick={closeWindow}
                className="!h-7 !w-7 !min-w-7 !p-0 !rounded-xl !border-transparent !bg-white/4 hover:!bg-red-500/80 !text-white/70 hover:!text-white active:!scale-95 transition-all duration-300"
              />
            </Tooltip>
          </div>
        </div>
      </Layout.Header>

      <Layout.Content className="app-content min-h-0 flex-1 overflow-hidden bg-transparent">
        <Outlet />
      </Layout.Content>
    </Layout>
  )
}
