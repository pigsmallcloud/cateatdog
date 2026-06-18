/**
 * cateatdog - 单篇日记详情模块
 * 负责加载和渲染单篇 Markdown 日记
 */

const PostView = {
    /** 容器元素 */
    container: null,

    /** 当前加载的 slug */
    currentSlug: null,

    /**
     * 初始化
     * @param {string} containerId
     */
    init(containerId) {
        this.container = document.getElementById(containerId);

        if (!this.container) {
            console.error('PostView: 容器元素未找到:', containerId);
            return;
        }

        // 显示加载状态
        this.container.innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
        <p>加载日记...</p>
      </div>
    `;

        // 从 URL 获取 slug
        const params = new URLSearchParams(window.location.search);
        const slug = params.get('slug');

        if (!slug) {
            this.container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <h3>未指定日记</h3>
          <p>请从 <a href="index.html">时间线</a> 选择一篇日记查看</p>
        </div>
      `;
            return;
        }

        this.currentSlug = slug;
        DataStore.ready(() => {
            this.loadPost(slug);
        });
    },

    /**
     * 加载并渲染单篇日记
     * @param {string} slug
     */
    async loadPost(slug) {
        try {
            const post = DataStore.getBySlug(slug);

            if (!post) {
                this.container.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">😿</div>
            <h3>日记未找到</h3>
            <p>这篇日记可能已被删除。</p>
            <p><a href="index.html">← 返回时间线</a></p>
          </div>
        `;
                return;
            }

            // 加载 Markdown 内容
            const markdown = await DataStore.loadMarkdown(post.file);

            // 渲染页面
            this.render(post, markdown);

            // 更新页面标题
            document.title = `${post.title} - ${CONFIG.title}`;

        } catch (err) {
            console.error('加载日记失败:', err);
            this.container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">😿</div>
          <h3>加载失败</h3>
          <p>无法加载日记内容，请稍后重试。</p>
          <p><a href="index.html">← 返回时间线</a></p>
        </div>
      `;
        }
    },

    /**
     * 渲染日记页面
     * @param {Object} post
     * @param {string} markdown
     */
    render(post, markdown) {
        // 解析 YAML front matter
        const { content } = this.parseFrontMatter(markdown);

        // 渲染 Markdown 为 HTML
        const html = this.renderMarkdown(content);

        // 日期格式化
        const dateStr = this.formatDate(post.date);

        // 标签
        const tagsHtml = post.tags
            ? post.tags
                .map((t) => `<span class="tag">${this.escapeHtml(t)}</span>`)
                .join('')
            : '';

        // 构建页面
        const pageHtml = `
      <article class="post-page">
        <a href="index.html" class="back-link">← 返回时间线</a>

        <div class="post-actions">
          <button class="btn btn-sm btn-primary" onclick="Admin.openEditor(DataStore.getBySlug('${this.escapeHtml(post.slug)}'))">
            ✏️ 编辑
          </button>
          <button class="btn btn-sm btn-danger" onclick="Admin.deletePost(DataStore.getBySlug('${this.escapeHtml(post.slug)}'))">
            🗑️ 删除
          </button>
        </div>

        <header class="post-page-header">
          <h1 class="post-page-title">${this.escapeHtml(post.title)}</h1>
          <div class="post-page-meta">
            <span class="meta-item">📅 ${dateStr}</span>
            ${tagsHtml ? `<span class="meta-item">🏷️ ${tagsHtml}</span>` : ''}
          </div>
        </header>

        <div class="markdown-content">
          ${html}
        </div>
      </article>
    `;

        this.container.innerHTML = pageHtml;

        // 渲染后处理：给图片添加点击查看功能
        this.container.querySelectorAll('.markdown-content img').forEach((img) => {
            img.style.cursor = 'pointer';
            img.addEventListener('click', () => {
                ImageViewer.show(img.src);
            });
        });
    },

    /**
     * 解析 YAML front matter
     * @param {string} markdown
     * @returns {{ content: string, meta: Object }}
     */
    parseFrontMatter(markdown) {
        const result = { content: markdown, meta: {} };

        // 检查是否有 front matter (--- 包围的 YAML)
        const match = markdown.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
        if (match) {
            const yamlBlock = match[1];
            result.content = match[2];

            // 简易 YAML 解析（只支持基本键值对和数组）
            const lines = yamlBlock.split('\n');
            let currentKey = null;
            lines.forEach((line) => {
                // 数组项
                if (line.match(/^\s+-\s+/)) {
                    if (currentKey && Array.isArray(result.meta[currentKey])) {
                        result.meta[currentKey].push(line.replace(/^\s+-\s+/, '').trim());
                    }
                    return;
                }

                const kvMatch = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
                if (kvMatch) {
                    currentKey = kvMatch[1];
                    let value = kvMatch[2].trim();

                    // 处理数组开始 (tags: [a, b])
                    if (value.startsWith('[') && value.endsWith(']')) {
                        value = value.slice(1, -1).split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, ''));
                        result.meta[currentKey] = value;
                    } else {
                        // 去除引号
                        value = value.replace(/^['"]|['"]$/g, '');
                        result.meta[currentKey] = value;
                    }
                }
            });
        }

        return result;
    },

    /**
     * 使用 marked 渲染 Markdown
     * @param {string} markdown
     * @returns {string}
     */
    renderMarkdown(markdown) {
        if (typeof marked !== 'undefined') {
            // 配置 marked
            if (marked.setOptions) {
                marked.setOptions({
                    breaks: true,
                    gfm: true,
                });
            }
            return marked.parse(markdown);
        }

        // 降级方案：简单的 Markdown 渲染
        return this.simpleMarkdown(markdown);
    },

    /**
     * 简易 Markdown 渲染器（marked.js 不可用时备用）
     */
    simpleMarkdown(text) {
        let html = text
            // 转义 HTML
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            // 图片
            .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">')
            // 链接
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
            // 粗体
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            // 斜体
            .replace(/\*([^*]+)\*/g, '<em>$1</em>')
            // 换行
            .replace(/\n/g, '<br>');

        return `<p>${html}</p>`;
    },

    /**
     * 格式化日期
     */
    formatDate(dateStr) {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long',
        });
    },

    /**
     * HTML 转义
     */
    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },
};
