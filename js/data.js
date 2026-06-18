/**
 * cateatdog - 数据加载模块
 * 负责加载 posts.json 索引和单个 Markdown 文件
 */

const DataStore = {
    /** 所有日记的元数据索引 */
    posts: [],

    /** 按年月组织的索引 { '2025-06': [post, ...] } */
    byMonth: {},

    /** 所有标签集合 */
    allTags: [],

    /** 数据是否已加载 */
    loaded: false,

    /** 加载回调队列 */
    _callbacks: [],

    /**
     * 加载数据索引
     * 优先尝试 fetch 加载 posts.json；
     * 如果失败（例如 file:// 协议下），尝试使用内联数据；
     * 还失败则显示空状态。
     * @returns {Promise<Array>} posts 数组
     */
    async load() {
        if (this.loaded) return this.posts;

        // 1) 优先检查是否有内联数据（从 <script src="data/posts.js"> 注入）
        if (window.__POSTS_DATA__ && Array.isArray(window.__POSTS_DATA__)) {
            this.posts = window.__POSTS_DATA__;
            this._buildIndex();
            this.loaded = true;
            this._loading = false;
            this._notify();
            return this.posts;
        }

        // 2) 尝试 fetch
        try {
            const resp = await fetch(CONFIG.dataUrl);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const json = await resp.json();
            this.posts = json.posts || [];
            this._buildIndex();
            this.loaded = true;
            this._loading = false;
            this._notify();
            return this.posts;
        } catch (err) {
            console.warn('fetch 加载失败，尝试备用方案:', err);

            // 3) 等待一下再检查内联数据（可能 script 还没加载完）
            try {
                await new Promise((resolve) => setTimeout(resolve, 500));
                if (window.__POSTS_DATA__ && Array.isArray(window.__POSTS_DATA__)) {
                    this.posts = window.__POSTS_DATA__;
                    this._buildIndex();
                    this.loaded = true;
                    this._loading = false;
                    this._notify();
                    return this.posts;
                }
            } catch (_) { /* ignore */ }

            // 4) 全部失败 —— 空状态
            console.error('所有加载方式均失败，显示空状态');
            this.posts = [];
            this.loaded = true;
            this._loading = false;
            this._notify();
            return this.posts;
        }
    },

    /**
     * 构建内部索引
     */
    _buildIndex() {
        // 按年月分组
        this.byMonth = {};
        const tagSet = new Set();

        this.posts.forEach((post) => {
            const key = `${post.year}-${String(post.month).padStart(2, '0')}`;
            if (!this.byMonth[key]) this.byMonth[key] = [];
            this.byMonth[key].push(post);

            // 收集标签
            if (post.tags) {
                post.tags.forEach((t) => tagSet.add(t));
            }
        });

        this.allTags = Array.from(tagSet).sort();
    },

    /**
     * 数据就绪后执行回调
     * @param {Function} callback
     */
    ready(callback) {
        if (this.loaded) {
            callback(this.posts);
        } else {
            this._callbacks.push(callback);
            // 如果没有在加载中，触发加载
            if (!this._loading) {
                this._loading = true;
                this.load();
            }
        }
    },

    _notify() {
        this._callbacks.forEach((cb) => cb(this.posts));
        this._callbacks = [];
    },

    /**
     * 按年月获取日记列表
     * @param {number} year
     * @param {number} month
     * @returns {Array}
     */
    getByMonth(year, month) {
        const key = `${year}-${String(month).padStart(2, '0')}`;
        return this.byMonth[key] || [];
    },

    /**
     * 获取某一天的所有日记
     * @param {number} year
     * @param {number} month
     * @param {number} day
     * @returns {Array}
     */
    getByDate(year, month, day) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return this.posts.filter((p) => p.date === dateStr);
    },

    /**
     * 根据 slug 获取单篇日记
     * @param {string} slug
     * @returns {Object|undefined}
     */
    getBySlug(slug) {
        return this.posts.find((p) => p.slug === slug);
    },

    /**
     * 加载单篇 Markdown 文件内容
     * @param {string} filePath - Markdown 文件路径
     * @returns {Promise<string>}
     */
    async loadMarkdown(filePath) {
        try {
            const resp = await fetch(filePath);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            return await resp.text();
        } catch (err) {
            console.error('加载 Markdown 失败:', err);
            return '# 加载失败\n\n无法加载日记内容。';
        }
    },

    /**
     * 全文搜索
     * @param {string} query - 搜索关键词
     * @returns {Array} 匹配的 posts 数组，每项带 .matches 字段
     */
    search(query) {
        if (!query || !query.trim()) return [];
        const q = query.trim().toLowerCase();

        return this.posts
            .filter((post) => {
                const inTitle = post.title && post.title.toLowerCase().includes(q);
                const inPreview = post.preview && post.preview.toLowerCase().includes(q);
                const inTags =
                    post.tags &&
                    post.tags.some((t) => t.toLowerCase().includes(q));
                return inTitle || inPreview || inTags;
            })
            .map((post) => {
                // 找到匹配片段
                let preview = post.preview || '';
                const idx = preview.toLowerCase().indexOf(q);
                let snippet = '';
                if (idx !== -1) {
                    const start = Math.max(0, idx - 20);
                    const end = Math.min(preview.length, idx + q.length + 40);
                    snippet = (start > 0 ? '…' : '') + preview.slice(start, end) + (end < preview.length ? '…' : '');
                } else {
                    snippet = preview.slice(0, 80) + (preview.length > 80 ? '…' : '');
                }

                return {
                    ...post,
                    matchSnippet: snippet,
                    matchQuery: query,
                };
            });
    },

    /**
     * 按标签筛选
     * @param {string} tag
     * @returns {Array}
     */
    filterByTag(tag) {
        if (!tag) return this.posts;
        return this.posts.filter((p) => p.tags && p.tags.includes(tag));
    },
};
