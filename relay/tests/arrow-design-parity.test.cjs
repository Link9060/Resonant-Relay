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
 for(const text of ['arrow-os-tray-header','arrow-os-tray-featured','arrow-os-tray-section','arrow-os-tray-footer','arrow-os-trigger','controlButton(\\'appearance\\'','controlButton(\\'settings\\'','controlButton(\\'notes\\'','controlButton(\\'tasks\\'','controlButton(\\'calendar\\''])assert.ok(js.includes(text),text);
 assert.match(js,/setOpen\(instance, false\)/);
 assert.match(js,/instance\.content\.inert = !open/);
});
test('ARROW command dock keeps narrow-screen and accessible contrast styles',()=>{
 const css=read(path.join(root,'public/arrow-shell.css'));
 for(const token of ['arrow-os-tray-grid','arrow-os-trigger-label','max-width:680px','prefers-reduced-motion','forced-colors:active','data-host-theme="light"','data-host-theme="dark"'])assert.ok(css.includes(token),token);
});
test('Orbit offers light and dark for all five identities',()=>{
 const css=from('ARROW_ORBIT_SOURCE','src/app/adapt.css');
 for(const id of ['core','bloom','haven','atelier','pulse'])assert.ok(css.includes('data-orbit-adapt="'+id+'"'),id);
 assert.match(css,/:root\[data-arrow-theme="light"\]/);
 assert.match(css,/:root\[data-arrow-theme="dark"\]/);
 assert.match(css,/adapt-view-switch/);
});
test('Waypoint light and dark share ARROW surface and text tokens',()=>{
 const css=from('ARROW_WAYPOINT_SOURCE','src/app/globals.css');
 assert.match(css,/:root\[data-arrow-theme="light"\]/);
 assert.match(css,/:root\[data-arrow-theme="dark"\]/);
 assert.match(css,/--arrow-accent-color/);
 assert.match(css,/capture-editor/);
});
test('Atlas light and dark use global ARROW theme and preserve graph data',()=>{
 const css=from('ARROW_ATLAS_SOURCE','apps/explorer/styles.css');
 assert.match(css,/:root\[data-arrow-theme="light"\]/);
 assert.match(css,/:root\[data-arrow-theme="dark"\]/);
 assert.match(css,/--canvas/);
 assert.match(css,/node-dialog/);
});
test('RAVIN respects ARROW light/dark, contrast and custom accent',()=>{
 const css=from('ARROW_RAVIN_SOURCE','ravin/public/arrow-ravin.css');
 assert.match(css,/data-arrow-ravin="true"\]\[data-arrow-theme="light"\]/);
 assert.match(css,/data-arrow-ravin="true"\]\[data-arrow-theme="dark"\]/);
 assert.match(css,/--rv-text/);
 assert.match(css,/--arrow-accent-on/);
});
