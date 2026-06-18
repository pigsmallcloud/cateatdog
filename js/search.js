/**
 * cateatdog - 搜索模块
 * 实时全文搜索日记内容
 */

const SearchApp = {
    /** 搜索输入框 */
    input: null,

    /** 搜索结果容器 */
    resultsContainer: null,

    /** 搜索信息容器 */
    infoContainer: null,

    /** 清除按钮 */
    clearBtn: null,

    /** 防抖定时器 */
    debounceTimer: null,

    /**
     * 初始化搜索
     * @param {string} inputId
     * @param {string} resultsId
     * @param {string} infoId
     * @param {string} clearBtnId
     */
    init(inputId, resultsId, infoId, clearBtnId) {
        this.input = document.getElementById(inputId);
        this.resultsContainer = document.getElementById(resultsId);
        this.infoContainer = document.getElementById(infoId);
        this.clearBtn = document.getElementById(clearBtnId);

        if (!this.input || !this.resultsContainer) {
            console.error('Search: 容器元素未找到');
            return;
        }

        // 显示初始状态
        this.resultsContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <h3>搜索你的日记</h3>
        <p>输入关键词搜索标题、内容或标签</p>
      </div>
    `;

        // 绑定输入事件（防抖）
        this.input.addEventListener('input', () => {
            this.handleInput();
        });

        // 绑定清除按钮
        if (this.clearBtn) {
            this.clearBtn.addEventListener('click', () => {
                this.input.value = '';
                this.clearBtn.classList.remove('visible');
                this.infoContainer.textContent = '';
                this.resultsContainer.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">🔍</div>
            <h3>搜索你的日记</h3>
            <p>输入关键词搜索标题、内容或标签</p>
          </div>
        `;
                this.input.focus();
            });
        }

        // 绑定回车
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.performSearch();
            }
        });

        // 从 URL 参数读取初始查询
        const params = new URLSearchParams(window.location.search);
        const q = params.get('q');
        if (q) {
            this.input.value = q;
            if (this.clearBtn) this.clearBtn.classList.add('visible');
            DataStore.ready(() => {
                this.performSearch();
            });
        }
    },

    /**
     * 输入处理（带防抖）
     */
    handleInput() {
        const value = this.input.value.trim();

        if (this.clearBtn) {
            this.clearBtn.classList.toggle('visible', value.length > 0);
        }

        // 清空时重置
        if (!value) {
            this.infoContainer.textContent = '';
            this.resultsContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <h3>搜索你的日记</h3>
          <p>输入关键词搜索标题、内容或标签</p>
        </div>
      `;
            return;
        }

        // 防抖：300ms 后搜索
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            this.performSearch();
        }, 300);
    },

    /**
     * 执行搜索
     */
    performSearch() {
        const query = this.input.value.trim();
        if (!query) return;

        // 确保数据已加载
        if (!DataStore.loaded) {
            DataStore.ready(() => this.performSearch());
            return;
        }

        const results = DataStore.search(query);

        // 更新 URL（不刷新页面）
        const url = new URL(window.location);
        url.searchParams.set('q', query);
        window.history.replaceState({}, '', url);

        // 显示搜索信息
        if (this.infoContainer) {
            if (results.length === 0) {
                this.infoContainer.textContent = `未找到包含 "${query}" 的日记`;
            } else {
                this.infoContainer.textContent = `找到 ${results.length} 篇包含 "${query}" 的日记`;
            }
        }

        // 渲染结果
        this.renderResults(results, query);
    },

    /**
     * 渲染搜索结果
     * @param {Array} results
     * @param {string} query
     */
    renderResults(results, query) {
        if (results.length === 0) {
            this.resultsContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">😿</div>
          <h3>没有找到相关内容</h3>
          <p>试试其他关键词吧</p>
        </div>
      `;
            return;
        }

        let html = '';
        results.forEach((post) => {
            // 高亮匹配词
            const highlightedPreview = this.highlightText(post.matchSnippet || post.preview || '', query);
            const highlightedTitle = this.highlightText(post.title, query);

            const tagsHtml = post.tags
                ? post.tags
                    .map((t) => `<span class="tag">${this.escapeHtml(t)}</span>`)
                    .join('')
                : '';

            html += `
        <div class="search-result-item" data-slug="${this.escapeHtml(post.slug)}">
          <div class="result-title">${highlightedTitle}</div>
          <div class="result-date">📅 ${post.date}</div>
          <div class="result-preview">${highlightedPreview}</div>
          ${tagsHtml ? `<div class="result-tags">${tagsHtml}</div>` : ''}
        </div>
      `;
        });

        this.resultsContainer.innerHTML = html;

        // 绑定点击事件
        this.resultsContainer.querySelectorAll('.search-result-item').forEach((item) => {
            item.addEventListener('click', () => {
                const slug = item.dataset.slug;
                if (slug) {
                    window.location.href = `post.html?slug=${encodeURIComponent(slug)}`;
                }
            });
        });
    },

    /**
     * 高亮文本中的匹配词
     * @param {string} text
     * @param {string} query
     * @returns {string} HTML
     */
    highlightText(text, query) {
        if (!text || !query) return this.escapeHtml(text || '');
        const escaped = this.escapeHtml(text);
        const escapedQuery = this.escapeHtml(query);
        const regex = new RegExp(`(${this.escapeRegex(escapedQuery)})`, 'gi');
        return escaped.replace(regex, '<span class="highlight">$1</span>');
    },

    /**
     * 转义正则表达式特殊字符
     */
    escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
