/**
 * 自动化测试套件
 * 覆盖：
 * 1. 计时核心状态机流转 (IDLE -> RUNNING -> PAUSED -> RESUME -> COMPLETED -> REST_WAITING)
 * 2. 模式切换 (25m / 5m / 15m) 与时长、格式化验证
 * 3. 4次番茄后长休流转逻辑
 * 4. 任务关联与番茄累加
 * 5. 今日战报与7日趋势聚合
 * 6. 物理时间戳校准与后台恢复
 */

const assert = require('assert');
const { TimerEngine } = require('../src/timer-engine');
const { StorageManager, MemoryStorage } = require('../src/storage');

let testsPassed = 0;
let testsTotal = 0;

function it(name, fn) {
  testsTotal++;
  try {
    fn();
    console.log(`  ✓ ${name}`);
    testsPassed++;
  } catch (e) {
    console.error(`  ✗ ${name}`);
    console.error(e);
  }
}

console.log('--- 开始执行《专注时刻》核心自动化测试 ---\n');

// 1. StorageManager 测试
console.log('【Suite 1: StorageManager 存储与统计】');
const storage = new StorageManager(new MemoryStorage());

it('应成功初始化默认任务与配置', () => {
  const tasks = storage.getTasks();
  assert.ok(Array.isArray(tasks) && tasks.length >= 3);
  const settings = storage.getSettings();
  assert.strictEqual(settings.pomodoroDuration, 25);
  assert.strictEqual(settings.shortBreakDuration, 5);
  assert.strictEqual(settings.longBreakDuration, 15);
});

it('应支持创建新任务并支持选择与删除', () => {
  const newTask = storage.addTask('自动化测试任务');
  assert.ok(newTask && newTask.id);
  assert.strictEqual(newTask.title, '自动化测试任务');
  assert.strictEqual(newTask.pomodoroCount, 0);

  const updated = storage.recordPomodoroForTask(newTask.id, 1500);
  assert.strictEqual(updated.pomodoroCount, 1);
  assert.strictEqual(updated.totalDurationSeconds, 1500);

  storage.deleteTask(newTask.id);
  const tasksAfter = storage.getTasks();
  assert.strictEqual(tasksAfter.some(t => t.id === newTask.id), false);
});

it('应正确计算今日战报与近 7 日趋势', () => {
  // 模拟写入完成记录
  storage.saveSession({
    mode: 'pomodoro',
    taskId: 'task-1',
    targetDurationSeconds: 1500,
    actualDurationSeconds: 1500,
    status: 'completed',
    startedAt: new Date().toISOString(),
    endedAt: new Date().toISOString()
  });

  const todayStats = storage.getTodayStats();
  assert.ok(todayStats.completedPomodoroCount >= 1);
  assert.ok(todayStats.totalDurationSeconds >= 1500);

  const trend = storage.getRecent7DaysStats();
  assert.strictEqual(trend.length, 7);
  assert.ok(trend[trend.length - 1].count >= 1);

  const distribution = storage.getTaskDistribution();
  assert.ok(Array.isArray(distribution) && distribution.length > 0);
});

// 2. TimerEngine 状态机测试
console.log('\n【Suite 2: TimerEngine 倒计时核心引擎与状态机】');

it('初始化状态应为 IDLE 且时间为 25:00', () => {
  const timer = new TimerEngine({ storage });
  assert.strictEqual(timer.state, 'IDLE');
  assert.strictEqual(timer.currentMode, 'pomodoro');
  assert.strictEqual(timer.remainingSeconds, 25 * 60);
  assert.strictEqual(timer.getFormattedTime(), '25:00');
  assert.strictEqual(timer.getProgress(), 0);
});

it('模式切换应正确更新倒计时时长 (5m / 15m / 25m)', () => {
  const timer = new TimerEngine({ storage });
  timer.setMode('short-break');
  assert.strictEqual(timer.currentMode, 'short-break');
  assert.strictEqual(timer.remainingSeconds, 5 * 60);
  assert.strictEqual(timer.getFormattedTime(), '05:00');

  timer.setMode('long-break');
  assert.strictEqual(timer.currentMode, 'long-break');
  assert.strictEqual(timer.remainingSeconds, 15 * 60);
  assert.strictEqual(timer.getFormattedTime(), '15:00');

  timer.setMode('pomodoro');
  assert.strictEqual(timer.currentMode, 'pomodoro');
  assert.strictEqual(timer.remainingSeconds, 25 * 60);
});

it('运行中禁止直接切换模式', () => {
  const timer = new TimerEngine({ storage });
  timer.start();
  assert.strictEqual(timer.state, 'RUNNING');
  assert.throws(() => {
    timer.setMode('short-break');
  }, /Cannot switch mode while timer is running/);
  timer.reset();
});

it('完整生命周期控制流: start -> pause -> resume -> reset', () => {
  const timer = new TimerEngine({ storage });
  let events = [];
  timer.subscribe(payload => events.push(payload.event));

  timer.start();
  assert.strictEqual(timer.state, 'RUNNING');
  assert.ok(timer.targetEndTime > Date.now());

  timer.pause();
  assert.strictEqual(timer.state, 'PAUSED');
  assert.strictEqual(timer.targetEndTime, null);

  timer.resume();
  assert.strictEqual(timer.state, 'RUNNING');
  assert.ok(timer.targetEndTime > Date.now());

  timer.reset();
  assert.strictEqual(timer.state, 'IDLE');
  assert.strictEqual(timer.remainingSeconds, 25 * 60);

  assert.ok(events.includes('start'));
  assert.ok(events.includes('pause'));
  assert.ok(events.includes('resume'));
  assert.ok(events.includes('reset'));
});

it('倒计时自然完成应自动转为 REST_WAITING 并建议短休息', () => {
  const mockStorage = new StorageManager(new MemoryStorage());
  const timer = new TimerEngine({ storage: mockStorage, pomodoroMinutes: 0.1 }); // 6 秒
  timer.setTask('task-1');
  timer.start();

  // 模拟时间递减归零
  timer.remainingSeconds = 0;
  timer._onComplete();

  assert.strictEqual(timer.state, 'REST_WAITING');
  assert.strictEqual(timer.completedPomodorosInCycle, 1);

  // 验证保存的会话记录
  const sessions = mockStorage.getSessions();
  assert.strictEqual(sessions.length, 1);
  assert.strictEqual(sessions[0].status, 'completed');
  assert.strictEqual(sessions[0].mode, 'pomodoro');
});

it('每累计完成 4 个番茄钟应自动建议进入长休息 (15m)', () => {
  const mockStorage = new StorageManager(new MemoryStorage());
  const timer = new TimerEngine({ storage: mockStorage, longBreakInterval: 4 });
  timer.completedPomodorosInCycle = 3; // 前 3 次完成

  let lastCompleteData = null;
  timer.subscribe(payload => {
    if (payload.event === 'complete') {
      lastCompleteData = payload;
    }
  });

  timer.start();
  timer.remainingSeconds = 0;
  timer._onComplete();

  assert.strictEqual(timer.completedPomodorosInCycle, 4);
  assert.ok(lastCompleteData);
  assert.strictEqual(lastCompleteData.nextSuggestedMode, 'long-break');
});

it('物理时间戳后台断网/切后台休眠自动校准与恢复', () => {
  const mockStorage = new StorageManager(new MemoryStorage());
  const timer1 = new TimerEngine({ storage: mockStorage });
  timer1.start();

  // 模拟已过去 300 秒 (5分钟)
  const targetEndTime = Date.now() + (25 * 60 - 300) * 1000;
  mockStorage.saveActiveState({
    mode: 'pomodoro',
    state: 'RUNNING',
    remainingSeconds: 25 * 60,
    totalSeconds: 25 * 60,
    targetEndTime: targetEndTime,
    completedPomodorosInCycle: 0,
    currentTaskId: null,
    timestamp: Date.now() - 300000
  });

  const timer2 = new TimerEngine({ storage: mockStorage });
  const restored = timer2.restoreState();
  assert.strictEqual(restored, true);
  assert.strictEqual(timer2.state, 'RUNNING');
  // 剩余秒数应在 1200 秒左右 (允许 1 秒误差)
  assert.ok(Math.abs(timer2.remainingSeconds - 1200) <= 2);
  timer2.reset();
});

console.log(`\n==========================================`);
console.log(`测试结果汇总: 全部 ${testsTotal} 项测试，通过: ${testsPassed}，失败: ${testsTotal - testsPassed}`);
console.log(`==========================================\n`);

if (testsPassed !== testsTotal) {
  process.exit(1);
} else {
  console.log('🎉 自动化测试 100% 通过！质量门禁 Gate 3 验证达标！');
  process.exit(0);
}
