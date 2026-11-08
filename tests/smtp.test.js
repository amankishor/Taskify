import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {FileStore} from '../server/store.js';
import {createApplication} from '../server/app.js';
import {queueReminder} from '../server/reminders.js';
test('task reminder is delivered through real local SMTP transport and not sent twice',async()=>{
 const received=[],connections=new Set();
 const smtp=net.createServer(socket=>{connections.add(socket);socket.on('close',()=>connections.delete(socket));socket.write('220 localhost SMTP test\r\n');let buffer='',data=false,mail='';socket.on('data',chunk=>{buffer+=chunk.toString();while(buffer.includes('\r\n')){const index=buffer.indexOf('\r\n'),line=buffer.slice(0,index);buffer=buffer.slice(index+2);if(data){if(line==='.'){received.push(mail);mail='';data=false;socket.write('250 accepted\r\n');}else mail+=line+'\r\n';continue;}if(/^(EHLO|HELO)/.test(line))socket.write('250 localhost\r\n');else if(line==='DATA'){data=true;socket.write('354 continue\r\n');}else if(line==='QUIT'){socket.end('221 goodbye\r\n');}else socket.write('250 OK\r\n');}});});
 await new Promise(r=>smtp.listen(0,'127.0.0.1',r));const dir=mkdtempSync(path.join(tmpdir(),'notesnexa-smtp-')),store=new FileStore(path.join(dir,'db.json'));
 try{
  await store.insert('users',{_id:'u',name:'Owner',email:'owner@example.test',user_name:'owner',usernameKey:'owner'});const task={_id:'t',userId:'u',title:'Send proposal',dueDate:new Date(Date.now()-1000).toISOString(),task:[{text:'Finish the proposal',completed_todo:false}]};await store.insert('tasks',task);await queueReminder(store,'task',task);
  const {runReminders}=await createApplication({store,env:{JWT_SECRET:'smtp-test-secret-at-least-32-characters',SMTP_HOST:'127.0.0.1',SMTP_PORT:String(smtp.address().port),SMTP_FROM:'NotesNexa <sender@example.test>',APP_URL:'https://example.test'}});
  assert.equal((await runReminders()).sent,1);assert.equal(received.length,1);assert.match(received[0],/To: owner@example.test/);assert.match(received[0],/Finish the proposal/);assert.equal((await runReminders()).sent,0);assert.equal(received.length,1);
 }finally{for(const socket of connections)socket.destroy();await new Promise(r=>smtp.close(r));rmSync(dir,{recursive:true,force:true});}
});
