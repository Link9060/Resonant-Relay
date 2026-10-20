/* eslint-disable @typescript-eslint/no-require-imports */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read = (p) => fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('Relay opens with conversations, not a duplicate widget dashboard', ()=>{
  assert.match(read('src/app/(app)/page.tsx'), /ChatsPage home/);
  assert.doesNotMatch(read('src/app/(app)/page.tsx'), /dashboard-page/);
});
test('Relay no longer exposes the old widget dashboard route', ()=>{
  assert.equal(fs.existsSync(path.join(__dirname,'..','src/app/(app)/legacy-dashboard/page.tsx')),false);
});
test('Relay mobile navigation is communication-first', ()=>{
  const dock=read('src/components/dock.tsx');
  const mobile=dock.split('const mobileItems:')[1]?.split('return (')[0] || '';
  assert.match(mobile, /href: '\/chats'/);
  assert.match(mobile,/href: '\/', label: 'Home'/);
  assert.doesNotMatch(mobile,/label: 'Dashboard'/);
});
