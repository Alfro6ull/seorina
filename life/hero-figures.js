/* Canvas artwork extracted from the supplied seorina-hero.html. */
const seorinaHero = (() => {
'use strict';

function drawFigure(ctx, options = {}) {
  const {
    x = 0, y = 0, height = 52, phase = 0,
    moving = 0, facing = 1, color = '#000', outfit = ''
  } = options;
  const m = Math.max(0, Math.min(1, Number(moving) || 0));
  const turn = facing < 0 ? -1 : 1;
  const tau = Math.PI * 2;
  const cycle = ((phase / tau) % 1 + 1) % 1;
  const bob = m * (2.7 + 1.8 * Math.cos(phase * 2));
  const hip = { x: m * 0.8, y: -51.7 + bob };
  const mix = (a, b, t) => a + (b - a) * t;

  function footAt(t, idleX) {
    t = ((t % 1) + 1) % 1;
    let fx, fy, angle = 0;
    const stance = 0.56;
    if (t < stance) {
      fx = 21 - 42 * t / stance;
      fy = 0;
    } else {
      const u = (t - stance) / (1 - stance);
      fx = -21 + 42 * (0.5 - 0.5 * Math.cos(Math.PI * u));
      fy = -10 * Math.pow(Math.sin(Math.PI * u), 1.35);
      angle = -0.18 * Math.sin(Math.PI * u);
    }
    return { x: mix(idleX, fx, m), y: fy * m, angle: angle * m };
  }

  function joint(a, b, l1, l2, bend = -1) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const d = Math.max(0.001, Math.min(Math.hypot(dx, dy), l1 + l2 - 0.001));
    const realD = Math.max(Math.hypot(dx, dy), 0.001);
    const ux = dx / realD, uy = dy / realD;
    const reach = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
    const spread = Math.sqrt(Math.max(0, l1 * l1 - reach * reach));
    return {
      x: a.x + ux * reach - uy * spread * bend,
      y: a.y + uy * reach + ux * spread * bend
    };
  }

  function normal(a, b) {
    const length = Math.max(0.001, Math.hypot(b.x - a.x, b.y - a.y));
    return { x: -(b.y - a.y) / length, y: (b.x - a.x) / length };
  }

  function limb(a, b, c, wa, wb, wc) {
    const n1 = normal(a, b), n2 = normal(b, c);
    const nlen = Math.max(0.2, Math.hypot(n1.x + n2.x, n1.y + n2.y));
    const nb = { x: (n1.x + n2.x) / nlen, y: (n1.y + n2.y) / nlen };
    const p = (v, n, w, sign) => ({ x: v.x + n.x * w * sign, y: v.y + n.y * w * sign });
    const al = p(a, n1, wa, 1), bl = p(b, nb, wb, 1), cl = p(c, n2, wc, 1);
    const ar = p(a, n1, wa, -1), br = p(b, nb, wb, -1), cr = p(c, n2, wc, -1);
    ctx.beginPath();
    ctx.moveTo(al.x, al.y);
    ctx.quadraticCurveTo(mix(al.x, bl.x, 0.42), mix(al.y, bl.y, 0.42), bl.x, bl.y);
    ctx.quadraticCurveTo(mix(bl.x, cl.x, 0.6), mix(bl.y, cl.y, 0.6), cl.x, cl.y);
    ctx.quadraticCurveTo(c.x + (c.x - b.x) * 0.035, c.y + (c.y - b.y) * 0.035, cr.x, cr.y);
    ctx.quadraticCurveTo(mix(cr.x, br.x, 0.6), mix(cr.y, br.y, 0.6), br.x, br.y);
    ctx.quadraticCurveTo(mix(br.x, ar.x, 0.42), mix(br.y, ar.y, 0.42), ar.x, ar.y);
    ctx.closePath();
    ctx.fill();
  }

  function shoe(foot) {
    ctx.save();
    ctx.translate(foot.x, foot.y);
    ctx.rotate(foot.angle);
    ctx.beginPath();
    ctx.moveTo(-2.6, -4.8);
    ctx.quadraticCurveTo(0.2, -5.1, 2.2, -3.4);
    ctx.quadraticCurveTo(3.6, -1.6, 6.8, -1.3);
    ctx.quadraticCurveTo(8.2, -1.1, 8.3, 0);
    ctx.lineTo(-2.8, 0);
    ctx.quadraticCurveTo(-3.4, -1.6, -2.6, -4.8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function leg(foot, side) {
    const root = { x: hip.x + side * 1.6, y: hip.y };
    const ankle = { x: foot.x, y: foot.y - 3.6 };
    const knee = joint(root, ankle, 24, 24.5, -1);
    limb(root, knee, ankle, 4.8, 3.25, 2.15);
    shoe(foot);
  }

  function arm(offset, rear) {
    const swing = Math.sin(phase + offset);
    const shoulder = { x: rear ? -2.8 : 3.0, y: -74.3 + bob };
    const hand = {
      x: shoulder.x + mix(rear ? -1.8 : 2.8, swing * 11, m),
      y: -47.0 + bob - m * (2.7 + 3 * Math.abs(swing))
    };
    const elbow = joint(shoulder, hand, 14.5, 14.1, -1);
    limb(shoulder, elbow, hand, 3.15, 2.4, 1.65);
    ctx.beginPath();
    ctx.ellipse(hand.x + 0.35, hand.y + 0.8, 1.85, 3.0, -swing * m * 0.2, 0, tau);
    ctx.fill();
  }

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(turn * height / 100, height / 100);
  ctx.fillStyle = color;
  const rearFoot = footAt(cycle + 0.5, -4.2);
  const frontFoot = footAt(cycle, 3.5);
  arm(0, true);
  leg(rearFoot, -1);
  leg(frontFoot, 1);

  // One flowing shoulder–waist–hip shape, with no internal outfit details.
  ctx.save();
  ctx.translate(m * 0.8, bob);
  ctx.beginPath();
  ctx.moveTo(-3.4, -78.1);
  ctx.quadraticCurveTo(1.0, -80.2, 5.3, -76.8);
  ctx.bezierCurveTo(7.0, -72.4, 7.4, -66.8, 5.5, -61.6);
  ctx.quadraticCurveTo(4.2, -57.5, 6.5, -51.4);
  ctx.quadraticCurveTo(7.3, -48.2, 5.7, -45.6);
  ctx.quadraticCurveTo(0.4, -43.9, -5.8, -46.6);
  ctx.quadraticCurveTo(-6.8, -51.4, -4.5, -59.8);
  ctx.quadraticCurveTo(-3.8, -65.1, -6.0, -70.9);
  ctx.quadraticCurveTo(-7.3, -75.8, -3.4, -78.1);
  ctx.closePath();
  ctx.fill();

  // Clear neck and a quiet side profile; hair is a single continuous mass.
  ctx.beginPath();
  ctx.moveTo(-0.9, -85.8);
  ctx.lineTo(4.0, -86.7);
  ctx.quadraticCurveTo(2.4, -80.3, 5.0, -77.3);
  ctx.lineTo(-3.6, -76.8);
  ctx.quadraticCurveTo(0.1, -80.3, -0.9, -85.8);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-6.7, -90.6);
  ctx.bezierCurveTo(-7.0, -96.6, -3.2, -99.9, 2.1, -99.1);
  ctx.bezierCurveTo(6.0, -98.7, 7.2, -95.8, 7.0, -92.6);
  ctx.lineTo(9.0, -89.9);
  ctx.quadraticCurveTo(9.3, -89.2, 7.3, -88.8);
  ctx.quadraticCurveTo(7.2, -85.0, 4.4, -84.7);
  ctx.quadraticCurveTo(0.6, -84.4, -1.1, -87.0);
  ctx.quadraticCurveTo(-2.1, -83.4, -0.4, -79.9);
  ctx.quadraticCurveTo(-6.6, -78.9, -9.5, -81.2);
  ctx.quadraticCurveTo(-7.0, -85.3, -6.7, -90.6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  drawOutfit(ctx, outfit, bob);
  arm(Math.PI, false);
  ctx.restore();
}

/* Local canvas characters. Stylised illustrations, not traced likenesses.
 * Uses drawFigure() for the walking figure in dog mode only.
 * x/y are the ground point; phase is radians; action 0/1 are resting states.
 */
function drawActivity(ctx, options = {}) {
  const {x=0,y=0,height=60,phase=0,moving=0,facing=1,mode='dog',action=0} = options;
  const ink='#000', blue='#2628ef';
  const m=Math.max(0,Math.min(1,Number(moving)||0));
  const a=Math.max(0,Math.min(1,Number(action)||0));
  const scale=height/100, turn=facing<0?-1:1, tau=Math.PI*2;
  const mix=(u,v,t)=>u+(v-u)*t;
  const point=(x,y)=>({x,y});
  const pulse=(start,end)=>a>start&&a<end?Math.sin(Math.PI*(a-start)/(end-start)):0;
  const first=Math.pow(pulse(.14,.42),1.3), second=Math.pow(pulse(.47,.73),1.3);

  function normal(p,q){const d=Math.max(.001,Math.hypot(q.x-p.x,q.y-p.y));return point(-(q.y-p.y)/d,(q.x-p.x)/d);}
  function limb(p,k,q,wp=4,wk=3,wq=2){
    const n=normal(p,k), z=normal(k,q), ln=Math.max(.2,Math.hypot(n.x+z.x,n.y+z.y));
    const b=point((n.x+z.x)/ln,(n.y+z.y)/ln);
    const edge=(v,n,w,sign)=>point(v.x+n.x*w*sign,v.y+n.y*w*sign);
    const pl=edge(p,n,wp,1),kl=edge(k,b,wk,1),ql=edge(q,z,wq,1);
    const pr=edge(p,n,wp,-1),kr=edge(k,b,wk,-1),qr=edge(q,z,wq,-1);
    ctx.beginPath();ctx.moveTo(pl.x,pl.y);
    ctx.quadraticCurveTo(mix(pl.x,kl.x,.5),mix(pl.y,kl.y,.5),kl.x,kl.y);
    ctx.quadraticCurveTo(mix(kl.x,ql.x,.6),mix(kl.y,ql.y,.6),ql.x,ql.y);
    ctx.quadraticCurveTo(q.x+(q.x-k.x)*.04,q.y+(q.y-k.y)*.04,qr.x,qr.y);
    ctx.quadraticCurveTo(mix(qr.x,kr.x,.6),mix(qr.y,kr.y,.6),kr.x,kr.y);
    ctx.quadraticCurveTo(mix(kr.x,pr.x,.5),mix(kr.y,pr.y,.5),pr.x,pr.y);
    ctx.closePath();ctx.fill();
  }
  function knee(hip,foot,l1=24,l2=24,bend=-1){
    const dx=foot.x-hip.x,dy=foot.y-hip.y,real=Math.max(.001,Math.hypot(dx,dy));
    const d=Math.min(real,l1+l2-.001),reach=(l1*l1-l2*l2+d*d)/(2*d);
    const spread=Math.sqrt(Math.max(0,l1*l1-reach*reach));
    return point(hip.x+dx/real*reach-dy/real*spread*bend,hip.y+dy/real*reach+dx/real*spread*bend);
  }
  function line(points,color=ink,width=2){
    ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';
    ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);
    for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);
    ctx.stroke();
  }
  function ellipse(cx,cy,rx,ry,color=ink,angle=0){
    ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(cx,cy,rx,ry,angle,0,tau);ctx.fill();
  }
  function shoe(f,angle=0){
    ctx.save();ctx.translate(f.x,f.y);ctx.rotate(angle);ctx.fillStyle=ink;
    ctx.beginPath();ctx.moveTo(-3,-4.5);ctx.quadraticCurveTo(.5,-5.4,3,-2.8);
    ctx.quadraticCurveTo(7,-1.4,8.5,-1);ctx.quadraticCurveTo(9.5,0,7.5,0);
    ctx.lineTo(-3.4,0);ctx.quadraticCurveTo(-4,-2,-3,-4.5);ctx.fill();ctx.restore();
  }
  function leg(hip,foot,bend=-1){
    const ankle=point(foot.x,foot.y-3.3);ctx.fillStyle=ink;
    limb(hip,knee(hip,ankle,24,24,bend),ankle,4.6,3,2.1);shoe(foot);
  }
  function torso(hip,shoulder){
    const n=normal(hip,shoulder),w=point(mix(hip.x,shoulder.x,.42),mix(hip.y,shoulder.y,.42));
    ctx.fillStyle=ink;ctx.beginPath();
    ctx.moveTo(hip.x+n.x*6.8,hip.y+n.y*6.8);
    ctx.bezierCurveTo(w.x+n.x*4.1,w.y+n.y*4.1,shoulder.x+n.x*6,shoulder.y+n.y*6,shoulder.x+n.x*4.8,shoulder.y+n.y*4.8);
    ctx.quadraticCurveTo(shoulder.x+(shoulder.x-hip.x)*.12,shoulder.y+(shoulder.y-hip.y)*.12,shoulder.x-n.x*4.8,shoulder.y-n.y*4.8);
    ctx.bezierCurveTo(shoulder.x-n.x*7,shoulder.y-n.y*7,w.x-n.x*4.3,w.y-n.y*4.3,hip.x-n.x*6.6,hip.y-n.y*6.6);
    ctx.quadraticCurveTo(hip.x,hip.y+4,hip.x+n.x*6.8,hip.y+n.y*6.8);ctx.fill();
  }
  function head(cx,cy,angle=0){
    ctx.save();ctx.translate(cx,cy);ctx.rotate(angle);ctx.fillStyle=ink;
    ctx.beginPath();ctx.moveTo(-1,5);ctx.lineTo(4,4.4);ctx.quadraticCurveTo(2.4,10.5,5.5,13.5);
    ctx.lineTo(-3.5,13.5);ctx.quadraticCurveTo(.4,9.2,-1,5);ctx.fill();
    ctx.beginPath();ctx.moveTo(-6.8,-1.3);ctx.bezierCurveTo(-7.1,-7.5,-3.3,-10.8,2.1,-10.1);
    ctx.bezierCurveTo(6.1,-9.7,7.2,-6.7,7,-3.6);ctx.lineTo(9.1,-.7);
    ctx.quadraticCurveTo(9.4,0,7.2,.5);ctx.quadraticCurveTo(7,4.5,4.3,4.5);
    ctx.quadraticCurveTo(.6,5,-1.1,2.2);ctx.quadraticCurveTo(-2,6,-.4,9.3);
    ctx.quadraticCurveTo(-6.8,10,-9.6,7.8);ctx.quadraticCurveTo(-7,3.5,-6.8,-1.3);ctx.fill();ctx.restore();
  }
  function hand(p){ellipse(p.x,p.y,1.8,2.8);}
  function wheel(cx,cy,r){
    ctx.strokeStyle=ink;ctx.lineWidth=2;ctx.beginPath();ctx.arc(cx,cy,r,0,tau);ctx.stroke();
    ctx.save();ctx.translate(cx,cy);ctx.rotate(phase+(a>0&&a<1?tau*a*2:0));ctx.globalAlpha=.34;
    for(let k=0;k<3;k++){const t=k*Math.PI/3;line([[-Math.cos(t)*(r-1),-Math.sin(t)*(r-1)],[Math.cos(t)*(r-1),Math.sin(t)*(r-1)]],blue,.8);}
    ctx.restore();ellipse(cx,cy,1.8,1.8,blue);
  }

  if(mode==='dog'){
    drawFigure(ctx,{x,y,height,phase,moving:m,facing:turn,color:ink});
    ctx.save();ctx.translate(x,y);ctx.scale(turn*scale,scale);
    const tug=Math.sin(a*Math.PI)*5;
    const dogX=49+tug, trot=phase*1.35;
    const bounce=m*Math.abs(Math.sin(trot))*1.5;
    // Hand and leash remain visibly connected while the human arm swings.
    const handX=3+mix(2.8,-Math.sin(phase)*11,m);
    const handY=-47+m*(2.7+1.8*Math.cos(phase*2))-m*(2.7+3*Math.abs(Math.sin(phase)));
    ctx.strokeStyle=blue;ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(handX,handY);
    ctx.quadraticCurveTo(24+tug*.5,-11-tug*.55,dogX+11,-23+bounce);ctx.stroke();
    // A compact dog, with a readable muzzle, folded ear and raised tail.
    ctx.fillStyle=ink;
    for(let j=0;j<4;j++){
      const front=j>1, sign=j%2===0?1:-1, gait=Math.sin(trot+(front?0:Math.PI)+j%2*Math.PI);
      const foot=point(dogX+(front?9:-8)+gait*m*4.6,-Math.max(0,gait)*m*3);
      const jointP=point(dogX+(front?8:-9)+sign*1.1,-11+bounce);
      const mid=point(mix(jointP.x,foot.x,.5)+(front?-1:2),-5+bounce);
      limb(jointP,mid,foot,2.2,1.6,1.2);
    }
    ellipse(dogX,-15+bounce,13.2,6.5,ink,-.05);
    ellipse(dogX+10,-22+bounce,5.5,7.5,ink,.24);
    ellipse(dogX+16.3,-24.4+bounce,6.7,3.5,ink,-.13);
    ctx.fillStyle=ink;ctx.beginPath();ctx.moveTo(dogX+8,-27+bounce);ctx.quadraticCurveTo(dogX+4,-31+bounce,dogX+7,-17+bounce);ctx.quadraticCurveTo(dogX+11,-18+bounce,dogX+8,-27+bounce);ctx.fill();
    ctx.strokeStyle=ink;ctx.lineWidth=3.3;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(dogX-11,-17+bounce);
    ctx.quadraticCurveTo(dogX-20,-20+bounce,dogX-19+Math.sin(trot+a*Math.PI*3)*2.2,-29+bounce);ctx.stroke();
    line([[dogX+8,-26+bounce],[dogX+13,-24+bounce]],blue,1.8);
    ctx.restore();return;
  }

  ctx.save();ctx.translate(x,y);ctx.scale(turn*scale,scale);
  if(mode==='boxing'){
    const jab=first+second*.7, bounce=m*1.8*Math.abs(Math.sin(phase));
    const hip=point(-3+jab*2,-48+bounce), shoulder=point(-2+jab*5,-73+bounce);
    const back=point(-18-m*Math.sin(phase)*3,0), front=point(19+m*Math.sin(phase)*3,0);
    leg(point(hip.x-2,hip.y),back);leg(point(hip.x+2,hip.y),front);
    const rearHand=point(10+second*34,-82+bounce+second*3);
    ctx.fillStyle=ink;limb(point(shoulder.x-3,shoulder.y),point(7+second*15,-65+bounce-second*12),rearHand,3.5,2.7,2);
    torso(hip,shoulder);head(shoulder.x+2,shoulder.y-13,-jab*.035);
    ellipse(rearHand.x+2,rearHand.y,6.1,5.5,blue,-.22);
    const fist=point(14+first*35,-78+bounce-first*2);
    ctx.fillStyle=ink;limb(point(shoulder.x+3,shoulder.y+1),point(10+first*14,-62+bounce-first*14),fist,3.8,2.8,2.2);
    ellipse(fist.x+2.3,fist.y,6.8,5.8,blue,-.1);
  }else if(mode==='cycling'){
    const pedal=m>.001?phase:Math.PI*.16+(a>0&&a<1?tau*a*2:0);
    const bob=m*Math.sin(phase*2)*.7;
    const hip=point(-10,-47+bob), shoulder=point(9,-68+bob);
    const rearFoot=point(-3+9*Math.cos(pedal+Math.PI),-18+9*Math.sin(pedal+Math.PI));
    const frontFoot=point(-3+9*Math.cos(pedal),-18+9*Math.sin(pedal));
    ctx.fillStyle=ink;limb(hip,knee(hip,rearFoot,23,23),rearFoot,4.5,3,2);shoe(rearFoot);
    wheel(-28,-17,16);wheel(29,-17,16);
    line([[-28,-17],[-9,-41],[-3,-18],[-28,-17]],blue,2.1);
    line([[-9,-41],[17,-39],[-3,-18]],blue,2.1);
    line([[17,-39],[29,-17]],blue,2.1);
    line([[-9,-41],[-10,-47]],ink,2);
    line([[-17,-47],[-5,-47]],ink,3.1);
    line([[17,-39],[20,-45],[27,-45],[28,-41]],ink,2);
    ellipse(-3,-18,3.1,3.1,blue);
    line([[rearFoot.x,rearFoot.y],[-3,-18],[frontFoot.x,frontFoot.y]],blue,1.7);
    torso(hip,shoulder);head(17,-80+bob,.19);
    ctx.fillStyle=ink;
    limb(point(shoulder.x+1,shoulder.y+1),point(23,-56+bob),point(25,-43),3.4,2.6,1.8);hand(point(25,-43));
    limb(hip,knee(hip,frontFoot,23,23),frontFoot,4.8,3.2,2.2);shoe(frontFoot);
  }else if(mode==='skate'){
    const hop=Math.pow(pulse(.2,.78),1.15)*13;
    const crouch=pulse(.03,.23)*5+pulse(.78,.98)*4;
    const push=m*Math.max(0,Math.sin(phase));
    ctx.translate(0,-hop);
    const hip=point(-3,-46+crouch+push*2), shoulder=point(-6,-71+crouch+push*2);
    const rearFoot=point(-12-push*20,-9+push*9), frontFoot=point(14,-9);
    // Each wheel touches the ground at rest; the whole board follows the hop.
    ellipse(-14,-3,3,3);ellipse(17,-3,3,3);
    ctx.strokeStyle=blue;ctx.lineWidth=3.2;ctx.lineCap='round';ctx.beginPath();
    ctx.moveTo(-27,-10);ctx.quadraticCurveTo(-23,-6.8,-18,-7);ctx.lineTo(20,-7);
    ctx.quadraticCurveTo(25,-7.5,28,-11);ctx.stroke();
    ctx.fillStyle=ink;
    limb(point(hip.x-2,hip.y),point(-19-push*3,-26+crouch),point(rearFoot.x,rearFoot.y-3),4.6,3.2,2);shoe(rearFoot);
    limb(point(hip.x+2,hip.y),point(8,-28+crouch),point(frontFoot.x,frontFoot.y-3),4.8,3.2,2.1);shoe(frontFoot);
    const backHand=point(-26-push*3,-49+crouch-hop*.35);
    limb(point(shoulder.x-3,shoulder.y+1),point(-23,-59+crouch-hop*.2),backHand,3,2.4,1.6);hand(backHand);
    torso(hip,shoulder);head(shoulder.x+2,shoulder.y-13,.04);
    const forwardHand=point(23+push*4,-48+crouch-hop*.55);
    ctx.fillStyle=ink;limb(point(shoulder.x+3,shoulder.y+1),point(12,-59+crouch-hop*.25),forwardHand,3.3,2.4,1.7);hand(forwardHand);
  }else{
    ctx.restore();drawFigure(ctx,{x,y,height,phase,moving:m,facing:turn,color:ink});return;
  }
  ctx.restore();
}

const canvasOutfits = new Set(['script', 'designer', 'student', 'business', 'consulting', 'undercover']);

function drawOutfit(ctx, outfit, bob) {
  if (!canvasOutfits.has(outfit)) return;
  ctx.save();
  ctx.translate(0, bob);
  if (outfit === 'business' || outfit === 'undercover') {
    ctx.beginPath();
    ctx.moveTo(-5.8, -77.5);
    ctx.quadraticCurveTo(1, -81.8, 6.8, -76.9);
    ctx.lineTo(5.9, -63);
    ctx.lineTo(8.4, -45.5);
    ctx.quadraticCurveTo(1, -43, -8.6, -45.4);
    ctx.lineTo(-5.5, -62);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-2.8, -77.5);
    ctx.lineTo(1.5, -68);
    ctx.lineTo(4, -75.5);
    if (outfit === 'undercover') {
      ctx.moveTo(1.5, -68);
      ctx.lineTo(.5, -60);
    }
    ctx.stroke();
    if (outfit === 'business') {
      ctx.fillRect(7, -44, 12, 12);
      ctx.strokeStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(13, -44, 3, 5, 0, Math.PI, 2 * Math.PI);
      ctx.stroke();
    }
  } else {
    ctx.save();
    ctx.translate(10, outfit === 'script' ? -58 : -49);
    ctx.rotate(outfit === 'designer' ? -.27 : -.16);
    if (outfit === 'designer') {
      ctx.beginPath();
      ctx.roundRect(-3, -6, 13, 27, 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = .8;
      ctx.beginPath();
      ctx.moveTo(5, -3);
      ctx.lineTo(5, 17);
      ctx.stroke();
    } else {
      ctx.fillRect(-4, -7, outfit === 'student' ? 12 : 15, 15);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = .8;
      ctx.beginPath();
      ctx.moveTo(-1, -3);
      ctx.lineTo(6, -3);
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
}

function attach(avatar, banner, reduce) {
  const canvas = avatar.querySelector('.hero-actor-canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const word = banner.querySelector('.hero-word');
  const letters = Array.from(word.children);
  let mode = '';
  let outfit = '';
  let phase = 0;
  let facing = 1;
  let walking = false;
  let actionStart = null;
  let frame = 0;
  let previousFrame = 0;
  let width = 0;
  let height = 0;

  function reactWord(progress, light) {
    const active = progress > 0 && progress < 1;
    const hump = (center, spread) => Math.exp(-(((progress - center) / spread) ** 2));
    letters.forEach((letter, index) => {
      let x = 0;
      let y = 0;
      let rotation = 0;
      let scale = 1;
      if (active && mode === 'dog') {
        const tug = hump(.36 + (6 - index) * .025, .09);
        x = tug * (3 + index);
        rotation = tug * index / 3;
      } else if (active && mode === 'boxing') {
        const delay = Math.abs(index - 2) * .017;
        const hit = hump(.28 + delay, .035) + hump(.60 + delay, .04);
        const strength = 1 / (1 + Math.abs(index - 2) * .5);
        x = hit * 14 * strength;
        rotation = hit * 6 * strength;
        scale = 1 - hit * .09 * strength;
      } else if (active && mode === 'cycling') {
        rotation = index === 2 ? 360 * (progress ** 2 * (3 - 2 * progress)) : -1.4 * Math.sin(progress * Math.PI);
        y = index === 2 ? -5 * Math.sin(progress * Math.PI) : 0;
      } else if (active && mode === 'skate') {
        const jump = hump(.49 + (index - 3) * .022, .095);
        y = -jump * 13;
        rotation = jump * (index - 3) * .8;
      }
      letter.style.transform = active ? `translate(${x}px,${y}px) rotate(${rotation}deg) scaleX(${scale})` : '';
      letter.style.transformOrigin = mode === 'cycling' && index === 2 ? '50% 50%' : '';
      letter.style.setProperty('--shine-x', `${(progress * 9 - index - 1) * 100}%`);
    });
    word.style.setProperty('--shine-alpha', String(light * .72));
  }

  function paint(progress = 0, moving = 0) {
    const shine = walking ? .21 : Math.sin(progress * Math.PI);
    reactWord(progress, shine);
    if (!mode || !width || !height) return;
    ctx.clearRect(0, 0, width, height);
    const ground = height * 53 / 56;
    const options = {x:width / 2, y:ground, height:ground - 5, phase, moving, facing};
    if (mode === 'figure') drawFigure(ctx, {...options, outfit});
    else drawActivity(ctx, {...options, mode, action:progress});
  }

  function measure() {
    if (!mode) return;
    const bounds = canvas.getBoundingClientRect();
    const ratio = Math.min(devicePixelRatio || 1, 2);
    width = bounds.width;
    height = bounds.height;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    if (!frame) paint();
  }

  function tick(now) {
    frame = 0;
    if (previousFrame && walking) phase += Math.min(34, now - previousFrame) * .015;
    previousFrame = now;
    const progress = actionStart === null ? 0 : Math.min(1, (now - actionStart) / 1200);
    if (progress >= 1) actionStart = null;
    paint(progress, walking ? 1 : 0);
    if (walking || actionStart !== null) frame = requestAnimationFrame(tick);
    else previousFrame = 0;
  }

  function queue() {
    if (!frame) frame = requestAnimationFrame(tick);
  }

  function show(nextMode, nextOutfit, animate) {
    actionStart = null;
    mode = nextMode === 'figure' && !canvasOutfits.has(nextOutfit) ? '' : nextMode;
    outfit = nextOutfit;
    if (mode && mode !== 'figure') facing = 1;
    canvas.hidden = !mode;
    avatar.classList.toggle('has-canvas-figure', Boolean(mode));
    if (mode) measure();
    if (mode && mode !== 'figure' && animate && !reduce.matches) {
      actionStart = performance.now();
      queue();
    } else {
      paint();
    }
  }

  function walk(distance) {
    if (reduce.matches) return;
    facing = distance < 0 ? -1 : 1;
    walking = true;
    queue();
  }

  function settle() {
    walking = false;
    if (!frame) paint();
  }

  new ResizeObserver(measure).observe(avatar);
  reduce.addEventListener('change', () => {
    if (!reduce.matches) return;
    cancelAnimationFrame(frame);
    frame = 0;
    previousFrame = 0;
    actionStart = null;
    walking = false;
    paint();
  });
  return {show, walk, settle};
}

return {attach};
})();
