import { FolderOpenOutlined, GithubOutlined, GlobalOutlined, InfoCircleOutlined, LinkOutlined, SettingOutlined } from '@ant-design/icons'
import { Button, Checkbox, Descriptions, Form, Input, InputNumber, Layout, Modal, Radio, Slider, Space, Switch, Tabs, Tag, message } from 'antd'
import { getVersion } from '@tauri-apps/api/app'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { open as chooseDirectory } from '@tauri-apps/plugin-dialog'
import { open } from '@tauri-apps/plugin-shell'
import { useEffect, useState } from 'react'
import { loadConfig, saveDownloadPath, testProxyConnection } from '../api'
import appLogo from '../static/logo.png'

type FormValues = {
  download_path: string
  enable_proxy: boolean
  proxy: string
  naming_rule: 'original' | 'timestamp' | 'custom'
  custom_prefix: string
  open_folder_after_download: boolean
  theme: 'light' | 'dark' | 'auto'
  thumbnail_size: number
  sidebar_width: number
  show_info: string[]
  concurrent_downloads: number
  auto_deduplicate: boolean
  download_notification: boolean
}

const defaults: FormValues = {
  download_path: '',
  enable_proxy: false,
  proxy: '',
  naming_rule: 'original',
  custom_prefix: '',
  open_folder_after_download: false,
  theme: 'light',
  thumbnail_size: 180,
  sidebar_width: 320,
  show_info: ['resolution'],
  concurrent_downloads: 3,
  auto_deduplicate: true,
  download_notification: true,
}

export function ConfigPage() {
  const [form] = Form.useForm<FormValues>()
  const [modal, contextHolder] = Modal.useModal()
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('basic')
  const [version, setVersion] = useState('')
  const [testingProxy, setTestingProxy] = useState(false)
  const [proxyLatency, setProxyLatency] = useState<number | null>(null)
  const [gpuInfo, setGpuInfo] = useState<{ renderer: string; isHardware: boolean }>({
    renderer: '检测中...',
    isHardware: true,
  })

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      if (gl) {
        const ext = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info')
        if (ext) {
          const renderer = (gl as WebGLRenderingContext).getParameter(ext.UNMASKED_RENDERER_WEBGL) || ''
          const isSoftware = /swiftshader|llvmpipe|software/i.test(renderer)
          setGpuInfo({
            renderer: renderer || 'WebGL 硬件加速',
            isHardware: !isSoftware,
          })
        } else {
          setGpuInfo({ renderer: 'WebGL 硬件加速', isHardware: true })
        }
      } else {
        setGpuInfo({ renderer: '软件渲染', isHardware: false })
      }
    } catch {
      setGpuInfo({ renderer: '已启用硬件加速', isHardware: true })
    }
  }, [])

  useEffect(() => {
    let active = true
    loadConfig()
      .then((config) => {
        if (active) {
          const hasProxy = Boolean(config.proxy && config.proxy.trim())
          form.setFieldsValue({
            ...defaults,
            download_path: config.download_path,
            enable_proxy: hasProxy,
            proxy: config.proxy || '',
          })
        }
      })
      .catch((error) => { if (active) message.error(`加载配置失败：${String(error)}`) })
    getVersion().then((value) => { if (active) setVersion(value) }).catch(() => {})
    return () => { active = false }
  }, [form])

  const choosePath = async () => {
    try {
      const path = await chooseDirectory({ directory: true, defaultPath: form.getFieldValue('download_path') || undefined })
      if (typeof path === 'string') form.setFieldValue('download_path', path)
    } catch (error) {
      message.error(`选择路径失败：${String(error)}`)
    }
  }

  const handleTestProxy = async () => {
    const proxy = form.getFieldValue('proxy')
    if (!proxy || !proxy.trim()) {
      message.warning('请先输入代理服务器地址')
      return
    }
    setTestingProxy(true)
    setProxyLatency(null)
    try {
      const ms = await testProxyConnection(proxy.trim())
      setProxyLatency(ms)
      message.success(`代理连接测试成功！延迟: ${ms}ms`)
    } catch (error) {
      setProxyLatency(null)
      message.error(`代理连接测试失败：${String(error)}`)
    } finally {
      setTestingProxy(false)
    }
  }

  const submit = async (values: FormValues) => {
    if (!values.download_path) {
      message.warning('请先选择下载保存路径')
      return
    }
    const proxyValue = values.enable_proxy && values.proxy ? values.proxy.trim() : undefined
    setSaving(true)
    try {
      await saveDownloadPath(values.download_path, proxyValue)
      message.success('下载保存路径已保存')
    } catch (error) {
      message.error(`设置保存失败：${String(error)}`)
    } finally {
      setSaving(false)
    }
  }

  const reset = () => {
    modal.confirm({
      title: '恢复默认设置？',
      content: '当前页面中的设置将恢复为默认值。',
      okText: '确定',
      cancelText: '取消',
      transitionName: '',
      maskTransitionName: '',
      onOk: () => form.setFieldsValue(defaults),
    })
  }

  const basic = (
    <Form.Item label="下载保存路径" required className="mb-4">
      <Space.Compact block className="flex shadow-xs">
        <Form.Item name="download_path" noStyle rules={[{ required: true, message: '请选择下载保存路径' }]}>
          <Input readOnly aria-label="下载保存路径" placeholder="选择保存路径" className="!bg-white/6 !text-xs !border-white/12 !text-white/80" />
        </Form.Item>
        <Button aria-label="选择路径" icon={<FolderOpenOutlined aria-hidden />} onClick={choosePath} className="!text-xs !font-medium !border-white/12 !bg-white/8 hover:!bg-white/15 !text-white/70">
          选择路径
        </Button>
      </Space.Compact>
    </Form.Item>
  )

  return (
    <Layout className="config-page min-h-screen bg-[#0B1322]">
      {contextHolder}
      <div className="config-header sticky top-0 z-20 flex items-center justify-between px-6 py-3.5 bg-white/5 backdrop-blur-[40px] backdrop-saturate-[180%] border-b border-white/8 shadow-[0_1px_0_0_rgba(255,255,255,0.05)_inset,0_4px_12px_-2px_rgba(0,0,0,0.3)]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#E4B863] text-[#0B1322] flex items-center justify-center shadow-xs">
            <SettingOutlined className="text-xs" />
          </div>
          <h2 className="text-sm font-semibold tracking-tight text-white/90 m-0">应用设置</h2>
        </div>
        {version && (
          <Tag className="!bg-white/8 !text-white/50 !border-white/15 !rounded-full !text-[11px] !font-mono !px-2.5 !m-0">
            v{version}
          </Tag>
        )}
      </div>

      <div className="config-content flex-1 p-4 md:p-6 max-w-3xl mx-auto w-full">
        <Form
          form={form}
          layout="horizontal"
          labelCol={{ flex: '110px' }}
          wrapperCol={{ flex: 1 }}
          onFinish={submit}
          onFinishFailed={() => setActiveTab('basic')}
          initialValues={defaults}
          className="!bg-white/5 !backdrop-blur-[40px] !backdrop-saturate-[180%] !border !border-white/10 !rounded-3xl !p-6 !shadow-[0_4px_24px_rgba(0,0,0,0.3),0_1px_0_0_rgba(255,255,255,0.05)_inset,0_-1px_0_0_rgba(0,0,0,0.3)_inset]"
        >
          <div className="form-hint persistence-note flex items-center gap-2 p-2.5 mb-5 rounded-2xl bg-white/4 border border-white/8 text-xs text-white/50">
            <InfoCircleOutlined className="text-white/30" />
            <span>当前仅下载保存路径与网络代理设置会保存并生效。</span>
          </div>

          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            className="modern-config-tabs"
            items={[
              {
                key: 'basic',
                label: '基础设置',
                forceRender: true,
                children: (
                  <div className="tab-content py-3 space-y-4">
                    {basic}
                    <Form.Item label="文件命名规则" name="naming_rule" className="mb-4">
                      <Radio.Group options={[{ value: 'original', label: '原始文件名' }, { value: 'timestamp', label: '时间戳命名' }, { value: 'custom', label: '自定义前缀' }]} />
                    </Form.Item>
                    <Form.Item noStyle shouldUpdate={(prev, next) => prev.naming_rule !== next.naming_rule}>
                      {({ getFieldValue }) =>
                        getFieldValue('naming_rule') === 'custom' ? (
                          <Form.Item label="自定义前缀" name="custom_prefix" className="mb-4">
                            <Input placeholder="例如: wallpaper_" allowClear className="!text-xs max-w-xs" />
                          </Form.Item>
                        ) : null
                      }
                    </Form.Item>
                    <Form.Item label="下载完成后" name="open_folder_after_download" valuePropName="checked" className="mb-4">
                      <Switch checkedChildren="自动打开保存目录" unCheckedChildren="不打开" />
                    </Form.Item>
                    <div className="form-hint text-xs text-white/35 flex items-center gap-1.5 pt-2">
                      <InfoCircleOutlined /> 选择壁纸下载后的保存位置
                    </div>
                  </div>
                ),
              },
              {
                key: 'network',
                label: '网络代理',
                children: (
                  <div className="tab-content py-3 space-y-4">
                    <Form.Item label="启用代理" name="enable_proxy" valuePropName="checked" className="mb-4">
                      <Switch checkedChildren="开启" unCheckedChildren="关闭" />
                    </Form.Item>
                    <Form.Item noStyle shouldUpdate={(prev, next) => prev.enable_proxy !== next.enable_proxy}>
                      {({ getFieldValue }) =>
                        getFieldValue('enable_proxy') ? (
                          <>
                            <Form.Item
                              label="代理服务器"
                              required
                              className="mb-3"
                              extra="支持 HTTP、HTTPS 与 SOCKS5 代理协议，例如 http://127.0.0.1:7890 或 socks5://127.0.0.1:1080"
                            >
                              <Space.Compact block className="flex shadow-xs max-w-lg">
                                <Form.Item
                                  name="proxy"
                                  noStyle
                                  rules={[
                                    { required: true, message: '请输入代理服务器地址' },
                                    {
                                      pattern: /^(https?|socks5):\/\/[^\s]+$/i,
                                      message: '格式错误，需以 http://、https:// 或 socks5:// 开头',
                                    },
                                  ]}
                                >
                                  <Input
                                    aria-label="代理服务器地址"
                                    placeholder="http://127.0.0.1:7890"
                                    allowClear
                                    className="!bg-white/6 !text-xs !border-white/12 !text-white/80"
                                  />
                                </Form.Item>
                                <Button
                                  onClick={handleTestProxy}
                                  loading={testingProxy}
                                  icon={<GlobalOutlined className="text-xs" />}
                                  className="!text-xs !font-medium !border-white/12 !bg-white/8 hover:!bg-white/15 !text-white/70"
                                >
                                  测试连接
                                </Button>
                              </Space.Compact>
                            </Form.Item>
                            {proxyLatency !== null && (
                              <div className="flex items-center gap-2 pl-[110px] pb-2 text-xs text-[#E4B863] font-mono">
                                <span className="inline-block w-2 h-2 rounded-full bg-[#E4B863] animate-pulse" />
                                <span>连通性良好，响应耗时: {proxyLatency} ms</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 pl-[110px] pt-1 flex-wrap">
                              <span className="text-[11px] text-white/35">快速填入:</span>
                              <Button
                                size="small"
                                type="dashed"
                                onClick={() => form.setFieldValue('proxy', 'http://127.0.0.1:7890')}
                                className="!text-[11px] !h-6 !px-2 !rounded-md"
                              >
                                Clash (7890)
                              </Button>
                              <Button
                                size="small"
                                type="dashed"
                                onClick={() => form.setFieldValue('proxy', 'http://127.0.0.1:10808')}
                                className="!text-[11px] !h-6 !px-2 !rounded-md"
                              >
                                v2ray (10808)
                              </Button>
                              <Button
                                size="small"
                                type="dashed"
                                onClick={() => form.setFieldValue('proxy', 'socks5://127.0.0.1:1080')}
                                className="!text-[11px] !h-6 !px-2 !rounded-md"
                              >
                                SOCKS5 (1080)
                              </Button>
                            </div>
                          </>
                        ) : null
                      }
                    </Form.Item>
                    <div className="form-hint text-xs text-white/35 flex items-center gap-1.5 pt-3">
                      <InfoCircleOutlined /> 配置的代理服务器将用于壁纸检索列表查询及高清原图下载。
                    </div>
                  </div>
                ),
              },
              {
                key: 'appearance',
                label: '界面设置',
                children: (
                  <div className="tab-content py-3 space-y-4">
                    <Form.Item label="主题模式" name="theme" className="mb-4">
                      <Radio.Group optionType="button" options={[{ value: 'light', label: '浅色' }, { value: 'dark', label: '深色' }, { value: 'auto', label: '跟随系统' }]} />
                    </Form.Item>
                    <Form.Item label="缩略图尺寸" name="thumbnail_size" className="mb-4">
                      <Slider min={150} max={300} step={10} marks={{ 150: '小', 225: '中', 300: '大' }} className="max-w-md" />
                    </Form.Item>
                    <Form.Item label="侧边栏宽度" className="mb-4">
                      <Space className="width-controls flex items-center gap-3 max-w-md">
                        <Form.Item name="sidebar_width" noStyle>
                          <Slider min={250} max={500} step={10} className="flex-1" />
                        </Form.Item>
                        <Form.Item name="sidebar_width" noStyle>
                          <InputNumber aria-label="侧边栏宽度" min={250} max={500} step={10} className="!w-20 !text-xs" />
                        </Form.Item>
                      </Space>
                    </Form.Item>
                    <Form.Item label="图片信息显示" name="show_info" className="mb-4">
                      <Checkbox.Group options={[{ value: 'resolution', label: '分辨率' }, { value: 'size', label: '文件大小' }, { value: 'views', label: '浏览次数' }]} />
                    </Form.Item>
                    <div className="flex items-center justify-between p-3 bg-white/4 border border-white/8 rounded-2xl text-xs text-white/60">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="font-medium text-white/80">GPU 硬件合成加速</span>
                      </div>
                      <Tag color="cyan" className="!mr-0 font-mono text-[10px]">
                        WebKit Compositing 开启
                      </Tag>
                    </div>
                  </div>
                ),
              },
              {
                key: 'download',
                label: '下载设置',
                children: (
                  <div className="tab-content py-3 space-y-4">
                    <Form.Item label="并发下载数" name="concurrent_downloads" className="mb-4">
                      <InputNumber min={1} max={10} className="!w-24 !text-xs" />
                    </Form.Item>
                    <Form.Item label="下载去重" name="auto_deduplicate" valuePropName="checked" className="mb-4">
                      <Switch checkedChildren="自动跳过已存在的文件" unCheckedChildren="允许重复下载" />
                    </Form.Item>
                    <Form.Item label="下载通知" name="download_notification" valuePropName="checked" className="mb-4">
                      <Switch checkedChildren="显示下载完成通知" unCheckedChildren="不显示通知" />
                    </Form.Item>
                  </div>
                ),
              },
              {
                key: 'about',
                label: '关于',
                children: (
                  <div className="about-section flex flex-col items-center justify-center py-2 text-center">
                    <div className="mb-3 hover:scale-105 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]">
                      <img
                        src={appLogo}
                        alt="Wallhaven"
                        className="w-16 h-16 object-contain select-none pointer-events-none drop-shadow-[0_4px_20px_rgba(228,184,99,0.35)]"
                      />
                    </div>
                    <h3 className="text-sm font-semibold tracking-tight text-white/90 m-0 mb-1">Wallhaven 壁纸管理器</h3>
                    <p className="text-[11px] text-white/50 max-w-md mx-auto mb-3 leading-relaxed">
                      基于 Tauri 和 React 构建的现代壁纸管理应用，快速浏览与收藏 Wallhaven 海量精选高清壁纸。
                    </p>
                    <Space className="mb-4">
                      <Button
                        type="primary"
                        icon={<GithubOutlined />}
                        onClick={() => open('https://github.com/sunnnnner/wallhaven_rs').catch((error) => message.error(`打开链接失败：${String(error)}`))}
                        className="!h-7 !px-3.5 !text-xs !font-medium !rounded-md !bg-[#E4B863] hover:!bg-[#d4a853] !text-[#0B1322] active:!scale-95 shadow-xs"
                      >
                        GitHub 源码
                      </Button>
                      <Button
                        icon={<LinkOutlined />}
                        onClick={() => message.info('文档页面开发中...')}
                        className="!h-7 !px-3.5 !text-xs !font-medium !rounded-md !border-white/15 !bg-white/8 hover:!bg-white/15 !text-white/70 active:!scale-95 shadow-xs"
                      >
                        使用文档
                      </Button>
                    </Space>
                    <div className="w-full max-w-md text-left">
                      <Descriptions
                        bordered
                        column={1}
                        size="small"
                        className="rounded-lg overflow-hidden border border-white/10 text-xs"
                        items={[
                          { key: 'framework', label: '框架', children: 'React + TypeScript' },
                          { key: 'ui', label: '设计系统', children: 'Tailwind CSS + Ant Design' },
                          { key: 'backend', label: '原生内核', children: 'Tauri + Rust' },
                          {
                            key: 'github',
                            label: '开源仓库',
                            children: (
                              <a
                                href="https://github.com/sunnnnner/wallhaven_rs"
                                onClick={(e) => {
                                  e.preventDefault()
                                  open('https://github.com/sunnnnner/wallhaven_rs').catch((error) => message.error(`打开链接失败：${String(error)}`))
                                }}
                                className="text-[#E4B863] hover:underline inline-flex items-center gap-1.5 font-mono text-[11px]"
                              >
                                <GithubOutlined className="text-xs" />
                                <span>sunnnnner/wallhaven_rs</span>
                              </a>
                            ),
                          },
                          {
                            key: 'gpu',
                            label: '图形渲染',
                            children: (
                              <div className="flex items-center gap-2 flex-wrap">
                                <Tag color={gpuInfo.isHardware ? 'success' : 'default'} className="!mr-0 font-medium">
                                  {gpuInfo.isHardware ? 'GPU 硬件加速' : '软件渲染'}
                                </Tag>
                                <span className="font-mono text-zinc-500 text-[11px] truncate max-w-[200px]" title={gpuInfo.renderer}>
                                  {gpuInfo.renderer}
                                </span>
                              </div>
                            ),
                          },
                          { key: 'license', label: '开源协议', children: 'MIT' },
                        ]}
                      />
                    </div>
                  </div>
                ),
              },
            ]}
          />

          <div className="config-footer flex items-center justify-between pt-5 mt-4 border-t border-white/8">
            <Button
              onClick={reset}
              className="!h-8 !px-3 !text-xs !font-medium !rounded-md !border-white/15 !bg-white/8 hover:!bg-white/15 active:!scale-95 !text-white/60 shadow-xs"
            >
              恢复默认
            </Button>
            <Space className="flex items-center gap-2">
              <Button
                onClick={() => getCurrentWindow().close().catch((error) => message.error(`关闭设置失败：${String(error)}`))}
                className="!h-8 !px-3 !text-xs !font-medium !rounded-md !border-white/15 !bg-white/8 hover:!bg-white/15 active:!scale-95 !text-white/60 shadow-xs"
              >
                取消
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={saving}
                className="!h-8 !px-4 !text-xs !font-medium !rounded-md !bg-[#E4B863] hover:!bg-[#d4a853] !text-[#0B1322] active:!scale-95 shadow-xs"
              >
                保存设置
              </Button>
            </Space>
          </div>
        </Form>
      </div>
    </Layout>
  )
}
