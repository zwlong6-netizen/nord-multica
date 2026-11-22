/**
 * Nord Design Tokens for 《专注时刻 (Focus Time)》
 * 基于 Nord 调色板 (Arctic Ice & Northern Lights)
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
};

export const designTokens = {
  modeTokens: {
    pomodoro: {
      primary: nordPalette.aurora.nord11,
      softBg: 'rgba(191, 97, 106, 0.12)',
      border: 'rgba(191, 97, 106, 0.35)',
      glow: '0 0 24px rgba(191, 97, 106, 0.35)',
      label: '番茄专注',
      defaultMinutes: 25,
      unitSeconds: 25 * 60,
    },
    'short-break': {
      primary: nordPalette.frost.nord8,
      softBg: 'rgba(136, 192, 208, 0.12)',
      border: 'rgba(136, 192, 208, 0.35)',
      glow: '0 0 24px rgba(136, 192, 208, 0.35)',
      label: '短休息',
      defaultMinutes: 5,
      unitSeconds: 5 * 60,
    },
    'long-break': {
      primary: nordPalette.frost.nord7,
      softBg: 'rgba(143, 188, 187, 0.12)',
      border: 'rgba(143, 188, 187, 0.35)',
      glow: '0 0 24px rgba(143, 188, 187, 0.35)',
      label: '长休息',
      defaultMinutes: 15,
      unitSeconds: 15 * 60,
    },
  },
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { nordPalette, designTokens };
}
