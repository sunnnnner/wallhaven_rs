export function BrandLogo({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <svg
        viewBox="0 0 128 128"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full filter drop-shadow-[0_2px_10px_rgba(228,184,99,0.35)] transition-all duration-500 group-hover:drop-shadow-[0_4px_18px_rgba(228,184,99,0.6)] group-hover:scale-105"
      >
        <defs>
          <linearGradient id="brandGoldGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#D4A853" />
            <stop offset="50%" stopColor="#F8DE9E" />
            <stop offset="100%" stopColor="#E4B863" />
          </linearGradient>

          <linearGradient id="brandGlassGrad" x1="10%" y1="0%" x2="90%" y2="100%">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.95)" />
            <stop offset="45%" stopColor="rgba(255, 255, 255, 0.55)" />
            <stop offset="100%" stopColor="rgba(160, 205, 255, 0.3)" />
          </linearGradient>

          <linearGradient id="brandDeepGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(26, 45, 75, 0.85)" />
            <stop offset="100%" stopColor="rgba(12, 22, 38, 0.95)" />
          </linearGradient>
        </defs>

        {/* 底层香槟金柔和微光 */}
        <path
          d="M26 42 C29 68 38 98 48 98 C56 98 60 76 64 64 C68 76 72 98 80 98 C90 98 99 68 102 42"
          stroke="url(#brandGoldGrad)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.35"
        />

        {/* 艺术山峦重叠层 (深海流体) */}
        <path
          d="M24 40 C28 66 38 94 48 94 C57 94 61 74 64 60 C67 74 71 94 80 94 C90 94 100 66 104 40 C96 56 86 78 80 78 C73 78 68 56 64 42 C60 56 55 78 48 78 C42 78 32 56 24 40 Z"
          fill="url(#brandDeepGrad)"
          stroke="rgba(255, 255, 255, 0.15)"
          strokeWidth="1.2"
        />

        {/* 流体香槟金主轮廓 (丝滑优雅的 W 曲线) */}
        <path
          d="M24 40 C28 66 38 94 48 94 C57 94 61 74 64 60 C67 74 71 94 80 94 C90 94 100 66 104 40"
          stroke="url(#brandGoldGrad)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 磨砂晶体高光前层 */}
        <path
          d="M20 44 C26 70 37 90 48 90 C58 90 62 70 64 54 C66 70 70 90 80 90 C91 90 102 70 108 44 C104 54 94 72 80 72 C71 72 67 48 64 34 C61 48 57 72 48 72 C34 72 24 54 20 44 Z"
          fill="url(#brandGlassGrad)"
        />

        {/* 极细微晶高光脊线 */}
        <path
          d="M22 42 C30 64 39 84 48 84 C56 84 61 64 64 48 C67 64 72 84 80 84 C89 84 98 64 106 42"
          stroke="rgba(255, 255, 255, 0.85)"
          strokeWidth="1.6"
          strokeLinecap="round"
        />

        {/* 聚焦点微晶明眸 */}
        <circle cx="64" cy="34" r="2.2" fill="#FFFFFF" opacity="0.9" />
      </svg>
    </div>
  )
}
