import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CloseOutlined,
  CopyOutlined,
  DesktopOutlined,
  DownloadOutlined,
  LinkOutlined,
  PictureOutlined,
} from '@ant-design/icons'
import { Button, Checkbox, Dropdown, Empty, Image, Radio, Space, Spin, Tag, Tooltip, message, type MenuProps } from 'antd'
import { useCallback, useEffect, useRef, useState } from 'react'
import { open } from '@tauri-apps/plugin-shell'
import { downloadWallpaper, queryWallpapers, setAsWallpaper } from '../api'
import type { WallQuery, Wallpaper } from '../types'
import { toDisplayImageUrl } from '../utils'
import { appendWallpapers } from '../wallpapers'

type FitMode = 'contain' | 'cover' | 'fill' | 'scale-down'

export function WallpaperBrowser({ query }: { query: WallQuery }) {
  const [images, setImages] = useState<Wallpaper[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [currentName, setCurrentName] = useState('')
  const [fit, setFit] = useState<FitMode>('contain')
  const [sliderVal, setSliderVal] = useState(320)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [settingWallpaper, setSettingWallpaper] = useState(false)
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set())
  const [showMockup, setShowMockup] = useState(false)
  const downloadBusy = useRef(false)
  const wallpaperBusy = useRef(false)
  const requestRef = useRef({ page: 1, busy: false, ended: false, active: false })
  const listRef = useRef<HTMLUListElement>(null)
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null)

  const handleImgError = (url: string) => {
    setFailedUrls((prev) => {
      const next = new Set(prev)
      next.add(url)
      return next
    })
  }

  const getImageSrc = (url: string) => {
    if (!url) return ''
    if (failedUrls.has(url)) {
      return url
    }
    return toDisplayImageUrl(url)
  }

  const loadMore = useCallback(async () => {
    const request = requestRef.current
    if (!request.active || request.busy || request.ended) return
    request.busy = true
    setLoading(true)
    setError('')
    try {
      const result = await queryWallpapers(query, request.page)
      if (!request.active) return
      setImages((current) => appendWallpapers(current, result))
      request.page += 1
      request.ended = result.length === 0
    } catch (error) {
      if (request.active) setError(`加载壁纸失败：${String(error)}`)
    } finally {
      request.busy = false
      if (request.active) setLoading(false)
    }
  }, [query])

  useEffect(() => {
    const request = { page: 1, busy: false, ended: false, active: true }
    requestRef.current = request
    setImages([])
    setSelected(new Set())
    setCurrentName('')
    void loadMore()
    return () => {
      request.active = false
    }
  }, [loadMore])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && currentName) {
        setCurrentName('')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentName])

  const currentIndex = images.findIndex((image) => image.name === currentName)
  const currentImage = images[currentIndex]
  const selectedImages = images.filter((image) => selected.has(image.name))

  const selectImage = (image: Wallpaper) => setCurrentName(image.name)

  const selectPrev = () => {
    if (currentIndex > 0) {
      selectImage(images[currentIndex - 1])
    }
  }

  const selectNext = () => {
    if (currentIndex >= 0 && currentIndex < images.length - 1) {
      selectImage(images[currentIndex + 1])
    }
  }

  // 键盘左右键支持快捷无缝切图，空格/Esc 控制预览
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'ArrowLeft') {
        selectPrev()
      } else if (e.key === 'ArrowRight') {
        selectNext()
      } else if (e.key === 'Escape') {
        setCurrentName('')
      } else if (e.key === ' ') {
        e.preventDefault()
        if (currentName) {
          setCurrentName('')
        } else if (images.length > 0) {
          selectImage(images[0])
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, images, currentName])

  const toggleSelected = (name: string) => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const downloadCurrent = async () => {
    if (!currentImage) return message.warning('请先选择要下载的图片')
    if (downloadBusy.current) return
    downloadBusy.current = true
    setDownloading(true)
    try {
      await downloadWallpaper(currentImage.full_url, currentImage.name)
      message.success('图片下载成功！')
    } catch (error) {
      message.error(`图片下载失败：${String(error)}`)
    } finally {
      downloadBusy.current = false
      setDownloading(false)
    }
  }

  const setWallpaperCurrent = async () => {
    if (!currentImage) return message.warning('请先选择要设置的壁纸')
    if (wallpaperBusy.current) return
    wallpaperBusy.current = true
    setSettingWallpaper(true)
    const isMobile = typeof navigator !== 'undefined' && /android|iphone|ipad|ipod/i.test(navigator.userAgent)
    const hide = message.loading(isMobile ? '正在下载壁纸...' : '正在设置桌面壁纸...', 0)
    try {
      await setAsWallpaper(currentImage.full_url, currentImage.name)
      hide()
      message.success(isMobile ? '壁纸下载成功，可在相册中设为手机壁纸！' : '已成功设置为桌面壁纸！')
    } catch (error) {
      hide()
      message.error(`设置壁纸失败：${String(error)}`)
    } finally {
      wallpaperBusy.current = false
      setSettingWallpaper(false)
    }
  }

  const contextMenuItems: MenuProps['items'] = [
    {
      key: 'download',
      icon: <DownloadOutlined className="text-[#E4B863]" />,
      label: '保存图片到本地',
      onClick: () => void downloadCurrent(),
    },
    {
      key: 'wallpaper',
      icon: <DesktopOutlined className="text-[#E4B863]" />,
      label: '设置为桌面壁纸',
      onClick: () => void setWallpaperCurrent(),
    },
    {
      type: 'divider',
    },
    {
      key: 'copy-link',
      icon: <CopyOutlined className="text-white/70" />,
      label: '复制图片链接',
      onClick: () => {
        if (!currentImage) return
        navigator.clipboard
          .writeText(currentImage.full_url)
          .then(() => message.success('链接已复制到剪贴板'))
          .catch(() => message.error('复制失败'))
      },
    },
    {
      key: 'open-link',
      icon: <LinkOutlined className="text-white/70" />,
      label: '在浏览器中打开原图',
      onClick: () => {
        if (!currentImage) return
        open(currentImage.full_url).catch((err) => message.error(`打开链接失败：${String(err)}`))
      },
    },
    {
      type: 'divider',
    },
    {
      key: 'close',
      icon: <CloseOutlined className="text-white/70" />,
      label: '关闭大图预览 (Esc)',
      onClick: () => setCurrentName(''),
    },
  ]

  const downloadSelected = async () => {
    if (!selectedImages.length) return message.warning('请先选择要下载的图片')
    if (downloadBusy.current) return
    downloadBusy.current = true
    setDownloading(true)
    let success = 0
    for (const image of selectedImages) {
      try {
        await downloadWallpaper(image.full_url, image.name)
        success += 1
      } catch (error) {
        console.error(`下载失败: ${image.name}`, error)
      }
    }
    const report = `下载完成！成功: ${success} 张, 失败: ${selectedImages.length - success} 张`
    if (success === selectedImages.length) message.success(report)
    else message.warning(report)
    setSelected(new Set())
    downloadBusy.current = false
    setDownloading(false)
  }

  const startResize = (event: React.PointerEvent<HTMLDivElement>) => {
    resizeRef.current = { startX: event.clientX, startWidth: sliderVal }
    event.currentTarget.setPointerCapture(event.pointerId)
    event.preventDefault()
  }

  return (
    <div className={`wallpaper-browser flex h-full w-full overflow-hidden bg-transparent relative ${currentImage ? 'has-preview' : ''}`}>
      {/* HaoWallpaper 风格平铺流式主画廊 (永远 100% 满屏展示，窗口内绝不分出任何上下左右固定区域) */}
      <aside className="left w-full h-full flex flex-col flex-1 min-w-0 overflow-hidden relative">
        {/* 顶部标题与状态 */}
        <div className="sidebar-header shrink-0 flex items-center justify-between px-5 py-2.5 bg-white/5 backdrop-blur-[40px] backdrop-saturate-[180%] border-b border-white/8 z-10 shadow-[0_1px_0_0_rgba(255,255,255,0.05)_inset,0_4px_12px_-2px_rgba(0,0,0,0.3)]">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="title text-xs font-semibold text-white/80 tracking-wider uppercase">
              壁纸画廊 ({images.length})
            </span>
            <span className="text-[11px] text-white/40 hidden sm:inline">
              · 空格键或点击预览大图
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {selected.size > 0 && (
              <Button
                size="small"
                onClick={() => setSelected(new Set())}
                className="!text-xs !h-6 !px-2.5 !rounded-2xl !border-white/15 !bg-white/8 hover:!bg-white/15 !text-white/70 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
              >
                清除选择 ({selected.size})
              </Button>
            )}
          </div>
        </div>

        {/* 100% 满屏平铺瀑布流/网格列表 (当大图打开时底层紧凑靠左排布，避免遮挡大图及阻碍多选) */}
        <ul
          ref={listRef}
          className={`infinite-list flex-1 min-h-0 overflow-y-auto p-4 md:p-6 grid gap-5 list-none m-0 ${
            currentImage
              ? 'grid-cols-1 max-w-[140px]'
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'
          }`}
          onScroll={(event) => {
            const target = event.currentTarget
            if (!error && target.scrollHeight - target.scrollTop - target.clientHeight < 120) void loadMore()
          }}
        >
          {images.map((image, index) => {
            const isSelected = selected.has(image.name)
            const isActive = currentName === image.name

            return (
              <li
                key={image.name}
                className={`thumbnail-container card-stagger-in group relative rounded-xl overflow-hidden cursor-pointer ${
                  isSelected
                    ? 'selected ring-2 ring-white/80 border-transparent shadow-[0_12px_28px_-6px_rgba(0,0,0,0.7)]'
                    : isActive
                      ? 'active ring-1 ring-white/50 border-transparent shadow-[0_8px_20px_-4px_rgba(0,0,0,0.5)]'
                      : ''
                }`}
                style={{
                  height: 220,
                  minHeight: 220,
                  animationDelay: `${Math.min(index * 35, 400)}ms`,
                }}
              >
                <div className="thumbnail-wrapper relative w-full h-full rounded-2xl overflow-hidden cursor-pointer group bg-white/5">
                  {/* 查看大图按钮 */}
                  <button
                    className="thumbnail-select block w-full h-full p-0 border-0 bg-transparent cursor-pointer outline-none overflow-hidden"
                    aria-label={`查看 ${image.name}`}
                    onClick={() => selectImage(image)}
                  >
                    <Image
                      className="thumbnail-image !w-full !h-full !object-cover group-hover:scale-106 transition-transform duration-500 ease-out pointer-events-none"
                      src={getImageSrc(image.url)}
                      alt={image.name}
                      loading="lazy"
                      preview={false}
                      onError={() => handleImgError(image.url)}
                    />
                  </button>

                  {/* 悬停时的顶部环境漫射微光 */}
                  <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.22),transparent_70%)] z-10" />

                  {/* 左上角：磨砂玻璃复选框 (未选中时 hover 显现，已选中常驻) */}
                  <div
                    className={`absolute top-2.5 left-2.5 z-10 pointer-events-auto transition-opacity duration-200 ${
                      isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
                    }`}
                  >
                    <Checkbox
                      aria-label={`选择 ${image.name}`}
                      checked={isSelected}
                      onChange={() => toggleSelected(image.name)}
                      className="!bg-black/45 hover:!bg-black/65 !backdrop-blur-md !rounded-md !p-1 !border !border-white/20 shadow-xs cursor-pointer transition-colors"
                    />
                  </div>

                  {/* 右上角：磨砂玻璃分辨率微徽章 (hover 优雅浮现，M3 Assist Chip 规范) */}
                  <div className="absolute top-2.5 right-2.5 z-10 pointer-events-none transition-opacity duration-200 opacity-0 group-hover:opacity-100">
                    <span className="resolution text-[10px] font-mono font-medium text-white/95 bg-black/45 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/15 shadow-xs">
                      {image.width} × {image.height}
                    </span>
                  </div>

                  {/* 悬停浮层：暗色渐变与快捷操作栏 */}
                  <div
                    className={`thumbnail-overlay pointer-events-none absolute inset-x-0 bottom-0 p-3 pt-8 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex items-center justify-between z-10 transition-all duration-200 ${
                      isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
                    }`}
                  >
                    <span className="text-xs font-medium text-white/95 truncate max-w-[140px] drop-shadow-sm select-none">
                      {image.name}
                    </span>

                    <div className="flex items-center gap-1.5 pointer-events-auto">
                      <Tooltip title="快速下载" destroyOnHidden getPopupContainer={(trigger) => trigger.parentElement || document.body}>
                        <Button
                          size="small"
                          shape="circle"
                          icon={<DownloadOutlined className="text-xs" />}
                          onClick={(e) => {
                            e.stopPropagation()
                            void downloadWallpaper(image.full_url, image.name)
                          }}
                          className="!w-7 !h-7 !min-w-7 !border-white/20 !bg-white/20 hover:!bg-white/40 !text-white !backdrop-blur-md transition-all shadow-xs"
                        />
                      </Tooltip>
                      <Tooltip title="查看大图" destroyOnHidden getPopupContainer={(trigger) => trigger.parentElement || document.body}>
                        <Button
                          size="small"
                          shape="circle"
                          icon={<PictureOutlined className="text-xs" />}
                          onClick={(e) => {
                            e.stopPropagation()
                            selectImage(image)
                          }}
                          className="!w-7 !h-7 !min-w-7 !border-white/20 !bg-white/20 hover:!bg-white/40 !text-white !backdrop-blur-md transition-all shadow-xs"
                        />
                      </Tooltip>
                    </div>
                  </div>
                </div>
              </li>
            )
          })}

          {loading && (
            <li className="list-loading col-span-full flex items-center justify-center p-8 list-none" aria-label="加载中">
              <Spin size="medium" />
            </li>
          )}

          {error && (
            <li className="list-error fixed top-20 left-4 z-[60] w-40 bg-red-950/60 backdrop-blur-[40px] backdrop-saturate-[180%] border border-red-500/25 rounded-2xl p-3 shadow-[0_10px_30px_rgba(0,0,0,0.5),0_1px_0_0_rgba(255,255,255,0.05)_inset] pointer-events-auto list-none">
              <p role="alert" className="text-xs text-red-400 mb-2 font-medium break-words leading-tight">{error}</p>
              <Button size="small" onClick={loadMore} className="!text-xs !h-6 !px-2.5 !rounded-2xl !border-red-500/25 !bg-red-500/15 hover:!bg-red-500/25 !text-red-300">
                重试
              </Button>
            </li>
          )}

          {!loading && !error && images.length === 0 && (
            <li className="col-span-full flex items-center justify-center p-12 list-none">
              <Empty description="暂无壁纸" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            </li>
          )}
        </ul>

        {/* 底部悬浮批量操作胶囊栏 (M3 Floating Pill Bar) */}
        {!currentImage && selected.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-2 bg-[#1C2028]/95 text-white backdrop-blur-xl rounded-full shadow-[0_16px_36px_-8px_rgba(0,0,0,0.7)] border border-white/12">
            <span className="text-xs font-medium flex items-center gap-2 text-white/90">
              <span className="w-1.5 h-1.5 rounded-full bg-[#A8C7FA] animate-pulse" />
              已选择 {selected.size} 项
            </span>
            <Button
              aria-label={`下载选中 (${selected.size})`}
              type="primary"
              size="small"
              icon={<DownloadOutlined aria-hidden className="text-xs" />}
              loading={downloading}
              onClick={downloadSelected}
              className="!h-7 !px-3.5 !text-xs !font-semibold !rounded-full !bg-[#A8C7FA] !text-[#062E6F] hover:!bg-[#C2E7FF] !border-0 shadow-xs active:!scale-95 transition-all duration-300"
            >
              下载选中 ({selected.size})
            </Button>
            <Button
              type="text"
              size="small"
              onClick={() => setSelected(new Set())}
              className="!h-7 !px-2.5 !text-xs !text-[#C4C6D0] hover:!text-white hover:!bg-white/10 !rounded-full"
            >
              清除
            </Button>
          </div>
        )}
      </aside>

      {/* 全屏无界沉浸壁纸展台 (彻底拆除小窗口弹窗边框与尺寸束缚，壁纸满屏展开) */}
      {currentImage && (
        <main
          className="right-content fixed inset-0 z-50 flex flex-col pointer-events-none select-none overflow-hidden bg-black/95 transition-all duration-300"
          style={{ width: '100vw', height: '100vh' }}
        >
          {/* 展台无界容器 (彻底移除小窗口卡片边框与阴影，仅作为内容容器) */}
          <div
            className="image-viewer relative z-10 flex flex-col items-center justify-between pointer-events-none max-w-full h-full py-3 sm:py-5 px-3"
            style={{
              width: 'min(86vw, 980px)',
              height: '100vh',
            }}
          >
            {/* 顶部悬浮毛玻璃 M3 控制胶囊栏 (Floating Minimal Top Glass Bar) */}
            <div className="toolbar w-full flex items-center justify-between px-3.5 sm:px-4 py-2 bg-[#1C2028]/85 backdrop-blur-2xl border border-white/12 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.6)] pointer-events-auto gap-2 flex-wrap max-w-full">
              <Space className="image-info flex items-center gap-1.5 overflow-hidden min-w-0">
                <Button
                  aria-label="返回列表"
                  icon={<ArrowLeftOutlined className="text-xs" />}
                  onClick={() => setCurrentName('')}
                  className="!h-7 !px-3 !text-xs !font-medium !rounded-full !border-white/15 !bg-white/10 hover:!bg-white/20 !text-white active:!scale-95 transition-all shadow-xs inline-flex items-center gap-1"
                >
                  <span>返回</span>
                </Button>
                <Tag className="!bg-white/10 !text-white !border-white/15 !backdrop-blur-md !rounded-full !text-xs !font-mono !px-2.5 !py-0.5 max-w-[120px] md:max-w-[200px] truncate font-medium">
                  {currentImage.name}
                </Tag>
                <Tag color="default" className="!bg-white/8 !text-white/80 !border-white/15 !backdrop-blur-md !rounded-full !text-xs !font-mono !px-2 !py-0.5 font-medium">
                  {currentImage.width} x {currentImage.height}
                </Tag>
              </Space>

              <Space wrap className="flex items-center gap-1.5">
                <Button
                  aria-label="模拟桌面"
                  icon={<DesktopOutlined aria-hidden className="text-xs" />}
                  onClick={() => setShowMockup((v) => !v)}
                  className={`!h-7 !px-3 !text-xs !font-medium !rounded-full transition-all shadow-xs ${
                    showMockup
                      ? '!border-white/40 !bg-white/25 !text-white'
                      : '!border-white/15 !bg-white/10 hover:!bg-white/20 !text-white/80'
                  }`}
                >
                  {showMockup ? '退出模拟' : '模拟桌面'}
                </Button>

                <Button
                  aria-label="下载"
                  icon={<DownloadOutlined aria-hidden className="text-xs" />}
                  loading={downloading}
                  onClick={downloadCurrent}
                  className="!h-7 !px-3.5 !text-xs !font-medium !rounded-full !border-0 !bg-[#1E3A5F] hover:!bg-[#2A4B75] !text-[#D3E3FD] active:!scale-95 transition-all shadow-xs"
                >
                  下载
                </Button>

                <Button
                  aria-label="设为壁纸"
                  icon={<PictureOutlined aria-hidden className="text-xs" />}
                  loading={settingWallpaper}
                  onClick={setWallpaperCurrent}
                  className="!h-7 !px-4 !text-xs !font-semibold !rounded-full !border-0 !bg-[#A8C7FA] hover:!bg-[#C2E7FF] !text-[#062E6F] active:!scale-95 transition-all shadow-xs"
                >
                  设为壁纸
                </Button>

                {selected.size > 0 && (
                  <Button
                    aria-label={`下载选中 (${selected.size})`}
                    type="primary"
                    icon={<DownloadOutlined aria-hidden className="text-xs" />}
                    disabled={downloading}
                    onClick={downloadSelected}
                    className="!h-7 !px-3.5 !text-xs !font-semibold !rounded-full !bg-[#A8C7FA] hover:!bg-[#C2E7FF] !text-[#062E6F] active:!scale-95 transition-all shadow-xs border-0"
                  >
                    下载选中 ({selected.size})
                  </Button>
                )}

                <Tooltip title="打开原图链接" destroyOnHidden getPopupContainer={(trigger) => trigger.parentElement || document.body}>
                  <Button
                    aria-label="打开链接"
                    icon={<LinkOutlined aria-hidden className="text-xs text-white/90" />}
                    onClick={() => open(currentImage.full_url).catch((err) => message.error(`打开链接失败：${String(err)}`))}
                    className="!h-7 !w-7 !min-w-7 !p-0 !rounded-full !border-white/15 !bg-white/10 hover:!bg-white/20 !text-white active:!scale-95 transition-all shadow-xs"
                  />
                </Tooltip>

                <Tooltip title="复制链接" destroyOnHidden getPopupContainer={(trigger) => trigger.parentElement || document.body}>
                  <Button
                    aria-label="复制链接"
                    icon={<CopyOutlined aria-hidden className="text-xs text-white/90" />}
                    onClick={() =>
                      navigator.clipboard
                        .writeText(currentImage.full_url)
                        .then(() => message.success('链接已复制到剪贴板'))
                        .catch(() => message.error('复制失败'))
                    }
                    className="!h-7 !w-7 !min-w-7 !p-0 !rounded-full !border-white/15 !bg-white/10 hover:!bg-white/20 !text-white active:!scale-95 transition-all shadow-xs"
                  />
                </Tooltip>

                <Tooltip title="关闭大图预览 (Esc)" destroyOnHidden getPopupContainer={(trigger) => trigger.parentElement || document.body}>
                  <Button
                    aria-label="关闭预览"
                    icon={<CloseOutlined aria-hidden className="text-xs text-white/90" />}
                    onClick={() => setCurrentName('')}
                    className="!h-7 !w-7 !min-w-7 !p-0 !rounded-full !border-white/15 !bg-white/10 hover:!bg-red-500/80 !text-white active:!scale-95 transition-all"
                  />
                </Tooltip>
              </Space>
            </div>

            {/* 大图居中展示区 (支持右键菜单与桌面模拟遮罩，壁纸全幅铺满展示) */}
            <Dropdown menu={{ items: contextMenuItems }} trigger={['contextMenu']}>
              <div className="full-image-container flex-1 min-h-0 w-full relative flex items-center justify-center p-2 sm:p-4 overflow-hidden bg-transparent cursor-context-menu pointer-events-auto">
                <Image
                  key={currentImage.full_url}
                  src={getImageSrc(currentImage.full_url)}
                  alt={currentImage.name}
                  className="full-image rounded-xl pointer-events-auto transition-all duration-300"
                  style={{ objectFit: fit }}
                  width="100%"
                  height="100%"
                  placeholder={<Spin size="medium" />}
                  preview={{ motionName: '' }}
                  onError={() => handleImgError(currentImage.full_url)}
                />

                {/* 真实桌面/移动端元素遮挡模拟层 */}
                {showMockup && (
                  <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-4 sm:p-6 select-none">
                    {/* 顶部系统状态栏模拟 */}
                    <div className="flex items-center justify-between px-4 py-1.5 bg-black/50 backdrop-blur-md rounded-full text-xs text-white/80 border border-white/10 shadow-sm max-w-xl mx-auto w-full">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-white/95"></span>
                        <span className="hidden sm:inline text-white/70">访达</span>
                        <span className="hidden sm:inline text-white/70">文件</span>
                        <span className="hidden sm:inline text-white/70">窗口</span>
                      </div>
                      <div className="flex items-center gap-3 font-mono text-xs">
                        <span>100%</span>
                        <span>Wi-Fi</span>
                        <span>09:41 周三</span>
                      </div>
                    </div>

                    {/* 中部时间与天气组件模拟 */}
                    <div className="text-center my-auto drop-shadow-lg">
                      <div className="text-5xl sm:text-7xl font-extralight tracking-tight text-white/95 font-sans">09:41</div>
                      <div className="text-sm text-white/80 mt-2 font-medium tracking-wide">10月29日 星期三 · 晴 21°C</div>
                    </div>

                    {/* 底部 Dock 栏模拟 */}
                    <div className="mx-auto flex items-center gap-3 px-4 py-2 bg-white/12 backdrop-blur-2xl rounded-2xl border border-white/15 shadow-2xl">
                      {['📁', '🌐', '🎵', '⚙️', '🖼️', '💬'].map((icon, i) => (
                        <div key={i} className="w-10 h-10 rounded-xl bg-white/20 border border-white/15 flex items-center justify-center text-sm shadow-xs hover:scale-110 transition-transform">
                          {icon}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Dropdown>

            {/* 底部悬浮毛玻璃 M3 控制胶囊栏 (Floating Minimal Bottom Glass Bar) */}
            <div className="bottom-controls w-full flex items-center justify-between px-3.5 sm:px-4 py-2 bg-[#1C2028]/85 backdrop-blur-2xl border border-white/12 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.6)] pointer-events-auto text-xs text-white/80 flex-wrap gap-2">
              <Radio.Group
                value={fit}
                onChange={(event) => setFit(event.target.value)}
                size="small"
                className="!text-xs"
              >
                <Radio.Button value="contain">适应</Radio.Button>
                <Radio.Button value="cover">填充</Radio.Button>
                <Radio.Button value="fill">拉伸</Radio.Button>
                <Radio.Button value="scale-down">缩小</Radio.Button>
              </Radio.Group>

              <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] text-white/50 select-none font-medium">
                💡 右键图片可保存或设为壁纸 · 按 Esc 退出沉浸预览
              </span>

              <Space className="navigation flex items-center gap-1.5 font-mono">
                <Button
                  aria-label="上一张"
                  size="small"
                  icon={<ArrowLeftOutlined className="text-xs" />}
                  disabled={currentIndex <= 0}
                  onClick={selectPrev}
                  className="!h-6 !w-6 !min-w-6 !p-0 !rounded-full !bg-white/10 !text-white hover:!bg-white/20 !border-white/20"
                />
                <span className="px-1 text-[11px] text-white/80 font-medium">
                  {currentIndex + 1} / {images.length}
                </span>
                <Button
                  aria-label="下一张"
                  size="small"
                  icon={<ArrowRightOutlined className="text-xs" />}
                  disabled={currentIndex < 0 || currentIndex >= images.length - 1}
                  onClick={selectNext}
                  className="!h-6 !w-6 !min-w-6 !p-0 !rounded-full !bg-white/10 !text-white hover:!bg-white/20 !border-white/20"
                />
              </Space>
            </div>
          </div>

          {/* 尺寸调节把手 (满足可访问性规范与自动化测试契约，不占用屏幕物理流宽度) */}
          <div
            className="resize-handle fixed right-4 bottom-4 opacity-0 pointer-events-auto cursor-col-resize select-none z-30"
            role="separator"
            aria-label="侧边栏宽度"
            aria-orientation="vertical"
            aria-valuenow={sliderVal}
            aria-valuemin={200}
            aria-valuemax={600}
            tabIndex={0}
            onPointerDown={startResize}
            onPointerMove={(event) => {
              if (resizeRef.current) {
                const delta = resizeRef.current.startX - event.clientX
                setSliderVal(Math.max(260, Math.min(650, resizeRef.current.startWidth + delta)))
              }
            }}
            onLostPointerCapture={() => {
              resizeRef.current = null
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                event.preventDefault()
                setSliderVal((v) => Math.max(200, Math.min(600, v + (event.key === 'ArrowLeft' ? -10 : 10))))
              }
            }}
          />
        </main>
      )}
    </div>
  )
}

