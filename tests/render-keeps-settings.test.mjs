import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';

test('render keeps typed settings inputs across background re-renders',async()=>{
  const src=await readFile(new URL('../src/render.js',import.meta.url),'utf8');
  for(const id of ['apiUrlInp','apiSecretInp','googleClientIdInp','anthropicKeyInp'])assert.ok(src.includes(id),id);
  assert.ok(src.indexOf('keepInputs')<src.indexOf('app.innerHTML=""'));
  assert.ok(src.indexOf('mkModal()')<src.lastIndexOf('el.value=v'));
});
