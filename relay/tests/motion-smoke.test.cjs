const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('1.0.3 motion classes are present', () => {
  const css = read('src/app/beta-experience.css');
  for (const name of ['relay-motion-row-in', 'relay-motion-row-out', 'relay-motion-check', 'relay-motion-pop', 'relay-motion-sheet', 'relay-motion-calendar-forward']) {
    assert.match(css, new RegExp(`\\.${name}`));
  }
});

test('major interaction surfaces opt into motion', () => {
  const files = [
    'src/components/todos/weekly-todo-list.tsx',
    'src/components/notes/notes-workspace.tsx',
    'src/components/chats/message-thread.tsx',
    'src/components/notifications/notification-bell.tsx',
    'src/components/contacts/contacts-list.tsx',
    'src/app/(app)/calendar/page.tsx',
    'src/app/(app)/email/page.tsx',
    'src/app/(app)/quicklinks/page.tsx',
  ];
  for (const file of files) assert.match(read(file), /relay-motion-/);
});

test('reduced motion remains supported', () => {
  assert.match(read('src/app/beta-experience.css'), /prefers-reduced-motion/);
});
