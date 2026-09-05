import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import 'antd/dist/reset.css'
import './components/Style/theme.scss'
import './styles.css'
import App from './App'

ReactDOM.createRoot(document.getElementById('app')!).render(
  <React.StrictMode>
    <ConfigProvider locale={zhCN} button={{ autoInsertSpace: false }}>
      <App />
    </ConfigProvider>
  </React.StrictMode>,
)
