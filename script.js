/* =========================================================
   2048 — 完整游戏 + Firebase 认证 + 动画 + 音效
   ========================================================= */

// =========================================================
// 1. Firebase 初始化 (Compat 模式)
// =========================================================
const firebaseConfig = {
  apiKey: "AIzaSyDwqxkGAzID2HLfotcYDoWRdOsIZ3ccLx0",
  authDomain: "game-fd28f.firebaseapp.com",
  projectId: "game-fd28f",
  storageBucket: "game-fd28f.firebasestorage.app",
  messagingSenderId: "706337400889",
  appId: "1:706337400889:web:cb7ebcc53fa6d8215685e8"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// =========================================================
// 2. DOM 快捷引用
// =========================================================
const $ = id => document.getElementById(id);
const authSection      = $('auth-section');
const gameSection      = $('game-section');
const loginForm        = $('login-form');
const registerForm     = $('register-form');
const loginError       = $('login-error');
const registerError    = $('register-error');
const guestBtn         = $('guest-btn');
const logoutBtn        = $('logout-btn');
const userInfo         = $('user-info');
const scoreEl          = $('score');
const bestScoreEl      = $('best-score');
const gridBg           = $('grid-background');
const tileContainer    = $('tile-container');
const gameContainer    = $('game-container');
const gameOverOverlay  = $('game-over-overlay');
const finalScore       = $('final-score');
const winOverlay       = $('win-overlay');
const newGameBtn       = $('new-game-btn');
const restartBtn       = $('restart-btn');
const continueBtn      = $('continue-btn');
const musicBtn         = $('music-btn');
const shareBtn         = $('share-btn');
const toastEl          = $('toast');

// =========================================================
// 3. iOS / 移动端视口高度适配
// =========================================================
function fixMobileViewport() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}
fixMobileViewport();
window.addEventListener('resize', fixMobileViewport);

// 游戏容器尺寸变化时重新渲染
let _resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(_resizeTimer);
  _resizeTimer = setTimeout(() => {
    if (game && game.cells && game.cells.length > 0) {
      game._render();
    }
  }, 200);
});

// =========================================================
// 4. 页面加载时强制登出（无论之前是否登录过）
// =========================================================
auth.signOut();

// =========================================================
// 5. Auth 选项卡
// =========================================================
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    btn.classList.add('active');
    $(`${btn.dataset.tab}-form`).classList.add('active');
    loginError.textContent = '';
    registerError.textContent = '';
  });
});

// =========================================================
// 6. 认证方法
// =========================================================

/* ---- 登录 ---- */
loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  loginError.textContent = '';
  const email = $('login-email').value.trim();
  const pwd   = $('login-password').value;
  const btn   = loginForm.querySelector('.auth-btn');
  btn.disabled = true; btn.textContent = '登录中…';
  try {
    await auth.signInWithEmailAndPassword(email, pwd);
    loginForm.reset();
  } catch (err) {
    loginError.textContent = mapAuthError(err.code);
  }
  btn.disabled = false; btn.textContent = '登录';
});

/* ---- 注册 ---- */
registerForm.addEventListener('submit', async e => {
  e.preventDefault();
  registerError.textContent = '';
  const email = $('register-email').value.trim();
  const pwd   = $('register-password').value;
  const btn   = registerForm.querySelector('.auth-btn');
  btn.disabled = true; btn.textContent = '注册中…';
  try {
    await auth.createUserWithEmailAndPassword(email, pwd);
    registerForm.reset();
  } catch (err) {
    registerError.textContent = mapAuthError(err.code);
  }
  btn.disabled = false; btn.textContent = '注册';
});

/* ---- 访客 ---- */
guestBtn.addEventListener('click', async () => {
  guestBtn.disabled = true; guestBtn.textContent = '进入中…';
  try {
    await auth.signInAnonymously();
  } catch (err) {
    loginError.textContent = mapAuthError(err.code);
  }
  guestBtn.disabled = false; guestBtn.textContent = '🎮 访客模式';
});

/* ---- 退出 ---- */
logoutBtn.addEventListener('click', () => auth.signOut());

/* ---- 错误汉化 ---- */
function mapAuthError(code) {
  const m = {
    'auth/user-not-found':       '未找到该用户',
    'auth/wrong-password':        '密码错误',
    'auth/invalid-credential':    '邮箱或密码错误',
    'auth/email-already-in-use': '该邮箱已被注册',
    'auth/weak-password':        '密码过短，至少 6 位',
    'auth/invalid-email':        '邮箱格式无效',
    'auth/too-many-requests':    '操作过于频繁，请稍后再试',
    'auth/network-request-failed':'网络连接失败',
  };
  return m[code] || '操作失败，请重试';
}

/* ---- 认证状态监听 ---- */
auth.onAuthStateChanged(user => {
  const best = parseInt(localStorage.getItem('2048_best') || '0');
  if (user) {
    authSection.classList.add('hidden');
    gameSection.classList.remove('hidden');
    userInfo.textContent = user.isAnonymous ? '👤 访客' : `👤 ${user.email}`;
    bestScoreEl.textContent = best;
    // 进入游戏时提前初始化音效，确保移动时音效就绪
    SoundFX.init();
    game.start();
  } else {
    authSection.classList.remove('hidden');
    gameSection.classList.add('hidden');
    userInfo.textContent = '';
    game.cleanup();
  }
});

// =========================================================
// 7. 音效管理器 (Web Audio API)
// =========================================================
const SoundFX = {
  _ctx: null,
  _ready: false,

  /** 首次用户交互时初始化（由页面的 click/keydown 触发） */
  init() {
    if (this._ready) return;
    try {
      const C = window.AudioContext || window.webkitAudioContext;
      this._ctx = new C();
      this._ready = true;
    } catch (_) {}
  },

  _ensure() {
    if (!this._ready) this.init();
    if (this._ctx && this._ctx.state === 'suspended') {
      this._ctx.resume();
    }
  },

  /** 移动音 — 短促的点击声 */
  move() {
    try {
      this._ensure();
      const o = this._ctx.createOscillator();
      const g = this._ctx.createGain();
      o.connect(g); g.connect(this._ctx.destination);
      o.type = 'triangle'; o.frequency.value = 200;
      g.gain.setValueAtTime(0.5, this._ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, this._ctx.currentTime + 0.06);
      o.start(); o.stop(this._ctx.currentTime + 0.06);
    } catch (_) {}
  },

  /** 合并音 — 上扬的 pop 声 */
  merge() {
    try {
      this._ensure();
      const o = this._ctx.createOscillator();
      const g = this._ctx.createGain();
      o.connect(g); g.connect(this._ctx.destination);
      o.type = 'sine';
      o.frequency.setValueAtTime(300, this._ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(600, this._ctx.currentTime + 0.12);
      g.gain.setValueAtTime(0.5, this._ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, this._ctx.currentTime + 0.15);
      o.start(); o.stop(this._ctx.currentTime + 0.15);
    } catch (_) {}
  },

  /** 游戏结束 — 下行音 */
  gameOver() {
    try {
      this._ensure();
      const o = this._ctx.createOscillator();
      const g = this._ctx.createGain();
      o.connect(g); g.connect(this._ctx.destination);
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(400, this._ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(80, this._ctx.currentTime + 0.6);
      g.gain.setValueAtTime(0.35, this._ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, this._ctx.currentTime + 0.6);
      o.start(); o.stop(this._ctx.currentTime + 0.6);
    } catch (_) {}
  },

  /** 胜利 — 上行三音阶 */
  win() {
    try {
      this._ensure();
      [523, 659, 784].forEach((freq, i) => {
        const o = this._ctx.createOscillator();
        const g = this._ctx.createGain();
        o.connect(g); g.connect(this._ctx.destination);
        o.type = 'sine'; o.frequency.value = freq;
        const t = this._ctx.currentTime + i * 0.15;
        g.gain.setValueAtTime(0.4, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        o.start(t); o.stop(t + 0.35);
      });
    } catch (_) {}
  }
};

// =========================================================
// 8. 背景音乐
// =========================================================
const bgMusic = new Audio('./gin120_ed2-mr-raindrop.mp3');
bgMusic.loop = true;
bgMusic.volume = 0.15;
let bgMusicPlaying = false;

/** 首次用户交互时初始化音效系统和背景音乐 */
function initAudio() {
  SoundFX.init();

  if (bgMusicPlaying) return;
  bgMusicPlaying = true;
  bgMusic.play().catch(() => {});
  musicBtn.textContent = '🔊';
  musicBtn.classList.remove('music-off');
  musicBtn.classList.add('music-on');
}

/** 切换背景音乐 */
function toggleMusic() {
  if (bgMusic.paused) {
    bgMusic.play().catch(() => {});
    musicBtn.textContent = '🔊';
    musicBtn.classList.remove('music-off');
    musicBtn.classList.add('music-on');
  } else {
    bgMusic.pause();
    musicBtn.textContent = '🔇';
    musicBtn.classList.remove('music-on');
    musicBtn.classList.add('music-off');
  }
}

// 任何用户交互都触发音频初始化
document.addEventListener('click', initAudio, { once: true });
document.addEventListener('keydown', initAudio, { once: true });

// =========================================================
// 9. Toast 提示
// =========================================================
let toastTimer = null;
function showToast(msg) {
  if (toastTimer) clearTimeout(toastTimer);
  toastEl.textContent = msg;
  toastEl.classList.remove('hidden');
  // 重新触发动画
  toastEl.style.animation = 'none';
  void toastEl.offsetHeight;
  toastEl.style.animation = '';
  toastTimer = setTimeout(() => {
    toastEl.classList.add('hidden');
  }, 2000);
}

// ========================================================
// 10. 方块身份 Cell（用于平滑动画追踪）
// ========================================================
let _nextCellId = 0;
class Cell {
  constructor(value) {
    this.id = _nextCellId++;
    this.value = value;
  }
}

// ========================================================
// 11. 2048 游戏
// ========================================================
const SIZE = 4;
const TILE_CLASSES = [
  '', 'tile-2', 'tile-4', 'tile-8', 'tile-16', 'tile-32', 'tile-64',
  'tile-128', 'tile-256', 'tile-512', 'tile-1024', 'tile-2048'
];

class Game2048 {
  constructor() {
    this.cells    = [];      // Cell[][]  (null = 空)
    this.score    = 0;
    this.over     = false;
    this.won      = false;
    this.keepGoing = false;
    this._tileEls = new Map();  // cellId → DOM 元素
    this._pendingAnim = false;  // 正在播放动画
    this._gridBgCreated = false;
  }

  // ---- 生成网格背景 (只做一次) ----
  _createGridBg() {
    if (this._gridBgCreated) return;
    gridBg.innerHTML = '';
    gridBg.style.display = 'grid';
    gridBg.style.gridTemplateColumns = `repeat(${SIZE}, 1fr)`;
    gridBg.style.gap = '3%';
    gridBg.style.width = '100%';
    gridBg.style.height = '100%';
    for (let i = 0; i < SIZE * SIZE; i++) {
      const c = document.createElement('div');
      c.style.background = 'rgba(238, 228, 218, 0.35)';
      c.style.borderRadius = '4px';
      gridBg.appendChild(c);
    }
    this._gridBgCreated = true;
  }

  // ---- 获取格子位置 & 尺寸 ----
  _cellLayout(col, row) {
    const size = gameContainer.clientWidth;
    const pad  = size * 0.02;
    const gap  = size * 0.03;
    const cell  = (size - pad * 2 - gap * (SIZE - 1)) / SIZE;
    return {
      x: pad + col * (cell + gap),
      y: pad + row * (cell + gap),
      size: cell
    };
  }

  // ---- 初始化 / 开始 ----
  start() {
    this._createGridBg();
    this._tileEls.forEach(el => el.remove());
    this._tileEls.clear();
    tileContainer.innerHTML = '';

    this.cells = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
    this.score = 0;
    this.over = false;
    this.won = false;
    this.keepGoing = false;
    this._pendingAnim = false;
    this.hideOverlays();

    const t1 = this._addRandomTile();
    const t2 = this._addRandomTile();
    this._render({ newIds: [t1.id, t2.id] });
    this.updateScore();
  }

  // ---- 添加随机 Cell ----
  _addRandomTile() {
    const empty = [];
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++)
        if (this.cells[r][c] === null) empty.push([r, c]);
    if (empty.length === 0) return null;
    const [r, c] = empty[Math.floor(Math.random() * empty.length)];
    const val = Math.random() < 0.9 ? 2 : 4;
    const cell = new Cell(val);
    this.cells[r][c] = cell;
    return cell;
  }

  // ---- 空位计数 ----
  _emptyCount() {
    let n = 0;
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++)
        if (this.cells[r][c] === null) n++;
    return n;
  }

  // ============ 核心移动逻辑（旋转法） ============

  /** 顺时针旋转 90° */
  _rotate() {
    const g = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++)
        g[c][SIZE - 1 - r] = this.cells[r][c];
    this.cells = g;
  }

  /** 向左合并（操作 Cell 对象） */
  _moveLeft() {
    let moved = false;
    const victims = [];   // 被合并掉的 cellId
    const doubled = [];   // 翻倍的 cellId

    for (let r = 0; r < SIZE; r++) {
      let row = this.cells[r].filter(c => c !== null);
      for (let i = 0; i < row.length - 1; i++) {
        if (row[i].value === row[i + 1].value) {
          victims.push(row[i + 1].id);  // 这个被吃掉
          doubled.push(row[i].id);      // 这个翻倍
          row[i].value *= 2;
          this.score += row[i].value;
          row.splice(i + 1, 1);
          moved = true;
        }
      }
      while (row.length < SIZE) row.push(null);
      for (let c = 0; c < SIZE; c++)
        if (this.cells[r][c] !== row[c]) { moved = true; break; }
      this.cells[r] = row;
    }
    return { moved, victims, doubled };
  }

  /** 公开移动接口 */
  move(direction) {
    if (this.over || this.won || this._pendingAnim) return;

    const rotMap  = { left: 0, up: 3, right: 2, down: 1 };
    const rot     = rotMap[direction];
    const backRot = (SIZE - rot) % SIZE;

    for (let i = 0; i < rot; i++) this._rotate();
    const result = this._moveLeft();
    for (let i = 0; i < backRot; i++) this._rotate();

    if (!result.moved) return;

    // 新方块
    const newCell = this._addRandomTile();

    // 第一阶段：渲染新位置（CSS transition 自动平滑滑动）
    this._render({
      victims: result.victims,
      doubledIds: result.doubled,
      newIds: newCell ? [newCell.id] : []
    });

    // 播放音效
    if (result.doubled.length > 0) {
      SoundFX.merge();
    } else {
      SoundFX.move();
    }

    this.updateScore();

    // 第二阶段：动画完成后检查胜负
    this._pendingAnim = true;
    setTimeout(() => {
      this._pendingAnim = false;
      this.checkGameOver();
      if (!this.keepGoing) this.checkWin();
    }, 130);
  }

  // ---- 检查结束 ----
  checkGameOver() {
    if (this._emptyCount() > 0) return;
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++) {
        const v = this.cells[r][c].value;
        if ((c < SIZE - 1 && this.cells[r][c + 1] && this.cells[r][c + 1].value === v) ||
            (r < SIZE - 1 && this.cells[r + 1][c] && this.cells[r + 1][c].value === v)) {
          return;
        }
      }
    this.over = true;
    finalScore.textContent = `得分：${this.score}`;
    gameOverOverlay.classList.remove('hidden');
    SoundFX.gameOver();
  }

  // ---- 检查胜利 ----
  checkWin() {
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++)
        if (this.cells[r][c] && this.cells[r][c].value === 2048) {
          this.won = true;
          winOverlay.classList.remove('hidden');
          SoundFX.win();
          return;
        }
  }

  // ---- 更新分数 ----
  updateScore() {
    scoreEl.textContent = this.score;
    const best = Math.max(this.score,
      parseInt(localStorage.getItem('2048_best') || '0'));
    localStorage.setItem('2048_best', best);
    bestScoreEl.textContent = best;
  }

  // ---- 隐藏遮罩 ----
  hideOverlays() {
    gameOverOverlay.classList.add('hidden');
    winOverlay.classList.add('hidden');
  }

  // ---- 清理 ----
  cleanup() {
    this.over = true;
    this._pendingAnim = false;
    this._tileEls.forEach(el => el.remove());
    this._tileEls.clear();
    tileContainer.innerHTML = '';
  }

  // =====================================================
  // 9. 渲染（含平滑动画追踪）
  // =====================================================
  /**
   * @param {Object} opt
   * @param {number[]} [opt.victims]    — 被合并而消失的 cellId
   * @param {number[]} [opt.doubledIds] — 翻倍的 cellId（合并动画）
   * @param {number[]} [opt.newIds]     — 新出现的 cellId（弹入动画）
   */
  _render(opt = {}) {
    const victims    = new Set(opt.victims    || []);
    const doubledIds = new Set(opt.doubledIds || []);
    const newIds     = new Set(opt.newIds     || []);

    // 当前有效的 cellId
    const activeIds = new Set();
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++)
        if (this.cells[r][c]) activeIds.add(this.cells[r][c].id);

    // 移除不再存在的元素
    for (const [id, el] of this._tileEls) {
      if (!activeIds.has(id)) {
        el.remove();
        this._tileEls.delete(id);
      }
    }

    // 遍历网格，更新/创建方块
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const cell = this.cells[r][c];
        if (cell === null) continue;

        const pos    = this._cellLayout(c, r);
        let el       = this._tileEls.get(cell.id);
        const isNew  = !el;

        if (isNew) {
          el = document.createElement('div');
          el.style.position     = 'absolute';
          el.style.top          = '0';
          el.style.left         = '0';
          el.style.display      = 'flex';
          el.style.alignItems   = 'center';
          el.style.justifyContent = 'center';
          el.style.fontWeight   = '700';
          el.style.borderRadius = '4px';
          el.style.zIndex       = '1';
          tileContainer.appendChild(el);
          this._tileEls.set(cell.id, el);
        }

        // 尺寸
        el.style.width  = pos.size + 'px';
        el.style.height = pos.size + 'px';

        // 位置（CSS transition 自动平滑移动）
        el.style.left = pos.x + 'px';
        el.style.top  = pos.y + 'px';

        // 内容和样式
        el.dataset.value = cell.value;
        el.textContent   = cell.value;
        el.className     = `tile ${this._tileColorClass(cell.value)}`;
        if (cell.value >= 1024) el.classList.add('tile-extra');

        // 动画类
        if (victims.has(cell.id)) {
          // 被合并的——缩小消失
          el.classList.add('tile-vanish');
        }
        if (doubledIds.has(cell.id)) {
          el.classList.add('tile-merged');
        }
        if (newIds.has(cell.id)) {
          el.classList.add('tile-new');
        }
      }
    }
  }

  _tileColorClass(val) {
    const idx = Math.floor(Math.log2(val));
    return idx < TILE_CLASSES.length ? TILE_CLASSES[idx] : 'tile-super';
  }
}

// ========================================================
// 12. 键盘控制
// ========================================================
document.addEventListener('keydown', e => {
  const map = {
    ArrowLeft: 'left', ArrowUp: 'up',
    ArrowRight: 'right', ArrowDown: 'down'
  };
  const dir = map[e.key];
  if (dir) {
    e.preventDefault();
    // 确保音效上下文已激活
    SoundFX._ensure();
    game.move(dir);
  }
});

// ========================================================
// 13. 移动端触控
// ========================================================
let touchStartX = 0, touchStartY = 0;
let touchLastX = 0, touchLastY = 0;
let touchMoved = false;

gameContainer.addEventListener('touchstart', e => {
  const t = e.touches[0];
  touchStartX = t.clientX;
  touchStartY = t.clientY;
  touchLastX = t.clientX;
  touchLastY = t.clientY;
  touchMoved = false;
}, { passive: true });

gameContainer.addEventListener('touchmove', e => {
  const t = e.touches[0];
  touchLastX = t.clientX;
  touchLastY = t.clientY;
  touchMoved = true;
  e.preventDefault();
}, { passive: false });

gameContainer.addEventListener('touchend', e => {
  if (!touchMoved) return;

  const t  = e.changedTouches[0];
  const dx = t.clientX - touchStartX;
  const dy = t.clientY - touchStartY;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) return; // 提高阈值减少误触

  let dir;
  if (Math.abs(dx) > Math.abs(dy)) {
    dir = dx > 0 ? 'right' : 'left';
  } else {
    dir = dy > 0 ? 'down' : 'up';
  }
  SoundFX._ensure();
  game.move(dir);
}, { passive: true });

// ========================================================
// 14. 按钮事件
// ========================================================
const restart = () => {
  game.hideOverlays();
  game.start();
};
newGameBtn.addEventListener('click', restart);
restartBtn.addEventListener('click', restart);

continueBtn.addEventListener('click', () => {
  winOverlay.classList.add('hidden');
  game.keepGoing = true;
  game.won = false;
});

/* ---- 音乐开关 ---- */
musicBtn.addEventListener('click', toggleMusic);

/* ---- 分享按钮 ---- */
shareBtn.addEventListener('click', () => {
  const url = window.location.href;
  navigator.clipboard.writeText(url).then(() => {
    showToast('✅ 网址已复制在剪切板中！');
  }).catch(() => {
    // 降级方案
    const textarea = document.createElement('textarea');
    textarea.value = url;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast('✅ 网址已复制在剪切板中！');
  });
});

// ========================================================
// 15. 启动游戏
// ========================================================
const game = new Game2048();
