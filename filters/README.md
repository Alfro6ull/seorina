# 滤镜 · 薛仁雅档案

静态目录；使用仓库根目录启动静态服务器，访问 `/filters/`。不需要构建步骤、CDN 或第三方运行时依赖。

## 当前效果

- `tool.html?effect=glass`：长虹玻璃，独立 Canvas 2D 实现竖纹折射，支持棱镜／磨砂与全图／下半幅。
- `studio.html?effect=glitch`：数字故障，横向信号错位、色彩分离与扫描纹理。
- `studio.html?effect=ascii`：字符肖像，以明暗采样生成字符网格。
- `studio.html?effect=particles`：记忆粒子，从原图采样颜色，支持指针扰动；减少动态效果或页面隐藏时暂停动画。
- `studio.html?effect=halftone`：印刷网点，双色网点与纸张底色。

四种实验共用一个轻量编辑器：本地选图／拖放、实时预览、参数调整、原图对比和 PNG 导出。用户图片只在当前浏览器处理，不上传、不写入仓库。导出示例照片时保留署名与许可说明。

## 运行与维护

从仓库根目录运行 `python3 -m http.server 8769`，访问 `http://127.0.0.1:8769/filters/`。所有资源使用相对路径和原生 ES Modules。新增效果优先放在独立渲染模块，并复用编辑器，不复制整套上传／导出逻辑。

默认示例为 K-POPIT 케이팝잇 的《钢铁少女团2》电台上班路画面（图 8），核对 YouTube 原视频为 Creative Commons Attribution，Commons 文件页标 CC BY 4.0。见 `image-rights.html#demo-photo`。其他照片按单图核验，不因公开或可嵌入而搬运。

视觉参考与代码许可记录见 `references.html`；示例图片来源与许可见 `image-rights.html`；代码说明见 `credits.html`。
