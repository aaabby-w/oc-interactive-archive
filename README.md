# 未命名档案 / UNTITLED ARCHIVE

一个以原创角色与世界观为核心的互动档案网站。页面以中文内容为主，通过双语排版、主题切换、滚动文字动效、粒子跟随和 Three.js 场景，呈现人物资料、图像与叙事档案。

线上地址：[aaabby-w.github.io/oc-interactive-archive](https://aaabby-w.github.io/oc-interactive-archive/)

## 当前内容

- 沉浸式首页与浅色 / 深色主题
- 数据驱动的人物索引和人物详情页
- 七宁的人物资料、画廊与独立档案页
- 可分别展开的长篇经历和附录章节
- 世界、档案、图像与居所路由骨架
- 桌面端和移动端响应式布局
- 本地托管的 Noto Serif SC 字体，不依赖访客设备字体

## 内容结构

```text
content/characters/
├── registry.ts                 # 人物发布状态、排序与路由登记
├── types.ts                    # 人物内容类型
├── qining.ts                   # 七宁的人物资料与档案入口
└── qining-chapters.ts          # 七宁的独立附录章节

public/images/characters/       # 人物图片资源
app/characters/[slug]/          # 人物页面
app/characters/[slug]/archive/  # 人物档案页面
```

新增人物时，应先建立独立内容记录，再在 `registry.ts` 中登记；可复用页面组件不直接写入角色专属文案。

## 本地运行

环境要求：Node.js `>=22.13.0`、pnpm `11.19.0`。

```bash
pnpm install --frozen-lockfile
pnpm dev
```

常用检查：

```bash
pnpm run lint
pnpm run build:pages
```

## 部署

`main` 分支更新后，GitHub Actions 会执行静态构建，并自动发布到 GitHub Pages。项目配置支持仓库子路径 `/oc-interactive-archive/` 以及页面直达链接。

## 内容与版权

除项目依赖本身的开源许可外，本站角色设定、文字与美术作品不因公开源码而获得再利用授权。未经明确许可，请勿转载、改编、重新分发，或将这些内容用于任何 AI / 机器学习训练与数据集。

画作署名以网站各图像条目中标注的信息为准。
