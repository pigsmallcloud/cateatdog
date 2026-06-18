/**
 * cateatdog - 日历模块
 * 年视图 + 月视图，有日记的日期高亮显示
 */

const CalendarApp = {
    /** 当前查看的年份 */
    currentYear: new Date().getFullYear(),

    /** 当前展开的月份（月视图），null 表示未展开 */
    activeMonth: null,

    /** 选中的日期 */
    selectedDate: null,

    /** 容器元素 */
    container: null,

    /** 月份详情容器 */
    detailContainer: null,

    /** 中文月份名 */
    monthNames: [
        '一月', '二月', '三月', '四月', '五月', '六月',
        '七月', '八月', '九月', '十月', '十一月', '十二月',
    ],

    /** 中文星期名 */
    weekDays: ['日', '一', '二', '三', '四', '五', '六'],

    /**
     * 初始化日历
     * @param {string} containerId - 年视图容器 ID
     * @param {string} detailContainerId - 月份详情容器 ID
     */
    init(containerId, detailContainerId) {
        this.container = document.getElementById(containerId);
        this.detailContainer = document.getElementById(detailContainerId);

        if (!this.container) {
            console.error('Calendar: 容器元素未找到:', containerId);
            return;
        }

        // 显示加载
        this.container.innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
        <p>加载日历...</p>
      </div>
    `;

        DataStore.ready(() => {
            this.render();
        });
    },

    /**
     * 渲染年视图
     */
    render() {
        if (!this.container) return;

        const year = this.currentYear;
        const today = new Date();
        const hasPostDates = new Set(
            DataStore.posts.map((p) => p.date)
        );

        // 年视图标题
        let html = `
      <div class="year-view-header">
        <button class="nav-arrow" id="prevYear">‹</button>
        <h2>${year} 年</h2>
        <button class="nav-arrow" id="nextYear">›</button>
      </div>
      <div class="year-grid">
    `;

        // 渲染 12 个月
        for (let m = 0; m < 12; m++) {
            html += this.renderMonth(year, m, today, hasPostDates);
        }

        html += '</div>';
        this.container.innerHTML = html;

        // 绑定事件
        document.getElementById('prevYear').addEventListener('click', () => {
            this.currentYear--;
            this.activeMonth = null;
            this.selectedDate = null;
            if (this.detailContainer) {
                this.detailContainer.classList.remove('active');
                this.detailContainer.innerHTML = '';
            }
            this.render();
        });

        document.getElementById('nextYear').addEventListener('click', () => {
            this.currentYear++;
            this.activeMonth = null;
            this.selectedDate = null;
            if (this.detailContainer) {
                this.detailContainer.classList.remove('active');
                this.detailContainer.innerHTML = '';
            }
            this.render();
        });

        // 绑定日历日期点击
        this.container.querySelectorAll('.calendar-day').forEach((dayEl) => {
            dayEl.addEventListener('click', () => {
                const month = parseInt(dayEl.dataset.month);
                const day = parseInt(dayEl.dataset.day);
                if (!isNaN(month) && !isNaN(day)) {
                    this.showMonthDetail(year, month, day);
                }
            });
        });
    },

    /**
     * 渲染单个月份
     */
    renderMonth(year, month, today, hasPostDates) {
        const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();

        let html = `<div class="month-card">
      <div class="month-card-title">${this.monthNames[month]}</div>
      <div class="calendar-grid">`;

        // 星期行
        this.weekDays.forEach((w) => {
            html += `<div class="calendar-weekday">${w}</div>`;
        });

        // 上个月的填充日期
        for (let i = firstDay - 1; i >= 0; i--) {
            const d = daysInPrevMonth - i;
            html += `<div class="calendar-day other-month">${d}</div>`;
        }

        // 当前月的日期
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isToday =
                year === today.getFullYear() &&
                month === today.getMonth() &&
                d === today.getDate();
            const hasPost = hasPostDates.has(dateStr);

            let cls = 'calendar-day';
            if (isToday) cls += ' today';
            if (hasPost) cls += ' has-post';

            html += `<div class="${cls}" data-month="${month}" data-day="${d}">${d}</div>`;
        }

        // 下个月的填充日期
        const totalCells = firstDay + daysInMonth;
        const remaining = (7 - (totalCells % 7)) % 7;
        for (let d = 1; d <= remaining; d++) {
            html += `<div class="calendar-day other-month">${d}</div>`;
        }

        html += '</div></div>';
        return html;
    },

    /**
     * 显示月份详情和某天的日记列表
     */
    showMonthDetail(year, month, day) {
        if (!this.detailContainer) return;

        this.activeMonth = month;
        this.selectedDate = { year, month, day };

        const posts = DataStore.getByDate(year, month + 1, day);

        // 渲染月份大图
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();
        const hasPostDates = new Set(DataStore.posts.map((p) => p.date));
        const today = new Date();

        let html = `
      <div class="month-view-header">
        <button class="nav-arrow" id="detailPrevMonth">‹</button>
        <h3>${year}年${this.monthNames[month]}</h3>
        <button class="nav-arrow" id="detailNextMonth">›</button>
      </div>
      <div class="calendar-grid">
    `;

        this.weekDays.forEach((w) => {
            html += `<div class="calendar-weekday">${w}</div>`;
        });

        for (let i = firstDay - 1; i >= 0; i--) {
            html += `<div class="calendar-day other-month"></div>`;
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isToday =
                year === today.getFullYear() &&
                month === today.getMonth() &&
                d === today.getDate();
            const hasPost = hasPostDates.has(dateStr);
            const isSelected = d === day;

            let cls = 'calendar-day';
            if (isToday) cls += ' today';
            if (hasPost) cls += ' has-post';
            if (isSelected) cls += ' selected';

            html += `<div class="${cls}" data-detail-day="${d}">${d}</div>`;
        }

        html += '</div>';

        // 该天的日记列表
        if (posts.length > 0) {
            html += `<div class="day-posts">
        <div class="day-posts-title">📖 ${year}年${month + 1}月${day}日 · 共 ${posts.length} 篇</div>
        <div class="day-posts-list">
      `;

            posts.forEach((post) => {
                html += `
          <div class="day-post-item" data-slug="${post.slug}">
            <span class="post-title">${post.title}</span>
          </div>
        `;
            });

            html += '</div></div>';
        } else {
            html += `<div class="day-posts">
        <div class="day-posts-title">📭 ${year}年${month + 1}月${day}日 · 暂无日记</div>
      </div>`;
        }

        html += '</div>';

        this.detailContainer.innerHTML = html;
        this.detailContainer.classList.add('active');

        // 绑定事件
        document.getElementById('detailPrevMonth')?.addEventListener('click', (e) => {
            e.stopPropagation();
            let newMonth = month - 1;
            let newYear = year;
            if (newMonth < 0) {
                newMonth = 11;
                newYear--;
            }
            this.showMonthDetail(newYear, newMonth, 1);
        });

        document.getElementById('detailNextMonth')?.addEventListener('click', (e) => {
            e.stopPropagation();
            let newMonth = month + 1;
            let newYear = year;
            if (newMonth > 11) {
                newMonth = 0;
                newYear++;
            }
            this.showMonthDetail(newYear, newMonth, 1);
        });

        // 点击日期切换
        this.detailContainer.querySelectorAll('[data-detail-day]').forEach((el) => {
            el.addEventListener('click', () => {
                const d = parseInt(el.dataset.detailDay);
                if (!isNaN(d)) {
                    this.showMonthDetail(year, month, d);
                }
            });
        });

        // 点击日记跳转
        this.detailContainer.querySelectorAll('.day-post-item').forEach((item) => {
            item.addEventListener('click', () => {
                const slug = item.dataset.slug;
                if (slug) {
                    window.location.href = `post.html?slug=${encodeURIComponent(slug)}`;
                }
            });
        });
    },
};
