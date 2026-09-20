const FILES=["assets/illustrations/kingfisher.png", "assets/illustrations/egret.png", "assets/illustrations/ibis.png", "assets/illustrations/pheasant.png", "assets/illustrations/sparrow.png", "assets/illustrations/moth.png", "assets/illustrations/camellia.png", "assets/images/kingfisher.jpg", "assets/images/egret.jpg", "assets/images/ibis.jpg", "assets/images/camellia.jpg", "assets/images/moth.jpg", "assets/images/pheasant.jpg", "assets/images/sparrow.jpg"];

Page({
  data:{logs:[],running:false,doneCount:0,total:FILES.length},
  push(msg){const logs=this.data.logs.concat(msg);this.setData({logs:logs.slice(-40)});},
  async start(){
    if(this.data.running)return;
    this.setData({running:true});
    const fs=wx.getFileSystemManager();
    const map=wx.getStorageSync('nature.assets.fileIds')||{};
    let done=0,failed=0;
    for(const cloudPath of FILES){
      if(map[cloudPath]){this.push('- 跳过（已传）'+cloudPath);done++;continue}
      try{
        const tmp=wx.env.USER_DATA_PATH+'/up_'+cloudPath.replace(/\//g,'_');
        fs.copyFileSync(cloudPath,tmp);
        const res=await wx.cloud.uploadFile({cloudPath,filePath:tmp});
        try{fs.unlinkSync(tmp)}catch(e){}
        map[cloudPath]=res.fileID;
        done++;failed=failed;
        this.setData({doneCount:done});
        this.push('OK '+cloudPath);
      }catch(e){
        failed++;
        this.push('FAIL '+cloudPath+' '+(e.errMsg||e.message||''));
      }
      this.setData({logs:this.data.logs.slice(-40)});
    }
    wx.setStorageSync('nature.assets.fileIds',map);
    try{
      const db=wx.cloud.database();
      const ex=await db.collection('assets').where({type:'map'}).count();
      if(ex.total>0)await db.collection('assets').where({type:'map'}).update({data:{map}});
      else await db.collection('assets').add({data:{type:'map',map}});
      this.push('资产映射已写入云数据库（assets 集合）');
    }catch(e){this.push('映射写库失败：'+(e.errMsg||e.message||'')+'（不影响本机使用）')}
    this.push(failed?('完成：'+(done-failed)+' 成功，'+failed+' 失败，请截图给我'):'全部上传完成。可以返回正常页面了。');
    this.setData({running:false});
  }
})
