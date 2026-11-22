/**
 * TimerEngine - 番茄钟核心倒计时引擎与状态机
 * 
 * 状态定义:
 * - IDLE: 就绪闲置
 * - RUNNING: 正在倒计时
 * - PAUSED: 暂停中
 * - COMPLETED: 单次倒计时完成
 * - REST_WAITING: 等待开启休息或下一轮
 */

class TimerEngine {
  constructor(options = {}) {
    this.storage = options.storage || null;

    // 默认配置（分钟）
    this.durations = {
      pomodoro: options.pomodoroMinutes || 25,
      'short-break': options.shortBreakMinutes || 5,
      'long-break': options.longBreakMinutes || 15
    };
    this.longBreakInterval = options.longBreakInterval || 4;

    this.currentMode = 'pomodoro'; // 'pomodoro' | 'short-break' | 'long-break'
    this.state = 'IDLE'; // 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'REST_WAITING'

    this.totalSeconds = this.durations[this.currentMode] * 60;
    this.remainingSeconds = this.totalSeconds;

    this.completedPomodorosInCycle = 0; // 当前循环已完成番茄数（用于判断长休息）
    this.currentTaskId = null;

    // 时间戳校准（防止后台休眠与漂移）
    this.targetEndTime = null;
    this.timerId = null;

    // 事件订阅监听
    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(event, data = {}) {
    const payload = {
      event,
      state: this.state,
      mode: this.currentMode,
      remainingSeconds: this.remainingSeconds,
      totalSeconds: this.totalSeconds,
      progress: this.getProgress(),
      completedPomodorosInCycle: this.completedPomodorosInCycle,
      currentTaskId: this.currentTaskId,
      ...data
    };
    for (const listener of this.listeners) {
      try {
        listener(payload);
      } catch (e) {
        console.error('TimerEngine listener error:', e);
      }
    }
  }

  getProgress() {
    if (this.totalSeconds <= 0) return 1;
    return Math.max(0, Math.min(1, (this.totalSeconds - this.remainingSeconds) / this.totalSeconds));
  }

  getFormattedTime() {
    const minutes = Math.floor(this.remainingSeconds / 60);
    const seconds = this.remainingSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  setMode(mode) {
    if (this.state === 'RUNNING') {
      throw new Error('Cannot switch mode while timer is running');
    }
    if (!this.durations[mode]) {
      throw new Error(`Invalid mode: ${mode}`);
    }
    this.currentMode = mode;
    this.totalSeconds = this.durations[mode] * 60;
    this.remainingSeconds = this.totalSeconds;
    this.state = 'IDLE';
    this.targetEndTime = null;

    this._persistState();
    this.notify('mode_change');
  }

  setTask(taskId) {
    this.currentTaskId = taskId;
    this._persistState();
    this.notify('task_change', { taskId });
  }

  start() {
    if (this.state === 'RUNNING') return;

    if (this.state === 'IDLE' || this.state === 'COMPLETED' || this.state === 'REST_WAITING') {
      this.totalSeconds = this.durations[this.currentMode] * 60;
      this.remainingSeconds = this.totalSeconds;
    }

    this.state = 'RUNNING';
    const now = Date.now();
    this.targetEndTime = now + this.remainingSeconds * 1000;

    this._startInterval();
    this._persistState();
    this.notify('start');
  }

  pause() {
    if (this.state !== 'RUNNING') return;

    this._stopInterval();
    this._calibrateTime();
    this.state = 'PAUSED';
    this.targetEndTime = null;

    this._persistState();
    this.notify('pause');
  }

  resume() {
    if (this.state !== 'PAUSED') return;

    this.state = 'RUNNING';
    this.targetEndTime = Date.now() + this.remainingSeconds * 1000;

    this._startInterval();
    this._persistState();
    this.notify('resume');
  }

  abandon() {
    // 放弃当前会话
    const actualDuration = this.totalSeconds - this.remainingSeconds;
    this._stopInterval();

    if (actualDuration > 0 && this.storage) {
      this.storage.saveSession({
        mode: this.currentMode,
        taskId: this.currentTaskId,
        targetDurationSeconds: this.totalSeconds,
        actualDurationSeconds: actualDuration,
        status: 'abandoned',
        startedAt: new Date(Date.now() - actualDuration * 1000).toISOString(),
        endedAt: new Date().toISOString()
      });
    }

    this.state = 'IDLE';
    this.remainingSeconds = this.totalSeconds;
    this.targetEndTime = null;

    this._persistState();
    this.notify('abandon');
  }

  reset() {
    this._stopInterval();
    this.state = 'IDLE';
    this.remainingSeconds = this.totalSeconds;
    this.targetEndTime = null;

    this._persistState();
    this.notify('reset');
  }

  _startInterval() {
    this._stopInterval();
    this.timerId = setInterval(() => {
      this._tick();
    }, 1000);
  }

  _stopInterval() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  _calibrateTime() {
    if (this.targetEndTime) {
      const msLeft = this.targetEndTime - Date.now();
      this.remainingSeconds = Math.max(0, Math.ceil(msLeft / 1000));
    }
  }

  _tick() {
    if (this.state !== 'RUNNING') return;

    this._calibrateTime();

    if (this.remainingSeconds <= 0) {
      this.remainingSeconds = 0;
      this._onComplete();
    } else {
      this.notify('tick');
    }
  }

  _onComplete() {
    this._stopInterval();
    this.state = 'COMPLETED';
    const finishedMode = this.currentMode;
    const duration = this.totalSeconds;

    // 数据持久化
    if (this.storage) {
      this.storage.saveSession({
        mode: finishedMode,
        taskId: this.currentTaskId,
        targetDurationSeconds: duration,
        actualDurationSeconds: duration,
        status: 'completed',
        startedAt: new Date(Date.now() - duration * 1000).toISOString(),
        endedAt: new Date().toISOString()
      });

      if (finishedMode === 'pomodoro' && this.currentTaskId) {
        this.storage.recordPomodoroForTask(this.currentTaskId, duration);
      }
    }

    // 模式自动流转计算
    let nextSuggestedMode = 'short-break';
    if (finishedMode === 'pomodoro') {
      this.completedPomodorosInCycle += 1;
      if (this.completedPomodorosInCycle % this.longBreakInterval === 0) {
        nextSuggestedMode = 'long-break';
      } else {
        nextSuggestedMode = 'short-break';
      }
    } else {
      // 休息结束，建议进入番茄
      nextSuggestedMode = 'pomodoro';
    }

    this.state = 'REST_WAITING';
    this._persistState();
    this.notify('complete', {
      finishedMode,
      nextSuggestedMode,
      cycleCount: this.completedPomodorosInCycle
    });
  }

  _persistState() {
    if (!this.storage) return;
    this.storage.saveActiveState({
      mode: this.currentMode,
      state: this.state,
      remainingSeconds: this.remainingSeconds,
      totalSeconds: this.totalSeconds,
      targetEndTime: this.targetEndTime,
      completedPomodorosInCycle: this.completedPomodorosInCycle,
      currentTaskId: this.currentTaskId,
      timestamp: Date.now()
    });
  }

  restoreState() {
    if (!this.storage) return false;
    const saved = this.storage.getActiveState();
    if (!saved) return false;

    this.currentMode = saved.mode || 'pomodoro';
    this.totalSeconds = saved.totalSeconds || this.durations[this.currentMode] * 60;
    this.completedPomodorosInCycle = saved.completedPomodorosInCycle || 0;
    this.currentTaskId = saved.currentTaskId || null;

    if (saved.state === 'RUNNING' && saved.targetEndTime) {
      const msLeft = saved.targetEndTime - Date.now();
      if (msLeft <= 0) {
        // 后台已自然走完
        this.remainingSeconds = 0;
        this._onComplete();
        return true;
      } else {
        this.remainingSeconds = Math.ceil(msLeft / 1000);
        this.state = 'RUNNING';
        this.targetEndTime = saved.targetEndTime;
        this._startInterval();
        this.notify('restore');
        return true;
      }
    } else if (saved.state === 'PAUSED') {
      this.state = 'PAUSED';
      this.remainingSeconds = saved.remainingSeconds;
      this.notify('restore');
      return true;
    } else {
      this.state = saved.state || 'IDLE';
      this.remainingSeconds = saved.remainingSeconds || this.totalSeconds;
      this.notify('restore');
      return true;
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TimerEngine };
}
