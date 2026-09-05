import { ArrowLeftOutlined, ArrowRightOutlined, CopyOutlined, DownloadOutlined, LinkOutlined, PictureOutlined } from '@ant-design/icons'
import { Button, Checkbox, Empty, Image, Radio, Space, Spin, Tag, Tooltip, message } from 'antd'
import { useCallback, useEffect, useRef, useState } from 'react'
import { open } from '@tauri-apps/plugin-shell'
import { downloadWallpaper, queryWallpapers } from '../api'
import type { WallQuery, Wallpaper } from '../types'
import { appendWallpapers } from '../wallpapers'

type FitMode = 'contain' | 'cover' | 'fill' | 'scale-down'

export function WallpaperBrowser({ query }: { query: WallQuery }) {
  const [images, setImages] = useState<Wallpaper[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [currentName, setCurrentName] = useState('')
  const [fit, setFit] = useState<FitMode>('contain')
  const [sidebarWidth, setSidebarWidth] = useState(320)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)
  const downloadBusy = useRef(false)
  const requestRef = useRef({ page: 1, busy: false, ended: false, active: false })
  const listRef = useRef<HTMLUListElement>(null)
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null)

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
    return () => { request.active = false }
  }, [loadMore])

  useEffect(() => {
    const list = listRef.current
    if (list && images.length && !loading && !error && list.scrollHeight <= list.clientHeight) {
      void loadMore()
    }
  }, [images, loading, error, loadMore])

  const currentIndex = images.findIndex((image) => image.name === currentName)
  const currentImage = images[currentIndex]
  const selectedImages = images.filter((image) => selected.has(image.name))

  const selectImage = (image: Wallpaper) => setCurrentName(image.name)
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
    resizeRef.current = { startX: event.clientX, startWidth: sidebarWidth }
    event.currentTarget.setPointerCapture(event.pointerId)
    event.preventDefault()
  }

  return (
    <div className="wallpaper-browser">
      <aside className="left" style={{ width: sidebarWidth }}>
        <div className="sidebar-header">
          <span className="title">壁纸列表 ({images.length})</span>
          {selected.size > 0 && <Button size="small" onClick={() => setSelected(new Set())}>清除选择 ({selected.size})</Button>}
        </div>
        <ul
          ref={listRef}
          className="infinite-list"
          onScroll={(event) => {
            const target = event.currentTarget
            if (!error && target.scrollHeight - target.scrollTop - target.clientHeight < 120) void loadMore()
          }}
        >
          {images.map((image) => (
            <li key={image.name} className={`thumbnail-container${selected.has(image.name) ? ' selected' : ''}${currentName === image.name ? ' active' : ''}`}>
              <div className="thumbnail-wrapper">
                <button className="thumbnail-select" aria-label={`查看 ${image.name}`} onClick={() => selectImage(image)}>
                  <Image className="thumbnail-image" src={image.url} alt={image.name} loading="lazy" preview={false} />
                </button>
                <div className="thumbnail-overlay">
                  <Checkbox aria-label={`选择 ${image.name}`} checked={selected.has(image.name)} onChange={() => toggleSelected(image.name)} />
                  <div className="thumbnail-info"><span className="resolution">{image.width} x {image.height}</span></div>
                </div>
              </div>
            </li>
          ))}
          {loading && <li className="list-loading" aria-label="加载中"><Spin size="small" /></li>}
          {error && <li className="list-error"><p role="alert">{error}</p><Button onClick={loadMore}>重试</Button></li>}
          {!loading && !error && images.length === 0 && <li><Empty description="暂无壁纸" /></li>}
        </ul>
        <div className="resize-handle" role="separator" aria-label="侧边栏宽度" aria-orientation="vertical" aria-valuenow={sidebarWidth} aria-valuemin={200} aria-valuemax={600} tabIndex={0}
          onPointerDown={startResize}
          onPointerMove={(event) => {
            if (resizeRef.current) setSidebarWidth(Math.max(200, Math.min(600, resizeRef.current.startWidth + event.clientX - resizeRef.current.startX)))
          }}
          onLostPointerCapture={() => { resizeRef.current = null }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
              event.preventDefault()
              setSidebarWidth((width) => Math.max(200, Math.min(600, width + (event.key === 'ArrowLeft' ? -10 : 10))))
            }
          }}
        />
      </aside>

      <main className="right-content">
        {!currentImage ? (
          <div className="empty-state"><Empty image={<PictureOutlined />} description="选择左侧图片以查看详情" /></div>
        ) : (
          <div className="image-viewer">
            <div className="toolbar">
              <Space className="image-info"><Tag>{currentImage.name}</Tag><Tag color="success">{currentImage.width} x {currentImage.height}</Tag></Space>
              <Space wrap>
                <Button aria-label="下载" icon={<DownloadOutlined aria-hidden />} loading={downloading} onClick={downloadCurrent}>下载</Button>
                {selected.size > 0 && <Button type="primary" icon={<DownloadOutlined aria-hidden />} disabled={downloading} onClick={downloadSelected}>下载选中 ({selected.size})</Button>}
                <Tooltip title="打开链接"><Button aria-label="打开链接" icon={<LinkOutlined />} onClick={() => open(currentImage.full_url).catch((error) => message.error(`打开链接失败：${String(error)}`))} /></Tooltip>
                <Tooltip title="复制链接"><Button aria-label="复制链接" icon={<CopyOutlined />} onClick={() => navigator.clipboard.writeText(currentImage.full_url).then(() => message.success('链接已复制到剪贴板')).catch(() => message.error('复制失败'))} /></Tooltip>
              </Space>
            </div>
            <div className="full-image-container">
              <Image key={currentImage.full_url} src={currentImage.full_url} alt={currentImage.name} className="full-image" style={{ objectFit: fit }} width="100%" height="100%" placeholder={<Spin />} preview />
            </div>
            <div className="bottom-controls">
              <Radio.Group value={fit} onChange={(event) => setFit(event.target.value)} size="small">
                <Radio.Button value="contain">适应</Radio.Button>
                <Radio.Button value="cover">填充</Radio.Button>
                <Radio.Button value="fill">拉伸</Radio.Button>
                <Radio.Button value="scale-down">缩小</Radio.Button>
              </Radio.Group>
              <Space className="navigation">
                <Tooltip title="上一张"><Button aria-label="上一张" size="small" icon={<ArrowLeftOutlined />} disabled={currentIndex <= 0} onClick={() => selectImage(images[currentIndex - 1])} /></Tooltip>
                <span>{currentIndex + 1} / {images.length}</span>
                <Tooltip title="下一张"><Button aria-label="下一张" size="small" icon={<ArrowRightOutlined />} disabled={currentIndex < 0 || currentIndex >= images.length - 1} onClick={() => selectImage(images[currentIndex + 1])} /></Tooltip>
              </Space>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
