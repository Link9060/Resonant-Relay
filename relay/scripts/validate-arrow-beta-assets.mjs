import {existsSync,readFileSync,readdirSync,statSync} from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve('out'),prefix='/Resonant-Relay';
let checked=0,pages=0,imports=0;
function walk(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(path.join(dir,entry.name)):[path.join(dir,entry.name)]);}
function localAsset(href,base){
  const url=new URL(href,base);
  if(url.hostname!=='link9060.github.io')return null;
  assert.ok(url.pathname.startsWith(prefix+'/'),'Asset escaped beta: '+url.href);
  const file=path.join(root,decodeURIComponent(url.pathname.slice(prefix.length)));
  assert.ok(existsSync(file)&&statSync(file).isFile(),'Missing beta asset: '+url.pathname);
  return file;
}
for(const file of walk(root)){
  const relative=path.relative(root,file).split(path.sep).join('/');
  const base='https://link9060.github.io'+prefix+'/'+relative;
  if(file.endsWith('.html')){
    pages++;
    const html=readFileSync(file,'utf8');
    for(const tag of html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)=["']([^"']+)["'][^>]*>/g))if(localAsset(tag[1],base))checked++;
    if(/^arrow\/(?:orbit|waypoint|atlas|ravin)\/index\.html$/.test(relative))assert.match(html,/arrow-beta-guard\.js/,'Center entry is missing its beta gate: '+relative);
  }
  if(file.endsWith('.js')){
    const source=readFileSync(file,'utf8');
    for(const item of source.matchAll(/\b(?:from\s*|import\s*\(\s*)["'](\.{1,2}\/[^"']+\.js(?:\?[^"']*)?)["']/g))if(localAsset(item[1],base))imports++;
  }
}
assert.ok(existsSync(path.join(root,'help/index.html')),'Missing notification/account setup guide');
assert.ok(existsSync(path.join(root,'arrow/version.json')),'Missing beta center manifest');
console.log(`Verified ${checked} boot assets on ${pages} exported pages and ${imports} imported module dependencies.`);
