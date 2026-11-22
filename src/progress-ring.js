/**
 * ProgressRing - 动态环形进度条组件 (SVG)
 * 计算 stroke-dasharray 和 stroke-dashoffset，支持响应式与发光动效
 */

class ProgressRing {
  constructor(svgElement, options = {}) {
    this.svg = svgElement;
    this.radius = options.radius || 120;
    this.strokeWidth = options.strokeWidth || 8;
    this.circumference = 2 * Math.PI * this.radius;

    this.accentColor = options.accentColor || 'var(--mode-accent)';
    this.trackColor = options.trackColor || 'var(--nord1)';

    this._init();
  }

  _init() {
    if (!this.svg) return;
    this.svg.setAttribute('viewBox', '0 0 280 280');
    this.svg.innerHTML = `
      <defs>
        <filter id="ring-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="var(--mode-accent)" flood-opacity="0.6"/>
        </filter>
      </defs>
      <!-- 底轨 -->
      <circle
        cx="140"
        cy="140"
        r="${this.radius}"
        fill="transparent"
        stroke="${this.trackColor}"
        stroke-width="${this.strokeWidth}"
      />
      <!-- 动态进度轨 -->
      <circle
        id="progress-indicator"
        cx="140"
        cy="140"
        r="${this.radius}"
        fill="transparent"
        stroke="${this.accentColor}"
        stroke-width="${this.strokeWidth}"
        stroke-linecap="round"
        stroke-dasharray="${this.circumference}"
        stroke-dashoffset="0"
        transform="rotate(-90 140 140)"
        filter="url(#ring-glow)"
        style="transition: stroke-dashoffset 0.35s ease, stroke 0.3s ease;"
      />
    `;

    this.indicator = this.svg.querySelector('#progress-indicator');
  }

  setProgress(progress) {
    if (!this.indicator) return;
    const clamped = Math.max(0, Math.min(1, progress));
    // progress 为已走过比例（从 0 到 1），offset 递增或递减
    // 经典番茄钟：未走前满圈或空圈，此处显示剩余或已走
    const offset = this.circumference * (1 - clamped);
    this.indicator.style.strokeDashoffset = offset;
  }

  setColor(color) {
    if (!this.indicator) return;
    this.indicator.setAttribute('stroke', color);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ProgressRing };
}
