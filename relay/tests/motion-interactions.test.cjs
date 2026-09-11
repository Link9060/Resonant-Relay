const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('to-do animates create complete and delete states', () => {
  const source = read('src/components/todos/weekly-todo-list.tsx');
  assert.match(source, /enteringId/);
  assert.match(source, /completedPulseId/);
  assert.match(source, /removingId/);
});

test('chat animates realtime messages reactions and removal', () => {
  const source = read('src/components/chats/message-thread.tsx');
  assert.match(source, /freshMessageId/);
  assert.match(source, /reactionPulse/);
  assert.match(source, /removingMessageId/);
});

test('notes animate note and block changes', () => {
  const source = read('src/components/notes/notes-workspace.tsx');
  assert.match(source, /newNoteId/);
  assert.match(source, /newBlockId/);
  assert.match(source, /movingBlockId/);
});
