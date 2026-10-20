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


// ARROW Adapt III regression coverage: each identity changes interface composition,
// not merely fonts and palette tokens. Core must stay as the unchanged baseline.
test('shared dock changes control geometry and grouping for every non-Core identity',()=>{
 const css=read(path.join(root,'public/arrow-shell.css'));
 for(const id of ['bloom','haven','atelier','pulse']) {
  assert.ok(css.includes('data-arrow-adapt="'+id+'"] .arrow-os-root'),id+' dock missing');
 }
 assert.match(css,/data-arrow-adapt="bloom".*arrow-os-control/);
 assert.match(css,/data-arrow-adapt="haven".*arrow-os-tray-section/);
 assert.match(css,/data-arrow-adapt="atelier".*arrow-os-tray-grid/);
 assert.match(css,/data-arrow-adapt="pulse".*arrow-os-tray-featured/);
 assert.match(css,/prefers-reduced-motion/);
});
test('Relay switches actual desktop navigation architecture in Atelier',()=>{
 const css=read(path.join(root,'src/app/adapt-identities.css'));
 const rootLayout=read(path.join(root,'src/app/layout.tsx'));
 assert.match(rootLayout,/import '\.\/adapt-identities\.css'/);
 for(const id of ['bloom','haven','atelier','pulse'])assert.ok(css.includes('data-arrow-adapt="'+id+'"'),id);
 assert.match(css,/data-arrow-adapt="atelier".*relay-primary-cluster/);
 assert.match(css,/flex-direction:row/);
 assert.match(css,/padding-top:76px/);
 assert.match(css,/relay-mobile-nav/);
});
test('Orbit has distinct home hero markup for four identities',{skip:!process.env.ARROW_ORBIT_SOURCE},()=>{
 const jsx=from('ARROW_ORBIT_SOURCE','src/components/orbit-dashboard.tsx');
 const css=from('ARROW_ORBIT_SOURCE','src/app/adapt.css');
 for(const id of ['bloom','haven','atelier','pulse']){
  assert.ok(jsx.includes('adapt-intro-'+id),id+' missing masthead');
  assert.ok(css.includes('data-orbit-adapt="'+id+'"'),id+' missing screen layout');
 }
 assert.match(css,/adapt-view-switch/);
 assert.match(jsx,/OrbitWidgetStudio/);
});
for(const [moduleName,env,path,features] of [
 ['Waypoint','ARROW_WAYPOINT_SOURCE','src/app/globals.css',['.waypoint-app .sidebar','.waypoint-app .nav-item','.waypoint-app .topbar']],
 ['Atlas','ARROW_ATLAS_SOURCE','apps/explorer/styles.css',['.app-shell .sidebar','.app-shell .topbar','.app-shell .inspector']],
 ['RAVIN','ARROW_RAVIN_SOURCE','ravin/public/arrow-ravin.css',['.ravin-sidebar','.ravin-main','.ravin-composer']]
]) {
 test(moduleName+' changes navigation and content composition with Adapt',{skip:!process.env[env]},()=>{
  const css=from(env,path);
  assert.match(css,/ARROW Adapt III/);
  for(const id of ['bloom','haven','atelier','pulse'])assert.ok(css.includes('data-arrow-adapt="'+id+'"'),moduleName+' '+id);
  for(const feature of features)assert.ok(css.includes(feature),moduleName+' feature '+feature);
  assert.match(css,/prefers-reduced-motion/);
 });
}


/* Adapt IV · Interaction guarantees. No new module data model required. */
test('Relay keeps legacy mobile routes and adds identity-specific ARROW module launcher',()=>{
 const jsx=read(path.join(root,'src/components/dock.tsx'));
 const css=read(path.join(root,'src/app/adapt-identities.css'));
 for(const selector of ['relay-mobile-nav','relay-adapt-mobile-hub','relay-adapt-hub-menu']) {
  assert.ok(jsx.includes(selector),selector+' missing from navigation');
  assert.ok(css.includes(selector),selector+' missing from identity design');
 }
 for(const center of ['orbit','ravin','atlas','waypoint']) assert.ok(jsx.includes("'"+center+"'"),center);
 assert.match(jsx,/<details className="relay-adapt-mobile-hub/);
 assert.match(jsx,/<summary aria-label="Open ARROW module shortcuts"/);
 assert.match(css,/data-arrow-adapt="atelier".*relay-adapt-hub-menu/);
 assert.match(css,/data-arrow-adapt="bloom".*relay-adapt-mobile-hub/);
 assert.match(css,/data-arrow-adapt="pulse".*relay-mobile-nav/);
});
test('Atlas map controls and mobile filters call existing graph actions',{skip:!process.env.ARROW_ATLAS_SOURCE},()=>{
 const markup=from('ARROW_ATLAS_SOURCE','apps/explorer/index.html');
 const js=from('ARROW_ATLAS_SOURCE','apps/explorer/app.js');
 const css=from('ARROW_ATLAS_SOURCE','apps/explorer/styles.css');
 assert.doesNotThrow(()=>new Function(js));
 for(const id of ['atlasMobileFilters','atlasSidebar','atlasMobileScrim','atlasMapFit','atlasMapMinus','atlasMapPlus','atlasMapZoomLabel']){
  assert.ok(markup.includes('id="'+id+'"'),id+' missing markup');
  assert.ok(js.includes("'#"+id+"'"),id+' missing wiring');
 }
 assert.match(js,/setAtlasFiltersOpen/);
 assert.match(js,/updateZoom\(\)/);
 assert.match(js,/graphIdentityThemeCache/);
 for(const id of ['bloom','haven','atelier','pulse']) assert.ok(js.includes(id+': {'),id+' canvas style');
 assert.match(js,/arrow:accentchange/);
 assert.match(markup,/aria-expanded="false"/);
 assert.match(css,/html\.atlas-filters-open/);
 for(const id of ['bloom','haven','atelier','pulse'])assert.ok(css.includes('data-arrow-adapt="'+id+'"] .atlas-map-controls'),id);
});
test('RAVIN provides accessible functional identity command strip and focus mode',{skip:!process.env.ARROW_RAVIN_SOURCE},()=>{
 const js=from('ARROW_RAVIN_SOURCE','ravin/public/ravin-shell.js');
 const css=from('ARROW_RAVIN_SOURCE','ravin/public/arrow-ravin.css');
 assert.doesNotThrow(()=>new Function(js));
 for(const id of ['adaptNewChatBtn','adaptSearchBtn','adaptFocusBtn']) assert.ok(js.includes('id="'+id+'"'),id);
 assert.match(js,/aria-pressed="false"/);
 assert.match(js,/dataset\.adaptFocus/);
 assert.match(js,/function setAdaptFocus/);
 assert.match(js,/setAdaptFocus\(false\)/);
 assert.match(js,/toggleSidebar\(\)/);
 assert.match(js,/data-arrow-open="tasks"/);
 assert.match(js,/data-arrow-open="calendar"/);
 assert.match(css,/data-adapt-focus="true"/);
 for(const id of ['bloom','haven','atelier','pulse'])assert.ok(css.includes('data-arrow-adapt="'+id+'"] .ravin-adapt-commandbar'),id);
});


test('Waypoint preserves six mobile planning tabs and changes geometry per identity',{skip:!process.env.ARROW_WAYPOINT_SOURCE},()=>{
 const css=from('ARROW_WAYPOINT_SOURCE','src/app/globals.css');
 const jsx=from('ARROW_WAYPOINT_SOURCE','src/components/waypoint-shell.tsx');
 assert.match(jsx,/className="nav"/);
 assert.match(jsx,/aria-current=\{activeTab===id/);
 assert.match(css,/grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
 assert.match(css,/\.nav-item span:not\(\.nav-badge\)/);
 for(const id of ['bloom','haven','atelier','pulse']){
  assert.ok(css.includes('data-arrow-adapt="'+id+'"] .waypoint-app .sidebar'),id+' mobile layout missing');
 }
});


test('Adapt V Appearance preview never changes account settings until user applies',()=>{
 const shell=read(path.join(root,'public/arrow-shell.js'));
 const css=read(path.join(root,'public/arrow-shell.css'));
 assert.match(shell,/function renderIdentityPreview/);
 assert.match(shell,/function renderPreviewLab/);
 assert.match(shell,/data-adapt-preview-stage/);
 assert.match(shell,/data-adapt-preview-choice/);
 assert.doesNotMatch(shell,/data-adapt-preview-theme/);
 assert.doesNotMatch(shell,/data-adapt-choice=/);
 assert.match(shell,/data-theme-choice/);
 assert.match(shell,/arrow-os-appearance-advanced/);
 assert.match(shell,/data-adapt-preview-apply/);
 assert.match(shell,/Sample only. The preview follows/);
 assert.match(shell,/addEventListener\('click', \(\) => applyAdapt\(previewIdentity,true\)\)/);
 assert.match(css,/data-preview-identity="bloom"/);
 assert.match(css,/data-preview-identity="haven"/);
 assert.match(css,/data-preview-identity="atelier"/);
 assert.match(css,/data-preview-identity="pulse"/);
 assert.match(css,/data-preview-theme="dark"/);
 assert.doesNotThrow(()=>new Function(shell));
});
test('Core widgets are preserved while non-Core identities use native component composition',{skip:!process.env.ARROW_ORBIT_SOURCE},()=>{
 const studio=from('ARROW_ORBIT_SOURCE','src/components/orbit-widget-studio.tsx');
 const native=from('ARROW_ORBIT_SOURCE','src/components/adapt-native-ui.tsx');
 assert.match(studio,/NativeWidgetFrame/);
 assert.match(studio,/NativeGalleryRow/);
 assert.match(native,/switch\(identity\)/);
 assert.match(native,/default:return <div className="adapt-widget-top"/);
 for(const id of ['bloom','haven','atelier','pulse']) assert.ok(native.includes("case '"+id+"'"),id+' missing composition');
 assert.match(native,/MutationObserver/);
});


test('Appearance has one identity chooser and one global theme control',()=>{
 const js=read(path.join(root,'public/arrow-shell.js'));
 const css=read(path.join(root,'public/arrow-shell.css'));
 assert.match(js,/data-adapt-preview-choice/);
 assert.match(js,/data-adapt-preview-apply/);
 assert.doesNotMatch(js,/data-adapt-choice="/);
 assert.doesNotMatch(js,/data-adapt-preview-theme/);
 assert.match(js,/applyTheme\(button\.dataset\.themeChoice, true\)/);
 assert.match(css,/\.arrow-os-panel\[data-panel="appearance"\]/);
 assert.match(css,/\.arrow-os-appearance-advanced/);
 assert.doesNotThrow(()=>new Function(js));
});
test('Orbit immersive world follows identities and light dark',{skip:!process.env.ARROW_ORBIT_SOURCE},()=>{
 const css=from('ARROW_ORBIT_SOURCE','src/app/adapt.css');
 const tsx=from('ARROW_ORBIT_SOURCE','src/components/orbit-adapt.tsx');
 assert.match(css,/Adapt V\.1: native identities now extend into the IMMERSIVE Orbit world/);
 for(const name of ['bloom','haven','atelier','pulse']){
  assert.ok(css.includes('data-orbit-adapt="'+name+'"]'),name+' world composition');
 }
 assert.match(css,/data-arrow-theme="light".*orbit-app/);
 assert.match(css,/world-canvas/);
 assert.match(css,/orbit-command-panel/);
 assert.match(tsx,/data-orbit-adapt=\{theme\}/);
});
test('RAVIN command controls use a true three-row grid for identity layouts',{skip:!process.env.ARROW_RAVIN_SOURCE},()=>{
 const css=from('ARROW_RAVIN_SOURCE','ravin/public/ravin-waypoint.css');
 assert.match(css,/grid-template-rows:auto auto minmax\(0,1fr\)!important/);
 assert.match(css,/\.ravin-adapt-commandbar/);
 assert.match(css,/\.ravin-workspace/);
 assert.match(css,/\.ravin-composer-zone/);
});
