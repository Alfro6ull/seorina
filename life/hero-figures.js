/* One canvas character family for the year rail and its Easter eggs. */
const seorinaHero = (() => {
'use strict';
const core = window.SeorinaCharacter;
const annual = window.SeorinaYearCharacter;
const hobbies = window.SeorinaHobbyCharacter;

function drawFigure(ctx, options) {
  annual.draw(ctx, {...options, mode: options.outfit});
}

function drawActivity(ctx, options) {
  if (core.modes.some(item => item.id === options.mode) || options.mode === 'cycling') {
    core.draw(ctx, options);
  } else {
    hobbies.draw(ctx, options);
  }
}

function attach(avatar, banner, reduce) {
  if (!core || !annual || !hobbies) return null;
  const actorCanvas = avatar.querySelector('.hero-actor-canvas');
  const lightCanvas = banner.querySelector('.hero-light-canvas');
  const actor = actorCanvas.getContext('2d');
  const lighting = lightCanvas.getContext('2d');
  if (!actor || !lighting) return null;

  const word = banner.querySelector('.hero-word');
  const letters = Array.from(word.children);
  const actionDuration = 1600;
  const sweepDuration = 780;
  const landingDuration = 260;
  const ease = t => t < .5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
  const mix = (a, b, t) => a + (b - a) * t;
  const hump = (value, center, spread) => Math.exp(-Math.pow((value - center) / spread, 2));
  let scene;
  let mode = '';
  let outfit = '';
  let facing = 1;
  let phase = 0;
  let walking = false;
  let actionStart = null;
  let sweepStart = null;
  let sweepDirection = 1;
  let landingStart = null;
  let frame = 0;
  let previousFrame = 0;

  function reactWord(progress, light, shineX) {
    const acting = progress > 0 && progress < 1;
    letters.forEach((letter, index) => {
      let x = 0;
      let y = 0;
      let rotation = 0;
      let scaleX = 1;
      let scaleY = 1;
      if (acting && mode === 'dog') {
        const tug = hump(progress, .36 + (6 - index) * .025, .09);
        const release = hump(progress, .64 + (6 - index) * .018, .13);
        x = (tug * 8 - release * 3) * (.3 + index * .11);
        rotation = (tug * 2 - release) * index / 6;
        scaleX = 1 + tug * .045 * index / 6;
      } else if (acting && mode === 'boxing') {
        const delay = Math.abs(index - 2) * .017;
        const hit = hump(progress, .28 + delay, .035) + hump(progress, .60 + delay, .04);
        const recoil = hump(progress, .37 + delay, .055) + hump(progress, .70 + delay, .07);
        const strength = 1 / (1 + Math.abs(index - 2) * .5);
        x = (hit * 15 - recoil * 5) * strength;
        rotation = (hit * 6 - recoil * 2) * strength;
        scaleX = 1 - hit * .09 * strength;
        scaleY = 1 + hit * .04 * strength;
      } else if (acting && mode === 'cycling') {
        const ride = Math.sin(progress * Math.PI);
        rotation = index === 2 ? 360 * ease(progress) : -1.4 * ride;
        y = index === 2 ? -5 * ride : Math.sin(progress * Math.PI * 2 - index * .55) * ride * 2;
      } else if (acting && mode === 'skate') {
        const jump = hump(progress, .49 + (index - 3) * .022, .095);
        const land = hump(progress, .70 + (index - 3) * .02, .065);
        y = -jump * 13 + land * 3;
        rotation = jump * (index - 3) * .8;
        scaleY = 1 - land * .045;
      }
      letter.style.transformOrigin = mode === 'cycling' && index === 2 ? '50% 50%' : '';
      letter.style.transform = acting ? `translate(${x}px,${y}px) rotate(${rotation}deg) scale(${scaleX},${scaleY})` : '';
      const box = scene.letters[index];
      letter.style.setProperty('--shine-x', `${(shineX - box.left) / Math.max(1, box.width) * 100}%`);
    });
    word.style.setProperty('--shine-alpha', String(light * .8));
  }

  function paintLights(light, shineX, pulse, progress) {
    const {width, height, ground, center, letterTop, letters: boxes} = scene;
    lighting.clearRect(0, 0, width, height);
    if (light > .01) {
      const cone = lighting.createLinearGradient(0, letterTop, 0, ground);
      cone.addColorStop(0, `rgba(119,156,255,${light * .11})`);
      cone.addColorStop(.65, `rgba(119,156,255,${light * .035})`);
      cone.addColorStop(1, `rgba(255,225,80,${light * .13})`);
      lighting.fillStyle = cone;
      lighting.beginPath();
      lighting.moveTo(shineX - 67, letterTop);
      lighting.lineTo(shineX + 77, letterTop);
      lighting.lineTo(center + 20, ground);
      lighting.lineTo(center - 16, ground);
      lighting.closePath();
      lighting.fill();
    }

    if (light > .01 || pulse > .01) {
      lighting.save();
      lighting.translate(center, ground + 1);
      lighting.scale(1, .28);
      const radius = 24 + pulse * 8;
      const glow = lighting.createRadialGradient(0, 0, 1, 0, 0, radius);
      const opacity = Math.max(light, pulse);
      glow.addColorStop(0, `rgba(255,218,52,${.74 * opacity})`);
      glow.addColorStop(.35, `rgba(255,220,62,${.36 * opacity})`);
      glow.addColorStop(1, 'rgba(255,225,80,0)');
      lighting.fillStyle = glow;
      lighting.fillRect(-radius, -radius, radius * 2, radius * 2);
      lighting.restore();
    }

    if (mode === 'cycling' && progress > 0) {
      const o = boxes[2];
      const radius = o.width * .17;
      lighting.save();
      lighting.translate(o.left + o.width * .49, o.top + o.height * .47 - 5 * Math.sin(progress * Math.PI));
      lighting.rotate(phase * .4 + progress * Math.PI * 4);
      lighting.strokeStyle = `rgba(38,40,239,${.46 * Math.sin(progress * Math.PI)})`;
      lighting.lineWidth = 1;
      for (let spoke = 0; spoke < 3; spoke++) {
        lighting.rotate(Math.PI / 3);
        lighting.beginPath();
        lighting.moveTo(-radius, 0);
        lighting.lineTo(radius, 0);
        lighting.stroke();
      }
      lighting.restore();
    }
  }

  function paint(progress = 0, light = 0, travel = .5, pulse = 0, moving = 0) {
    if (!scene) return;
    const shineX = mix(scene.shineFrom, scene.shineTo, travel);
    reactWord(progress, light, shineX);
    paintLights(light, shineX, pulse, progress);
    if (!mode || !scene.actorWidth || !scene.actorHeight) return;

    actor.clearRect(0, 0, scene.actorWidth, scene.actorHeight);
    const x = scene.actorWidth / 2;
    const y = scene.actorHeight * 53 / 56;
    const actorHeight = Math.min(66, y / 1.20);
    if ((mode === 'cycling' || mode === 'skate') && Math.max(moving, light) > .1) {
      actor.save();
      actor.strokeStyle = `rgba(38,40,239,${Math.max(moving, light) * .22})`;
      actor.lineWidth = 1.1;
      for (let line = 0; line < 2; line++) {
        actor.beginPath();
        actor.moveTo(x - facing * (32 + line * 7), y - 10 - line * 7);
        actor.lineTo(x - facing * (43 + line * 11), y - 10 - line * 7);
        actor.stroke();
      }
      actor.restore();
    }
    const options = {x, y, height:actorHeight, phase, moving, facing};
    if (mode === 'figure') drawFigure(actor, {...options, outfit, action:progress});
    else drawActivity(actor, {...options, mode, action:progress});
  }

  function sizeCanvas(canvas, ctx, width, height, ratio) {
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function measure() {
    const heroBox = banner.getBoundingClientRect();
    const avatarBox = avatar.getBoundingClientRect();
    if (!heroBox.width || !avatarBox.height) return;
    const wordBox = word.getBoundingClientRect();
    const actorBox = actorCanvas.getBoundingClientRect();
    const ratio = Math.min(devicePixelRatio || 1, 2);
    const ground = avatarBox.top - heroBox.top + avatarBox.height * 53 / 56;
    const height = Math.ceil(ground + 14);
    const width = heroBox.width;
    const letterTop = wordBox.top - heroBox.top;
    const wordLeft = wordBox.left - heroBox.left;
    const boxes = letters.map(letter => ({
      left: wordLeft + letter.offsetLeft,
      top: letterTop + letter.offsetTop,
      width: letter.offsetWidth,
      height: letter.offsetHeight
    }));
    scene = {
      letters: boxes,
      width, height, ground, letterTop,
      center: avatarBox.left - heroBox.left + avatarBox.width / 2,
      shineFrom: boxes[0].left - 54,
      shineTo: boxes.at(-1).left + boxes.at(-1).width + 54,
      actorWidth: actorBox.width,
      actorHeight: actorBox.height
    };
    lightCanvas.style.height = height + 'px';
    sizeCanvas(lightCanvas, lighting, width, height, ratio);
    if (mode) sizeCanvas(actorCanvas, actor, actorBox.width, actorBox.height, ratio);
    if (!frame) paint();
  }

  function progress(start, now, duration) {
    return start === null ? null : Math.max(0, Math.min(1, (now - start) / duration));
  }

  function tick(now) {
    frame = 0;
    const action = progress(actionStart, now, actionDuration);
    const sweep = progress(sweepStart, now, sweepDuration);
    const landing = progress(landingStart, now, landingDuration) ?? 1;
    const moving = walking ? 1 : 1 - landing;
    previousFrame = now;
    const actionLight = action === null ? 0 : Math.sin(action * Math.PI);
    const sweepLight = sweep === null ? 0 : Math.sin(sweep * Math.PI);
    const pulse = Math.sin(landing * Math.PI);
    const travel = action === null ? ease(sweep ?? .5) : ease(action);
    paint(action ?? 0, Math.max(actionLight, sweepLight, pulse * .65),
      sweepDirection > 0 ? travel : 1 - travel, pulse, moving);
    if (action === 1) actionStart = null;
    if (sweep === 1) sweepStart = null;
    if (landing === 1) landingStart = null;
    if (walking || actionStart !== null || sweepStart !== null || landingStart !== null) queue();
    else {
      previousFrame = 0;
      paint();
    }
  }

  function queue() {
    if (!frame) frame = requestAnimationFrame(tick);
  }

  function replay() {
    if (reduce.matches) return;
    const now = performance.now();
    if (mode && mode !== 'figure') actionStart = now;
    else sweepStart = now;
    queue();
  }

  function show(nextMode, nextOutfit, animate) {
    actionStart = null;
    mode = nextMode || 'idle';
    outfit = nextOutfit;
    if (mode && mode !== 'figure') facing = 1;
    actorCanvas.hidden = !mode;
    avatar.classList.toggle('has-canvas-figure', Boolean(mode));
    measure();
    if (mode && mode !== 'figure' && animate) {
      sweepDirection = 1;
      replay();
    } else if (!frame) {
      paint();
    }
  }

  function walk(distance, advance = true) {
    if (reduce.matches) return;
    const direction = distance < 0 ? -1 : 1;
    if (!walking || direction !== facing) sweepStart = performance.now();
    facing = direction;
    const size = scene ? Math.min(66, scene.actorHeight * 53 / 56 / 1.20) : 60;
    if (advance) phase += Math.abs(Number(distance) || 0) / (.75 * size) * Math.PI * 2;
    sweepDirection = direction;
    walking = true;
    landingStart = null;
    queue();
  }

  function settle() {
    if (walking) landingStart = performance.now();
    walking = false;
    if (landingStart !== null) queue();
    else if (!frame) paint();
  }

  const observer = new ResizeObserver(measure);
  observer.observe(banner);
  observer.observe(avatar);
  reduce.addEventListener('change', () => {
    if (!reduce.matches) return;
    cancelAnimationFrame(frame);
    frame = 0;
    previousFrame = 0;
    actionStart = sweepStart = landingStart = null;
    walking = false;
    paint();
  });
  return {show, walk, settle, replay};
}

return {attach};
})();
