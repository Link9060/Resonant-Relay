import {existsSync,readFileSync} from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve('out');const prefix='/Resonant-Relay';let checked=0;
for(const route of ['/', '/login/', '/arrow/orbit/','/arrow/waypoint/','/arrow/atlas/','/arrow/ravin/']) {
  const html=readFileSync(path.join(root,route,'index.html'),'utf8');
  for(const tag of html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)=["']([^"']+)["'][^>]*>/g)) {
    const url=new URL(tag[1],'https://link9060.github.io'+prefix+route);if(url.hostname!=='link9060.github.io')continue;
    const file=decodeURIComponent(url.pathname).slice(prefix.length);
    assert.ok(url.pathname.startsWith(prefix+'/'),'Asset escaped beta: '+url.href);
    assert.ok(existsSync(path.join(root,file)),'Missing boot asset on '+route+': '+url.pathname);checked++;
  }
}
console.log('Verified '+checked+' beta boot assets across six entry pages.');
