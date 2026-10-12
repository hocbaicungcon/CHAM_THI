const test=require('node:test'),assert=require('node:assert/strict'),B=require('../js/batch-feedback');
test('review names exact questions and TF ideas, excludes ignored or out-of-range cells',()=>{
 const record={answers:{},flags:{p1:['Bỏ trống','Tô nhiều','Mờ'],p2:[['','Mờ','Bỏ trống','']],p3:['Số không rõ']}};
 assert.deepEqual(B.review(record,{p1:['A','X'],p2:[['Đ','S','X','Đ']],p3:['O']},[2,1,1]).map(v=>v.label),['Phần I câu 1','Phần II câu 1.b','Phần III câu 1']);
 record.flags.p1[0]='';assert.equal(B.review(record,{p1:['A','X'],p2:[['Đ','S','X','Đ']],p3:['O']},[2,1,1]).length,2);
});
test('batch statistics include only current uploaded batch and distinguish read, scored, review and failed',()=>{
 const items=[{record:{answers:{},flags:{p1:['Mờ']}},keys:{p1:['A']},result:{scores:[1,0,0]}},{record:{answers:{}},keys:{},result:null},{record:{error:'Ảnh hỏng'},keys:{},result:null}];
 assert.deepEqual(B.statistics(items,[1,0,0],1),{total:3,recognized:2,graded:1,review:1,failed:1,fileErrors:1});
});
