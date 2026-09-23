// Identical deployment-local metadata; dynamic validated species remain supported.
const records=[["kingfisher","普通翠鸟","Common Kingfisher","Alcedo atthis"],["egret","白鹭","Little Egret","Egretta garzetta"],["ibis","朱鹮","Crested Ibis","Nipponia nippon"],["pheasant","红腹锦鸡","Golden Pheasant","Chrysolophus pictus"],["sparrow","麻雀","Eurasian Tree Sparrow","Passer montanus"],["moth","绿尾大蚕蛾","Chinese Moon Moth","Actias ningpoana"],["camellia","山茶","Japanese Camellia","Camellia japonica"],["red-fox","赤狐","Red Fox","Vulpes vulpes"],["red-crowned-crane","丹顶鹤","Red-crowned Crane","Grus japonensis"],["monarch-butterfly","帝王蝶","Monarch Butterfly","Danaus plexippus"],["fly-agaric","毒蝇伞","Fly Agaric","Amanita muscaria"],["ginkgo","银杏","Ginkgo","Ginkgo biloba"],["sika-deer","梅花鹿","Sika Deer","Cervus nippon"],["panda","大熊猫","Giant Panda","Ailuropoda melanoleuca"],["chinese-alligator","扬子鳄","Chinese Alligator","Alligator sinensis"],["snow-leopard","雪豹","Snow Leopard","Panthera uncia"]];
function trustedSpecies(speciesId){
 if(typeof speciesId!=='string'||speciesId!==speciesId.normalize('NFKC').trim()||!/^[\p{L}][\p{L} ·_-]{0,79}$/u.test(speciesId)||/^(unknown|未知|无法识别|植物|动物|鸟类|昆虫|other)$/i.test(speciesId))throw Error('invalid_species');
 const match=records.find(row=>row[0]===speciesId||row[1]===speciesId||row[3]===speciesId);
 return match?{id:match[0],name:match[2]+' ('+match[3]+')'}:{id:speciesId,name:speciesId};
}
module.exports={trustedSpecies};
