import {existsSync,readFileSync,readdirSync,statSync} from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
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
    if(/^arrow\/(?:orbit|waypoint|atlas|ravin)\/index\.html$/.test(relative)){
      // A comment or inline string mentioning the guard is not an executable gate.
      const scripts=[...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)];
      assert.ok(scripts.some(match=>{
        const url=new URL(match[1],base);
        return url.origin==='https://link9060.github.io'&&url.pathname===prefix+'/arrow/arrow-beta-guard.js';
      }),'Center entry is missing its executable beta gate: '+relative);
    }
  }
  if(file.endsWith('.js')){
    const source=readFileSync(file,'utf8');
    for(const item of source.matchAll(/\b(?:from\s*|import\s*\(\s*)["'](\.{1,2}\/[^"']+\.js(?:\?[^"']*)?)["']/g))if(localAsset(item[1],base))imports++;
  }
}
assert.ok(existsSync(path.join(root,'help/index.html')),'Missing notification/account setup guide');
const versionPath=path.join(root,'arrow/version.json');
assert.ok(existsSync(versionPath),'Missing beta center manifest');
const version=JSON.parse(readFileSync(versionPath,'utf8'));
const expected=JSON.parse(readFileSync(path.resolve('scripts/arrow-beta-centers.json'),'utf8'));
assert.deepEqual(version.centers,expected,'Packaged center SHAs do not match the exact integration pins');
const shellPath=path.join(root,'arrow/arrow-shell.js');
assert.ok(existsSync(shellPath),'Missing packaged ARROW shell');
const shellHash=createHash('sha256').update(readFileSync(shellPath)).digest('hex').slice(0,12);
assert.equal(version.shell,shellHash,'Packaged shell checksum does not match version.json');
const cssPath=path.join(root,'arrow/arrow-shell.css');
assert.ok(existsSync(cssPath),'Missing packaged ARROW shell CSS');
const cssHash=createHash('sha256').update(readFileSync(cssPath)).digest('hex').slice(0,12);
assert.equal(version.shellCss,cssHash,'Packaged shell CSS checksum does not match version.json');
console.log(`Verified ${checked} boot assets on ${pages} exported pages and ${imports} imported module dependencies.`);
