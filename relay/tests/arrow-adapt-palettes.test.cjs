/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname,'..');
const shell = fs.readFileSync(path.join(root,'public/arrow-shell.js'),'utf8');
const css = fs.readFileSync(path.join(root,'public/arrow-shell.css'),'utf8');
const chat = fs.readFileSync(path.join(root,'src/app/(app)/chats/page.tsx'),'utf8');

test('each Adapt identity offers its own palette choices', () => {
  for(const id of ['core','bloom','haven','atelier','pulse']){
    assert.match(shell,new RegExp('\\b'+id+':\\s*\\['));
  }
  for(const palette of ['cobalt','violet','scarlet','petal','lilac','forest','sage','champagne','burgundy','voltage','hyperpop']){
    assert.ok(shell.includes("'"+palette+"'"),palette+' is missing');
  }
});
test('custom color is offered on every Adapt identity with independent storage',()=>{
  assert.match(shell,/adaptPalettes: 'arrow_os_adapt_palettes_v1'/);
  assert.match(shell,/adaptCustomColors: 'arrow_os_adapt_custom_colors_v1'/);
  assert.match(shell,/data-accent-choice="custom"/);
  assert.match(shell,/paletteChoices\(currentIdentity\)/);
  assert.match(shell,/getCustomColor\(currentIdentity\)/);
  assert.match(shell,/getAccentChoice\(normalized\)/);
});
test('color schemes use both primary and secondary colors throughout the shell',()=>{
  assert.match(shell,/--arrow-adapt-primary/);
  assert.match(shell,/--arrow-adapt-secondary/);
  assert.match(shell,/--arrow-adapt-gradient/);
  assert.match(css,/arrow-os-palette-grid/);
  assert.match(css,/var\(--swatch-secondary/);
});
test('Relay is a communications hub with actual conversations, not a duplicate dashboard',()=>{
  assert.match(chat,/Stay connected\./);
  assert.match(chat,/homeFilter/);
  assert.match(chat,/homeConversations/);
  assert.match(chat,/Contacts/);
  assert.ok(!fs.existsSync(path.join(root,'src/app/(app)/legacy-dashboard/page.tsx')));
});
