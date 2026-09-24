// AI 成本配置（Master Plan §47）：混元 0.20 / 百度植物 0.0029 / 百度动物 0.001（元/次）。
// 优先级：内置默认 < 部署环境变量 < 后台 aiCostConfig/main 文档（支持扁平字段或 {costs:{...}}）。
// 任何读取失败都回落到上一级，绝不阻塞主流程；结果缓存 5 分钟。
const DEFAULTS=Object.freeze({baiduPlant:0.0029,baiduAnimal:0.001,hunyuan:0.20});
const ENV=Object.freeze({baiduPlant:'NATURE_BAIDU_PLANT_COST',baiduAnimal:'NATURE_BAIDU_ANIMAL_COST',hunyuan:'NATURE_HUNYUAN_COST'});
const TTL=5*60*1000;
let cache=null,cachedAt=0;
const num=(v,fallback)=>{const n=Number(v);return Number.isFinite(n)&&n>=0?n:fallback};
function envCostConfig(){const out={};for(const name of Object.keys(DEFAULTS))out[name]=num(process.env[ENV[name]],DEFAULTS[name]);return out}
function normalize(raw,base){const out={...base};if(!raw||typeof raw!=='object')return out;for(const name of Object.keys(DEFAULTS))out[name]=num(raw[name],base[name]);return out}
// 事务内部同步读取上次已知配置（事务里不发起额外读取）。
function cachedCostConfig(){return cache||envCostConfig()}
async function loadCostConfig(db,now=Date.now()){
 if(cache&&now-cachedAt<TTL)return cache;
 let remote=null;
 try{const doc=await db.collection('aiCostConfig').doc('main').get();remote=doc&&doc.data}catch(e){remote=null}
 const base=envCostConfig();
 cache=normalize(remote&&remote.costs?remote.costs:remote,base);
 cachedAt=now;
 return cache;
}
function resetCostCache(){cache=null;cachedAt=0}
module.exports={loadCostConfig,cachedCostConfig,envCostConfig,normalize,resetCostCache,DEFAULTS};
