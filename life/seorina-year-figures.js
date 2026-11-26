/**
 * Annual character silhouettes for the existing Seorina timeline.
 * Load after seorina-character.js. No timers, DOM access or image resources.
 * The year-to-role mapping stays in the host; these are illustrative poses.
 *
 * SeorinaYearCharacter.draw(ctx, {
 *   outfit: 'uniform', x: 100, y: 140, height: 60,
 *   phase: 0, moving: 0, action: 0, facing: 1
 * });
 * x/y is the rail contact point. Locomotion follows the core kit's phase;
 * action is one bounded gesture from 0 to 1. Both endpoints are at rest.
 * Leave 0.65*height in front, 0.5*height behind and 1.1*height above.
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./seorina-character.js'));
  } else root.SeorinaYearCharacter = factory(root.SeorinaCharacter);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Character) {
  'use strict';
  const modes = Object.freeze([
    {id:'infant', label:'出生'},
    {id:'trainee', label:'练习生'},
    {id:'script', label:'读剧本'},
    {id:'producers', label:'高中生'},
    {id:'court', label:'宫廷造型'},
    {id:'uniform', label:'学校制服'},
    {id:'designer', label:'服装设计'},
    {id:'student', label:'抱书'},
    {id:'royal', label:'韩服'},
    {id:'hanbok-archery', label:'韩服射箭'},
    {id:'business', label:'通勤'},
    {id:'cello', label:'大提琴'},
    {id:'triathlete', label:'跑步'},
    {id:'consulting', label:'资料夹'},
    {id:'undercover', label:'西装'}
  ].map(Object.freeze));
  const keys = new Set(modes.map(mode => mode.id));
  const finite = (v, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback;
  const clamp = v => Math.max(0, Math.min(1, finite(v)));
  const mix = (a,b,t) => a + (b-a)*t;
  const tau = Math.PI*2;

  function draw(ctx, options = {}) {
    if (!Character || typeof Character.drawPose !== 'function') return false;
    const key = options.outfit || options.mode || 'script';
    const outfit = keys.has(key) ? key : 'script';
    const moving = clamp(options.moving), action = clamp(options.action);
    const phase = finite(options.phase);
    const gesture = Math.sin(action*Math.PI);

    // The reading pose is shared exactly with the main gesture kit.
    if (outfit === 'script') {
      Character.draw(ctx, {...options, mode:'script', phase, moving, action});
      return true;
    }

    Character.drawPose(ctx, {...options, phase, moving, action}, p => {
      const {ctx:c, point:P, ink, accent} = p;
      const bob = moving*(2.7 + 1.8*Math.cos(phase*2));
      const hip = P(moving*.8,-51.7+bob);
      const shoulder = P(moving*.8,-75+bob);
      const head = P(shoulder.x+1.2,shoulder.y-13.8);
      const upper = (x,y) => P(x+shoulder.x,y+bob);

      function foot(t, idle) {
        t = ((t%1)+1)%1;
        let x,y=0;
        if (t<.56) x=21-42*t/.56;
        else {
          const u=(t-.56)/.44;
          x=-21+42*(.5-.5*Math.cos(Math.PI*u));
          y=-10*Math.pow(Math.sin(Math.PI*u),1.35);
        }
        return P(mix(idle,x,moving),y*moving);
      }
      const backFoot=foot(phase/tau+.5,-4.2), frontFoot=foot(phase/tau,3.5);

      function arm(hand, rear=false, elbow=null, width=3.2) {
        const origin=P(shoulder.x+(rear?-2.8:3),shoulder.y+.7);
        const joint=elbow || p.knee(origin,hand,14.5,14.1,-1);
        p.limb(origin,joint,hand,width,2.4,1.65);
        p.hand(hand);
      }
      function relaxedArm(rear=false) {
        const swing=Math.sin(phase+(rear?0:Math.PI))*moving;
        const hand=upper((rear?-4.5:5.8)+swing*10,-47-moving*(2.7+3*Math.abs(swing)));
        arm(hand,rear);
        return hand;
      }
      function legs() {
        p.leg(P(hip.x-1.6,hip.y),backFoot);
        p.leg(P(hip.x+1.6,hip.y),frontFoot);
      }
      function body(angle=0, pony=false) {
        p.torso(hip,shoulder);
        p.head(head.x,head.y,angle);
        if (pony) ponytail(head.x,head.y,angle);
      }
      function ponytail(x,y,angle=0) {
        c.save();c.translate(x,y);c.rotate(angle);c.fillStyle=ink;
        c.beginPath();c.moveTo(-5.5,-5.7);
        c.bezierCurveTo(-10.5,-9,-13,-4.5,-11,1.5);
        c.quadraticCurveTo(-10.5,6,-14,8);
        c.quadraticCurveTo(-7.5,8,-7.8,1.5);
        c.quadraticCurveTo(-9,-3,-5.5,-5.7);c.fill();c.restore();
      }
      function skirt(hem=-25,spread=13) {
        c.fillStyle=ink;c.beginPath();
        c.moveTo(hip.x-5.8,hip.y-4);
        c.quadraticCurveTo(hip.x,hip.y-2,hip.x+5.8,hip.y-4);
        c.quadraticCurveTo(hip.x+8.3,(hip.y+hem)/2,hip.x+spread+moving*Math.sin(phase)*1.8,hem+bob*.22);
        c.quadraticCurveTo(hip.x+1,hem+2,hip.x-spread+moving*Math.sin(phase)*1.1,hem+bob*.22);
        c.quadraticCurveTo(hip.x-7.2,(hip.y+hem)/2,hip.x-5.8,hip.y-4);c.fill();
      }
      function lapel() {
        p.line([[shoulder.x-2.5,shoulder.y+.4],[shoulder.x+1,shoulder.y+8.3],[shoulder.x+4.1,shoulder.y+1.5]],'#fff',.85);
      }
      function book(x,y,w=15,h=19,angle=-.15) {
        c.save();c.translate(x,y);c.rotate(angle);c.fillStyle=accent;
        c.beginPath();c.moveTo(-w/2,-h/2);c.lineTo(w/2,-h/2+.6);
        c.lineTo(w/2,h/2);c.quadraticCurveTo(0,h/2+1,-w/2,h/2);c.closePath();c.fill();
        p.line([[-w/2+2,-h/2+1.5],[-w/2+2,h/2-1]],'#fff',.8);
        p.line([[-w/2+5,-h/2+5],[w/2-2,-h/2+5]],'#fff',.7);
        c.restore();
      }

      if (outfit === 'infant') {
        const rock=(moving*Math.sin(phase)+gesture*Math.sin(action*tau))*.045;
        c.save();c.translate(0,-12);c.rotate(rock);
        c.fillStyle=ink;c.beginPath();c.moveTo(-27,2);
        c.bezierCurveTo(-26,-11,-12,-19,4,-13);
        c.bezierCurveTo(11,-11,13,-3,21,-3);
        c.quadraticCurveTo(29,-1,25,5);
        c.bezierCurveTo(12,13,-21,14,-27,2);c.fill();
        p.ellipse(16,-11,8,8.5,ink,.2);
        p.ellipse(22.7,-9.5,2.3,1.9,ink);
        p.line([[-16,-8],[-8,-2],[-1,8]],'#fff',1.2);
        p.line([[-7,-1],[3,-6],[9,-5]],'#fff',.85);
        c.restore();return;
      }

      if (outfit === 'cello') {
        const bowStroke=Math.sin(action*tau*2)*gesture*8;
        // Stool, feet and instrument all share the same ground anchor.
        p.line([[-16,-37],[4,-37]],ink,3.4);
        p.line([[-13,-36],[-16,0]],ink,1.8);
        p.line([[0,-36],[3,0]],ink,1.8);
        const seatedHip=P(-8,-43),seatedShoulder=P(-7,-69);
        p.limb(P(-10,-43),P(-1,-24),P(-7,-3.3),4.6,3.2,2.1);p.shoe(P(-7,0));
        p.limb(P(-5,-43),P(14,-26),P(8,-3.3),4.8,3.2,2.1);p.shoe(P(8,0));
        p.torso(seatedHip,seatedShoulder);p.head(-5.8,-82.8,.08);
        // The upper waist and wider lower bout keep it readable as a cello.
        c.save();c.translate(21,-19);c.rotate(.06);c.fillStyle=accent;
        c.beginPath();c.moveTo(-4,-36);
        c.bezierCurveTo(-11,-37,-15,-31,-10,-24);
        c.quadraticCurveTo(-6,-19,-12,-15);
        c.bezierCurveTo(-20,-6,-12,7,0,7);
        c.bezierCurveTo(13,7,20,-6,12,-15);
        c.quadraticCurveTo(6,-19,10,-24);
        c.bezierCurveTo(15,-31,11,-37,4,-36);c.closePath();c.fill();
        p.line([[0,-36],[0,-59]],ink,3);p.ellipse(0,-61,2.6,3,ink);
        p.line([[0,-34],[0,1]],'#fff',.9);
        p.line([[-3,-12],[3,-12]],'#fff',1.3);
        p.line([[0,7],[0,19]],ink,1.4);
        c.restore();
        const neckHand=P(19,-67),bowHand=P(9+bowStroke,-38);
        p.limb(P(-4,-68),P(5,-58),neckHand,3.1,2.4,1.65);p.hand(neckHand);
        p.limb(P(-10,-67),P(-17,-46),bowHand,3.1,2.4,1.65);p.hand(bowHand);
        p.line([[bowHand.x-5,bowHand.y+1],[bowHand.x+33,bowHand.y-5]],ink,1.1);
        p.line([[bowHand.x-3,bowHand.y+2.3],[bowHand.x+31,bowHand.y-3.6]],'#fff',.65);
        return;
      }

      if (outfit === 'triathlete') {
        const run=moving>0?phase:.55+gesture*Math.sin(action*tau)*.7;
        const lift=moving*2*Math.abs(Math.sin(run));
        const rh=P(-4,-48-lift),rs=P(7,-71-lift);
        const front=P(13+Math.sin(run)*10,-Math.max(0,-Math.cos(run))*moving*13);
        const back=P(-17-Math.sin(run)*8,-Math.max(0,Math.cos(run))*moving*13);
        p.leg(P(rh.x-1.5,rh.y),back);p.leg(P(rh.x+1.5,rh.y),front);
        const farHand=P(-9-Math.sin(run)*8,-61-lift);
        p.limb(P(rs.x-3,rs.y),P(-9,-55-lift),farHand,3.1,2.4,1.65);p.hand(farHand);
        p.torso(rh,rs);p.head(rs.x+4,rs.y-13,.15);ponytail(rs.x+4,rs.y-13,.15);
        const nearHand=P(20+Math.sin(run)*7,-69-lift);
        p.limb(P(rs.x+2,rs.y+1),P(18,-53-lift),nearHand,3.3,2.4,1.65);p.hand(nearHand);
        p.line([[rh.x-1,rh.y-17],[rh.x+6,rh.y-14]],'#fff',1);
        return;
      }

      if (outfit === 'trainee') {
        const reach=gesture;
        legs();
        const backHand=upper(-18-4*reach,-52-12*reach);
        arm(backHand,true,upper(-19,-66));
        body(-.04,true);
        const frontHand=upper(16+4*reach,-79-12*reach);
        arm(frontHand,false,upper(16,-66-3*reach));
        return;
      }

      const traditional=outfit==='court'||outfit==='royal'||outfit==='hanbok-archery';
      if (traditional) {
        legs();
        if(outfit==='hanbok-archery') {
          const extension=gesture*3;
          arm(upper(8,-68),true,upper(-11,-63),4.1);
          body();
          skirt(-3,outfit==='court'?12:17);
          // Same face and head size; a compact bun is the costume cue.
          p.ellipse(head.x-7.2,head.y-3.4,3.6,3.6);
          p.line([[head.x-10.7,head.y-4],[head.x-.5,head.y-5.5]],'#fff',.7);
          arm(upper(32+extension,-66),false,upper(18,-65),4.1);
          const bx=34+extension,by=-64+bob;
          c.strokeStyle=accent;c.lineWidth=1.7;c.lineCap='round';c.beginPath();
          c.moveTo(bx,-91+bob);c.bezierCurveTo(bx+18,-79+bob,bx+18,-47+bob,bx,-34+bob);c.stroke();
          p.line([[bx,-91+bob],[8,-68+bob],[bx,-34+bob]],ink,.7);
          p.line([[8,-68+bob],[bx+19,by]],ink,.9);
          p.line([[bx+14,by-2],[bx+19,by],[bx+14,by+2]],ink,.8);
        } else {
          arm(upper(9,-55),true,upper(-9,-62),4.3);
          body();skirt(-3,outfit==='court'?13:17);
          p.ellipse(head.x-7.4,head.y-3.6,3.5,3.5);
          arm(upper(7,-55),false,upper(12,-63),4.2);
          if(outfit==='royal') p.line([[head.x-11,head.y-4],[head.x,head.y-5.5]],accent,.9);
        }
        p.line([[shoulder.x-2,shoulder.y+1],[shoulder.x+3,shoulder.y+8],[shoulder.x+4.5,shoulder.y+3]],'#fff',.85);
        p.line([[hip.x-5,hip.y-9],[hip.x+5,hip.y-9],[hip.x+1,hip.y-5]],'#fff',.8);
        return;
      }

      // Every remaining costume shares the same legs, torso and side profile.
      legs();
      if(outfit==='producers') {
        c.fillStyle=ink;c.beginPath();c.moveTo(-5,-73+bob);
        c.bezierCurveTo(-15,-76+bob,-18,-67+bob,-15,-53+bob);
        c.quadraticCurveTo(-9,-49+bob,-4,-53+bob);c.closePath();c.fill();
        relaxedArm(true);body(.03,true);skirt(-27,11.5);
        const hand=upper(15,-66+gesture*2);
        book(hand.x+1,hand.y-4,5,10,-.14);
        arm(hand,false,upper(14,-56));
        return;
      }
      if(outfit==='uniform') {
        relaxedArm(true);body(.04);skirt(-25,12.7);lapel();
        book(14+shoulder.x,-61+bob,13.5,19,-.18);
        arm(upper(15,-56),false,upper(12,-49));
        return;
      }
      if(outfit==='designer') {
        relaxedArm(true);body(.03,true);
        const hand=upper(18,-56);
        // A hanger and light garment make the prop recognizable at small size.
        c.strokeStyle=accent;c.lineWidth=1.2;c.lineCap='round';c.beginPath();
        c.arc(hand.x+1,hand.y-2,2,Math.PI*.65,Math.PI*2.25);c.stroke();
        p.line([[hand.x+2,hand.y],[hand.x-8,hand.y+7],[hand.x+12,hand.y+7],[hand.x+2,hand.y]],accent,1.2);
        c.fillStyle=accent;c.beginPath();
        c.moveTo(hand.x-4,hand.y+5);c.lineTo(hand.x+7,hand.y+5);
        c.lineTo(hand.x+12,hand.y+13);c.lineTo(hand.x+7,hand.y+16);
        c.lineTo(hand.x+6,hand.y+28);c.quadraticCurveTo(hand.x+1,hand.y+29,hand.x-6,hand.y+27);
        c.lineTo(hand.x-5,hand.y+15);c.lineTo(hand.x-10,hand.y+12);c.closePath();c.fill();
        arm(hand,false,upper(14,-47));
        return;
      }
      if(outfit==='student') {
        arm(upper(15,-51),true,upper(-8,-56));body(.025);
        // Two books are supported by the forearm, not floating over the torso.
        c.save();c.translate(17+shoulder.x,-52+bob);c.rotate(-.12);
        c.fillStyle=accent;c.fillRect(-10,-5,21,4);c.fillStyle=ink;c.fillRect(-9,0,21,4);
        p.line([[-8,1],[10,1]],'#fff',.7);c.restore();
        arm(upper(22,-48),false,upper(12,-45));
        return;
      }
      if(outfit==='business') {
        relaxedArm(true);body();lapel();
        const hand=upper(12+moving*Math.sin(phase)*3,-47);
        arm(hand,false,upper(7,-61));
        c.strokeStyle=accent;c.lineWidth=1.7;c.beginPath();
        c.moveTo(hand.x-4,hand.y+9);c.bezierCurveTo(hand.x-5,hand.y-1,hand.x+5,hand.y-1,hand.x+5,hand.y+9);c.stroke();
        c.fillStyle=accent;c.beginPath();c.moveTo(hand.x-7,hand.y+7);c.lineTo(hand.x+8,hand.y+7);
        c.lineTo(hand.x+9,hand.y+24);c.quadraticCurveTo(hand.x,hand.y+26,hand.x-8,hand.y+23);c.closePath();c.fill();
        p.hand(hand);return;
      }
      if(outfit==='consulting') {
        relaxedArm(true);body(.02,true);
        book(13+shoulder.x,-56+bob,15,23,-.12);
        arm(upper(17,-50),false,upper(8,-47));
        return;
      }
      // Undercover: a quiet tailored jacket, no extra icon or weapon.
      relaxedArm(true);body();lapel();
      c.fillStyle=ink;c.beginPath();c.moveTo(-5.6+hip.x,-69+bob);
      c.lineTo(-7.2+hip.x,-44+bob);c.quadraticCurveTo(1+hip.x,-42+bob,8+hip.x,-45+bob);
      c.lineTo(5.3+hip.x,-68+bob);c.closePath();c.fill();
      relaxedArm(false);
    });
    return true;
  }
  return Object.freeze({draw,modes,has:key=>keys.has(key)});
});
