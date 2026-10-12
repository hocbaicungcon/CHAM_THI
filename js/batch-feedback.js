(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ChamTNBatchFeedback=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function review(record,keys,counts){
  const issues=[];
  if(record.answers)for(let part=0;part<3;part++){
   const p='p'+(part+1);
   for(let q=0;q<counts[part];q++)for(let sub=0;sub<(part===1?4:1);sub++){
    const key=part===1?keys[p]?.[q]?.[sub]:keys[p]?.[q];
    const reason=part===1?record.flags?.[p]?.[q]?.[sub]:record.flags?.[p]?.[q];
    if(reason&&key!=='X')issues.push({part:part+1,question:q+1,sub:part===1?sub:null,label:`Phần ${['I','II','III'][part]} câu ${q+1}${part===1?'.'+'abcd'[sub]:''}`,reason});
   }
  }
  return issues;
 }
 function statistics(items,counts,fileErrors=0){
  return {total:items.length,recognized:items.filter(i=>i.record.answers).length,graded:items.filter(i=>i.result?.scores).length,review:items.filter(i=>review(i.record,i.keys,counts).length||i.record.codeIssue||i.record.studentUncertain&&!i.record.studentEdited||i.record.examUncertain).length,failed:items.filter(i=>!i.record.answers||i.record.error).length,fileErrors};
 }
 return {review,statistics};
});
