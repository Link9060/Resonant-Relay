import {execFileSync} from 'node:child_process';
import {cpSync,existsSync,mkdirSync,readFileSync,writeFileSync,rmSync,readdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const relay=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const work=path.join(relay,'.arrow-beta-build');
const output=path.join(relay,'out');
const base='/Resonant-Relay/arrow';
const manifest=JSON.parse(readFileSync(path.join(relay,'scripts/arrow-beta-centers.json'),'utf8'));
const run=(command,args,cwd,env={})=>execFileSync(command,args,{cwd,env:{...process.env,...env},stdio:'inherit'});
if(process.env.NEXT_PUBLIC_RELAY_DEPLOY_TARGET!=='github-pages')throw new Error('ARROW beta packaging must use the GitHub Pages beta target.');
run('npm',['run','build'],relay);
rmSync(work,{recursive:true,force:true});mkdirSync(work,{recursive:true});
function source(repo){
  if(process.env.ARROW_BETA_LOCAL_ROOT)return path.join(process.env.ARROW_BETA_LOCAL_ROOT,repo);
  const dir=path.join(work,repo);run('git',['init',dir],relay);run('git',['remote','add','origin','https://github.com/Link9060/'+repo+'.git'],dir);
  run('git',['fetch','--depth=1','origin',manifest[repo]],dir);run('git',['checkout','--detach','FETCH_HEAD'],dir);return dir;
}
function compile(repo,center,key){
  const dir=source(repo);if(!process.env.ARROW_BETA_LOCAL_ROOT)run('npm',existsSync(path.join(dir,'package-lock.json'))?['ci']:['install','--no-audit','--no-fund'],dir);
  run('npm',['run','build'],dir,{[key]:base+'/'+center,NEXT_PUBLIC_ARROW_SHELL_BASE:base});
  cpSync(path.join(dir,'out'),path.join(output,'arrow',center),{recursive:true});return dir;
}
const orbit=compile('Resonant-Orbit','orbit','NEXT_PUBLIC_ORBIT_BASE_PATH');
run(process.execPath,['--test','tests/arrow-shell.test.cjs','tests/entertainment.test.cjs'],orbit);
compile('Resonant-Waypoint','waypoint','NEXT_PUBLIC_WAYPOINT_BASE_PATH');
const atlas=source('Resonant-Field');cpSync(path.join(atlas,'apps/explorer'),path.join(output,'arrow','atlas'),{recursive:true});
const ravin=source('Project-R.A.V.I.N.-1.1');cpSync(path.join(ravin,'ravin/public'),path.join(output,'arrow','ravin'),{recursive:true});
const common=path.join(output,'arrow');
for(const name of ['arrow-shell.js','arrow-shell.css'])cpSync(path.join(orbit,'public',name),path.join(common,name));
cpSync(path.join(relay,'public/arrow-beta-guard.js'),path.join(common,'arrow-beta-guard.js'));
cpSync(path.join(ravin,'ravin/src/nextMove.js'),path.join(common,'next-move.js'));
cpSync(path.join(ravin,'ravin/src/autoPlanner.js'),path.join(common,'autoPlanner.js'));
function patchHtml(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())patchHtml(file);else if(entry.name.endsWith('.html')){
  let html=readFileSync(file,'utf8').replace(/(["'])\/arrow-shell\.(js|css)(\?[^"']*)?\1/g,(_m,quote,ext)=>quote+base+'/arrow-shell.'+ext+'?v=beta-repair-1'+quote);
  html=html.replace(/<script[^>]*src=["']\/arrow-auth-guard\.js[^"']*["'][^>]*><\/script>/g,'');
  html=html.replace(/<link[^>]*href=["']\/arrow-auth-guard\.js[^"']*["'][^>]*>/g,'');
  html=html.replace(/<head>/i,'<head><script src="'+base+'/arrow-beta-guard.js?v=beta-repair-1"></script>');writeFileSync(file,html);
}}}
patchHtml(common);
writeFileSync(path.join(output,'.nojekyll'),'');
run(process.execPath,['scripts/validate-arrow-beta-assets.mjs'],relay);
