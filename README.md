# 2048 小游戏 🎮

经典 2048 游戏的网页版，支持**账号注册登录**和**访客模式**，带音效和背景音乐。

## ✨ 功能

- ✅ **经典 2048 玩法** — 方向键/滑动控制方块合并
- ✅ **账号注册登录** — 使用 Firebase 认证，保存最高分
- ✅ **访客模式** — 无需注册，直接开玩
- ✅ **平滑动画** — 方块滑动、合并、出现均有流畅动画
- ✅ **音效系统** — 移动、合并、胜利、失败均有提示音
- ✅ **背景音乐** — 可随时开关
- ✅ **移动端适配** — 支持手机滑动操作
- ✅ **响应式设计** — 适配各种屏幕尺寸
- ✅ **最高分记录** — 使用 localStorage 本地保存

## 🖥️ 在线地址

[https://2048.whatisissue.dpdns.org](https://2048.whatisissue.dpdns.org)

## 🛠️ 技术栈

- **前端**: 原生 HTML + CSS + JavaScript
- **认证**: Firebase Authentication（邮箱密码 + 匿名登录）
- **音效**: Web Audio API
- **部署**: GitHub Pages + Cloudflare

## 📁 项目结构

```
├── index.html          # 页面结构
├── style.css           # 样式
├── script.js           # 游戏逻辑 + 认证 + 音效
├── gin120_ed2-mr-raindrop.mp3  # 背景音乐
└── README.md           # 项目说明
```

## 🚀 本地运行

```bash
python -m http.server 8080
```

浏览器打开 `http://localhost:8080`

## 📄 许可证

MIT
