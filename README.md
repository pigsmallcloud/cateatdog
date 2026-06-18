# 🐱 猫吃狗 (cateatdog)

> 个人日记静态网站 · 记录生活，留存时光

一个**朋友圈风格**的个人日记网站，纯静态（HTML/CSS/JS），可托管在 **GitHub Pages** 上。日记内容以 Markdown 格式存储，支持文字、图片、标签、全文搜索和日历浏览。

---

## ✨ 功能特性

| 功能 | 说明 |
|------|------|
| 📝 **朋友圈时间线** | 卡片式布局，图文混排，按时间倒序排列 |
| 📅 **年视图+月视图日历** | 有日记的日期高亮显示，点击可查看当天日记 |
| 🔍 **全文搜索** | 实时搜索标题、内容和标签，关键词高亮 |
| 🏷️ **标签分类** | 每条日记可打标签，支持按标签筛选 |
| 😀 **Emoji 支持** | 完美支持 Emoji 表情 |
| 🖼️ **图片查看器** | 点击图片放大查看 |
| 📱 **响应式设计** | 适配手机、平板和桌面 |
| 🌙 **暗色友好** | 温暖色系设计，阅读舒适 |

---

## 📂 项目结构

```
cateatdog/
├── index.html              # 主页 - 时间线视图
├── calendar.html           # 日历视图
├── post.html               # 单篇日记详情页
├── search.html             # 搜索页面
├── css/
│   └── style.css           # 全局样式
├── js/
│   ├── config.js           # 配置文件
│   ├── data.js             # 数据加载模块
│   ├── timeline.js         # 时间线渲染
│   ├── calendar.js         # 日历渲染
│   ├── post.js             # 日记详情渲染
│   └── search.js           # 搜索功能
├── posts/                  # 📝 日记 Markdown 文件
│   └── YYYY/MM/YYYY-MM-DD-标题.md
├── images/                 # 🖼️ 图片资源
├── data/
│   ├── posts.json          # 🔄 自动生成的索引文件（供 HTTP 方式使用）
│   └── posts.js            # 🔄 自动生成的内联数据（供 file:// 方式使用）
├── scripts/
│   └── generate-index.py   # 🔧 索引生成脚本
└── .github/workflows/
    └── generate-index.yml  # 🤖 GitHub Actions 自动索引
```

---

## 🚀 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/你的用户名/cateatdog.git
cd cateatdog
```

### 2. 写第一篇日记

在 `posts/` 目录下创建 Markdown 文件：

```
posts/2025/06/2025-06-18-你好世界.md
```

### 3. 更新索引

```bash
python scripts/generate-index.py
```

### 4. 提交并推送

```bash
git add .
git commit -m "📝 添加第一篇日记"
git push
```

---

## 📝 如何写日记

### 文件命名规范

```
posts/YYYY/MM/YYYY-MM-DD-标题.md
```

例如：

- `posts/2025/06/2025-06-18-今天去公园散步.md`
- `posts/2025/07/2025-07-01-下半年的第一天.md`

### Markdown 格式

每篇日记包含 **YAML front matter**（元数据）和 **Markdown 正文**：

```markdown
---
title: 今天去公园散步
date: 2025-06-18
tags: [日常, 户外, 摄影]
images:
  - /images/2025/06/park1.jpg
  - /images/2025/06/park2.jpg
---

今天天气很好，去公园散步了...

![公园景色](/images/2025/06/park1.jpg)

遇到了一只可爱的猫咪 🐱
```

### Front Matter 字段

| 字段 | 必填 | 说明 |
|------|------|------|
| `title` | ✅ | 日记标题 |
| `date` | ✅ | 日期 (YYYY-MM-DD) |
| `tags` | ❌ | 标签列表 |
| `images` | ❌ | 图片路径列表 |
| `preview` | ❌ | 自定义摘要（不填则自动提取正文前150字） |

---

## 🖼️ 图片管理

图片放在 `images/` 目录下，建议按年月组织：

```
images/
├── 2025/
│   ├── 06/
│   │   ├── park1.jpg
│   │   └── sunset.jpg
│   └── 07/
│       └── beach.jpg
└── sample/
    └── sunset.jpg
```

在 Markdown 中引用图片：

```markdown
![描述文字](/images/2025/06/park1.jpg)
```

在 front matter 的 `images` 字段中列出（用于时间线卡片展示）：

```yaml
images:
  - /images/2025/06/park1.jpg
  - /images/2025/06/park2.jpg
```

---

## 🌐 部署到 GitHub Pages

### 方式一：手动部署（推荐）

1. **在 GitHub 上创建仓库**，仓库名设为 `cateatdog`
2. 推送代码到 GitHub：

```bash
git remote add origin https://github.com/你的用户名/cateatdog.git
git branch -M main
git push -u origin main
```

1. **启用 GitHub Pages**：
   - 进入仓库 → **Settings** → **Pages**
   - **Source** 选择 **Deploy from a branch**
   - **Branch** 选择 `main`，目录选择 `/ (root)`
   - 点击 **Save**

2. 等待几分钟，你的网站就上线了！🎉
   - 访问地址：`https://你的用户名.github.io/cateatdog/`

### 方式二：使用自定义域名

1. 在仓库 Settings → Pages 中填写自定义域名
2. 在域名的 DNS 设置中添加 CNAME 记录指向 `你的用户名.github.io`
3. 在项目根目录创建 `CNAME` 文件（或通过 Pages 设置自动生成）

---

## 🤖 自动更新索引

项目已配置 GitHub Actions 工作流（`.github/workflows/generate-index.yml`），当 `posts/` 目录下的文件发生变化时，会自动：

1. 运行 `scripts/generate-index.py` 重新生成索引
2. 提交更新后的 `data/posts.json`

这样你只需要关注写日记本身，索引会自动维护。

> ⚠️ **注意**：首次推送后，GitHub Actions 可能需要手动启用。
> 进入仓库的 **Actions** 标签页，如果提示 "Workflows aren't available in this repository yet"，点击 **I understand my workflows, go ahead and enable them**。

---

## 🛠️ 本地预览

由于浏览器的安全策略，直接打开 HTML 文件可能无法加载 `data/posts.json`。推荐使用本地服务器预览：

### Python 方式

```bash
# Python 3
python -m http.server 8080

# 然后访问 http://localhost:8080
```

### Node.js 方式

```bash
# 安装 http-server
npx http-server . -p 8080

# 然后访问 http://localhost:8080
```

### VS Code 方式

安装 **Live Server** 扩展，右键 `index.html` → **Open with Live Server**。

---

## 📋 首次使用检查清单

- [ ] 运行 `python scripts/generate-index.py` 生成索引
- [ ] 在本地用 Live Server 或 `python -m http.server` 预览
- [ ] 确认时间线、日历、搜索功能正常
- [ ] 创建 GitHub 仓库并推送代码
- [ ] 在 GitHub 仓库 Settings → Pages 中启用 Pages
- [ ] （可选）配置自定义域名

---

## ❓ 常见问题

### Q: 修改日记后需要重新生成索引吗？

**需要。** 每次新增、修改或删除 Markdown 文件后，运行 `python scripts/generate-index.py` 更新索引。如果配置了 GitHub Actions，推送后会自动更新。

### Q: 如何修改网站标题和作者名？

编辑 `js/config.js` 文件中的 `CONFIG` 对象即可。

### Q: 网站可以被搜索引擎收录吗？

是的，搜索引擎可以收录静态页面。建议在 GitHub Pages 设置中勾选 "Enforce HTTPS"。

### Q: 支持移动端访问吗？

完全支持！网站采用响应式设计，手机、平板、桌面均可获得良好体验。

---

## 📄 许可证

MIT License

---

<p align="center">用 ❤️ 记录生活</p>
