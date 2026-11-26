# 生平档案维护说明

这是直接发布到 GitHub Pages 的静态站。浏览器不需要 Node、框架或远程翻译服务。

## 当前多语言范围

| 内容 | 中文 | 한국어 | English |
| --- | --- | --- | --- |
| 时间线 | `index.html` | 尚未翻译 | 尚未翻译 |
| 语名索引 | `names.html` | `names.ko.html` | `names.en.html` |
| 考据阅读页 | `research.html` | `research.ko.html` | `research.en.html` |
| 考据内容源 | `research.md` | `research.ko.md` | `research.en.md` |

时间线页脚的“资料语言”链接打开对应语种的索引。时间线正文仍为中文；韩英资料返回时间线时已注明这一点。

## 改布局和导航

- 三种语言的名字索引共用 `names.css`。调整字号、列宽、留白和手机断点只需改这一份。
- 考据页面共用 `research.css` 与 `templates/research.html`。`research*.html` 是生成文件，修改 Markdown 或模板后重新生成。
- `../assets/archive-language.css` 与 `../assets/archive-language.js` 共用语言入口、语言偏好和阅读位置逻辑。明确的语言 URL 优先于保存的偏好；没有 JavaScript 或存储权限时，普通链接仍然可用。
- 版权样式共用 `../assets/copyright.css`。版权区保持为页面控制区之后的独立区块。
- 年份轨道、小人及彩蛋分别由现有独立脚本维护，详见 `CHARACTERS.md`。

## 改考据内容

在仓库根目录使用 Node 20 或更新版本：

```sh
npm ci
npm run build:research
npm run check
```

编辑对应的 `research*.md`，同步三种语言的事实、日期和出处，再生成并一同提交 HTML。网页生成使用锁定版本的 Markdown 解析器。检查会比较生成结果、表格结构、链接顺序、索引事件覆盖和本地锚点，防止译本遗漏记录或链接。

三语考据的 `section-XX`、`record-XXX` 按相同的章节和表格顺序生成，用于切换语言后保持阅读位置。因此新增章节或行时，应同步更新所有语言。检查可以发现结构差异；译文是否准确仍需要人工审核。

## 改名字索引

三份 `names*.html` 的文字是分别维护的。保留原文作品名和 `name-eNNN` 等稳定锚点；新增或纠正条目时同步更新译文，然后运行 `npm run check`。

三语共用样式和导航行为，但尚未共用 HTML 内容模板。更大规模的结构调整仍应检查三种语言的实际页面。

## 改时间线事件

`index.html` 中的可见事件 HTML 仍是实际显示来源。页末的 `#archive` JSON 是资料快照，当前交互脚本没有用它生成页面：**只修改 JSON 不会更新读者看到的记录**。

修改事件时，需要同步可见 HTML、JSON、相关名字索引与三语考据。事件 ID 和既有链接应保持稳定。时间线主体的 CSS 和交互仍有内嵌部分；这次发布没有重写这套结构。

后续若频繁增补事件，应优先建立统一事件数据和页面生成流程，再让这些内容从同一份数据输出。无需为日常样式调整引入前端框架。

## 发布

将生成后的 HTML、内容源及共用资产一起提交到 `main`，由现有 GitHub Pages 发布。发布前运行 `npm run check`，上线后检查时间线页脚、三语互链、事件深链接和手机排版。
