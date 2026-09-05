import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ConfigPage } from './pages/ConfigPage'
import { HomeLayout } from './pages/HomeLayout'
import { WallpaperBrowser } from './pages/WallpaperBrowser'
import type { WallQuery } from './types'

const queries: Record<string, WallQuery> = {
  latest: { categories: 111, purity: 110, topRange: '', sorting: 'date_added', order: 'desc', ai_art_filter: 1, page: 1 },
  top: { categories: 111, purity: 110, topRange: '6M', sorting: 'toplist', order: 'desc', ai_art_filter: 0, page: 1 },
  hot: { categories: 111, purity: 110, topRange: '', sorting: 'hot', order: 'asc', ai_art_filter: 1, page: 1 },
  random: { categories: 111, purity: 110, topRange: '', sorting: 'random', order: 'desc', ai_art_filter: 1, page: 1 },
}

function Listing({ kind }: { kind: keyof typeof queries }) {
  return <WallpaperBrowser key={kind} query={queries[kind]} />
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/index/latest" replace />} />
        <Route path="/index" element={<HomeLayout />}>
          <Route index element={<Navigate to="latest" replace />} />
          <Route path="latest" element={<Listing kind="latest" />} />
          <Route path="top" element={<Listing kind="top" />} />
          <Route path="hot" element={<Listing kind="hot" />} />
          <Route path="random" element={<Listing kind="random" />} />
        </Route>
        <Route path="/config" element={<ConfigPage />} />
        <Route path="*" element={<Navigate to="/index/latest" replace />} />
      </Routes>
    </HashRouter>
  )
}
