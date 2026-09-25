const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync('src/app/(app)/layout.tsx', 'utf8');
const snippet = source.slice(source.indexOf('    async function getAuthenticatedUser()'), source.indexOf('    async function loadAccountData('));
function loader(auth) {
  const context = vm.createContext({supabase: {auth}, withTimeout: p => p, wait: async () => {}});
  vm.runInContext(ts.transpileModule(snippet + '\nthis.load = getAuthenticatedUser;', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText, context);
  return context.load;
}
test('signed-out visitors redirect rather than raising a session load failure', async () => {
  let attempts = 0;
  const load = loader({
    getUser: async () => { attempts++; return {data:{user:null},error:{name:'AuthSessionMissingError'}}; },
    getSession: async () => ({data:{session:null},error:null}),
  });
  assert.equal(await load(), null);
  assert.equal(attempts, 1);
});
test('session lookup failures stay visible instead of being treated as signed out', async () => {
  const error = new Error('connection unavailable');
  const load = loader({getUser: async () => {throw error;},getSession: async () => {throw error;}});
  await assert.rejects(load(), /connection unavailable/);
});
test('validated users keep their normal app loading path', async () => {
  const user = {id:'fixture-user'};
  const load = loader({getUser: async () => ({data:{user},error:null})});
  assert.equal(await load(), user);
});
