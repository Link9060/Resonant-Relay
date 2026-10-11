const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const {createHash} = require('node:crypto');

test('beta packaging preserves Next chunk identity while versioning custom assets', () => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'arrow-assets-'));
  try {
    for (const name of ['_next/static/chunks/runtime.js', '_next/static/chunks/dependency.js', 'arrow/orbit/_next/static/chunks/center.js', 'arrow/arrow-shell.js', 'arrow/arrow-shell.css']) {
      const file = path.join(output, name);
      fs.mkdirSync(path.dirname(file), {recursive:true});
      fs.writeFileSync(file, name);
    }
    const html = '<script src="/Resonant-Relay/_next/static/chunks/runtime.js"></script><script src="/Resonant-Relay/_next/static/chunks/dependency.js"></script><script src="/Resonant-Relay/arrow/orbit/_next/static/chunks/center.js"></script><script src="/Resonant-Relay/arrow/arrow-shell.js"></script><link href="/Resonant-Relay/arrow/arrow-shell.css" rel="stylesheet">';
    fs.writeFileSync(path.join(output, 'index.html'), html);
    const script = fs.readFileSync(path.join(__dirname, '../scripts/build-arrow-beta.mjs'), 'utf8');
    const begin = script.indexOf("const betaPrefix=");
    const end = script.indexOf('versionHtml(output);', begin) + 'versionHtml(output);'.length;
    assert.ok(begin >= 0 && end > begin, 'packager versioning function exists');
    vm.runInNewContext(script.slice(begin, end), {output, path, URL, createHash, ...fs});
    const result = fs.readFileSync(path.join(output, 'index.html'), 'utf8');
    for (const name of ['runtime.js', 'dependency.js', 'center.js']) {
      assert.ok(result.includes(name+'"'), 'Next chunk URL must remain unchanged: '+name);
      assert.ok(!result.includes(name+'?'), 'Next runtime must not receive per-file suffixes: '+name);
    }
    assert.match(result, /arrow-shell\.js\?v=[a-f0-9]{12}/);
    assert.match(result, /arrow-shell\.css\?v=[a-f0-9]{12}/);
  } finally { fs.rmSync(output, {recursive:true, force:true}); }
});
