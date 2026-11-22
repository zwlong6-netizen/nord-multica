/**
 * NotificationManager - 提示音效（Web Audio API）与系统原生桌面通知
 */

class NotificationManager {
  constructor() {
    this.audioCtx = null;
    this.soundEnabled = true;
    this.notificationEnabled = true;
    this._hasNotificationPermission = false;

    if (typeof window !== 'undefined' && 'Notification' in window) {
      this._hasNotificationPermission = Notification.permission === 'granted';
    }
  }

  setSoundEnabled(enabled) {
    this.soundEnabled = Boolean(enabled);
  }

  setNotificationEnabled(enabled) {
    this.notificationEnabled = Boolean(enabled);
  }

  async requestPermission() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission !== 'granted') {
        const perm = await Notification.requestPermission();
        this._hasNotificationPermission = perm === 'granted';
        return this._hasNotificationPermission;
      }
      this._hasNotificationPermission = true;
      return true;
    }
    return false;
  }

  /**
   * 使用 Web Audio API 合成 Nord 风格自然纯净的正弦波三和弦铃声
   */
  playCompletionSound(type = 'pomodoro') {
    if (!this.soundEnabled || typeof window === 'undefined') return;

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      if (!this.audioCtx) {
        this.audioCtx = new AudioContext();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const ctx = this.audioCtx;
      const now = ctx.currentTime;

      // 极光音阶: Pomodoro 使用 明快和弦 [C5, E5, G5], 休息使用 舒缓泛音 [A4, C5, E5]
      const freqs = type === 'pomodoro' ? [523.25, 659.25, 783.99] : [440.00, 523.25, 659.25];

      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);

        gain.gain.setValueAtTime(0, now + idx * 0.12);
        gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.12 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.9);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.95);
      });
    } catch (e) {
      console.warn('Web Audio playback failed:', e);
    }
  }

  showNotification(title, body) {
    if (!this.notificationEnabled) return;

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="%23BF616A"/></svg>'
        });
        return;
      } catch (e) {
        console.warn('System notification error:', e);
      }
    }

    // 降级: 应用内 Toast 通知
    this.showInAppToast(title, body);
  }

  showInAppToast(title, body) {
    if (typeof document === 'undefined') return;
    let toast = document.getElementById('nord-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'nord-toast';
      toast.style.position = 'fixed';
      toast.style.bottom = '24px';
      toast.style.right = '24px';
      toast.style.backgroundColor = 'var(--nord1)';
      toast.style.border = '1px solid var(--nord9)';
      toast.style.borderRadius = '8px';
      toast.style.padding = '12px 18px';
      toast.style.boxShadow = '0 8px 24px rgba(0,0,0,0.35)';
      toast.style.zIndex = '9999';
      toast.style.transition = 'all 0.3s ease';
      toast.style.maxWidth = '320px';
      toast.style.color = 'var(--nord6)';
      toast.style.display = 'none';
      document.body.appendChild(toast);
    }

    toast.innerHTML = `<div style="font-weight: 600; color: var(--nord8); margin-bottom: 4px;">${title}</div><div style="font-size: 13px; color: var(--nord4);">${body}</div>`;
    toast.style.display = 'block';
    toast.style.opacity = '1';

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => { toast.style.display = 'none'; }, 300);
    }, 4500);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NotificationManager };
}
