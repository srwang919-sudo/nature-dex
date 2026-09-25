const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path'), vm = require('vm'), { createRequire } = require('module');
const root = path.join(__dirname, '..');
const thumb = require('../native/lib/thumbnail');

const SIGNED = 'https://example.test/art/a.jpg?sign=st%3Dabc%26e%3D1700000000&t=1699999999';

// ---- 纯函数：派生 -------------------------------------------------------
test('thumbnails stay off until the real environment proves a拼接 order', () => {
  assert.equal(thumb.deriveThumbUrl(SIGNED, 420, 'off'), null);
  assert.equal(thumb.deriveThumbUrl(SIGNED, 420), null);
  for (const bad of ['', null, undefined, 'params-FIRST', 'sign_first', 42]) {
    assert.equal(thumb.resolveMode(bad), 'off', 'unknown mode must fail safe: ' + bad);
  }
});

test('both拼接 orders are reproducible, and only for allowlisted widths', () => {
  const paramsFirst = thumb.deriveThumbUrl(SIGNED, 420, 'params-first');
  const signFirst = thumb.deriveThumbUrl(SIGNED, 420, 'sign-first');
  assert.ok(paramsFirst.startsWith('https://example.test/art/a.jpg?imageMogr2/thumbnail/420x&sign='));
  assert.ok(signFirst.startsWith('https://example.test/art/a.jpg?sign='));
  assert.ok(signFirst.endsWith('&imageMogr2/thumbnail/420x'));
  // 两种拼法都完整保留原有查询串，不能丢签名
  for (const u of [paramsFirst, signFirst]) {
    assert.ok(u.includes('sign=st%3Dabc%26e%3D1700000000'));
    assert.ok(u.includes('t=1699999999'));
  }
  for (const w of thumb.WIDTHS) assert.ok(thumb.deriveThumbUrl(SIGNED, w, 'sign-first'));
  assert.equal(thumb.deriveThumbUrl(SIGNED, 999, 'sign-first'), null, 'arbitrary widths are rejected');
  assert.equal(thumb.deriveThumbUrl(SIGNED, 421, 'sign-first'), null);
});

test('derivation refuses every URL shape it cannot prove safe', () => {
  const cases = {
    'cloud:// 未换临时链接': 'cloud://env-1.abc/art/a.jpg',
    '本地资源': '/assets/theme/share-safe-leaf.png',
    'data URI': 'data:image/png;base64,iVBOR',
    '裸地址无签名': 'https://example.test/art/a.jpg',
    '有查询但无 sign': 'https://example.test/art/a.jpg?foo=1',
    '已加工过': 'https://example.test/art/a.jpg?sign=abc&imageMogr2/thumbnail/420x',
    '空串': ''
  };
  for (const [label, url] of Object.entries(cases)) {
    assert.equal(thumb.deriveThumbUrl(url, 420, 'sign-first'), null, label + ' must not derive');
  }
});

test('width follows用途: scene 最小, 大图最大', () => {
  assert.equal(thumb.widthFor({ scene: true }), 240);
  assert.equal(thumb.widthFor({ large: true }), 640);
  assert.equal(thumb.widthFor({}), 420);
  assert.equal(thumb.widthFor(undefined), 420);
});

// ---- 一次性回退 ---------------------------------------------------------
test('a failed derived URL falls back to the original exactly once, never marking the card unavailable', () => {
  const first = thumb.nextSource('https://x/a.jpg?sign=1&imageMogr2/thumbnail/420x', 'https://x/a.jpg?sign=1', true);
  assert.equal(first.src, 'https://x/a.jpg?sign=1');
  assert.equal(first.usingThumb, false);
  assert.equal(first.unavailable, false, 'fallback must not claim the artwork is unavailable');

  const second = thumb.nextSource('', 'https://x/a.jpg?sign=1', false);
  assert.equal(second.src, 'https://x/a.jpg?sign=1');
  assert.equal(second.unavailable, true, 'the original failing is a genuine unavailable state');
});

// ---- 组件接入 -----------------------------------------------------------
const componentFile = path.join(root, 'native/components/collectible/index.js');
function loadComponent(storageValue) {
  let component;
  const wx = { getStorageSync: k => (k === thumb.STORAGE_KEY ? storageValue : null), cloud: { callFunction: () => {}, getTempFileURL: () => Promise.resolve({}) } };
  vm.runInNewContext(fs.readFileSync(componentFile, 'utf8'), {
    Component: c => { component = c; },
    wx,
    getCurrentPages: () => [{ route: 'native/pages/card/index' }],
    require: createRequire(componentFile)
  });
  return component;
}
function makeInstance(component, props) {
  return { data: {}, properties: props || {}, setData(v) { Object.assign(this.data, v); }, ...component.methods };
}
const CARD = { id: 'c1', speciesId: 'sparrow', zh: '麻雀', photoPath: SIGNED, artPhotoPath: SIGNED };

test('with the switch off the component behaves exactly as before', () => {
  const component = loadComponent(null);
  const inst = makeInstance(component, {});
  inst.data.presentation = { front: { photo: SIGNED } };
  component.methods.applyThumb.call(inst);
  assert.equal(inst.data.useThumb, false);
  assert.equal(inst.data.thumbUrl, '');
  component.methods.imageError.call(inst);
  assert.equal(inst.data.imageUnavailable, true, 'original failure still reports unavailable');
});

test('with the switch on the component derives once and silently retreats on error', () => {
  const component = loadComponent('sign-first');
  const inst = makeInstance(component, {});
  inst.data.presentation = { front: { photo: SIGNED } };
  component.methods.applyThumb.call(inst);
  assert.equal(inst.data.useThumb, true);
  assert.ok(inst.data.thumbUrl.endsWith('&imageMogr2/thumbnail/420x'));

  component.methods.imageError.call(inst);
  assert.equal(inst.data.useThumb, false, 'falls back to the original');
  assert.equal(inst.data.thumbUrl, '');
  assert.equal(inst.data.imageUnavailable, false, 'a broken derived URL must not look like a broken card');

  component.methods.imageError.call(inst);
  assert.equal(inst.data.imageUnavailable, true, 'only the original failing counts');
});

test('the observer wires derivation in without changing the source URL', () => {
  const component = loadComponent('params-first');
  const inst = makeInstance(component, {});
  component.observers.card.call(inst, CARD);
  assert.equal(inst.data.presentation.front.photo, SIGNED, 'the original stays intact for export/print');
  assert.equal(inst.data.useThumb, true);
  assert.ok(inst.data.thumbUrl.includes('imageMogr2/thumbnail/240x') === false, 'default card width is 420');
});

test('wxml renders the derived URL only while it is in use', () => {
  const wxml = fs.readFileSync(path.join(root, 'native/components/collectible/index.wxml'), 'utf8');
  assert.equal(wxml.includes('src="{{presentation.front.photo}}"'), false);
  assert.ok(wxml.includes('src="{{useThumb?thumbUrl:presentation.front.photo}}"'));
});

// ---- 导出与打印永不走缩略图 ---------------------------------------------
test('export and print paths never touch the thumbnail pipeline', () => {
  for (const file of ['native/lib/card-export.js', 'native/pages/print/index.js', 'native/lib/print-layout.js']) {
    const p = path.join(root, file);
    if (!fs.existsSync(p)) continue;
    const src = fs.readFileSync(p, 'utf8');
    assert.equal(src.includes('thumbnail'), false, file + ' must keep full-resolution originals');
  }
});
