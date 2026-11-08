import test from 'node:test';
import assert from 'node:assert/strict';
import {MongoMemoryServer} from 'mongodb-memory-server';
import {MongoClient} from 'mongodb';
import {MongoStore} from '../server/store.js';
import {createApplication} from '../server/app.js';
test('real MongoDB: concurrent updates, cold app instance, Cloudinary signatures and reminder cron',{skip:process.env.RUN_MONGO_TESTS!=='1',timeout:600000},async()=>{
 const mongo=await MongoMemoryServer.create({binary:{version:'7.0.14'}});const client=new MongoClient(mongo.getUri());await client.connect();const db=client.db('test'),store=new MongoStore(db,client);let server;const sent=[];
 try{
  await db.collection('users').createIndex({email:1},{unique:true});await db.collection('users').createIndex({usernameKey:1},{unique:true});
  const env={NODE_ENV:'production',MONGODB_URI:mongo.getUri(),JWT_SECRET:'mongo-test-secret-more-than-32-characters',SUPER_EMAIL:'owner@example.test',SUPER_PASSWORD:'StrongTestPassword123!',CRON_SECRET:'test-cron-secret',SMTP_FROM:'test@example.test',CLOUDINARY_CLOUD_NAME:'test-cloud',CLOUDINARY_API_KEY:'test-public',CLOUDINARY_API_SECRET:'never-return-this-secret'};
  const {app}=await createApplication({env,store,mailTransport:{sendMail:async m=>sent.push(m)}});server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
  const request=async(url,{token,method='GET',body}={})=>{const res=await fetch(base+url,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:res.status,data:await res.json()};};
  const token=(await request('/api/user/login',{method:'POST',body:{email:env.SUPER_EMAIL,password:env.SUPER_PASSWORD}})).data.jwtToken;assert.ok(token);
  const note=(await request('/api/home',{method:'POST',body:{},token})).data.data;
  await Promise.all([store.mutate('notes',{_id:note._id},n=>({...n,title:'Concurrent title'})),store.mutate('notes',{_id:note._id},n=>({...n,pinned:true}))]);const saved=await store.one('notes',{_id:note._id});assert.equal(saved.title,'Concurrent title');assert.equal(saved.pinned,true);
  const sign=await request('/api/uploads/sign',{method:'POST',body:{noteId:note._id},token});assert.equal(sign.status,200);assert.ok(sign.data.signature);assert.equal(JSON.stringify(sign.data).includes(env.CLOUDINARY_API_SECRET),false);
  assert.equal((await request('/api/uploads/sign',{method:'POST',body:{noteId:'someone-elses-note'},token})).status,404);
  const task=(await request('/api/task',{method:'POST',body:{},token})).data.data;await request('/api/task/'+task._id,{method:'PUT',body:{text:'Send proposal'},token});await request('/api/task/'+task._id+'/reminder',{method:'PATCH',body:{dueDate:new Date(Date.now()-1000).toISOString()},token});
  assert.equal((await request('/api/cron/reminders')).status,401);assert.equal((await request('/api/cron/reminders',{token:env.CRON_SECRET})).data.sent,1);assert.equal((await request('/api/cron/reminders',{token:env.CRON_SECRET})).data.sent,0);assert.equal(sent.length,1);assert.match(sent[0].text,/Send proposal/);
  await createApplication({env,store,mailTransport:{sendMail:async()=>{}}});assert.equal((await store.find('notes',{userId:note.userId})).length,1);
 }finally{if(server)await new Promise(r=>server.close(r));await client.close();await mongo.stop();}
});
