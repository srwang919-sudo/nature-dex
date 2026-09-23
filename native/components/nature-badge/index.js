const {definitions}=require('../../lib/badge-model');
Component({properties:{motif:String,earned:Boolean,large:Boolean},data:{safeMotif:'first'},observers:{motif(value){this.setData({safeMotif:definitions.some(d=>d.motif===value)?value:'first'})}}});
