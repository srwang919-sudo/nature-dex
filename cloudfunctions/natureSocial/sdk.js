// SDK compatibility boundary. Registry aliases contain maintained lodash, not old standalone modules.
const { createRequire } = require('module');
const databaseRequire = createRequire(require.resolve('@cloudbase/database'));
for (const name of ['set', 'unset']) {
  const id = databaseRequire.resolve(`lodash.${name}`);
  const lodash = databaseRequire(`lodash.${name}`);
  const method = lodash[name];
  if (typeof method !== 'function') throw Error('sdk_compatibility_invalid');
  method.default = method;
  require.cache[id].exports = method;
}
module.exports = require('wx-server-sdk');
