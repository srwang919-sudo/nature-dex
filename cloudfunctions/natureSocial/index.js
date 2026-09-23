let cloud;
try {
  cloud = require('./sdk');
  cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
} catch (_) {}

const { createSocialService } = require('./core');
const { CloudBaseRepository } = require('./cloudbase-repository');

async function main(event = {}, dependencies = {}) {
  const api = dependencies.cloud || cloud;
  if (!api) return { status: 'failed', code: 'runtime_unavailable', retryable: true };
  let openid;
  try { openid = api.getWXContext().OPENID; } catch (_) {}
  if (!openid) return { status: 'failed', code: 'unauthenticated' };
  try {
    const repo = dependencies.repo || new CloudBaseRepository(api.database());
    return await createSocialService({ repo, now: dependencies.now, randomToken: dependencies.randomToken }).execute(openid, event);
  } catch (_) {
    return { status: 'failed', code: 'service_unavailable', retryable: true };
  }
}

module.exports = { main };
