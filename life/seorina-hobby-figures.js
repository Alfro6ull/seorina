/*
 * Companion poses for SeorinaCharacter. Load seorina-character.js first.
 * Small stylised illustrations, not traced portraits or records of an event.
 * No DOM, assets, animation timer or network. All canvas state is restored.
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./seorina-character.js'));
  else root.SeorinaHobbyCharacter = factory(root.SeorinaCharacter);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Character) {
  'use strict';

  const modes = Object.freeze({
    guitar: '弹吉他', piano: '弹钢琴', listen: '听歌', puzzle: '拼拼图',
    gaming: '打游戏', write: '摘抄', watch: '看影视', travel: '旅行',
    eat: '吃饭', relax: '独处', heart: '爱心', martial: '柔术',
    ice: '速滑', retro: '复古', monochrome: '黑白', navy: '海军蓝'
  });
  const finite = (v, fallback) => Number.isFinite(Number(v)) ? Number(v) : fallback;
  const clamp = v => Math.max(0, Math.min(1, finite(v, 0)));

  /**
   * Draw one hobby pose at a ground point. The API matches SeorinaCharacter.draw.
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object} [options]
   * @param {string} [options.mode='listen'] A key in modes.
   * @param {number} [options.action=0] One finite performance, 0..1. Both ends rest.
   * @param {number} [options.phase=0] Radian gait phase; caller owns the clock.
   * @param {number} [options.moving=0] 0..1, affects travel and ice only.
   * @param {number} [options.height=60] Standing height in CSS pixels.
   * @param {number} [options.facing=1] Negative values mirror everything together.
   */
  function draw(ctx, options = {}) {
    if (!Character || typeof Character.drawPose !== 'function') return;
    const mode = options.mode || 'listen';
    if (!Object.prototype.hasOwnProperty.call(modes, mode)) {
      Character.draw(ctx, { ...options, mode: 'idle' });
      return;
    }
    const a = clamp(options.action), moving = clamp(options.moving);
    const phase = finite(options.phase, 0);
    const swell = a > 0 && a < 1 ? Math.sin(a * Math.PI) : 0;
    const beat = Math.sin(a * Math.PI * 6) * swell;

    // Keep exactly the same walking body for these quiet standing variants.
    if (['travel', 'retro', 'monochrome', 'navy'].includes(mode)) {
      Character.draw(ctx, { ...options, mode: moving ? 'walk' : 'idle' });
    }

    Character.drawPose(ctx, options, p => {
      const { point: P, limb, torso, head, shoe, leg, line, ellipse, hand } = p;
      const ink = p.ink, blue = p.accent;
      const front = (s, e, h, width = 3.2) => {
        limb(P(...s), P(...e), P(...h), width, 2.35, 1.65);
        hand(P(...h));
      };
      const rect = (x, y, w, h, color = ink, radius = 0) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        if (radius && typeof ctx.roundRect === 'function') ctx.roundRect(x, y, w, h, radius);
        else ctx.rect(x, y, w, h);
        ctx.fill();
      };
      function seated({ x = -12, y = -29, tilt = 0, stool = true, nod = 0 } = {}) {
        const hip = P(x, y), shoulder = P(x + tilt, y - 27);
        if (stool) {
          line([[x - 9, y + 2], [x + 9, y + 2]], ink, 2.7);
          line([[x - 6, y + 3], [x - 8, 0]], ink, 1.5);
          line([[x + 6, y + 3], [x + 9, 0]], ink, 1.5);
        }
        limb(P(x - 2, y), P(x + 15, y + 3), P(x + 15, -3.7), 4.7, 3.1, 2.1);
        shoe(P(x + 15, 0));
        limb(P(x + 2, y), P(x + 25, y + 2), P(x + 28, -3.7), 4.8, 3.2, 2.1);
        shoe(P(x + 28, 0));
        torso(hip, shoulder);
        head(shoulder.x + 1.2, shoulder.y - 13.8, nod);
        return { hip, shoulder };
      }
      function standing({ tilt = 0, nod = 0 } = {}) {
        const hip = P(0, -51.7), shoulder = P(tilt, -75);
        leg(P(-1.6, hip.y), P(-4.2, 0));
        leg(P(1.6, hip.y), P(3.5, 0));
        torso(hip, shoulder);
        head(shoulder.x + 1.2, shoulder.y - 13.8, nod);
        return { hip, shoulder };
      }
      function tabletop(y = -31, left = -1, right = 42) {
        line([[left, y], [right, y]], ink, 2.4);
        line([[left + 3, y], [left + 3, 0]], ink, 1.4);
        line([[right - 4, y], [right - 4, 0]], ink, 1.4);
      }
      function musicNote(x, y, amount) {
        if (amount <= .01) return;
        ctx.save();
        ctx.globalAlpha *= amount * .8;
        const rise = 5 * swell;
        line([[x, y - rise], [x, y - 8 - rise], [x + 5, y - 6 - rise]], blue, 1.2);
        ellipse(x - 1.8, y + .3 - rise, 2.6, 1.5, blue, -.3);
        ctx.restore();
      }

      if (mode === 'guitar') {
        seated({ x: -12, tilt: 1.6 * swell, nod: .07 * swell });
        front([-15, -55], [4, -48], [28, -51]);
        ctx.save();
        ctx.translate(3, -38); ctx.rotate(-.42);
        ctx.fillStyle = blue;
        ctx.beginPath();
        ctx.moveTo(-1, -10);
        ctx.bezierCurveTo(4, -14, 11, -10, 10, -5);
        ctx.bezierCurveTo(8, -1, 7, 1, 11, 6);
        ctx.bezierCurveTo(14, 14, -1, 17, -8, 12);
        ctx.bezierCurveTo(-15, 7, -13, -3, -6, -5);
        ctx.bezierCurveTo(-4, -5, -3, -9, -1, -10);
        ctx.closePath(); ctx.fill();
        rect(6, -2.8, 29, 4.3, blue);
        rect(34, -3.5, 7.5, 5.4, blue, 1.3);
        ellipse(1, 1, 3.3, 3.3, ink);
        line([[-6, 1], [40, -1]], '#ffffff', .6);
        line([[-6, -1.4], [-6, 4]], ink, 1.4);
        for (let fret = 12; fret <= 32; fret += 4) line([[fret, -2.3], [fret, 1.1]], ink, .6);
        ctx.restore();
        front([-8, -55], [4, -45], [5 + beat * 1.2, -36 + beat * 2.2]);
        musicNote(35, -75, swell);
      } else if (mode === 'piano') {
        seated({ x: -23, tilt: 2 * swell, nod: .05 * beat });
        // Case, keyboard, and two slender legs read as one small upright piano.
        rect(6, -58, 35, 25, ink, 1.4);
        line([[6, -58], [41, -58]], blue, 2);
        rect(3, -35, 40, 5, '#ffffff');
        line([[3, -35], [43, -35], [43, -29], [3, -29]], ink, 1.2);
        for (let key = 9; key < 41; key += 4) line([[key, -35], [key, -30]], ink, .55);
        [10, 14, 22, 26, 30, 38].forEach(key => rect(key, -35, 1.5, 2.9, ink));
        line([[9, -29], [9, 0]], ink, 1.7);
        line([[38, -29], [38, 0]], ink, 1.7);
        front([-25, -55], [-8, -36], [10, -34 - beat * .9]);
        front([-19, -55], [-5, -39], [19, -34 + beat * .9]);
        musicNote(38, -69, swell);
      } else if (mode === 'listen') {
        const nod = .06 * beat;
        standing({ tilt: swell * .8, nod });
        front([-3, -74], [-8, -60], [-4, -47]);
        front([3, -74], [17, -70], [9, -87]);
        ctx.save(); ctx.translate(1.2 + swell * .8, -88.8); ctx.rotate(nod);
        ctx.strokeStyle = blue; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(-.2, -1.2, 10.6, Math.PI * .95, Math.PI * 2.08); ctx.stroke();
        ellipse(-9.9, .9, 2.1, 4.2, blue, -.1);
        ellipse(9.7, .9, 2, 3.6, blue, .1);
        ctx.restore();
        musicNote(25, -86, swell);
      } else if (mode === 'puzzle') {
        seated({ x: -18, tilt: 2, nod: .18 }); tabletop();
        rect(9, -33, 24, 2, blue);
        // Three interlocking seams, rather than a stack of floating squares.
        line([[17, -33], [17, -31]], '#ffffff', .6);
        line([[25, -33], [25, -31]], '#ffffff', .6);
        const lift = 5 * swell;
        rect(21 + 4 * swell, -34 - lift, 5.5, 2.2, blue);
        ellipse(23.7 + 4 * swell, -34.4 - lift, 1.1, .7, blue);
        front([-20, -54], [-7, -38], [12, -33]);
        front([-14, -54], [4, -39 - lift * .5], [24 + 4 * swell, -35 - lift]);
      } else if (mode === 'gaming') {
        seated({ x: -13, tilt: 1.4 * swell, nod: .06 * swell });
        front([-16, -55], [-4, -40], [7, -41]);
        front([-9, -55], [5, -41], [16, -41]);
        ctx.save(); ctx.translate(11.5, -40); ctx.rotate(.07 * beat);
        ctx.fillStyle = blue;
        ctx.beginPath(); ctx.moveTo(-7, -4);
        ctx.quadraticCurveTo(-10, -1, -10, 3);
        ctx.quadraticCurveTo(-9, 6, -5, 2);
        ctx.quadraticCurveTo(0, 0, 5, 2);
        ctx.quadraticCurveTo(9, 6, 10, 3);
        ctx.quadraticCurveTo(10, -1, 7, -4);
        ctx.closePath(); ctx.fill();
        line([[-6, -1], [-2, -1]], '#ffffff', .9);
        line([[-4, -3], [-4, 1]], '#ffffff', .9);
        ellipse(4.5, -.5, 1, 1, '#ffffff'); ellipse(7, -2, .8, .8, '#ffffff');
        ctx.restore();
      } else if (mode === 'write') {
        seated({ x: -18, tilt: 4, nod: .24 }); tabletop();
        ctx.fillStyle = blue; ctx.beginPath(); ctx.moveTo(8, -32);
        ctx.lineTo(12, -39); ctx.quadraticCurveTo(20, -38, 23, -35);
        ctx.quadraticCurveTo(28, -37, 37, -36); ctx.lineTo(33, -30);
        ctx.quadraticCurveTo(26, -32, 22, -32); ctx.closePath(); ctx.fill();
        line([[23, -35], [22, -32]], '#ffffff', .7);
        front([-19, -53], [-6, -36], [13, -34]);
        const penX = 27 + beat * 2.1, penY = -36 + .6 * beat;
        front([-11, -52], [5, -43], [penX + 1, penY - 3]);
        line([[penX - 1, penY + 1], [penX + 4, penY - 8]], ink, 1.1);
      } else if (mode === 'watch') {
        seated({ x: -19, tilt: -1.2 * swell, nod: -.035 * swell }); tabletop(-28, 13, 45);
        // Open-frame screen; the empty counter keeps the prop light at small sizes.
        ctx.strokeStyle = blue; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.rect(17, -57, 26, 21); ctx.stroke();
        line([[30, -36], [30, -29]], ink, 1.5);
        line([[24, -29], [36, -29]], ink, 1.5);
        line([[22, -51], [38, -51]], blue, .7);
        front([-22, -55], [-22, -42], [-6, -31]);
        front([-15, -55], [-3, -39], [9, -29]);
      } else if (mode === 'travel') {
        // The body above is the identical core walker. The rear hand follows its gait.
        const bob = moving * (2.7 + 1.8 * Math.cos(phase * 2));
        const rearHandX = -2.8 + (-1.8 * (1 - moving) + Math.sin(phase) * 11 * moving);
        const rearHandY = -47 + bob - moving * (2.7 + 3 * Math.abs(Math.sin(phase)));
        const suitcaseX = -26 - swell * 2;
        line([[rearHandX, rearHandY], [suitcaseX + 6, -27]], blue, 1.5);
        rect(suitcaseX - 6, -26, 17, 22, blue, 2.7);
        line([[suitcaseX - 1, -22], [suitcaseX - 1, -8]], '#ffffff', .8);
        line([[suitcaseX + 5, -22], [suitcaseX + 5, -8]], '#ffffff', .8);
        ellipse(suitcaseX - 3, -2.2, 2.2, 2.2); ellipse(suitcaseX + 8, -2.2, 2.2, 2.2, ink);
      } else if (mode === 'eat') {
        seated({ x: -15, tilt: 1, nod: .1 * swell });
        front([-18, -55], [-9, -39], [9, -40]);
        const spoon = P(13 - 7 * swell, -43 - 18 * swell);
        front([-10, -55], [8, -49 - 5 * swell], [spoon.x, spoon.y]);
        ctx.fillStyle = blue; ctx.beginPath(); ctx.moveTo(4, -42);
        ctx.lineTo(22, -42); ctx.quadraticCurveTo(21, -32, 13, -33);
        ctx.quadraticCurveTo(5, -34, 4, -42); ctx.fill();
        line([[spoon.x, spoon.y], [spoon.x + 3, spoon.y - 5]], blue, 1.15);
        ellipse(spoon.x + 3.4, spoon.y - 5.7, 1.8, 1, blue, -.55);
      } else if (mode === 'relax') {
        // A relaxed cross-legged seat, keeping the same slim torso and small head.
        const hip = P(-3, -18), shoulder = P(-5 - swell, -43);
        limb(P(-7, -17), P(-24, -7), P(9, -3), 4.8, 3.8, 2.2); shoe(P(10, 0));
        limb(P(1, -17), P(23, -6), P(-13, -3), 4.8, 3.8, 2.2); shoe(P(-13, 0), -.15);
        torso(hip, shoulder); head(shoulder.x + 1.2, shoulder.y - 13.8, .06 * swell);
        front([-8 - swell, -43], [-16, -26], [-20, -13]);
        front([-2 - swell, -43], [9, -27], [18, -12]);
      } else if (mode === 'heart') {
        standing({ tilt: 1.2 * swell });
        front([-3, -74], [4, -60], [17, -65 - swell * 3]);
        front([3, -74], [20, -59], [23, -66 - swell * 3]);
        ctx.save(); ctx.translate(20, -69 - swell * 3); ctx.scale(1 + swell * .08, 1 + swell * .08);
        ctx.fillStyle = blue; ctx.beginPath(); ctx.moveTo(0, 7);
        ctx.bezierCurveTo(-13, -.8, -7, -8, 0, -3);
        ctx.bezierCurveTo(7, -8, 13, -.8, 0, 7); ctx.fill(); ctx.restore();
      } else if (mode === 'martial') {
        const extension = 8 * swell;
        const hip = P(-6, -32), shoulder = P(-2 + 2 * swell, -58);
        limb(P(-9, -32), P(-28, -11), P(-13, -3), 4.8, 3.4, 2.2); shoe(P(-13, 0));
        limb(P(-3, -32), P(19, -23), P(23, -3), 4.8, 3.3, 2.2); shoe(P(23, 0));
        torso(hip, shoulder); head(shoulder.x + 1.2, shoulder.y - 13.8, -.02);
        front([-5, -57], [8, -43], [17 + extension, -57]);
        front([2, -57], [17, -49], [24 + extension, -55]);
        // One narrow belt indicates training clothes without a detailed uniform.
        line([[-11, -34], [0, -33], [3, -26]], blue, 1.4);
      } else if (mode === 'ice') {
        const stride = moving * Math.sin(phase) + .7 * beat;
        const hip = P(-8, -38), shoulder = P(13, -59);
        const rearFoot = P(-23 - 14 * Math.max(0, stride), -3 - 4 * Math.max(0, stride));
        const frontFoot = P(17 + 6 * Math.min(0, stride), -3);
        limb(P(-10, -38), P(-28 - stride * 4, -19), P(rearFoot.x, rearFoot.y - 3), 4.7, 3.1, 2.1);
        limb(P(-6, -38), P(21, -24), P(frontFoot.x, frontFoot.y - 3), 4.8, 3.2, 2.1);
        shoe(rearFoot); shoe(frontFoot);
        line([[rearFoot.x - 5, rearFoot.y + 2.6], [rearFoot.x + 11, rearFoot.y + 2.6]], blue, 1.4);
        line([[frontFoot.x - 5, 0], [frontFoot.x + 12, 0]], blue, 1.4);
        torso(hip, shoulder); head(24, -69, .22);
        front([10, -59], [-1, -43], [-16, -39]);
        front([16, -58], [25, -47], [34, -51 - 3 * swell]);
      } else if (mode === 'retro') {
        // Lightweight scarf, not a new body or a costume covering the silhouette.
        line([[-2, -79], [5, -77], [4, -66]], blue, 1.65);
        line([[4, -67], [10 + swell * 3, -63]], blue, 1.3);
      } else if (mode === 'monochrome') {
        line([[-4, -73], [5, -73]], '#ffffff', .8);
      } else if (mode === 'navy') {
        line([[-4, -75], [1, -69], [5, -75]], blue, 1.5);
      }
    });
  }

  return Object.freeze({ draw, modes, supports: mode => Object.prototype.hasOwnProperty.call(modes, mode) });
});
