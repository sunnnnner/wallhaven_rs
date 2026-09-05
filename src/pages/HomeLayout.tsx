import { GithubOutlined, HomeOutlined, MenuOutlined, ReloadOutlined, SearchOutlined, SettingOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { Button, Input, Layout, Menu, message, Tooltip } from 'antd'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { open } from '@tauri-apps/plugin-shell'
import { useRef, useState } from 'react'

const items = [
  { key: '/index/latest', icon: <HomeOutlined aria-hidden />, label: '最新' },
  { key: '/index/top', icon: <ThunderboltOutlined aria-hidden />, label: '排行榜' },
  { key: '/index/hot', icon: <MenuOutlined aria-hidden />, label: '热门' },
  { key: '/index/random', icon: <ThunderboltOutlined aria-hidden />, label: '随机' },
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

  return (
    <Layout className="app-layout">
      <Layout.Header className="app-header">
        <div className="brand-section">
          <div className="brand-mark">W</div>
          <div>
            <div className="app-title">Wallhaven</div>
            <div className="app-subtitle">壁纸管理器</div>
          </div>
        </div>
        <Menu
          mode="horizontal"
          theme="dark"
          selectedKeys={[activeKey]}
          items={items}
          onClick={({ key }) => navigate(key)}
          className="nav-menu"
        />
        <div className="action-section">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onPressEnter={searchWallpapers}
            allowClear
            prefix={<SearchOutlined />}
            placeholder="搜索壁纸..."
            className="search-input"
          />
          <Tooltip title="刷新">
            <Button aria-label="刷新" icon={<ReloadOutlined />} onClick={refresh} />
          </Tooltip>
          <Tooltip title="设置">
            <Button aria-label="设置" icon={<SettingOutlined />} onClick={openConfig} />
          </Tooltip>
          <Tooltip title="GitHub">
            <Button aria-label="GitHub" icon={<GithubOutlined />} onClick={() => open('https://github.com/Sunnnner/wallhaven_rs').catch((error) => message.error(`打开链接失败：${String(error)}`))} />
          </Tooltip>
        </div>
      </Layout.Header>
      <Layout.Content className="app-content">
        <Outlet />
      </Layout.Content>
    </Layout>
  )
}
