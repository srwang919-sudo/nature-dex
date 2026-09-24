const cloud = require('./sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
exports.main = async () => {
  if (!cloud.getWXContext().OPENID) return { ok: false, code: 'unauthenticated' }
  const db = cloud.database()
  const created = [], existed = [], failed = []
  for (const name of ['natureSpecies', 'natureObservations', 'natureCards', 'userSpeciesDiscoveries','speciesArtworks','officialSpeciesArtworks','artworkReviewers','artworkReviewEvents','artworkReviewJobs','creationBonuses','creationMonths','creationReservations','aiUsageEvents','userArtworkContributions','cardRecoveryConsents','analyticsEvents','analyticsDaily']) {
    try { await db.createCollection(name); created.push(name) }
    catch (e) { if (/already exist|COLLECTION_EXIST/i.test(e.message || e.errMsg || '')) existed.push(name); else failed.push({name,code:'collection_setup_failed'}) }
  }
  // Fixed allowlist only: callers cannot create arbitrary production resources.
  for (const name of ['printOrderDrafts', 'printOrders', 'aiCostConfig', 'natureSocialProfiles', 'assets', 'artOperations', 'speciesWatercolors', 'observationDeletions', 'usageQuotas', 'recognitionReceipts', 'trustedObservations', 'accountPrivacy', 'natureFriendInvites', 'natureFriendships', 'natureFriendEdges', 'natureSpeciesCards', 'natureSpeciesShares', 'natureCopyRequests', 'natureCopySlots', 'natureMemorialCopies', 'membershipOrders', 'membershipEntitlements', 'wechatPayEvents', 'membershipReconciliationRuns']) {
    try { await db.createCollection(name); created.push(name) }
    catch (e) {
      if (/already exist|COLLECTION_EXIST/i.test(e.message || e.errMsg || '')) existed.push(name)
      else failed.push({ name, code: 'collection_setup_failed' })
    }
  }
  return { ok: failed.length === 0, created, existed, failed }
}
