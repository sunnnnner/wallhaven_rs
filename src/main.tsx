import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider, theme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import 'antd/dist/reset.css'
import './styles.css'
import App from './App'

// Material Design 3 (M3 / Material You) 设计系统色彩与组件 Token 规范
const m3Theme = {
  algorithm: theme.darkAlgorithm,
  token: {
    // M3 动态主色系 (Primary & On-Primary)
    colorPrimary: '#A8C7FA',
    colorPrimaryHover: '#C2E7FF',
    colorPrimaryActive: '#8AB4F8',
    colorTextLightSolid: '#062E6F',

    // M3 表面与容器色系 (Surface & Surface Containers)
    colorBgBase: '#10131A',
    colorBgLayout: '#10131A',
    colorBgContainer: '#1C2028',
    colorBgElevated: '#222630',

    // M3 文字与排版对比阶梯 (On-Surface & On-Surface-Variant)
    colorText: '#E2E2E9',
    colorTextSecondary: '#C4C6D0',
    colorTextTertiary: '#8E9099',
    colorTextQuaternary: 'rgba(255, 255, 255, 0.25)',

    // M3 描边轮廓 (Outline & Outline Variant)
    colorBorder: 'rgba(255, 255, 255, 0.12)',
    colorBorderSecondary: 'rgba(255, 255, 255, 0.08)',

    // M3 形状圆角规范 (8px / 12px / 16px)
    borderRadiusSM: 8,
    borderRadius: 12,
    borderRadiusLG: 16,

    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Google Sans", "PingFang SC", "Microsoft YaHei", sans-serif',
  },
  components: {
    Button: {
      borderRadius: 9999, // M3 标志性胶囊 Pill Button
      colorPrimary: '#A8C7FA',
      colorPrimaryHover: '#C2E7FF',
      colorPrimaryActive: '#8AB4F8',
      colorTextLightSolid: '#062E6F',
      defaultBg: 'rgba(255, 255, 255, 0.08)',
      defaultBorderColor: 'rgba(255, 255, 255, 0.12)',
      defaultColor: '#E2E2E9',
      defaultHoverBg: 'rgba(255, 255, 255, 0.14)',
      defaultHoverBorderColor: 'rgba(255, 255, 255, 0.22)',
      defaultHoverColor: '#FFFFFF',
    },
    Input: {
      borderRadius: 9999, // M3 胶囊搜索框
      colorBgContainer: '#161921',
      colorBorder: 'rgba(255, 255, 255, 0.12)',
      colorText: '#E2E2E9',
      colorTextPlaceholder: 'rgba(255, 255, 255, 0.4)',
    },
    Menu: {
      itemBorderRadius: 9999, // M3 胶囊导航项
      itemColor: '#C4C6D0',
      itemHoverColor: '#E2E2E9',
      itemHoverBg: 'rgba(255, 255, 255, 0.06)',
      itemSelectedColor: '#D3E3FD',
      itemSelectedBg: '#1E3A5F',
    },
    Tabs: {
      colorPrimary: '#A8C7FA',
      colorPrimaryHover: '#C2E7FF',
      colorPrimaryActive: '#8AB4F8',
      itemColor: '#C4C6D0',
      itemSelectedColor: '#A8C7FA',
      itemHoverColor: '#E2E2E9',
      inkBarColor: '#A8C7FA',
    },
    Radio: {
      colorPrimary: '#A8C7FA',
      buttonCheckedBg: '#1E3A5F',
      buttonColor: '#C4C6D0',
    },
    Checkbox: {
      colorPrimary: '#A8C7FA',
      colorWhite: '#062E6F',
      borderRadiusSM: 4,
    },
    Switch: {
      colorPrimary: '#A8C7FA',
      colorPrimaryHover: '#C2E7FF',
    },
    Slider: {
      colorPrimary: '#A8C7FA',
      colorPrimaryBorder: '#A8C7FA',
    },
    Modal: {
      colorBgElevated: '#222630',
      borderRadiusLG: 24, // M3 Extra Large 模态窗圆角
    },
    Dropdown: {
      colorBgElevated: '#222630',
      borderRadiusLG: 16,
    },
  },
}

ReactDOM.createRoot(document.getElementById('app')!).render(
  <React.StrictMode>
    <ConfigProvider locale={zhCN} button={{ autoInsertSpace: false }} theme={m3Theme}>
      <App />
    </ConfigProvider>
  </React.StrictMode>,
)
