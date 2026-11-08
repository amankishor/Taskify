import {createHash,randomUUID} from 'node:crypto';
export function nextOccurrence(due,repeat,after=Date.now()){
 let next=Date.parse(due),step=(repeat==='weekly'?7:1)*86400000;
 if(!Number.isFinite(next)||repeat==='none')return due;
 next+=Math.max(1,Math.floor((after-next)/step)+1)*step;
 if(repeat==='weekdays')while([0,6].includes(new Date(next+330*60000).getUTCDay()))next+=86400000;
 return new Date(next).toISOString();
}
const jobId=(kind,itemId,due)=>createHash('sha256').update(`${kind}:${itemId}:${due}`).digest('hex');
export async function queueReminder(store,kind,item){
 if(kind==='task')for(const todo of item.task||[])if(todo.dueDate)await queueReminder(store,'todo',{...item,_id:item._id+':'+todo._id,listId:item._id,todoId:todo._id,remindAt:todo.dueDate,completedAt:todo.completedAt,reminderCompletedAt:todo.reminderCompletedAt});
 const due=kind==='task'?item.dueDate:kind==='reminder'||kind==='todo'?item.remindAt:item.reminderAt;
 if(!due||item.completedAt||item.reminderCompletedAt||kind==='reminder'&&item.notifyEmail===false)return;
 const id=jobId(kind,item._id,due);
 try{await store.insert('reminders',{_id:id,userId:item.userId,itemId:kind==='todo'?item.listId:item._id,...(kind==='todo'?{todoId:item.todoId}:{}),kind,due,status:'pending',attempts:0,nextAttempt:Date.parse(due)});}catch(err){if(err.code!==11000)throw err;await store.mutate('reminders',{_id:id,status:'cancelled'},j=>({...j,status:'pending',attempts:0,nextAttempt:Date.parse(due)}));}
}
async function advanceRepeat(store,item,due,time){
 const next=await store.mutate('events',{_id:item._id,userId:item.userId},current=>current.remindAt===due&&!current.completedAt&&current.repeat!=='none'?{...current,remindAt:nextOccurrence(due,current.repeat,time),lastSentAt:new Date(time).toISOString()}:null);
 if(next)await queueReminder(store,'reminder',next);
}
export async function processReminders({store,sendMail,from,appUrl='',clock=()=>Date.now(),limit=30}){
 const stats={sent:0,failed:0,cancelled:0},time=clock(),started=Date.now();
 // Recover the next occurrence if a worker stopped after recording email delivery.
 for(const event of await store.find('events',{remindAt:{$lte:new Date(time).toISOString()}})){
  if(event.completedAt||event.notifyEmail===false||!event.repeat||event.repeat==='none')continue;
  if(await store.one('reminders',{_id:jobId('reminder',event._id,event.remindAt),status:'sent'}))await advanceRepeat(store,event,event.remindAt,time);
 }
 const due=await store.find('reminders',{$or:[{status:'pending',nextAttempt:{$lte:time}},{status:'sending',leaseUntil:{$lte:time}}]});
 for(const candidate of due.slice(0,limit)){
  if(Date.now()-started>30000)break;
  const claim=randomUUID(),job=await store.mutate('reminders',{_id:candidate._id,_rev:candidate._rev},j=>{
   if(!((j.status==='pending'&&j.nextAttempt<=time)||(j.status==='sending'&&j.leaseUntil<=time)))return null;
   return {...j,status:'sending',leaseUntil:time+180000,claim,attempts:j.attempts+1};
  });if(!job)continue;
  const item=await store.one(job.kind==='task'||job.kind==='todo'?'tasks':job.kind==='reminder'?'events':'notes',{_id:job.itemId,userId:job.userId});
  const todo=job.kind==='todo'?item?.task.find(t=>t._id===job.todoId):null;
  const user=await store.one('users',{_id:job.userId}),currentDue=job.kind==='todo'?todo?.dueDate:job.kind==='task'?item?.dueDate:job.kind==='reminder'?item?.remindAt:item?.reminderAt;
  const complete=job.kind==='todo'?(todo?.completed_todo||todo?.reminderCompletedAt):job.kind==='task'&&item?.task?.length>0&&item.task.every(t=>t.completed_todo);
  if(!item||!user||currentDue!==job.due||item.trashedAt||item.completedAt||item.reminderCompletedAt||job.kind==='reminder'&&item.notifyEmail===false||complete){await store.mutate('reminders',{_id:job._id,claim},j=>({...j,status:'cancelled'}));stats.cancelled++;continue;}
  let delivered=false;
  try{
   const title=job.kind==='todo'?todo.text:item.title;
   const list=job.kind==='task'?item.task.filter(t=>!t.completed_todo).map(t=>`- ${t.text}`).join('\n'):item.description||'';
   await sendMail({from,to:user.email,subject:`NotesNexa reminder: ${title.replace(/[\r\n]/g,' ').slice(0,150)}`,messageId:`<reminder-${job._id}@notesnexa.app>`,text:`Hello ${user.name},\n\nYour reminder is due: ${title}\n\n${list}\n\nOpen your workspace: ${appUrl}${job.kind==='task'||job.kind==='todo'?'/task':'/home?view=reminders'}\n\nNotesNexa`});
   await store.mutate('reminders',{_id:job._id,claim},j=>({...j,status:'sent',sentAt:new Date(clock()).toISOString()}));stats.sent++;delivered=true;
  }catch{
   await store.mutate('reminders',{_id:job._id,claim},j=>({...j,status:j.attempts>=5?'failed':'pending',nextAttempt:clock()+Math.min(60*60*1000,60000*2**j.attempts),lastError:'Email delivery failed'}));stats.failed++;
  }
  if(delivered&&job.kind==='reminder'&&item.repeat&&item.repeat!=='none')try{await advanceRepeat(store,item,job.due,time);}catch{console.error('Reminder recurrence will resume on the next worker run.');}
 }return stats;
}
