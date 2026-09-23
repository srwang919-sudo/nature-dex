// Retired static maps must never resurrect rights-unverified assets from cache.
function resolve(path){return typeof path==='string'&&/^\/?assets\/(images|illustrations|badges|fonts)\//.test(path)?'':path||''}
module.exports={resolve};
