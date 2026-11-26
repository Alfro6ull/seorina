# 时间线小人

两个独立角色：年份小人常驻时间线，根据 `annualFigures` 选择造型；彩蛋小人随机出现，完成一次动作后离开。点击年份小人可主动召唤彩蛋，按 Escape 可提前结束；页面不显示彩蛋名称或说明条。

停留时年份小人会轻微呼吸、换重心，大提琴会缓慢运弓，跑步造型会做轻微热身。脚底保持在线上，拖动时自然切到走路。彩蛋首次等待 4–6 秒，之后间隔 20–35 秒随机出现，独立于当前年份。

年份轴支持鼠标按住拖动与手机原生横向滑动。松手后吸附到最近一年并更新内容；原来的点击、左右方向键及 Home/End 仍可使用。拖动结束产生的点击不会误开某个年份。

## 文件

- `seorina-character.js`：共用头部、身体、四肢及 9 个基础姿态。
- `seorina-year-figures.js`：15 种年度造型，覆盖现有 16 个年份。
- `seorina-hobby-figures.js`：16 种兴趣姿态。
- `hero-figures.js`：年份小人的画布、步态及原有横幅光效。
- `hero-easter-eggs.js`：独立彩蛋的进场、动作、退场和随机调度。
- `year-rail-drag.js`：鼠标拖动与原生滚动吸附的协调，触摸保留浏览器自身滑动。
- `characters.html`：组件预览，可切年份、触发彩蛋。

脚本按照上面的核心、年度、兴趣顺序加载，随后加载两个控制器。全部使用原生 Canvas，无字体、图片或第三方运行时依赖。

## 复用姿态

```js
SeorinaCharacter.draw(ctx, {
  mode: 'dog',
  x: 120, y: 90, height: 60,
  facing: 1, phase: 0, moving: 0, action: 0
});

SeorinaYearCharacter.draw(ctx, {
  outfit: 'uniform',
  x: 120, y: 90, height: 60,
  facing: 1, phase: 0, moving: 0, action: 0
});
```

`x/y` 是地面锚点；`height` 是正常站立身高，坐姿、骑车和婴儿保持自然高度。`phase` 控制移动步态，`moving` 是 0–1 的移动幅度，`action` 是一次动作的 0–1 进度。可选的 `idle` 是 0–1 的待机幅度，`idlePhase` 是独立的弧度时钟；宿主当前每 4.4 秒推进一周，默认不传时保持原来的静态画面。绘制函数不启动计时器，不清空宿主画布；宿主负责缩放与设备像素比。

新增造型请复用 `SeorinaCharacter.drawPose(ctx, options, painter => {})` 的头部与肢体方法，不再单独手绘另一套 SVG 身体。代码中形象是风格化插画，不是演员照片描摹。

彩蛋独立于年份。动作与道具用于趣味表现，不表示该兴趣在选中年份发生，也不作为生平事实。既有年表及来源资料保持独立。

系统要求减少动态效果时不自动播放。页面隐藏或小人离屏时暂停待机绘制，恢复后从原位置继续；彩蛋恢复后重新等待，不积压动画。空闲时只更新小人画布，不重复绘制横幅或改动字母样式。

`SeorinaYearRail.attach(viewport, {onStart, onEnd})` 提供 `isInteracting`。宿主在交互期间暂停“130ms 没滚动就选年”的逻辑，`onEnd` 再排选年任务，避免用户按住暂停时轨道突然回跳。
