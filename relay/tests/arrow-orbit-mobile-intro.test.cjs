/* eslint-disable @typescript-eslint/no-require-imports */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const path=require('node:path');
const postcss=require('postcss');

const source=readFileSync(path.join(__dirname,'../public/arrow-shell.css'),'utf8');
const stylesheet=postcss.parse(source);
const mobile=stylesheet.nodes.filter(node=>node.type==='atrule'&&node.name==='media'&&/max-width:\s*680px/.test(node.params)).at(-1);
assert.ok(mobile,'missing mobile welcome styles');

function ruleFor(selectorPart){
 let result;
 mobile.walkRules(rule=>{if(rule.selector.includes(selectorPart))result=rule;});
 assert.ok(result,'missing '+selectorPart);
 return result;
}
function props(rule){
 const result={};
 rule.walkDecls(d=>{result[d.prop]=d.value+(d.important?' !important':'');});
 return result;
}

test('before Enter Orbit, mobile world nodes and tools do not compete with the welcome message',()=>{
 const rule=ruleFor('.world-shell:is(.intro-intro, .intro-collapsing)');
 const selector=rule.selector;
 for(const name of ['.destination-layer','.orbit-core-label','.craft-orbit','.orbit-links','.world-inspector','.orbit-shortcuts','.orbit-location-tools','.orbit-extra-location','.orbit-command-toggle']){
  assert.ok(selector.includes(name),'did not hide '+name);
 }
 assert.equal(props(rule).display,'none !important');
 assert.equal(selector.includes('.intro-command'),false,'do not hide navigation after Enter Orbit');
 assert.equal(selector.includes('.world-canvas'),false,'must keep sphere visible');
 assert.equal(selector.includes('.orbit-intro-card'),false,'must keep onboarding action visible');
});

test('mobile welcome message stays centered and scrollable with accessible Enter Orbit button',()=>{
 const zone=props(ruleFor('.world-shell.intro-intro .orbit-left-zone'));
 assert.equal(zone['overflow-y'],'auto');
 assert.match(zone.width,/auto/);
 assert.match(zone['max-height'],/100dvh/);
 const intro=props(ruleFor('.world-shell.intro-intro .orbit-intro-card'));
 assert.equal(intro['text-align'],'center');
 const button=props(ruleFor('.world-shell.intro-intro .orbit-intro-enter'));
 assert.equal(button['min-height'],'48px');
 assert.equal(button['touch-action'],'manipulation');
});

test('first-run owner and notification overlays are hidden but normal mobile controls remain available',()=>{
 const selector=ruleFor('body:has(.orbit-app .world-shell:is(.intro-intro,.intro-collapsing))').selector;
 assert.ok(selector.includes('.arrow-role-preview'));
 assert.ok(selector.includes('.arrow-os-notification-button'));
 assert.equal(props(ruleFor('body:has(.orbit-app .world-shell:is(.intro-intro,.intro-collapsing))')).display,'none !important');
 assert.equal(selector.includes('.intro-command'),false);
});
