/* eslint-disable @typescript-eslint/no-require-imports */
/* ARROW Beta: regression checks for the Orbit mobile overlap repair. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const path=require('node:path');
const postcss=require('postcss');

const source=readFileSync(path.join(__dirname,'../public/arrow-shell.css'),'utf8');
const stylesheet=postcss.parse(source);
const mobile=stylesheet.nodes.filter(node=>node.type==='atrule' && node.name==='media' && node.params.includes('max-width: 680px')).at(-1);
assert.ok(mobile,'Expected dedicated mobile Orbit media query');

function declarations(selector){
 const found=[];
 mobile.walkRules(rule=>{if(rule.selector===selector){const props={};rule.walkDecls(d=>{props[d.prop]=d.value+(d.important?' !important':'');});found.push(props);}});
 assert.ok(found.length,'Missing expected mobile selector: '+selector);
 return found.at(-1);
}

test('mobile Orbit shortcuts have an explicit non-stretching bottom and height',()=>{
 const nav=declarations('.orbit-app .orbit-shortcuts');
 assert.match(nav.bottom,/^auto\s*!important$/);
 assert.match(nav.height,/^max-content\s*!important$/);
 assert.match(nav.top,/^calc\(/);
 assert.match(nav['max-width'],/100vw/);
});

test('mobile Orbit keeps command and quick locations above compact shortcuts',()=>{
 const cmd=declarations('.orbit-app .orbit-command-toggle');
 const loc=declarations('.orbit-app .orbit-location-tools');
 const nav=declarations('.orbit-app .orbit-shortcuts');
 assert.equal(cmd.top,loc.top);
 assert.notEqual(cmd.top,nav.top);
 assert.equal(loc.bottom,'auto');
 assert.equal(loc.transform,'none');
 assert.equal(declarations('.orbit-app .orbit-shortcut')['min-height'],'44px');
});

test('welcome screen, owner preview and notifications have independent mobile rules',()=>{
 const intro=mobile.nodes.find(node=>node.type==='rule' && node.selector.includes('.world-shell.intro-intro .orbit-shortcuts'));
 assert.ok(intro && intro.nodes.some(x=>x.prop==='display'&&x.value.includes('none')));
 const role=declarations('body:has(.orbit-app) .arrow-role-preview');
 const notif=declarations('body:has(.orbit-app) .arrow-os-notification-button');
 assert.notEqual(role.bottom,notif.bottom);
 assert.ok(role.bottom.includes('safe-area-inset-bottom'));
 assert.ok(notif.bottom.includes('safe-area-inset-bottom'));
 assert.equal(declarations('body:has(.orbit-app) .arrow-role-preview select')['min-height'],'44px');
});
