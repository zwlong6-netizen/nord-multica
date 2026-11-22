/**
 * App - 《专注时刻》主应用程序前端控制器
 */

class FocusTimeApp {
  constructor() {
    this.storage = new StorageManager();
    this.notifications = new NotificationManager();

    const settings = this.storage.getSettings() || {};
    this.timer = new TimerEngine({
      storage: this.storage,
      pomodoroMinutes: settings.pomodoroDuration || 25,
      shortBreakMinutes: settings.shortBreakDuration || 5,
      longBreakMinutes: settings.longBreakDuration || 15,
      longBreakInterval: settings.longBreakInterval || 4
    });

    this.notifications.setSoundEnabled(settings.soundEnabled !== false);
    this.notifications.setNotificationEnabled(settings.notificationEnabled !== false);

    this.dom = {};
    this.progressRing = null;
  }

  init() {
    this._bindElements();
    this._initProgressRing();
    this._bindEvents();
    this._renderTasks();
    this._renderStats();

    // 尝试恢复之前中断的状态（例如刷新页面或切回前台）
    const restored = this.timer.restoreState();
    if (!restored) {
      this.timer.notify('init');
    }

    // 订阅计时器状态流转
    this.timer.subscribe((payload) => this._onTimerStateChange(payload));

    // 请求桌面通知权限
    this.notifications.requestPermission().catch(() => {});
  }

  _bindElements() {
    this.dom.timerDisplay = document.getElementById('timer-digits');
    this.dom.btnToggle = document.getElementById('btn-toggle');
    this.dom.btnPause = document.getElementById('btn-pause');
    this.dom.btnReset = document.getElementById('btn-reset');
    this.dom.modeBadge = document.getElementById('mode-badge');
    this.dom.modeTabs = document.querySelectorAll('.mode-tab');
    this.dom.svgRing = document.getElementById('progress-ring-svg');
    this.dom.fsmState = document.getElementById('fsm-state');

    // 任务相关
    this.dom.taskSelect = document.getElementById('task-select');
    this.dom.inputNewTask = document.getElementById('input-new-task');
    this.dom.btnAddTask = document.getElementById('btn-add-task');
    this.dom.taskList = document.getElementById('task-list');

    // 统计相关
    this.dom.statTodayPomodoros = document.getElementById('stat-today-pomodoros');
    this.dom.statTodayMinutes = document.getElementById('stat-today-minutes');
    this.dom.chartTrend = document.getElementById('chart-trend');
    this.dom.chartDistribution = document.getElementById('chart-distribution');

    // 设置开关
    this.dom.soundToggle = document.getElementById('sound-toggle');
    this.dom.notifyToggle = document.getElementById('notify-toggle');
  }

  _initProgressRing() {
    if (this.dom.svgRing) {
      this.progressRing = new ProgressRing(this.dom.svgRing, {
        radius: 110,
        strokeWidth: 8
      });
    }
  }

  _bindEvents() {
    // 主控制按钮
    if (this.dom.btnToggle) {
      this.dom.btnToggle.addEventListener('click', () => {
        if (this.timer.state === 'IDLE' || this.timer.state === 'COMPLETED' || this.timer.state === 'REST_WAITING') {
          this.timer.start();
        } else if (this.timer.state === 'PAUSED') {
          this.timer.resume();
        }
      });
    }

    if (this.dom.btnPause) {
      this.dom.btnPause.addEventListener('click', () => {
        if (this.timer.state === 'RUNNING') {
          this.timer.pause();
        }
      });
    }

    if (this.dom.btnReset) {
      this.dom.btnReset.addEventListener('click', () => {
        if (this.timer.state === 'RUNNING' || this.timer.state === 'PAUSED') {
          if (confirm('确认放弃本次专注吗？放弃将不计入有效番茄数。')) {
            this.timer.abandon();
          }
        } else {
          this.timer.reset();
        }
      });
    }

    // 模式切换 Tabs
    this.dom.modeTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const mode = tab.getAttribute('data-mode');
        if (this.timer.state === 'RUNNING') {
          if (confirm('当前计时正在进行中，切换模式将重置当前进度，确认切换吗？')) {
            this.timer.reset();
            this.timer.setMode(mode);
          }
        } else {
          this.timer.setMode(mode);
        }
      });
    });

    // 任务创建与选择
    if (this.dom.btnAddTask && this.dom.inputNewTask) {
      const handleAddTask = () => {
        const title = this.dom.inputNewTask.value;
        if (title && title.trim()) {
          const newTask = this.storage.addTask(title);
          this.dom.inputNewTask.value = '';
          this._renderTasks();
          if (newTask) {
            this.timer.setTask(newTask.id);
          }
        }
      };

      this.dom.btnAddTask.addEventListener('click', handleAddTask);
      this.dom.inputNewTask.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleAddTask();
      });
    }

    if (this.dom.taskSelect) {
      this.dom.taskSelect.addEventListener('change', (e) => {
        const selectedId = e.target.value;
        this.timer.setTask(selectedId || null);
        this._renderTasks();
      });
    }

    // 设置开关监听
    if (this.dom.soundToggle) {
      this.dom.soundToggle.addEventListener('change', (e) => {
        const enabled = e.target.checked;
        this.notifications.setSoundEnabled(enabled);
        const settings = this.storage.getSettings() || {};
        settings.soundEnabled = enabled;
        this.storage.saveSettings(settings);
      });
    }

    if (this.dom.notifyToggle) {
      this.dom.notifyToggle.addEventListener('change', async (e) => {
        const enabled = e.target.checked;
        if (enabled) {
          await this.notifications.requestPermission();
        }
        this.notifications.setNotificationEnabled(enabled);
        const settings = this.storage.getSettings() || {};
        settings.notificationEnabled = enabled;
        this.storage.saveSettings(settings);
      });
    }
  }

  _onTimerStateChange(payload) {
    const { state, mode, remainingSeconds, totalSeconds, progress, event } = payload;

    // 1. 刷新时间文字
    if (this.dom.timerDisplay) {
      this.dom.timerDisplay.textContent = this.timer.getFormattedTime();
      if (state === 'PAUSED') {
        this.dom.timerDisplay.classList.add('paused');
      } else {
        this.dom.timerDisplay.classList.remove('paused');
      }
    }

    // 2. 刷新网页标题
    document.title = `${this.timer.getFormattedTime()} - 《专注时刻》`;

    // 3. 刷新环形进度条
    if (this.progressRing) {
      this.progressRing.setProgress(progress);
    }

    // 4. 刷新主题模式与样式变量
    document.documentElement.setAttribute('data-mode', mode);
    this.dom.modeTabs.forEach(tab => {
      if (tab.getAttribute('data-mode') === mode) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    // 5. 刷新状态与徽章
    if (this.dom.modeBadge) {
      if (mode === 'pomodoro') {
        this.dom.modeBadge.textContent = '番茄专注';
        this.dom.modeBadge.className = 'badge badge-pomodoro';
      } else if (mode === 'short-break') {
        this.dom.modeBadge.textContent = '短休息';
        this.dom.modeBadge.className = 'badge badge-short-break';
      } else {
        this.dom.modeBadge.textContent = '长休息';
        this.dom.modeBadge.className = 'badge badge-long-break';
      }
    }

    if (this.dom.fsmState) {
      const stateLabels = {
        IDLE: 'IDLE (闲置就绪)',
        RUNNING: 'RUNNING (计时专注中)',
        PAUSED: 'PAUSED (已暂停)',
        COMPLETED: 'COMPLETED (单次完成)',
        REST_WAITING: 'REST_WAITING (等待休息流转)'
      };
      this.dom.fsmState.textContent = stateLabels[state] || state;
    }

    // 6. 刷新控制按钮状态
    if (this.dom.btnToggle && this.dom.btnPause && this.dom.btnReset) {
      if (state === 'IDLE') {
        this.dom.btnToggle.textContent = mode === 'pomodoro' ? '开始专注' : '开始休息';
        this.dom.btnToggle.disabled = false;
        this.dom.btnPause.disabled = true;
        this.dom.btnReset.disabled = true;
      } else if (state === 'RUNNING') {
        this.dom.btnToggle.textContent = '计时中...';
        this.dom.btnToggle.disabled = true;
        this.dom.btnPause.disabled = false;
        this.dom.btnReset.disabled = false;
      } else if (state === 'PAUSED') {
        this.dom.btnToggle.textContent = '继续计时';
        this.dom.btnToggle.disabled = false;
        this.dom.btnPause.disabled = true;
        this.dom.btnReset.disabled = false;
      } else if (state === 'COMPLETED' || state === 'REST_WAITING') {
        this.dom.btnToggle.textContent = mode === 'pomodoro' ? '开启休息' : '开始下一番茄';
        this.dom.btnToggle.disabled = false;
        this.dom.btnPause.disabled = true;
        this.dom.btnReset.disabled = false;
      }
    }

    // 7. 处理完成事件通知与统计刷新
    if (event === 'complete') {
      const { finishedMode, nextSuggestedMode, cycleCount } = payload;
      this.notifications.playCompletionSound(finishedMode);

      if (finishedMode === 'pomodoro') {
        this.notifications.showNotification(
          '🎉 番茄专注已完成！',
          `恭喜达成 1 个完整番茄钟（周期累计第 ${cycleCount} 个）。休息一下吧！`
        );
      } else {
        this.notifications.showNotification(
          '🌿 休息结束',
          '精力恢复满满，开启下一个高效专注番茄吧！'
        );
      }

      this._renderTasks();
      this._renderStats();

      // 自动切换至建议模式
      setTimeout(() => {
        this.timer.setMode(nextSuggestedMode);
      }, 500);
    } else if (event === 'abandon') {
      this._renderStats();
    }
  }

  _renderTasks() {
    const tasks = this.storage.getTasks();
    const currentTaskId = this.timer.currentTaskId;

    // 更新下拉选择框
    if (this.dom.taskSelect) {
      this.dom.taskSelect.innerHTML = '<option value="">-- 无标题专注 (默认) --</option>' +
        tasks.map(t => `<option value="${t.id}" ${t.id === currentTaskId ? 'selected' : ''}>${t.title} (${t.pomodoroCount || 0} 🍅)</option>`).join('');
    }

    // 更新侧边栏任务卡片列表
    if (this.dom.taskList) {
      if (tasks.length === 0) {
        this.dom.taskList.innerHTML = '<div style="color: var(--nord3); font-size: 13px; text-align: center; padding: 16px;">暂无任务，输入上方名称添加</div>';
        return;
      }

      this.dom.taskList.innerHTML = tasks.map(t => {
        const isActive = t.id === currentTaskId;
        return `
          <div class="task-item ${isActive ? 'active' : ''}" data-task-id="${t.id}">
            <div style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              <span style="font-weight: 500;">${t.title}</span>
              <div style="font-size: 11px; color: var(--nord4); margin-top: 2px;">
                🍅 ${t.pomodoroCount || 0} 个番茄 · ${Math.round((t.totalDurationSeconds || 0) / 60)} 分钟
              </div>
            </div>
            <div style="display: flex; gap: 6px; align-items: center;">
              <button class="btn btn-ghost select-task-btn" data-id="${t.id}" style="padding: 4px 8px; font-size: 12px; color: ${isActive ? 'var(--mode-accent)' : 'var(--nord4)'}">
                ${isActive ? '当前选中' : '选择'}
              </button>
              <button class="btn btn-ghost delete-task-btn" data-id="${t.id}" style="padding: 4px 6px; font-size: 12px; color: var(--nord11);" title="删除任务">✕</button>
            </div>
          </div>
        `;
      }).join('');

      // 绑定任务点击与删除事件
      this.dom.taskList.querySelectorAll('.select-task-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const tId = btn.getAttribute('data-id');
          this.timer.setTask(tId);
          this._renderTasks();
        });
      });

      this.dom.taskList.querySelectorAll('.delete-task-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const tId = btn.getAttribute('data-id');
          if (confirm('确定要删除该任务吗？')) {
            this.storage.deleteTask(tId);
            if (this.timer.currentTaskId === tId) {
              this.timer.setTask(null);
            }
            this._renderTasks();
            this._renderStats();
          }
        });
      });
    }
  }

  _renderStats() {
    // 今日战报核心卡片
    const todayStats = this.storage.getTodayStats();
    if (this.dom.statTodayPomodoros) {
      this.dom.statTodayPomodoros.textContent = todayStats.completedPomodoroCount;
    }
    if (this.dom.statTodayMinutes) {
      this.dom.statTodayMinutes.textContent = todayStats.totalDurationMinutes;
    }

    // 近 7 日柱状图渲染
    if (this.dom.chartTrend) {
      const recent7Days = this.storage.getRecent7DaysStats();
      const maxMins = Math.max(1, ...recent7Days.map(d => d.minutes));

      this.dom.chartTrend.innerHTML = recent7Days.map(d => {
        const heightPct = Math.round((d.minutes / maxMins) * 100);
        return `
          <div style="display: flex; flex-direction: column; align-items: center; flex: 1; height: 100%; justify-content: flex-end; gap: 6px;">
            <div style="font-size: 10px; color: var(--nord4);">${d.minutes}m</div>
            <div style="width: 100%; max-width: 24px; height: ${Math.max(6, heightPct)}%; background: ${d.minutes > 0 ? 'var(--nord8)' : 'var(--nord2)'}; border-radius: 4px; transition: height 0.4s ease;"></div>
            <div style="font-size: 11px; color: var(--nord4);">${d.label}</div>
          </div>
        `;
      }).join('');
    }

    // 任务分布列表渲染
    if (this.dom.chartDistribution) {
      const distribution = this.storage.getTaskDistribution();
      if (distribution.length === 0 || distribution.every(d => d.seconds === 0)) {
        this.dom.chartDistribution.innerHTML = '<div style="color: var(--nord3); font-size: 12px; text-align: center; padding: 12px;">暂无专注分布数据</div>';
      } else {
        this.dom.chartDistribution.innerHTML = distribution.map(d => `
          <div style="margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px; color: var(--nord5);">
              <span>${d.title}</span>
              <span>${Math.round(d.seconds / 60)}m (${d.percentage}%)</span>
            </div>
            <div style="width: 100%; height: 6px; background: var(--nord1); border-radius: 3px; overflow: hidden;">
              <div style="width: ${d.percentage}%; height: 100%; background: var(--nord9); border-radius: 3px;"></div>
            </div>
          </div>
        `).join('');
      }
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FocusTimeApp };
}
