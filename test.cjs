// Run the actual inline game in a minimal DOM/canvas shell; no packages needed.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(`${__dirname}/index.html`, 'utf8');
const source = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const elements = new Map(), timers = new Map(), listeners = {};
const storage=new Map();
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
  audioInit=()=>{};
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
  for(const weapon of [0,1,2,3]){
    arena(['########','#......#','#......#','########']);
    G.posX=1.5;G.posY=1.5;G.dirX=1;G.dirY=0;G.planeX=0;G.planeY=FOV;
    G.explored=new Uint8Array(G.W*G.H);G.mode='play';G.weapon=weapon;
    G.ammo={bullets:10,shells:10,rockets:10};
    fire();
    if(weapon<3){
      const shots=G.ents.filter(e=>e.type==='tracer');
      assert.equal(shots.length,weapon===1?9:1);
      assert(shots.every(e=>e.kind===['sidearmTrace','pelletTrace','ripperTrace'][weapon]));
      for(const e of shots){updateShotEffect(e,.1);assert(e.x<7,'tracer ends before wall');assert(e.remaining<1e-9);}
      renderWorld();
      for(const e of shots){updateShotEffect(e,.1);assert.equal(e.alive,false);}
    }else{
      const rocket=G.ents.find(e=>e.kind==='rocket');updateProj(rocket,.05);
      const trail=G.ents.find(e=>e.type==='trail');assert(trail);renderWorld();
      updateShotEffect(trail,.3);assert.equal(trail.alive,false);
    }
  }
  arena(['#####','#...#','#####']);G.posX=1.5;G.posY=1.5;
  spawnEnemy('brute',3.5,1.5);const target=G.ents[0],before=target.hp;
  const hitDistance=hitscan(1,0,14);assert.equal(target.hp,before-14);assert(hitDistance<2);
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

  for(let i=0;i<3;i++){
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
  // Walkable routes use real collision radii and current machinery state.
  function reachableFromStart(){
    const start=[3,3],q=[start],seen=new Set([start.join(',')]);
    for(const [x,y] of q)for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=x+dx,ny=y+dy,k=nx+','+ny;
      if(nx<0||ny<0||nx>=G.W||ny>=G.H||seen.has(k)||blocked(nx+.5,ny+.5))continue;
      seen.add(k);q.push([nx,ny]);
    }return seen;
  }
  function canUse(f,reachable){return [[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>reachable.has([f.x+dx,f.y+dy].join(',')));}
  function settle(){for(let j=0;j<100;j++)updateBlackout(.05);}
  for(let i=3;i<6;i++){
    restoreLoadout({hp:100,armor:25,weapon:1,owned:[true,true,true,true],ammo:{bullets:90,shells:24,rockets:8}});
    loadLevel(i);G.mode='play';const def=MAPS[i].blackout;
    assert(MAPS[i].rows.every(r=>r.length===G.W));
    assert.equal(chapterExitReady(),false);
    for(const e of G.ents)if(e.type==='enemy')assert(!blocked(e.x,e.y,e.radius),'enemy starts in a wall: '+i+' '+e.kind);
    const firstPanel=def.fixtures.find(f=>f.kind==='power');assert(canUse(firstPanel,reachableFromStart()));
    useFixture(firstPanel);settle();
    let reach=reachableFromStart();
    if(i===3){
      assert(reach.has('18,15'),'plate reachable after cargo movement');
      const heavy=G.ents.find(e=>e.kind==='bulwark'),hp=heavy.hp;
      heavy.angle=0;damageEnemy(heavy,20,heavy.x+2,heavy.y);assert.equal(heavy.hp,hp-3);
      damageEnemy(heavy,20,heavy.x-2,heavy.y);assert.equal(heavy.hp,hp-23);
      G.posX=heavy.x+3;G.posY=heavy.y;heavy.fire=0;updateEnemy(heavy,.05);
      assert.equal(heavy.charge,'windup');updateEnemy(heavy,.9);assert.equal(heavy.charge,'rush');
      const chargeX=heavy.x;updateEnemy(heavy,.05);assert(heavy.x>chargeX);
      heavy.x=18.5;heavy.y=15.5;settle();assert(G.systems.plate);assert(chapterExitReady());
      loadLevel(i);G.mode='play';useFixture(firstPanel);settle();
      const conduit=def.fixtures.find(f=>f.kind==='conduit');assert(canUse(conduit,reachableFromStart()));
      G.posX=conduit.x+.5;G.posY=conduit.y+1.5;hitscan(0,-1,14);settle();
      assert(G.systems.conduit);assert(chapterExitReady(),'sidearm-only bypass works');
      // Killing the heavy away from the plate still permits a manual override.
      loadLevel(i);G.mode='play';useFixture(firstPanel);settle();
      const h=G.ents.find(e=>e.kind==='bulwark');damageEnemy(h,10000,h.x,h.y+2);
      G.posX=18.5;G.posY=15.5;settle();assert(G.systems.plate);
    }else if(i===4){
      const conduit=def.fixtures.find(f=>f.kind==='conduit');assert(canUse(conduit,reach));
      const s=G.ents.find(e=>e.kind==='splitter'),count=G.totalEnemies;
      damageEnemy(s,1000);assert.equal(G.ents.filter(e=>e.kind==='crawler').length,3);assert.equal(G.totalEnemies,count+3);
      damageEnemy(s,1000);assert.equal(G.ents.filter(e=>e.kind==='crawler').length,3);
      const leech=G.ents.find(e=>e.kind==='leech');leech.x=3.5;leech.y=2.5;leech.fire=0;
      updateEnemy(leech,.05);assert(G.systems.outage>0);damageEnemy(leech,1000);updateBlackout(.05);assert.equal(G.systems.outage,0);
      // Both power modes provide a path into the rear laboratory.
      useFixture(firstPanel);settle();assert(canUse(conduit,reachableFromStart()));
      G.posX=conduit.x+.5;G.posY=conduit.y+1.5;hitscan(0,-1,14);settle();assert(chapterExitReady());
    }else{
      const boss=G.ents.find(e=>e.kind==='warden'),hp=boss.hp;
      damageEnemy(boss,1000);assert.equal(boss.hp,hp,'shield blocks damage');
      for(const relay of def.fixtures.filter(f=>f.kind==='relay')){assert(canUse(relay,reach),'relay reachable: '+relay.label);useFixture(relay);}
      assert(!chapterExitReady(),'boss must also die');
      G.posX=12.5;G.posY=12.5;boss.fire=0;updateEnemy(boss,.05);assert.equal(G.ents.filter(e=>e.type==='proj'&&e.owner===boss).length,5);
      boss.fire=0;updateEnemy(boss,.05);assert(G.systems.hazards.length>0);G.systems.hazards=[];
      G.posX=12.5;G.posY=12.5;G.armor=0;G.hp=100;warnFloor();updateBlackout(1);assert.equal(G.hp,100);
      updateBlackout(.5);assert(G.hp<100,'warned tile becomes hazardous');
      damageEnemy(boss,1000);assert(boss.dead);assert(chapterExitReady());assert.equal(G.systems.hazards.length,0);
    }
    settle();reach=reachableFromStart();assert(canUse(G.secretsExit,reach),'exit reachable '+MAPS[i].name);
    renderWorld();drawHUD();drawAutomap();
    const saved=readCheckpoint();assert.equal(saved.level,i);assert.equal(saved.loadout.hp,100);
    G.hp=1;G.ammo.rockets=0;continueCheckpoint();assert.equal(G.hp,100);assert.equal(G.ammo.rockets,8);assert.equal(G.systems.conduit,false);
  }
  localStorage.setItem(CHECKPOINT_KEY,'{bad json');assert.equal(readCheckpoint(),null);
  localStorage.setItem(CHECKPOINT_KEY,JSON.stringify({version:1,level:999,loadout:levelEntry}));assert.equal(readCheckpoint(),null);
  saveCheckpoint();const invalid=readCheckpoint();invalid.loadout.ammo.rockets=-1;
  localStorage.setItem(CHECKPOINT_KEY,JSON.stringify(invalid));assert.equal(readCheckpoint(),null);
  // Briefings keep enemies paused until explicit entry.
  loadLevel(3);go();assert.equal(G.mode,'briefing');assert(document.getElementById('brief-cards').innerHTML.includes('Power Switch'));
  document.getElementById('btn-enter').onclick();assert.equal(G.mode,'play');
  showGuide('p-pause');assert(document.getElementById('guide-cards').innerHTML.includes('Portal Gun'));

  // Portal placement, actual traversal, retrigger guard, and puzzle boundaries.
  arena(['########','#......#','#......#','#......#','########']);
  G.systems=null;G.portals=[null,null];G.nextPortal=0;G.portalReady=true;
  G.posX=3.5;G.posY=2.5;G.dirX=1;G.dirY=0;G.planeX=0;G.planeY=FOV;
  placePortal();assert.equal(G.portals[0].kind,'portalBlue');assert.equal(G.nextPortal,1);
  rotate(Math.PI);placePortal();assert.equal(G.portals[1].kind,'portalAmber');
  const entrance=G.portals[0],exit=G.portals[1];G.posX=entrance.x;G.posY=entrance.y;
  updatePortals();assert(Math.hypot(G.posX-exit.x,G.posY-exit.y)<.6);assert(!G.portalReady);
  const arrived=G.posX;updatePortals();assert.equal(G.posX,arrived,'no immediate return teleport');
  G.posX=3.5;updatePortals();assert(G.portalReady);
  G.posX=exit.x;G.posY=exit.y;updatePortals();assert(Math.hypot(G.posX-entrance.x,G.posY-entrance.y)<.6,'return trip works');
  G.explored=new Uint8Array(G.W*G.H);renderWorld();
  for(const t of [T_DOOR,T_LOCK,T_POWER,T_CONDUIT,T_RELAY,T_GLASS,T_EXIT]){
    G.posX=3.5;G.posY=2.5;G.dirX=1;G.dirY=0;G.portals=[null,null];G.nextPortal=0;
    G.map[2*G.W+5]=t;placePortal();assert.equal(G.portals[0],null,'reject non-portal surface '+t);
  }
  loadLevel(3);assert(G.portals.every(p=>p===null));
  const portalPickup=G.ents.find(e=>e.kind==='wPortal');assert(portalPickup);
  G.posX=portalPickup.x;G.posY=portalPickup.y;checkPickup(portalPickup);assert(G.owned[4]);assert.equal(G.weapon,4);
  G.hp=100;saveCheckpoint();const valid=readCheckpoint();assert(valid);
  // Inventory saved at sector entry, so an in-sector Portal Gun pickup resets on retry.
  assert.equal(valid.loadout.owned[4],false);
  document.getElementById('setting-volume').oninput({target:{value:'0'}});assert.equal(settings.volume,0);
  document.getElementById('setting-sensitivity').oninput({target:{value:'2'}});assert.equal(settings.sensitivity,2);
  document.getElementById('setting-controls').onchange({target:{value:'touch'}});assert.equal(TOUCH,true);
  document.getElementById('setting-controls').onchange({target:{value:'desktop'}});assert.equal(TOUCH,false);
  console.log('PASS: combat, controls, six map routes, machinery, enemies, boss, checkpoints, briefings, portals, rendering, settings');
`;
vm.runInNewContext(source.slice(0,source.lastIndexOf('})();'))+checks+'})();', {
  assert,console,document,listeners,timers,
  window:{innerWidth:960,innerHeight:540,matchMedia:()=>({matches:false}),addEventListener:noop},
  localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},performance:{now:()=>0},requestAnimationFrame:noop,
  addEventListener:(name,fn)=>{listeners[name]=fn;},
  setTimeout:fn=>{timers.set(++timerId,fn);return timerId;},clearTimeout:id=>timers.delete(id),
}, {timeout:5000});
