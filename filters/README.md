# 滤镜 · 薛仁雅档案

静态目录；使用仓库根目录启动静态服务器，访问 `/filters/`。
入口列出「漏光」（Canvas 2D）和「字浪」（WebGL）。两页自动加载同一张有明确许可的本站示例；也可选择或拖放本地图片，输出 PNG。用户文件不离开浏览器。页面不发出业务网络请求，不读取远程图片网址，不使用浏览器持久存储；资源全部随站点发布。禁止连接请求的 CSP 是额外保护。

## 第三方代码

- [Living ASCII](https://github.com/yusen-dev/living-ascii)，Yusen，MIT，见 `vendor/living-ascii/LICENSE.txt`。保留原图分析、光丝、方向和字形 shader；为本地选图替换入口，并添加幅度控制、GPU 资源清理和纹理尺寸保护。未引入示例图片、本地服务或 FFmpeg。
- [Three.js r169](https://github.com/mrdoob/three.js/tree/r169)，MIT，见 `vendor/three/LICENSE.txt`。未修改浏览器构建文件。

本版有字浪实时预览和 PNG 单帧下载。原版的 MP4 编码路径使用本机 Node 服务器；本版没有移植视频导出。

## 示例图片与维护

默认示例是 CNTV 역사극채널 的《Oasis》访谈截图。Wikimedia Commons 附 2023 年的许可复核记录。CC BY 3.0；已重新编码、清除元数据；预览裁切、缩略图及导出标注滤镜改动。参见站内 `image-rights.html#cntv`。授权范围是版权，不等于肖像授权或官方背书。

上一版可用备选：[Ten Asia BVLGARI 活动图](https://commons.wikimedia.org/wiki/File:Seol_In-ah_at_BVLGARI_photo_call_event.jpg)，复核为 CC BY 3.0，本版未收录。杂志、剧照、社媒按单图另查，不因公开或可嵌入而搬运。

开源项目与完整许可证单列在 `credits.html`。示例资源全部本地托管，不由远端热链。

新增五种 Canvas 2D 工具采用同一模板，通过 `tool.html?effect=stretch|glass|glitch|particles|print` 访问；通用参数和导出在 `art-tools.js`。完全本地、无 AI、无新增第三方依赖。故障是图像错位/彩块模拟，不更改 JPEG 字节。
