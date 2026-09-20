function createRevealMachine({reducedMotion=false,onStage=()=>{},setTimeout:later=setTimeout,clearTimeout:cancel=clearTimeout}={}){
 let current='sealed',timers=[];
 const emit=stage=>{current=stage;onStage(stage)};
 const clear=()=>{timers.forEach(cancel);timers=[]};
 const start=()=>{clear();emit('sealed');const stages=[['split',420],['lift',700],['settled',1020]];if(reducedMotion){stages.forEach(([stage])=>emit(stage));return}stages.forEach(([stage,delay])=>timers.push(later(()=>emit(stage),delay)))};
 return {start,cancel:()=>{clear();current='sealed'},state:()=>current};
}
module.exports={createRevealMachine};
