#!/usr/bin/env python3
"""
cateatdog - 日记索引生成脚本

扫描 posts/ 目录下的 Markdown 文件，提取 front matter 元数据，
生成 data/posts.json 索引文件供前端使用。

用法:
    python scripts/generate-index.py

支持的文件命名格式:
    posts/YYYY/MM/YYYY-MM-DD-标题.md
    posts/YYYY/MM/YYYY-MM-DD-标题-更多文字.md
"""

import os
import re
import json
import sys
from pathlib import Path

# 项目根目录（脚本在 scripts/ 下时）
ROOT_DIR = Path(__file__).resolve().parent.parent
POSTS_DIR = ROOT_DIR / 'posts'
DATA_DIR = ROOT_DIR / 'data'
OUTPUT_FILE = DATA_DIR / 'posts.json'


def parse_front_matter(content):
    """
    解析 YAML front matter (简易解析器)
    返回 (meta_dict, content_body)
    """
    meta = {}
    body = content

    # 匹配 --- 包围的 YAML
    match = re.match(r'^---\n(.*?)\n---\n(.*)', content, re.DOTALL)
    if match:
        yaml_text = match.group(1)
        body = match.group(2)

        current_key = None
        for line in yaml_text.split('\n'):
            # 数组项:   - value
            list_match = re.match(r'^\s+-\s+(.*)', line)
            if list_match and current_key:
                if current_key not in meta:
                    meta[current_key] = []
                if not isinstance(meta[current_key], list):
                    meta[current_key] = [meta[current_key]]
                meta[current_key].append(list_match.group(1).strip().strip('"').strip("'"))
                continue

            # 键值对: key: value
            kv_match = re.match(r'^([a-zA-Z_\u4e00-\u9fff]+):\s*(.*)', line)
            if kv_match:
                current_key = kv_match.group(1)
                value = kv_match.group(2).strip()

                # 空值 - 可能是数组的开始，初始化为空列表
                if not value:
                    meta[current_key] = []
                    continue

                # 数组: [a, b, c]
                if value.startswith('[') and value.endswith(']'):
                    items = value[1:-1].split(',')
                    meta[current_key] = [
                        item.strip().strip('"').strip("'") for item in items if item.strip()
                    ]
                else:
                    # 去除引号
                    value = value.strip('"').strip("'")
                    meta[current_key] = value

    return meta, body


def extract_preview(text, max_length=150):
    """
    从 Markdown 正文提取预览文本
    """
    # 移除 front matter
    text = re.sub(r'^---\n.*?\n---\n', '', text, flags=re.DOTALL)

    # 移除 Markdown 图片标签
    text = re.sub(r'!\[.*?\]\(.*?\)', '', text)

    # 移除 Markdown 链接
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)

    # 移除 Markdown 标题标记
    text = re.sub(r'^#{1,6}\s+', '', text, flags=re.MULTILINE)

    # 移除粗体和斜体
    text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)
    text = re.sub(r'\*(.*?)\*', r'\1', text)

    # 移除代码标记
    text = re.sub(r'`{1,3}[^`]*`{1,3}', '', text)

    # 移除 HTML 标签
    text = re.sub(r'<[^>]+>', '', text)

    # 移除分割线
    text = re.sub(r'^[-*_]{3,}\s*$', '', text, flags=re.MULTILINE)

    # 移除空行和多余空白
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    text = ' '.join(lines)

    # 截取
    if len(text) > max_length:
        text = text[:max_length].rsplit(' ', 1)[0] + '…'

    return text.strip()


def parse_filename(filepath):
    """
    从文件名解析日期和标题
    支持格式: YYYY-MM-DD-标题.md 或 YYYY-MM-DD-标题-更多.md
    """
    stem = filepath.stem  # 不含扩展名

    # 匹配 YYYY-MM-DD-标题
    match = re.match(r'^(\d{4})-(\d{2})-(\d{2})-(.+)$', stem)
    if match:
        year = int(match.group(1))
        month = int(match.group(2))
        day = int(match.group(3))
        title = match.group(4).replace('-', ' ')
        return year, month, day, title

    return None


def scan_posts():
    """
    扫描所有 Markdown 文件，构建索引
    """
    posts = []

    # 遍历 posts/YYYY/MM/ 目录结构
    md_files = list(POSTS_DIR.rglob('*.md'))
    md_files.sort()  # 按文件名排序

    for filepath in md_files:
        # 跳过以 . 开头的文件
        if filepath.name.startswith('.'):
            continue

        # 解析文件名
        parsed = parse_filename(filepath)
        if not parsed:
            print(f'  ⚠ 跳过: 文件名格式不符合规范 - {filepath}', file=sys.stderr)
            continue

        year, month, day, title_from_filename = parsed

        # 读取文件内容
        try:
            content = filepath.read_text(encoding='utf-8')
        except Exception as e:
            print(f'  ⚠ 读取失败: {filepath} - {e}', file=sys.stderr)
            continue

        # 解析 front matter
        meta, body = parse_front_matter(content)

        # 优先使用 front matter 中的标题
        title = meta.get('title', title_from_filename)

        # 构建日期字符串
        date_str = f'{year:04d}-{month:02d}-{day:02d}'

        # 提取预览
        preview = meta.get('preview', '')
        if not preview:
            preview = extract_preview(body)

        # 构建相对路径
        rel_path = filepath.relative_to(ROOT_DIR).as_posix()

        # 构建 slug（唯一标识）
        slug = f'{date_str}-{filepath.stem.split("-", 3)[-1]}' if '-' in filepath.stem else filepath.stem

        # 图片列表（优先从 front matter 获取）
        images = meta.get('images', [])

        # 标签
        tags = meta.get('tags', [])

        post = {
            'slug': slug,
            'title': title,
            'date': date_str,
            'year': year,
            'month': month,
            'day': day,
            'tags': tags if isinstance(tags, list) else [tags] if tags else [],
            'images': images if isinstance(images, list) else [images] if images else [],
            'file': rel_path,
            'preview': preview,
        }

        posts.append(post)
        print(f'  ✓ {date_str} {title}')

    # 按日期倒序排列
    posts.sort(key=lambda p: p['date'], reverse=True)

    return posts


def main():
    print('🔍 扫描日记文件...')
    print(f'   目录: {POSTS_DIR}')

    if not POSTS_DIR.exists():
        print(f'  ✗ posts 目录不存在: {POSTS_DIR}')
        print('  请先在项目根目录下创建 posts/ 目录并放入 Markdown 文件。')
        sys.exit(1)

    posts = scan_posts()

    if not posts:
        print()
        print('  ⚠ 未找到符合格式的 Markdown 文件。')
        print()
        print('  文件命名格式示例:')
        print('    posts/2025/06/2025-06-18-今天去公园散步.md')
        print()
        print('  Markdown 文件格式示例:')
        print('    ---')
        print('    title: 今天去公园散步')
        print('    date: 2025-06-18')
        print('    tags: [日常, 户外]')
        print('    images:')
        print('      - /images/2025/06/park.jpg')
        print('    ---')
        print('    ')
        print('    今天天气真好，去公园散步了...')
        sys.exit(0)

    # 构建输出数据
    output = {
        'generated_at': f'{__import__("datetime").datetime.now().isoformat()}',
        'total': len(posts),
        'posts': posts,
    }

    # 确保 data 目录存在
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    # 写入 JSON（供 fetch 使用）
    OUTPUT_FILE.write_text(
        json.dumps(output, ensure_ascii=False, indent=2),
        encoding='utf-8',
    )

    # 写入 JS（供 file:// 协议下直接加载）
    js_file = DATA_DIR / 'posts.js'
    js_content = f'// 自动生成 - 供 file:// 协议下直接加载\n' \
                 f'window.__POSTS_DATA__ = {json.dumps(posts, ensure_ascii=False, indent=2)};\n'
    js_file.write_text(js_content, encoding='utf-8')

    print()
    print(f'✅ 索引生成完成！')
    print(f'   共 {len(posts)} 篇日记')
    print(f'   📄 JSON: {OUTPUT_FILE}')
    print(f'   📜 JS:   {js_file}')
    print()
    print('💡 提示: 每次新增/修改日记后，记得运行此脚本更新索引。')
    print('   也可以配置 GitHub Actions 自动运行。')


if __name__ == '__main__':
    main()
