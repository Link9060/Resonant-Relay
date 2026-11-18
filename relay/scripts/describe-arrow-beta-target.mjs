import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const relay = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = join(relay, '..');
const filename = join(relay, 'scripts', 'arrow-beta-centers.json');
const manifest = JSON.parse(readFileSync(filename, 'utf8'));
const expected = ['Resonant-Orbit','Resonant-Waypoint','Resonant-Field','Project-R.A.V.I.N.-1.1'];
const invalid = expected.filter(name => typeof manifest[name] !== 'string' || !/^[0-9a-f]{40}$/i.test(manifest[name]));
if(invalid.length || Object.keys(manifest).sort().join(',') !== expected.slice().sort().join(',')) {
  throw new Error('Integrated ARROW Beta manifest must contain exactly four full commit SHAs. Bad entries: '+invalid.join(', '));
}
const deploy = readFileSync(join(repoRoot,'.github','workflows','deploy-pages.yml'),'utf8');
const build = readFileSync(join(relay,'scripts','build-arrow-beta.mjs'),'utf8');
if(!/branches:\s*\[beta\]/.test(deploy) || !deploy.includes('node scripts/build-arrow-beta.mjs')) {
  throw new Error('ARROW Beta deploy workflow no longer uses branch beta + pinned integration packaging.');
}
if(!build.includes('arrow-beta-centers.json') || !build.includes("manifest[repo]")) {
  throw new Error('Integrated ARROW Beta build no longer checks out pinned center SHAs.');
}
const command = spawnSync('git',['branch','--show-current'],{cwd:repoRoot,encoding:'utf8'});
const branch = process.env.GITHUB_HEAD_REF || command.stdout?.trim() || '(detached checkout)';
const base = process.env.GITHUB_BASE_REF || '';
console.log('=== INTEGRATED ARROW BETA SOURCE OF TRUTH ===');
console.log('Live URL: https://link9060.github.io/Resonant-Relay/arrow/orbit/');
console.log('Deployment owner: Link9060/Resonant-Relay branch beta');
console.log('Current checkout:',branch);
if(base) console.log('Pull request target:',base);
for(const name of expected) console.log(name.padEnd(25)+' '+manifest[name]);
console.log('Standalone repository main-branch changes do NOT update the beta.');
console.log('To preview a module fix, pin its exact review-branch commit in this manifest.');
console.log('No deployment occurs until the Relay beta branch is explicitly merged/pushed.');
if(process.argv.includes('--verify')) {
  if(base && base !== 'beta') throw new Error('Integrated ARROW Beta PR must target Relay beta, not '+base);
  if(branch === 'main') throw new Error('Refusing to validate an integrated ARROW beta change on Relay main.');
}
