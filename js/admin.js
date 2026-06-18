/**
 * cateatdog - 在线日记管理模块
 * 通过 GitHub API 直接在网页上创建/编辑/删除日记
 *
 * 使用前需要在设置中配置：
 * 1. GitHub 用户名
 * 2. 仓库名
 * 3. Personal Access Token (需要有 repo 或 public_repo 权限)
 *    → 在 https://github.com/settings/tokens 创建
 */

const Admin = {
  /** 当前编辑模式: 'new' 或 'edit' */
  mode: 'new',

  /** 正在编辑的日记 slug（编辑模式时） */
  editSlug: null,

  /** 正在编辑的日记原始内容（编辑模式时） */
  editOriginalContent: null,

  /** 是否已初始化 */
  _initialized: false,

  /**
   * 初始化管理模块
   */
  init() {
    if (this._initialized) return;
    this._initialized = true;

    // 从 localStorage 加载 GitHub 设置
    this._loadSettings();

    // 注入设置和编辑器的 HTML
    this._injectSettingsDialog();
    this._injectEditorModal();
  },

  // ==========================================
  //  设置管理
  // ==========================================

  /** 默认设置 */
  _defaults: {
    token: '',
    owner: '',
    repo: '',
    branch: 'main',
  },

  _loadSettings() {
    try {
      const saved = localStorage.getItem('cateatdog_github');
      if (saved) {
        Object.assign(this._defaults, JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Admin: 读取设置失败', e);
    }
  },

  _saveSettings() {
    try {
      localStorage.setItem('cateatdog_github', JSON.stringify(this._defaults));
    } catch (e) {
      console.warn('Admin: 保存设置失败', e);
    }
  },

  /** 检查是否已配置 GitHub */
  isConfigured() {
    return !!(this._defaults.token && this._defaults.owner && this._defaults.repo);
  },

  /**
   * 打开设置对话框
   */
  showSettings() {
    const dlg = document.getElementById('adminSettings');
    if (!dlg) return;

    document.getElementById('settingsToken').value = this._defaults.token;
    document.getElementById('settingsOwner').value = this._defaults.owner;
    document.getElementById('settingsRepo').value = this._defaults.repo;
    document.getElementById('settingsBranch').value = this._defaults.branch;

    dlg.classList.add('active');
  },

  /** 保存设置 */
  _onSaveSettings() {
    this._defaults.token = document.getElementById('settingsToken').value.trim();
    this._defaults.owner = document.getElementById('settingsOwner').value.trim();
    this._defaults.repo = document.getElementById('settingsRepo').value.trim();
    this._defaults.branch = document.getElementById('settingsBranch').value.trim() || 'main';

    if (!this._defaults.token || !this._defaults.owner || !this._defaults.repo) {
      this._showToast('请填写完整的 GitHub 配置信息', 'error');
      return;
    }

    this._saveSettings();
    this._closeSettings();
    this._showToast('✅ 设置已保存', 'success');
  },

  _closeSettings() {
    document.getElementById('adminSettings')?.classList.remove('active');
  },

  // ==========================================
  //  GitHub API
  // ==========================================

  _apiHeaders() {
    return {
      'Authorization': `Bearer ${this._defaults.token}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
    };
  },

  _apiBase() {
    return `https://api.github.com/repos/${this._defaults.owner}/${this._defaults.repo}`;
  },

  /**
   * 调用 GitHub API
   */
  async _apiRequest(method, path, body) {
    const url = `${this._apiBase()}${path}`;
    const opts = {
      method,
      headers: this._apiHeaders(),
    };
    if (body) opts.body = JSON.stringify(body);

    const resp = await fetch(url, opts);
    const data = await resp.json();

    if (!resp.ok) {
      throw new Error(data.message || `HTTP ${resp.status}`);
    }
    return data;
  },

  /**
   * 获取文件的 SHA（更新文件时需要）
   */
  async _getFileSha(path) {
    try {
      const data = await this._apiRequest('GET', `/contents/${path}?ref=${this._defaults.branch}`);
      return data.sha;
    } catch (e) {
      return null; // 文件不存在
    }
  },

  /**
   * 提交文件到 GitHub
   * @param {string} path - 文件路径，如 posts/2026/06/2026-06-18-标题.md
   * @param {string} content - 文件内容
   * @param {string} message - commit 信息
   */
  async _commitFile(path, content, message) {
    const existingSha = await this._getFileSha(path);
    const encoded = btoa(unescape(encodeURIComponent(content))); // UTF-8 base64

    const body = {
      message,
      content: encoded,
      branch: this._defaults.branch,
    };
    if (existingSha) body.sha = existingSha;

    return this._apiRequest('PUT', `/contents/${path}`, body);
  },

  /**
   * 触发 GitHub Actions 工作流
   */
  async _triggerWorkflow() {
    try {
      const workflowId = 'generate-index.yml';
      await this._apiRequest('POST', `/actions/workflows/${workflowId}/dispatches`, {
        ref: this._defaults.branch,
      });
    } catch (e) {
      console.warn('Admin: 触发工作流失败（可手动推送）', e);
    }
  },

  // ==========================================
  //  日记编辑器
  // ==========================================

  /**
   * 打开写日记 / 编辑日记
   * @param {Object|null} post - null=写新日记, 有值=编辑
   */
  async openEditor(post) {
    // 检查是否已配置 GitHub
    if (!this.isConfigured()) {
      this.showSettings();
      return;
    }

    const modal = document.getElementById('adminEditor');
    if (!modal) return;

    this.mode = post ? 'edit' : 'new';
    this.editSlug = post ? post.slug : null;

    // 设置标题
    document.getElementById('editorTitle').textContent = post ? '✏️ 编辑日记' : '✏️ 写新日记';
    document.getElementById('editorSubmitBtn').textContent = post ? '保存修改' : '发布日记';

    // 填充表单
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    if (post) {
      // 编辑模式：加载现有内容
      document.getElementById('editorTitleInput').value = post.title || '';
      document.getElementById('editorDate').value = post.date || dateStr;
      document.getElementById('editorTags').value = (post.tags || []).join(', ');

      // 加载 Markdown 原文
      try {
        const md = await DataStore.loadMarkdown(post.file);
        // 去掉 front matter
        const bodyMatch = md.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
        document.getElementById('editorContent').value = bodyMatch ? bodyMatch[1].trim() : md;
        this.editOriginalContent = md;
      } catch (e) {
        document.getElementById('editorContent').value = '';
        this.editOriginalContent = null;
      }

      document.getElementById('editorImages').value = (post.images || []).join('\n');
    } else {
      // 新建模式
      document.getElementById('editorTitleInput').value = '';
      document.getElementById('editorDate').value = dateStr;
      document.getElementById('editorTags').value = '';
      document.getElementById('editorContent').value = '';
      document.getElementById('editorImages').value = '';
      this.editOriginalContent = null;
    }

    modal.classList.add('active');
    document.getElementById('editorTitleInput').focus();
  },

  /** 关闭编辑器 */
  closeEditor() {
    document.getElementById('adminEditor')?.classList.remove('active');
    this.editSlug = null;
    this.editOriginalContent = null;
  },

  /**
   * 保存日记
   */
  async _onSaveDiary() {
    const title = document.getElementById('editorTitleInput').value.trim();
    const date = document.getElementById('editorDate').value.trim();
    const tagsRaw = document.getElementById('editorTags').value.trim();
    const content = document.getElementById('editorContent').value.trim();
    const imagesRaw = document.getElementById('editorImages').value.trim();

    // 验证
    if (!title) { this._showToast('请输入日记标题', 'error'); return; }
    if (!date) { this._showToast('请选择日期', 'error'); return; }
    if (!content) { this._showToast('请输入日记内容', 'error'); return; }

    if (!this._defaults.token || !this._defaults.owner || !this._defaults.repo) {
      this._showToast('请先在设置中配置 GitHub', 'error');
      this.closeEditor();
      this.showSettings();
      return;
    }

    // 解析标签
    const tags = tagsRaw
      ? tagsRaw.split(/[,，、]/).map(s => s.trim()).filter(Boolean)
      : [];

    // 解析图片
    const images = imagesRaw
      ? imagesRaw.split('\n').map(s => s.trim()).filter(Boolean)
      : [];

    // 构建 Markdown 内容
    let md = '---\n';
    md += `title: ${title}\n`;
    md += `date: ${date}\n`;
    if (tags.length > 0) {
      md += `tags: [${tags.map(t => `"${t}"`).join(', ')}]\n`;
    }
    if (images.length > 0) {
      md += 'images:\n';
      images.forEach(img => { md += `  - ${img}\n`; });
    }
    md += '---\n\n';
    md += content;
    if (!content.endsWith('\n')) md += '\n';

    // 构建文件路径
    const dateObj = new Date(date + 'T00:00:00');
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');

    // 从标题生成 slug（只保留字母数字中文和横线）
    const slugTitle = title
      .replace(/[^\u4e00-\u9fff\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'untitled';

    const fileName = `${date}-${slugTitle}.md`;
    const filePath = `posts/${year}/${month}/${fileName}`;

    // 构建 commit 信息
    const commitMsg = this.mode === 'edit'
      ? `📝 编辑日记: ${title}`
      : `📝 新增日记: ${title}`;

    // 显示保存中状态
    const btn = document.getElementById('editorSubmitBtn');
    const originalText = btn.textContent;
    btn.textContent = '⏳ 保存中...';
    btn.disabled = true;

    try {
      // 提交到 GitHub
      await this._commitFile(filePath, md, commitMsg);

      // 触发 Actions 重新生成索引
      await this._triggerWorkflow();

      this._showToast(`✅ 日记已${this.mode === 'edit' ? '更新' : '发布'}！请等待索引更新...`, 'success');
      this.closeEditor();

      // 如果是在详情页编辑，等一会儿刷新
      if (this.mode === 'edit' && window.location.pathname.includes('post.html')) {
        setTimeout(() => window.location.reload(), 2000);
      }
    } catch (e) {
      console.error('Admin: 保存失败', e);
      this._showToast(`❌ 保存失败: ${e.message}`, 'error');
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  },

  // ==========================================
  //  图片上传
  // ==========================================

  /**
   * 打开图片上传对话框
   */
  showImageUploader() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = false;

    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (!this.isConfigured()) {
        this._showToast('请先在设置中配置 GitHub', 'error');
        this.showSettings();
        return;
      }

      // 验证文件大小（限制 10MB）
      if (file.size > 10 * 1024 * 1024) {
        this._showToast('图片不能超过 10MB', 'error');
        return;
      }

      this._showToast('⏫ 上传中...', 'info');

      try {
        const url = await this._uploadImage(file);
        // 将图片链接插入到内容编辑器中
        const textarea = document.getElementById('editorContent');
        const cursorPos = textarea.selectionStart;
        const imgMd = `![${file.name}](${url})`;
        textarea.value = textarea.value.slice(0, cursorPos) + imgMd + '\n' + textarea.value.slice(cursorPos);

        // 也添加到图片列表
        const imgInput = document.getElementById('editorImages');
        imgInput.value = imgInput.value ? imgInput.value + '\n' + url : url;

        this._showToast('✅ 图片已上传并插入', 'success');
      } catch (e) {
        console.error('Admin: 上传失败', e);
        this._showToast(`❌ 上传失败: ${e.message}`, 'error');
      }
    };

    input.click();
  },

  /**
   * 上传图片到 GitHub 仓库
   * @param {File} file
   * @returns {Promise<string>} 图片 URL
   */
  async _uploadImage(file) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    // 生成唯一文件名
    const ext = file.name.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    const imageName = `${timestamp}.${ext}`;
    const path = `images/${year}/${month}/${imageName}`;

    // 读取文件为 base64
    const base64 = await this._fileToBase64(file);

    const body = {
      message: `🖼️ 上传图片: ${imageName}`,
      content: base64.split(',')[1], // 去掉 data:image/...;base64, 前缀
      branch: this._defaults.branch,
    };

    await this._apiRequest('PUT', `/contents/${path}`, body);

    // 返回原始文件 URL（GitHub raw）
    return `https://raw.githubusercontent.com/${this._defaults.owner}/${this._defaults.repo}/${this._defaults.branch}/${path}`;
  },

  /**
   * File → Base64
   */
  _fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  // ==========================================
  //  删除日记
  // ==========================================

  /**
   * 删除日记
   * @param {Object} post
   */
  async deletePost(post) {
    if (!post || !post.file) return;

    if (!confirm(`确定要删除「${post.title}」吗？此操作不可撤销。`)) return;

    if (!this.isConfigured()) {
      this._showToast('请先在设置中配置 GitHub', 'error');
      this.showSettings();
      return;
    }

    try {
      const sha = await this._getFileSha(post.file);
      if (!sha) throw new Error('文件不存在');

      await this._apiRequest('DELETE', `/contents/${post.file}`, {
        message: `🗑️ 删除日记: ${post.title}`,
        sha,
        branch: this._defaults.branch,
      });

      await this._triggerWorkflow();
      this._showToast('✅ 日记已删除', 'success');

      // 跳转到首页
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1500);
    } catch (e) {
      console.error('Admin: 删除失败', e);
      this._showToast(`❌ 删除失败: ${e.message}`, 'error');
    }
  },

  // ==========================================
  //  UI 注入
  // ==========================================

  /** 注入设置对话框 HTML */
  _injectSettingsDialog() {
    if (document.getElementById('adminSettings')) return;

    const html = `
      <div id="adminSettings" class="modal-overlay">
        <div class="modal-dialog settings-dialog">
          <div class="modal-header">
            <h3>⚙️ GitHub 设置</h3>
            <button class="modal-close" onclick="Admin._closeSettings()">✕</button>
          </div>
          <div class="modal-body">
            <p class="settings-help">
              需要 GitHub Personal Access Token 才能在线写日记。
              <a href="https://github.com/settings/tokens" target="_blank">创建 Token →</a>
              需要 <strong>repo</strong> 或 <strong>public_repo</strong> 权限。
            </p>
            <div class="form-group">
              <label>GitHub Token</label>
              <input type="password" id="settingsToken" placeholder="ghp_xxxxxxxxxxxx" />
            </div>
            <div class="form-group">
              <label>仓库所有者（用户名）</label>
              <input type="text" id="settingsOwner" placeholder="your-username" />
            </div>
            <div class="form-group">
              <label>仓库名称</label>
              <input type="text" id="settingsRepo" placeholder="cateatdog" />
            </div>
            <div class="form-group">
              <label>分支</label>
              <input type="text" id="settingsBranch" placeholder="main" value="main" />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="Admin._closeSettings()">取消</button>
            <button class="btn btn-primary" onclick="Admin._onSaveSettings()">保存</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
  },

  /** 注入编辑器模态框 HTML */
  _injectEditorModal() {
    if (document.getElementById('adminEditor')) return;

    const html = `
      <div id="adminEditor" class="modal-overlay">
        <div class="modal-dialog editor-dialog">
          <div class="modal-header">
            <h3 id="editorTitle">✏️ 写新日记</h3>
            <button class="modal-close" onclick="Admin.closeEditor()">✕</button>
          </div>
          <div class="modal-body editor-body">
            <div class="form-row">
              <div class="form-group flex-grow">
                <label>标题</label>
                <input type="text" id="editorTitleInput" placeholder="日记标题..." />
              </div>
              <div class="form-group form-group-date">
                <label>日期</label>
                <input type="date" id="editorDate" />
              </div>
            </div>

            <div class="form-group">
              <label>标签（用逗号分隔）</label>
              <input type="text" id="editorTags" placeholder="日常, 随笔, 旅行..." />
            </div>

            <div class="form-group">
              <label>
                内容（支持 Markdown 语法）
                <button class="btn btn-sm btn-upload" onclick="Admin.showImageUploader()" title="上传图片">🖼️ 插入图片</button>
              </label>
              <textarea id="editorContent" rows="12" placeholder="在这里写日记..."></textarea>
            </div>

            <div class="form-group">
              <label>图片链接（一行一个）</label>
              <textarea id="editorImages" rows="2" placeholder="/images/2026/06/photo.jpg"></textarea>
            </div>

            <details class="editor-preview-toggle">
              <summary>📖 预览</summary>
              <div id="editorPreview" class="editor-preview markdown-content"></div>
            </details>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="Admin.closeEditor()">取消</button>
            <button class="btn btn-danger" id="editorDeleteBtn" style="display:none" onclick="Admin._onDeletePost()">🗑️ 删除</button>
            <button class="btn btn-primary" id="editorSubmitBtn" onclick="Admin._onSaveDiary()">发布日记</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
  },

  // ==========================================
  //  Toast 提示
  // ==========================================

  _showToast(message, type) {
    let toast = document.getElementById('adminToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'adminToast';
      toast.className = 'admin-toast';
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.className = 'admin-toast show';
    if (type === 'error') toast.classList.add('toast-error');
    else if (type === 'success') toast.classList.add('toast-success');

    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => {
      toast.classList.remove('show', 'toast-error', 'toast-success');
    }, 4000);
  },
};

// ==========================================
//  删除确认（独立函数，避免闭包问题）
// ==========================================
Admin._onDeletePost = function () {
  if (!Admin.editSlug) return;
  const post = DataStore.getBySlug(Admin.editSlug);
  if (post) {
    Admin.closeEditor();
    Admin.deletePost(post);
  }
};
