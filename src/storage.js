/**
 * StorageManager - 数据持久化层
 * 支持 LocalStorage 以及内存 Fallback（用于 Node.js / 测试环境）
 */

class StorageManager {
  constructor(storageBackend = null) {
    if (storageBackend) {
      this.storage = storageBackend;
    } else if (typeof window !== 'undefined' && window.localStorage) {
      this.storage = window.localStorage;
    } else {
      this.storage = new MemoryStorage();
    }

    this.KEYS = {
      SESSIONS: 'focus_time_sessions_v1',
      TASKS: 'focus_time_tasks_v1',
      SETTINGS: 'focus_time_settings_v1',
      CURRENT_STATE: 'focus_time_active_state_v1'
    };

    this._initDefaults();
  }

  _initDefaults() {
    if (!this.getTasks() || this.getTasks().length === 0) {
      const defaultTasks = [
        { id: 'task-1', title: '编写项目技术文档与 PRD', status: 'active', pomodoroCount: 3, totalDurationSeconds: 4500, createdAt: new Date().toISOString() },
        { id: 'task-2', title: '重构核心计时引擎与状态机', status: 'active', pomodoroCount: 2, totalDurationSeconds: 3000, createdAt: new Date().toISOString() },
        { id: 'task-3', title: 'Nord 暗色主题与组件走查', status: 'active', pomodoroCount: 1, totalDurationSeconds: 1500, createdAt: new Date().toISOString() },
      ];
      this.saveTasks(defaultTasks);
    }

    if (!this.getSettings()) {
      const defaultSettings = {
        pomodoroDuration: 25,
        shortBreakDuration: 5,
        longBreakDuration: 15,
        longBreakInterval: 4,
        autoStartBreaks: false,
        soundEnabled: true,
        notificationEnabled: true
      };
      this.saveSettings(defaultSettings);
    }
  }

  getTasks() {
    try {
      const data = this.storage.getItem(this.KEYS.TASKS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to get tasks:', e);
      return [];
    }
  }

  saveTasks(tasks) {
    try {
      this.storage.setItem(this.KEYS.TASKS, JSON.stringify(tasks));
      return true;
    } catch (e) {
      console.error('Failed to save tasks:', e);
      return false;
    }
  }

  addTask(title) {
    if (!title || !title.trim()) return null;
    const tasks = this.getTasks();
    const newTask = {
      id: 'task-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      title: title.trim(),
      status: 'active',
      pomodoroCount: 0,
      totalDurationSeconds: 0,
      createdAt: new Date().toISOString()
    };
    tasks.unshift(newTask);
    this.saveTasks(tasks);
    return newTask;
  }

  updateTask(taskId, updates) {
    const tasks = this.getTasks();
    const index = tasks.findIndex(t => t.id === taskId);
    if (index === -1) return null;
    tasks[index] = { ...tasks[index], ...updates, updatedAt: new Date().toISOString() };
    this.saveTasks(tasks);
    return tasks[index];
  }

  deleteTask(taskId) {
    let tasks = this.getTasks();
    tasks = tasks.filter(t => t.id !== taskId);
    this.saveTasks(tasks);
    return true;
  }

  recordPomodoroForTask(taskId, durationSeconds) {
    if (!taskId) return null;
    const tasks = this.getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      task.pomodoroCount = (task.pomodoroCount || 0) + 1;
      task.totalDurationSeconds = (task.totalDurationSeconds || 0) + durationSeconds;
      task.updatedAt = new Date().toISOString();
      this.saveTasks(tasks);
      return task;
    }
    return null;
  }

  getSessions() {
    try {
      const data = this.storage.getItem(this.KEYS.SESSIONS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to get sessions:', e);
      return [];
    }
  }

  saveSession(session) {
    try {
      const sessions = this.getSessions();
      sessions.unshift({
        ...session,
        id: session.id || ('sess-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4)),
        createdAt: session.createdAt || new Date().toISOString()
      });
      this.storage.setItem(this.KEYS.SESSIONS, JSON.stringify(sessions));
      return true;
    } catch (e) {
      console.error('Failed to save session:', e);
      return false;
    }
  }

  getSettings() {
    try {
      const data = this.storage.getItem(this.KEYS.SETTINGS);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  saveSettings(settings) {
    try {
      this.storage.setItem(this.KEYS.SETTINGS, JSON.stringify(settings));
      return true;
    } catch (e) {
      return false;
    }
  }

  saveActiveState(state) {
    try {
      if (!state) {
        this.storage.removeItem(this.KEYS.CURRENT_STATE);
      } else {
        this.storage.setItem(this.KEYS.CURRENT_STATE, JSON.stringify(state));
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  getActiveState() {
    try {
      const data = this.storage.getItem(this.KEYS.CURRENT_STATE);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * 统计计算：今日战报 & 历史趋势
   */
  getTodayStats() {
    const sessions = this.getSessions();
    const todayStr = new Date().toISOString().slice(0, 10);

    const todaySessions = sessions.filter(s => {
      const sDate = (s.startedAt || s.createdAt || '').slice(0, 10);
      return sDate === todayStr;
    });

    const completedPomodoros = todaySessions.filter(s => s.mode === 'pomodoro' && s.status === 'completed');
    const totalDurationSeconds = completedPomodoros.reduce((sum, s) => sum + (s.actualDurationSeconds || s.durationSeconds || 0), 0);

    return {
      todayDate: todayStr,
      completedPomodoroCount: completedPomodoros.length,
      totalDurationSeconds: totalDurationSeconds,
      totalDurationMinutes: Math.round(totalDurationSeconds / 60),
      sessions: todaySessions
    };
  }

  getRecent7DaysStats() {
    const sessions = this.getSessions();
    const result = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayLabel = `${d.getMonth() + 1}/${d.getDate()}`;

      const daySessions = sessions.filter(s => {
        const sDate = (s.startedAt || s.createdAt || '').slice(0, 10);
        return sDate === dateStr && s.mode === 'pomodoro' && s.status === 'completed';
      });

      const count = daySessions.length;
      const durationMins = Math.round(daySessions.reduce((acc, s) => acc + (s.actualDurationSeconds || s.durationSeconds || 0), 0) / 60);

      result.push({
        date: dateStr,
        label: dayLabel,
        count: count,
        minutes: durationMins
      });
    }

    return result;
  }

  getTaskDistribution() {
    const sessions = this.getSessions().filter(s => s.mode === 'pomodoro' && s.status === 'completed');
    const tasks = this.getTasks();
    const taskMap = {};

    tasks.forEach(t => {
      taskMap[t.id] = { id: t.id, title: t.title, count: 0, seconds: 0 };
    });
    taskMap['unassigned'] = { id: 'unassigned', title: '无标题专注', count: 0, seconds: 0 };

    sessions.forEach(s => {
      const tId = s.taskId && taskMap[s.taskId] ? s.taskId : 'unassigned';
      taskMap[tId].count += 1;
      taskMap[tId].seconds += (s.actualDurationSeconds || s.durationSeconds || 0);
    });

    const list = Object.values(taskMap).filter(item => item.count > 0 || item.id !== 'unassigned');
    const totalSecs = list.reduce((acc, item) => acc + item.seconds, 0);

    return list.map(item => ({
      ...item,
      percentage: totalSecs > 0 ? Math.round((item.seconds / totalSecs) * 100) : 0
    }));
  }
}

class MemoryStorage {
  constructor() {
    this.map = new Map();
  }
  getItem(key) {
    return this.map.has(key) ? this.map.get(key) : null;
  }
  setItem(key, val) {
    this.map.set(key, String(val));
  }
  removeItem(key) {
    this.map.delete(key);
  }
  clear() {
    this.map.clear();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { StorageManager, MemoryStorage };
}
