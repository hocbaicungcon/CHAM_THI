(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ChamTNCornerEditor=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  class History {
    constructor(){this.sessions=new WeakMap();}
    snapshot(record,view){const {source,cornerEdit,...data}=record;return JSON.parse(JSON.stringify({data,adjustments:record.points.adjustments||null,view}));}
    push(record,view){const state=this.snapshot(record,view);let session=this.sessions.get(record)||record.cornerEdit;if(!session){session={initial:state,steps:[]};this.sessions.set(record,session);}record.cornerEdit=session;session.steps.push(state);if(session.steps.length>20)session.steps.shift();}
    restore(record,state){const source=record.source;for(const key of Object.keys(record))if(key!=='source')delete record[key];Object.assign(record,JSON.parse(JSON.stringify(state.data)),{source});if(state.adjustments)record.points.adjustments=JSON.parse(JSON.stringify(state.adjustments));return state.view;}
    undo(record){const session=this.sessions.get(record)||record.cornerEdit;if(!session?.steps.length)return null;const view=this.restore(record,session.steps.pop());record.cornerEdit=session;return view;}
    cancel(record){const session=this.sessions.get(record)||record.cornerEdit;if(!session)return null;const view=this.restore(record,session.initial);this.sessions.delete(record);return view;}
    active(record){return !!record&&(this.sessions.has(record)||!!record.cornerEdit);}
    canUndo(record){return !!record&&!!(this.sessions.get(record)||record.cornerEdit)?.steps.length;}
    commit(record){this.sessions.delete(record);delete record.cornerEdit;}
  }
  return {History};
});
