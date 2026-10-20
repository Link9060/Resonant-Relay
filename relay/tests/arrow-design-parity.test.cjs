/* eslint-disable @typescript-eslint/no-require-imports */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=(p)=>fs.readFileSync(p,'utf8');
const from=(key,p)=>{assert.ok(process.env[key],key+' missing');return read(path.join(process.env[key],p));};
test('ARROW command dock markup parses and preserves panel actions',()=>{
 const js=read(path.join(root,'public/arrow-shell.js'));
 assert.doesNotThrow(()=>new Function(js));
 for(const text of ['arrow-os-tray-header','arrow-os-tray-featured','arrow-os-tray-section','arrow-os-tray-footer','arrow-os-trigger',"controlButton('appearance'","controlButton('settings'","controlButton('notes'","controlButton('tasks'","controlButton('calendar'"]) assert.ok(js.includes(text),text);
 assert.match(js,/setOpen\(instance, false\)/);
 assert.match(js,/instance\.content\.inert = !open/);
});
test('ARROW command dock keeps narrow-screen and accessible contrast styles',()=>{
 const css=read(path.join(root,'public/arrow-shell.css'));
 for(const token of ['arrow-os-tray-grid','arrow-os-trigger-label','max-width:680px','prefers-reduced-motion','forced-colors:active','data-host-theme="light"','data-host-theme="dark"'])assert.ok(css.includes(token),token);
});
test('Orbit offers light and dark for all five identities',{skip:!process.env.ARROW_ORBIT_SOURCE},()=>{
 const css=from('ARROW_ORBIT_SOURCE','src/app/adapt.css');
 for(const id of ['core','bloom','haven','atelier','pulse'])assert.ok(css.includes('data-orbit-adapt="'+id+'"'),id);
 assert.match(css,/:root\[data-arrow-theme="light"\]/);
 assert.match(css,/:root\[data-arrow-theme="dark"\]/);
 assert.match(css,/adapt-view-switch/);
});
test('Waypoint light and dark share ARROW surface and text tokens',{skip:!process.env.ARROW_WAYPOINT_SOURCE},()=>{
 const css=from('ARROW_WAYPOINT_SOURCE','src/app/globals.css');
 assert.match(css,/:root\[data-arrow-theme="light"\]/);
 assert.match(css,/:root\[data-arrow-theme="dark"\]/);
 assert.match(css,/--arrow-accent-color/);
 assert.match(css,/capture-editor/);
});
test('Atlas light and dark use global ARROW theme and preserve graph data',{skip:!process.env.ARROW_ATLAS_SOURCE},()=>{
 const css=from('ARROW_ATLAS_SOURCE','apps/explorer/styles.css');
 assert.match(css,/:root\[data-arrow-theme="light"\]/);
 assert.match(css,/:root\[data-arrow-theme="dark"\]/);
 assert.match(css,/--canvas/);
 assert.match(css,/node-dialog/);
});
test('RAVIN respects ARROW light/dark, contrast and custom accent',{skip:!process.env.ARROW_RAVIN_SOURCE},()=>{
 const css=from('ARROW_RAVIN_SOURCE','ravin/public/arrow-ravin.css');
 assert.match(css,/data-arrow-ravin="true"\]\[data-arrow-theme="light"\]/);
 assert.match(css,/data-arrow-ravin="true"\]\[data-arrow-theme="dark"\]/);
 assert.match(css,/--rv-text/);
 assert.match(css,/--arrow-accent-on/);
});


test('all five identities define independent body and display type families',()=>{
 const css=read(path.join(root,'public/arrow-shell.css'));
 for(const id of ['core','bloom','haven','atelier','pulse']) assert.ok(css.includes('data-arrow-adapt="'+id+'"'),id);
 for(const token of ['--arrow-font-body','--arrow-font-display','--arrow-identity-radius','font-family:var(--arrow-font-body)','font-family:var(--arrow-font-display)']) assert.ok(css.includes(token),token);
 assert.match(css,/body :is\(h1,h2,h3,h4,h5,h6\)/);
 assert.match(css,/body :is\(code,pre,kbd,samp/);
});
test('hover previews on desktop while click and Escape remain usable',()=>{
 const js=read(path.join(root,'public/arrow-shell.js'));
 const css=read(path.join(root,'public/arrow-shell.css'));
 assert.match(js,/matchMedia\('\(hover: hover\) and \(pointer: fine\)'\)\.matches/);
 assert.match(js,/instance\.closeTimer = setTimeout/);
 assert.match(js,/instance\.trigger\.addEventListener\('click'/);
 assert.match(js,/openInstance\.trigger\.focus/);
 assert.match(css,/\.arrow-os-root\[data-open="true"\]::after/);
});
test('Balanced, Quiet, Dynamic and Glass remain distinct across the shared shell',()=>{
 const css=read(path.join(root,'public/arrow-shell.css'));
 for(const id of ['balanced','quiet','dynamic','glass'])assert.ok(css.includes('data-arrow-experience="'+id+'"'),id);
 assert.match(css,/--arrow-mode-blur/);
 assert.match(css,/--arrow-mode-alpha/);
 assert.match(css,/data-arrow-experience="glass".*arrow-os-control/);
});
for(const [title,env,file,selectors] of [
 ['Orbit','ARROW_ORBIT_SOURCE','src/app/adapt.css',['adapt-widget','adapt-dashboard']],
 ['Waypoint','ARROW_WAYPOINT_SOURCE','src/app/globals.css',['waypoint-app','planning-editor']],
 ['Atlas','ARROW_ATLAS_SOURCE','apps/explorer/styles.css',['app-shell','node-dialog']],
 ['RAVIN','ARROW_RAVIN_SOURCE','ravin/public/arrow-ravin.css',['ravin-composer','ravin-sidebar']]
]){
 test(title+' keeps each material mode independent of its identity',{skip:!process.env[env]},()=>{
  const css=from(env,file);
  for(const id of ['balanced','quiet','dynamic','glass']) assert.ok(css.includes('data-arrow-experience="'+id+'"'),title+' missing '+id);
  for(const needle of selectors) assert.ok(css.includes(needle),title+' missing '+needle);
  assert.match(css,/data-arrow-motion="reduce"/);
 });
}
test('Relay surfaces use four distinct material modes and respect typography',()=>{
 const css=read(path.join(root,'src/app/experience.css'));
 for(const id of ['balanced','quiet','dynamic','glass']) assert.ok(css.includes('data-arrow-experience="'+id+'"'),id);
 assert.match(css,/\.relay-communications-hero/);
});
