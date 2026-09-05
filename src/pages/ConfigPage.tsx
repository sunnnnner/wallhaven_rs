import { FolderOpenOutlined, InfoCircleOutlined, LinkOutlined, PictureOutlined, SettingOutlined } from '@ant-design/icons'
import { Button, Checkbox, Descriptions, Form, Input, InputNumber, Layout, Modal, Radio, Slider, Space, Switch, Tabs, Tag, message } from 'antd'
import { getVersion } from '@tauri-apps/api/app'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { open as chooseDirectory } from '@tauri-apps/plugin-dialog'
import { open } from '@tauri-apps/plugin-shell'
import { useEffect, useState } from 'react'
import { loadConfig, saveDownloadPath } from '../api'

type FormValues = {
  download_path: string
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

  useEffect(() => {
    let active = true
    loadConfig()
      .then((config) => { if (active) form.setFieldsValue({ ...defaults, download_path: config.download_path }) })
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

  const submit = async (values: FormValues) => {
    if (!values.download_path) {
      message.warning('请先选择下载保存路径')
      return
    }
    setSaving(true)
    try {
      await saveDownloadPath(values.download_path)
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
      onOk: () => form.setFieldsValue(defaults),
    })
  }

  const basic = (
    <Form.Item label="下载保存路径" required>
      <Space.Compact block>
        <Form.Item name="download_path" noStyle rules={[{ required: true, message: '请选择下载保存路径' }]}>
          <Input readOnly aria-label="下载保存路径" placeholder="选择保存路径" />
        </Form.Item>
        <Button aria-label="选择路径" icon={<FolderOpenOutlined aria-hidden />} onClick={choosePath}>选择路径</Button>
      </Space.Compact>
    </Form.Item>
  )

  return (
    <Layout className="config-page">
      {contextHolder}
      <div className="config-header">
        <Space><SettingOutlined style={{ color: '#409eff', fontSize: 24 }} /><h2>应用设置</h2></Space>
        {version && <Tag>v{version}</Tag>}
      </div>
      <div className="config-content">
          <Form form={form} layout="horizontal" labelCol={{ flex: '120px' }} wrapperCol={{ flex: 1 }} onFinish={submit} onFinishFailed={() => setActiveTab('basic')} initialValues={defaults}>
            <div className="form-hint persistence-note"><InfoCircleOutlined /> 当前仅下载保存路径会保存并生效。</div>
            <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
              { key: 'basic', label: '基础设置', forceRender: true, children: <div className="tab-content">
                {basic}
                <Form.Item label="文件命名规则" name="naming_rule"><Radio.Group options={[{ value: 'original', label: '原始文件名' }, { value: 'timestamp', label: '时间戳命名' }, { value: 'custom', label: '自定义前缀' }]} /></Form.Item>
                <Form.Item noStyle shouldUpdate={(prev, next) => prev.naming_rule !== next.naming_rule}>
                  {({ getFieldValue }) => getFieldValue('naming_rule') === 'custom' ? <Form.Item label="自定义前缀" name="custom_prefix"><Input placeholder="例如: wallpaper_" allowClear /></Form.Item> : null}
                </Form.Item>
                <Form.Item label="下载完成后" name="open_folder_after_download" valuePropName="checked"><Switch checkedChildren="自动打开保存目录" unCheckedChildren="不打开" /></Form.Item>
                <div className="form-hint"><InfoCircleOutlined /> 选择壁纸下载后的保存位置</div>
              </div> },
              { key: 'appearance', label: '界面设置', children: <div className="tab-content">
                <Form.Item label="主题模式" name="theme"><Radio.Group optionType="button" options={[{ value: 'light', label: '浅色' }, { value: 'dark', label: '深色' }, { value: 'auto', label: '跟随系统' }]} /></Form.Item>
                <Form.Item label="缩略图尺寸" name="thumbnail_size"><Slider min={150} max={300} step={10} marks={{ 150: '小', 225: '中', 300: '大' }} /></Form.Item>
                <Form.Item label="侧边栏宽度"><Space className="width-controls"><Form.Item name="sidebar_width" noStyle><Slider min={250} max={500} step={10} /></Form.Item><Form.Item name="sidebar_width" noStyle><InputNumber aria-label="侧边栏宽度" min={250} max={500} step={10} /></Form.Item></Space></Form.Item>
                <Form.Item label="图片信息显示" name="show_info"><Checkbox.Group options={[{ value: 'resolution', label: '分辨率' }, { value: 'size', label: '文件大小' }, { value: 'views', label: '浏览次数' }]} /></Form.Item>
              </div> },
              { key: 'download', label: '下载设置', children: <div className="tab-content">
                <Form.Item label="并发下载数" name="concurrent_downloads"><InputNumber min={1} max={10} /></Form.Item>
                <Form.Item label="下载去重" name="auto_deduplicate" valuePropName="checked"><Switch checkedChildren="自动跳过已存在的文件" unCheckedChildren="允许重复下载" /></Form.Item>
                <Form.Item label="下载通知" name="download_notification" valuePropName="checked"><Switch checkedChildren="显示下载完成通知" unCheckedChildren="不显示通知" /></Form.Item>
              </div> },
              { key: 'about', label: '关于', children: <div className="about-section">
                <PictureOutlined className="about-icon" />
                <h3>Wallhaven 壁纸管理器</h3>
                <p>一个基于 Tauri 和 React 构建的壁纸管理应用，支持从 Wallhaven 浏览和下载高质量壁纸。</p>
                <Space><Button type="primary" icon={<LinkOutlined />} onClick={() => open('https://github.com/Sunnnner/wallhaven_rs').catch((error) => message.error(`打开链接失败：${String(error)}`))}>查看源码</Button><Button onClick={() => message.info('文档页面开发中...')}>使用文档</Button></Space>
                <Descriptions bordered column={1} size="small" items={[{ key: 'framework', label: '框架', children: 'React + TypeScript' }, { key: 'ui', label: 'UI 库', children: 'Ant Design' }, { key: 'backend', label: '后端', children: 'Tauri + Rust' }, { key: 'license', label: '开源协议', children: 'MIT' }]} />
              </div> },
            ]} />
            <div className="config-footer"><Button onClick={reset}>恢复默认</Button><Space><Button onClick={() => getCurrentWindow().close().catch((error) => message.error(`关闭设置失败：${String(error)}`))}>取消</Button><Button type="primary" htmlType="submit" loading={saving}>保存设置</Button></Space></div>
          </Form>
      </div>
    </Layout>
  )
}
