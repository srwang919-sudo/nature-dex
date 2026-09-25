// 缩略图派生（Master Plan §5 / §115）：一份 Master Artwork 派生多个用途，不重复调 AI。
//
// 三条硬规则（踩过坑才定下来）：
// 1. 默认关闭。云存储私有桶的临时地址带签名，图像处理参数与 sign 的拼接顺序
//    必须在真实环境验证；猜错就是图片 404，**可见回归**。所以代码先备好，开关默认 off。
// 2. 派生地址加载失败必须「一次性退回原图」，绝不能因此把卡片判为图片不可用。
// 3. 卡面导出与打印链路永远用原图（300dpi 品质优先），不接入缩略图 —— 本模块也只在
//    展示组件里被引用。
//
// 启用方式（验证之后）：把存储键 nature.thumbnails 设为 'params-first' 或 'sign-first'。
//   params-first → ?imageMogr2/thumbnail/<w>x&sign=...
//   sign-first   → ?sign=...&imageMogr2/thumbnail/<w>x
// 取值非法或读取异常一律回落 'off'（失败即保守）。
const MODES = ['off', 'params-first', 'sign-first'];
const WIDTHS = [240, 420, 640];
const STORAGE_KEY = 'nature.thumbnails';
const OP = 'imageMogr2/thumbnail/';

function resolveMode(value) {
  return MODES.indexOf(value) >= 0 ? value : 'off';
}

// 宿主探测：Node 单测里没有 wx，不能裸引用（曾导致定时器里 ReferenceError）。
function host() {
  try { return typeof wx !== 'undefined' ? wx : null; } catch (e) { return null; }
}

function currentMode(api) {
  const h = api || host();
  try {
    return resolveMode(h && typeof h.getStorageSync === 'function' ? h.getStorageSync(STORAGE_KEY) : null);
  } catch (e) {
    return 'off';
  }
}

// cloud:// 需要换成临时链接才能带参数，本地资源与 data: 一律不派生 —— 拿不准就不派生。
function deriveThumbUrl(url, width, mode) {
  if (!mode || mode === 'off') return null;
  if (typeof url !== 'string' || url.indexOf('https://') !== 0 && url.indexOf('http://') !== 0) return null;
  if (WIDTHS.indexOf(Number(width)) < 0) return null;
  const q = url.indexOf('?');
  if (q < 0) return null;                                  // 裸地址不动
  const base = url.slice(0, q);
  const pairs = url.slice(q + 1).split('&').filter(Boolean);
  if (pairs.some(p => p.indexOf('imageMogr2') === 0)) return null;  // 避免二次加工
  if (!pairs.some(p => p.split('=')[0] === 'sign')) return null;    // 云存储临时地址必带 sign
  const clause = OP + Number(width) + 'x';
  const ordered = mode === 'params-first' ? [clause].concat(pairs) : pairs.concat([clause]);
  return base + '?' + ordered.join('&');
}

// 按用途挑宽度：场景缩略 / 列表 / 大图。
function widthFor(props) {
  if (!props) return WIDTHS[1];
  if (props.scene) return WIDTHS[0];
  if (props.large) return WIDTHS[2];
  return WIDTHS[1];
}

// 加载失败时的下一步：还在用派生图就退回原图（不判不可用）；原图本身失败才算不可用。
function nextSource(thumb, original, usingThumb) {
  if (usingThumb && thumb && original && thumb !== original) {
    return { src: original, usingThumb: false, unavailable: false };
  }
  return { src: original || thumb || '', usingThumb: false, unavailable: true };
}

module.exports = { MODES, WIDTHS, STORAGE_KEY, resolveMode, currentMode, deriveThumbUrl, widthFor, nextSource };
