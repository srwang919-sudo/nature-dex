const {definitions,tierOf}=require('../../lib/badge-model');
const motifs=new Set(definitions.map(d=>d.motif));
const tiers=new Set(['copper','silver','gold','platinum']);
Component({properties:{motif:String,earned:Boolean,large:Boolean,tier:String,target:Number},data:{safeMotif:'first',safeTier:'copper'},observers:{
 motif(value){this.setData({safeMotif:motifs.has(value)?value:'first'})},
 // 未传等级时按达成难度推导，保证视觉与模型一致。
 'tier,target'(tier,target){const derived=tier&&tiers.has(tier)?tier:tierOf(Number(target)||1);this.setData({safeTier:tiers.has(derived)?derived:'copper'})}
}});
