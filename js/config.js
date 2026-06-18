/**
 * cateatdog - 配置文件
 * 修改此文件来自定义您的日记网站
 */
const CONFIG = {
    // 网站标题
    title: '猫吃狗',

    // 网站副标题 / 描述
    description: '记录生活，留存时光',

    // 作者名称（显示在日记卡片上）
    author: 'Pengo',

    // 作者头像（emoji 或图片路径）
    // 可以是 emoji，也可以是 /images/avatar.jpg 这样的路径
    avatar: '🐱',

    // 数据文件路径（由 generate-index.py 生成）
    dataUrl: 'data/posts.json',

    // 日记文件所在的根目录
    postsDir: 'posts',

    // 日期格式
    dateFormat: {
        locale: 'zh-CN',
        options: {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long',
        },
    },

    // 首页每页显示多少条日记（分页用，暂未实现）
    pageSize: 20,

    // 导航菜单
    nav: [
        { id: 'timeline', label: '时间线', icon: '📝', href: 'index.html' },
        { id: 'calendar', label: '日历', icon: '📅', href: 'calendar.html' },
        { id: 'search', label: '搜索', icon: '🔍', href: 'search.html' },
    ],
};
