import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {FileStore} from '../server/store.js';
import {queueReminder,processReminders,nextOccurrence} from '../server/reminders.js';
test('durable reminders deliver once, cancel completed tasks, retry and survive concurrent workers',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'notesnexa-mail-'));const store=new FileStore(path.join(dir,'db.json'));let clock=Date.now(),messages=[];
 const options={store,clock:()=>clock,sendMail:async m=>messages.push(m),from:'noreply@example.test',appUrl:'https://example.test'};
 try{
  await store.insert('users',{_id:'user',email:'owner@example.test',usernameKey:'owner',user_name:'owner',name:'Owner'});
  const item={_id:'task',userId:'user',title:'Finish draft',dueDate:new Date(clock-1000).toISOString(),task:[{text:'Write draft',completed_todo:false}]};await store.insert('tasks',item);await queueReminder(store,'task',item);await queueReminder(store,'task',item);
  await Promise.all([processReminders(options),processReminders(options)]);assert.equal(messages.length,1);assert.equal(messages[0].to,'owner@example.test');assert.match(messages[0].text,/Write draft/);
  await processReminders(options);assert.equal(messages.length,1);
  const next={...item,_id:'complete',task:[{text:'Done',completed_todo:true}]};await store.insert('tasks',next);await queueReminder(store,'task',next);assert.equal((await processReminders(options)).cancelled,1);
  const retry={...item,_id:'retry'};await store.insert('tasks',retry);await queueReminder(store,'task',retry);
  assert.equal((await processReminders({...options,sendMail:async()=>{throw Error('SMTP offline');}})).failed,1);await processReminders(options);assert.equal(messages.length,1);
  clock+=300000;assert.equal((await processReminders(options)).sent,1);assert.equal(messages.length,2);
  const cancelled={...item,_id:'changed'};await store.insert('tasks',cancelled);await queueReminder(store,'task',cancelled);await store.mutate('tasks',{_id:'changed'},v=>({...v,dueDate:null}));assert.equal((await processReminders(options)).cancelled,1);
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('standalone repeat reminders advance once, respect email opt-out and skip weekends in India',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'notesnexa-repeat-')),store=new FileStore(path.join(dir,'db.json'));const time=Date.parse('2026-11-06T03:30:00Z');let sent=0;
 try{await store.insert('users',{_id:'owner',email:'owner@example.test',user_name:'owner',name:'Owner'});const reminder={_id:'repeat',userId:'owner',title:'Morning review',remindAt:new Date(time).toISOString(),repeat:'weekdays',notifyEmail:true,completedAt:null};await store.insert('events',reminder);await queueReminder(store,'reminder',reminder);const options={store,clock:()=>time+60000,sendMail:async()=>sent++,from:'test@example.test'};await processReminders(options);assert.equal(sent,1);const next=await store.one('events',{_id:'repeat'});assert.equal(next.remindAt,'2026-11-09T03:30:00.000Z');await processReminders(options);assert.equal(sent,1);await queueReminder(store,'reminder',{...reminder,_id:'disabled',notifyEmail:false});assert.equal((await store.find('reminders',{itemId:'disabled'})).length,0);assert.equal(nextOccurrence('2026-11-01T03:30:00Z','daily',Date.parse('2026-11-08T04:30:00Z')),'2026-11-09T03:30:00.000Z');}finally{rmSync(dir,{recursive:true,force:true});}
});
test('individual task due dates send the task title and cancel after completion',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'notesnexa-todo-mail-')),store=new FileStore(path.join(dir,'db.json')),clock=Date.now(),messages=[];
 try{await store.insert('users',{_id:'owner',email:'owner@example.test',user_name:'owner',name:'Owner'});const list={_id:'list',userId:'owner',title:'Project',task:[{_id:'one',text:'Review the proposal',dueDate:new Date(clock-1000).toISOString(),completed_todo:false}],dueDate:null};await store.insert('tasks',list);await queueReminder(store,'task',list);const options={store,clock:()=>clock,sendMail:async m=>messages.push(m),from:'test@example.test'};await processReminders(options);assert.equal(messages.length,1);assert.match(messages[0].subject,/Review the proposal/);const updated=await store.mutate('tasks',{_id:'list'},l=>({...l,task:[...l.task,{_id:'two',text:'Cancel this reminder',dueDate:new Date(clock-1000).toISOString(),completed_todo:false}]}));await queueReminder(store,'task',updated);await store.mutate('tasks',{_id:'list'},l=>({...l,task:l.task.map(t=>t._id==='two'?{...t,completed_todo:true}:t)}));assert.equal((await processReminders(options)).cancelled,1);assert.equal(messages.length,1);}finally{rmSync(dir,{recursive:true,force:true});}
});
