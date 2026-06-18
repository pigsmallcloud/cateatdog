/**
 * cateatdog - 时间线模块（朋友圈风格）
 * 负责渲染首页的日记卡片列表
 */

const Timeline = {
    /** 当前激活的标签筛选 */
    activeTag: null,

    /** 容器元素 */
    container: null,

    /** 标签筛选容器 */
    tagsContainer: null,

    /**
     * 初始化时间线
     * @param {string} containerId - 容器元素 ID
     * @param {string} tagsContainerId - 标签筛选容器 ID（可选）
     */
    init(containerId, tagsContainerId) {
        this.container = document.getElementById(containerId);
        this.tagsContainer = document.getElementById(tagsContainerId);

        if (!this.container) {
            console.error('Timeline: 容器元素未找到:', containerId);
            return;
        }

        // 显示加载状态
        this.container.innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
        <p>加载日记中...</p>
      </div>
    `;

        DataStore.ready((posts) => {
            this.renderTags();
            this.render(posts);
        });
    },

    /**
     * 渲染标签筛选栏
     */
    renderTags() {
        if (!this.tagsContainer) return;

        if (DataStore.allTags.length === 0) {
            this.tagsContainer.style.display = 'none';
            return;
        }

        let html = `<button class="tag-filter-btn ${this.activeTag === null ? 'active' : ''
            }" data-tag="">全部</button>`;

        DataStore.allTags.forEach((tag) => {
            html += `<button class="tag-filter-btn ${this.activeTag === tag ? 'active' : ''
                }" data-tag="${this.escapeHtml(tag)}">${this.escapeHtml(tag)}</button>`;
        });

        this.tagsContainer.innerHTML = html;
        this.tagsContainer.style.display = 'flex';

        // 绑定事件
        this.tagsContainer.querySelectorAll('.tag-filter-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                const tag = btn.dataset.tag;
                this.activeTag = tag || null;
                this.renderTags();
                this.render();
            });
        });
    },

    /**
     * 渲染日记列表
     * @param {Array} posts - 可选，不传则用 DataStore.posts
     */
    render(posts) {
        if (!this.container) return;

        const source = posts || DataStore.posts;
        let filtered = source;

        // 按标签筛选
        if (this.activeTag) {
            filtered = DataStore.filterByTag(this.activeTag);
        }

        // 按日期倒序
        const sorted = [...filtered].sort(
            (a, b) => new Date(b.date) - new Date(a.date)
        );

        if (sorted.length === 0) {
            this.container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📝</div>
          <h3>还没有日记</h3>
          <p>在 posts 目录下创建 Markdown 文件来开始记录吧</p>
        </div>
      `;
            return;
        }

        let html = '<div class="timeline">';
        let currentDate = null;

        sorted.forEach((post, idx) => {
            // 日期分隔线
            const postDate = this.formatDateLabel(post.date);
            if (postDate !== currentDate) {
                currentDate = postDate;
                if (idx > 0) {
                    // 不是第一个分组，不需要额外操作
                }
            }

            html += this.renderCard(post);
        });

        html += '</div>';
        this.container.innerHTML = html;

        // 绑定点击事件
        this.container.querySelectorAll('.post-card').forEach((card) => {
            card.addEventListener('click', () => {
                const slug = card.dataset.slug;
                if (slug) {
                    window.location.href = `post.html?slug=${encodeURIComponent(slug)}`;
                }
            });
        });

        // 图片点击查看大图
        this.container.querySelectorAll('.post-card-images img').forEach((img) => {
            img.addEventListener('click', (e) => {
                e.stopPropagation();
                ImageViewer.show(img.src);
            });
        });

        // 标签点击筛选
        this.container.querySelectorAll('.tag').forEach((tagEl) => {
            tagEl.addEventListener('click', (e) => {
                e.stopPropagation();
                const tag = tagEl.dataset.tag;
                if (tag) {
                    this.activeTag = tag;
                    this.renderTags();
                    this.render();
                    // 滚动到顶部
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        });
    },

    /**
     * 渲染单张日记卡片
     * @param {Object} post
     * @returns {string} HTML
     */
    renderCard(post) {
        const hasImages = post.images && post.images.length > 0;
        const imageCount = hasImages ? post.images.length : 0;

        let imagesClass = 'post-card-images';
        if (imageCount === 1) imagesClass += ' single';
        else if (imageCount === 2) imagesClass += ' two';
        else if (imageCount === 4) imagesClass += ' four';

        let imagesHtml = '';
        if (hasImages) {
            imagesHtml = `<div class="${imagesClass}">`;
            // 最多显示9张
            const maxImages = Math.min(post.images.length, 9);
            for (let i = 0; i < maxImages; i++) {
                imagesHtml += `<img src="${this.escapeHtml(post.images[i])}" alt="日记图片" loading="lazy">`;
            }
            imagesHtml += '</div>';
        }

        const tagsHtml = post.tags
            ? post.tags
                .map(
                    (t) =>
                        `<span class="tag" data-tag="${this.escapeHtml(t)}">${this.escapeHtml(t)}</span>`
                )
                .join('')
            : '';

        const preview = post.preview || '';
        const timeStr = this.formatTime(post.date);

        return `
      <div class="post-card" data-slug="${this.escapeHtml(post.slug)}">
        <div class="post-card-header">
          <div class="post-card-avatar">${CONFIG.avatar}</div>
          <div>
            <div class="post-card-author">${this.escapeHtml(CONFIG.author)}</div>
            <div class="post-card-time">${timeStr}</div>
          </div>
        </div>
        <div class="post-card-tags">${tagsHtml}</div>
        <div class="post-card-title">${this.escapeHtml(post.title)}</div>
        <div class="post-card-preview">${this.escapeHtml(preview)}</div>
        ${imagesHtml}
        <div class="post-card-footer">
          <span>💬 查看详情</span>
          <div class="post-card-actions">
            <span class="post-card-action">❤️ ${Math.floor(Math.random() * 10)}</span>
          </div>
        </div>
      </div>
    `;
    },

    /**
     * 格式化日期标签
     */
    formatDateLabel(dateStr) {
        const d = new Date(dateStr + 'T00:00:00');
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const diff = Math.round((today - d) / (1000 * 60 * 60 * 24));

        if (diff === 0) return '今天';
        if (diff === 1) return '昨天';
        if (diff === 2) return '前天';

        return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
    },

    /**
     * 格式化时间显示
     */
    formatTime(dateStr) {
        const d = new Date(dateStr + 'T00:00:00');
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const diff = Math.round((today - d) / (1000 * 60 * 60 * 24));

        if (diff === 0) return '今天';
        if (diff === 1) return '昨天';

        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}年${m}月${day}日`;
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

/**
 * 图片查看器
 */
const ImageViewer = {
    viewer: null,
    img: null,

    init() {
        this.viewer = document.getElementById('imageViewer');
        this.img = this.viewer?.querySelector('img');
        if (!this.viewer) {
            // 动态创建
            this.viewer = document.createElement('div');
            this.viewer.id = 'imageViewer';
            this.viewer.className = 'image-viewer';
            this.viewer.innerHTML = `
        <button class="close-btn" id="imageViewerClose">✕</button>
        <img src="" alt="查看图片">
      `;
            document.body.appendChild(this.viewer);
            this.img = this.viewer.querySelector('img');
        }

        // 关闭事件
        this.viewer.addEventListener('click', (e) => {
            if (e.target === this.viewer || e.target.id === 'imageViewerClose') {
                this.hide();
            }
        });

        // ESC 键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.hide();
        });
    },

    show(src) {
        if (!this.viewer) this.init();
        this.img.src = src;
        this.viewer.classList.add('active');
        document.body.style.overflow = 'hidden';
    },

    hide() {
        if (!this.viewer) return;
        this.viewer.classList.remove('active');
        document.body.style.overflow = '';
    },
};
