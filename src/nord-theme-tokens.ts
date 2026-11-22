/**
 * Nord Design Tokens for 《专注时刻 (Focus Time)》
 * 基于 Nord 调色板 (Arctic Ice & Northern Lights)
 * 适配 Web / React / Vue / Tailwind CSS
 */

export const nordPalette = {
  // Polar Night (极夜暗色系 - 背景与暗色容器)
  polarNight: {
    nord0: '#2E3440', // 基础背景色
    nord1: '#3B4252', // 高亮背景/卡片背景
    nord2: '#434C5E', // 悬浮/激活背景/分割线
    nord3: '#4C566A', // 弱化文本/占位符/边框
  },

  // Snow Storm (雪暴明色系 - 文本与亮色元素)
  snowStorm: {
    nord4: '#D8DEE9', // 次要文本/图标
    nord5: '#E5E9F0', // 常规正文文本
    nord6: '#ECEFF4', // 主要标题/强调高亮文本
  },

  // Frost (极霜冷色系 - 主题强调与短/长休语义)
  frost: {
    nord7: '#8FBCBB', // 绿蓝/长休息强调色 (Long Break)
    nord8: '#88C0D0', // 冰蓝/短休息语义色 (Short Break)
    nord9: '#81A1C1', // 冰川蓝/主交互色/信息色
    nord10: '#5E81AC', // 深海蓝/主按钮激活色/重度强调
  },

  // Aurora (极光暖色系 - 番茄工作/警告/状态语义)
  aurora: {
    nord11: '#BF616A', // 极光红/番茄专注语义色 (Pomodoro Focus) / 危险/放弃
    nord12: '#D08770', // 极光橙/警告/进行中暂停状态
    nord13: '#EBCB8B', // 极光黄/提示/注意
    nord14: '#A3BE8C', // 极光绿/完成/成功/连续达标
    nord15: '#B48EAD', // 极光紫/特殊战报/成就标记
  },
} as const;

export const designTokens = {
  // 模式与语义对应表
  modeTokens: {
    pomodoro: {
      primary: nordPalette.aurora.nord11, // #BF616A
      softBg: 'rgba(191, 97, 106, 0.12)',
      border: 'rgba(191, 97, 106, 0.35)',
      glow: '0 0 24px rgba(191, 97, 106, 0.35)',
      label: '番茄专注',
      defaultMinutes: 25,
    },
    shortBreak: {
      primary: nordPalette.frost.nord8, // #88C0D0
      softBg: 'rgba(136, 192, 208, 0.12)',
      border: 'rgba(136, 192, 208, 0.35)',
      glow: '0 0 24px rgba(136, 192, 208, 0.35)',
      label: '短休息',
      defaultMinutes: 5,
    },
    longBreak: {
      primary: nordPalette.frost.nord7, // #8FBCBB
      softBg: 'rgba(143, 188, 187, 0.12)',
      border: 'rgba(143, 188, 187, 0.35)',
      glow: '0 0 24px rgba(143, 188, 187, 0.35)',
      label: '长休息',
      defaultMinutes: 15,
    },
  },

  // 背景与分层表面 (Surface)
  surface: {
    background: nordPalette.polarNight.nord0, // #2E3440
    card: nordPalette.polarNight.nord1, // #3B4252
    elevated: nordPalette.polarNight.nord2, // #434C5E
    overlay: 'rgba(46, 52, 64, 0.85)',
    border: 'rgba(76, 86, 106, 0.5)', // #4C566A with opacity
    borderActive: nordPalette.frost.nord9, // #81A1C1
  },

  // 字体与排版体系
  typography: {
    fontFamily: {
      base: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      mono: '"JetBrains Mono", "Fira Code", Menlo, Monaco, Consolas, monospace',
      timer: '"JetBrains Mono", "SF Pro Display", -apple-system, monospace',
    },
    fontSize: {
      xs: '12px',
      sm: '14px',
      base: '16px',
      lg: '18px',
      xl: '20px',
      '2xl': '24px',
      '3xl': '30px',
      timerHero: '72px',
      timerMini: '28px',
    },
    timerFeatures: {
      fontVariantNumeric: 'tabular-nums',
      fontFeatureSettings: '"tnum" on, "zero" on',
      letterSpacing: '-0.02em',
      fontWeight: '700',
    },
  },

  // 边角与阴影
  radius: {
    xs: '4px',
    sm: '6px',
    md: '10px',
    lg: '16px',
    full: '9999px',
  },

  shadows: {
    card: '0 4px 16px rgba(0, 0, 0, 0.25)',
    modal: '0 12px 32px rgba(0, 0, 0, 0.45)',
    glowFocus: '0 0 0 3px rgba(129, 161, 193, 0.45)',
  },

  // 动画曲线
  transition: {
    fast: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
    normal: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    slow: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  },
};
