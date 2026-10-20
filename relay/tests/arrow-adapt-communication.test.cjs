/* eslint-disable @typescript-eslint/no-require-imports */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read = (p) => fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('Relay opens with conversations, not a duplicate widget dashboard', ()=>{
  assert.match(read('src/app/(app)/page.tsx'), /chats\/page/);
  assert.doesNotMatch(read('src/app/(app)/page.tsx'), /dashboard-page/);
});
test('Old dashboard remains accessible during the migration for safe rollback', ()=>{
  assert.match(read('src/app/(app)/legacy-dashboard/page.tsx'), /dashboard-page/);
});
test('Relay mobile navigation is communication-first', ()=>{
  const dock=read('src/components/dock.tsx');
  const mobile=dock.split('const mobileItems:')[1]?.split('return (')[0] || '';
  assert.match(mobile, /href: '\/chats'/);
  assert.doesNotMatch(mobile,/href: '\/', label: 'Home'/);
});
