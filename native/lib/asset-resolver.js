/* 资产解析：https 临时链接（getTempFileURL 刷新，2h 有效）> cloud fileID > 包内路径 */
function resolve(path){
  try{
    const key=String(path).replace(/^\//,'');
    if(key.indexOf('assets/images/')===0)return path;
    const urls=wx.getStorageSync('nature.assets.urls')||{};
    if(urls[key])return urls[key];
    const map=wx.getStorageSync('nature.assets.fileIds')||{};
    if(map[key])return map[key];
  }catch(e){}
  return path;
}
module.exports={resolve};
