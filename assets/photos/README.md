# 全站图片素材库

此目录不是浏览页面。`library.json` 是唯一公开用途清单，`files/` 放原图，`depth/` 放 MUSE 深度图。路径相对清单，不依赖 GitHub Pages 的部署目录。原始来源、署名、授权状态、图片校验值都跟随稳定 ID。

- 滤镜不发布默认照片，仅由访客从本机选图。
- `photosFor(rows, 'muse')` 供 MUSE 取该展项的序列。以前已经上架的六张照片标记为 `existing-muse-only`，不视作获得转载或二改许可，也不能自动用于其他页面。
- 新可复用素材须有具体授权：`license-documented` 带许可证名及链接，或 `permission-documented` 带不含敏感信息的授权记录编号；`uses` 只填写实际被许可的用途。
- 待审 IG、品牌照、杂志、剧宣，以及未获授权的文件留在仓库外。只隐去链接不算私有，GitHub Pages 仍会公开仓库内的资产。原始照片、滤镜封面等衍生物的出处应标明。
- 私人素材总表（`私人素材库.json`）与本机留档在站点仓库旁的「薛仁雅 IG 私人来源台账」。稳定 ID 格式为 `ig-贴文短码-轮播序号`，既有 MUSE 的 `archivePhotoId` 可与之对应。完整存档不等于公开许可。

批量维护已有明确许可的本地图片：CSV 列为
`filename,id,title,source,date,tags,publish,rights,uses,license_name,license_url,permission_reference`，
选填 `depth_filename,depth_src,depth_model,depth_type,depth_direction`。只导入
`publish=true` 且有许可记录的行。标签以 `|` 分隔，分别提供允许的用途。
原文件存放于 `--source`；`depth_src` 必须相对于共享清单，不允许外链。

```sh
python3 muse/tools/index-library.py --source /path/to/local/photos --csv /path/to/reviewed.csv
node tools/check-photo-library.mjs
```
