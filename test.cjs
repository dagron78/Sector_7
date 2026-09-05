// Run the actual inline game in a minimal DOM/canvas shell; no packages needed.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(`${__dirname}/index.html`, 'utf8');
const source = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const elements = new Map(), timers = new Map(), listeners = {};
let timerId = 0;
const noop = () => {};
const context2d = new Proxy({
  createImageData: (w,h) => ({data:new Uint8ClampedArray(w*h*4)}),
  getImageData: (x,y,w,h) => ({data:new Uint8ClampedArray(w*h*4)}),
  createRadialGradient: () => ({addColorStop:noop}),
}, {get:(target,key) => target[key] ?? noop});
function element(id) {
  if (!elements.has(id)) elements.set(id, {
    style:{},classList:{toggle:noop,remove:noop,add:noop},
    firstElementChild:{style:{}},innerHTML:'desktop',focus:noop,
    getContext:()=>context2d,addEventListener:noop,
  });
  return elements.get(id);
}
const document = {
  getElementById:element,createElement:()=>element(Symbol()),
  querySelector:()=>element('fine'),querySelectorAll:()=>[],
  body:element('body'),documentElement:{},exitPointerLock:noop,
  addEventListener:(name,fn)=>{listeners[name]=fn;},
};
const checks = String.raw`
  // No audio devices or real timers are needed for these logic checks.
  assert.equal(WEAPONS[1].dmg*WEAPONS[1].pellets,78);
  assert.equal(WEAPONS[3].dmg,99);
  for(const name of Object.keys(SFX)) SFX[name]=()=>{};
  let emptySounds=0; SFX.empty=()=>emptySounds++;
  startGame=()=>{};
  loadLevel(0); G.mode='play'; G.weapon=1; G.ammo.shells=0;
  for(let i=0;i<60;i++){G.cool=Math.max(0,G.cool-1/60);if(G.cool===0)fire();}
  assert(emptySounds>=3 && emptySounds<=4);
  assert.equal(G.msgs.filter(m=>m.text.startsWith('Out of ammo')).length,1);

  function arena(rows){
    G.W=rows[0].length;G.H=rows.length;G.map=new Uint8Array(G.W*G.H);G.doors.clear();
    rows.forEach((r,y)=>[...r].forEach((c,x)=>{G.map[y*G.W+x]=c==='#'?T_TECH:c==='d'?T_DOOR:T_EMPTY;if(c==='d')G.doors.set(y*G.W+x,{open:0});}));
    G.ents=[];G.dead=0;G.hp=100;G.armor=0;G.posX=3.5;G.posY=1.5;
  }
  for(const wall of ['#','d']){
    arena(['#####','#.'+wall+'.#','#####']);
    spawnEnemy('grunt',3.5,1.5); const e=G.ents[0],hp=e.hp;
    splash(1.5,1.5,4,78);
    assert.equal(e.hp,hp,'cover protects enemy');assert.equal(G.hp,100,'cover protects player');
    if(wall==='d'){
      G.doors.get(7).open=1;splash(1.5,1.5,4,78);
      assert(e.hp<hp);assert(G.hp<100);
    }
  }
  arena(['#####','#...#','#####']);spawnEnemy('grunt',3.5,1.5);
  const exposed=G.ents[0];splash(1.5,1.5,4,78);assert(exposed.hp<exposed.maxhp);assert(G.hp<100);
  arena(['#####','#.#.#','##..#','#...#','#####']);
  assert.equal(hasLOS(1.5,1.5,2.5,2.5),false,'corner walls block explosions');
  assert.equal(hasLOS(2.5,2.5,1.5,1.5),false);

  arena(['########','#......#','#......#','########']);
  G.dirX=1;G.dirY=0;G.keys={};G.posY=1.5;
  const distances=[];
  for(const amount of [.05,.3,.7]){
    G.posX=1.5;TS_.mvy=-amount;movePlayer(.1);distances.push(G.posX-1.5);
  }
  assert.equal(distances[0],0);assert(distances[1]>0 && distances[1]<distances[2]);
  resetInput();keys.KeyW=true;keys.KeyD=true;G.posX=2.5;G.posY=1.5;
  movePlayer(.1);assert(Math.abs(Math.hypot(G.posX-2.5,G.posY-1.5)-.31)<1e-9);
  G.mode='play';G.shooting=true;TS_.mvx=1;listeners.blur();
  assert.equal(G.mode,'paused');assert.equal(G.shooting,false);assert.equal(TS_.mvx,0);assert.equal(Object.keys(keys).length,0);

  G.hp=73;G.armor=25;G.weapon=1;G.owned=[true,true,false,false];G.ammo={bullets:40,shells:8,rockets:0};
  loadLevel(1);G.mode='play';const entry=JSON.stringify(levelEntry);
  G.hp=1;G.armor=0;G.ammo.shells=0;G.owned[2]=true;
  G.posX=G.secretsExit.x+.5;G.posY=G.secretsExit.y-0.5;G.dirX=0;G.dirY=1;
  hurtPlayer(100);assert.equal(G.dead,1);
  useAction();levelComplete();toggleMap();assert.equal(G.mode,'play','dead player cannot advance or open map');
  assert.equal(timers.size,1);
  const staleDeath=[...timers.values()][0];
  document.getElementById('btn-retry').onclick();
  assert.equal(JSON.stringify(levelEntry),entry);assert.equal(G.hp,73);assert.equal(G.ammo.shells,8);assert.equal(G.owned[2],false);
  assert.equal(timers.size,0);staleDeath();assert.equal(G.mode,'play');
  G.ammo.shells=1;document.getElementById('btn-retry').onclick();assert.equal(G.ammo.shells,8);

  for(let i=0;i<MAPS.length;i++){
    loadLevel(i);const rows=MAPS[i].rows;assert(rows.every(r=>r.length===G.W));
    const start=[G.posX|0,G.posY|0];
    function flood(unlocked){
      const q=[start],seen=new Set([start.join(',')]);
      for(const [x,y] of q)for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const nx=x+dx,ny=y+dy,k=[nx,ny].join(',');
        if(nx<0||ny<0||nx>=G.W||ny>=G.H||seen.has(k))continue;
        const t=G.map[ny*G.W+nx];if(t!==T_EMPTY && t!==T_DOOR && !(unlocked&&t===T_LOCK))continue;
        seen.add(k);q.push([nx,ny]);
      }return seen;
    }
    const key=G.ents.find(e=>e.kind==='keycard');assert(flood(false).has([key.x|0,key.y|0].join(',')));
    const reachable=flood(true),exit=G.secretsExit;
    assert([[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>reachable.has([exit.x+dx,exit.y+dy].join(','))));
    renderWorld();drawHUD();
  }
  document.getElementById('setting-volume').oninput({target:{value:'0'}});assert.equal(settings.volume,0);
  document.getElementById('setting-sensitivity').oninput({target:{value:'2'}});assert.equal(settings.sensitivity,2);
  document.getElementById('setting-controls').onchange({target:{value:'touch'}});assert.equal(TOUCH,true);
  document.getElementById('setting-controls').onchange({target:{value:'desktop'}});assert.equal(TOUCH,false);
  console.log('PASS: cover, doors, corners, ammo cooldown, analog input, focus, death/retry, maps, rendering smoke check, settings');
`;
vm.runInNewContext(source.slice(0,source.lastIndexOf('})();'))+checks+'})();', {
  assert,console,document,listeners,timers,
  window:{innerWidth:960,innerHeight:540,matchMedia:()=>({matches:false}),addEventListener:noop},
  localStorage:{getItem:()=>null,setItem:noop},performance:{now:()=>0},requestAnimationFrame:noop,
  addEventListener:(name,fn)=>{listeners[name]=fn;},
  setTimeout:fn=>{timers.set(++timerId,fn);return timerId;},clearTimeout:id=>timers.delete(id),
}, {timeout:5000});
