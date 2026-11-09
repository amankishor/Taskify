import 'dotenv/config';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {MongoClient} from 'mongodb';
import {v2 as cloudinary} from 'cloudinary';
import {MongoStore} from '../server/store.js';
import {createApplication} from '../server/app.js';

// Use a separate database and remove only this run's temporary resources.
const client = new MongoClient(process.env.MONGODB_URI, {serverSelectionTimeoutMS:15000});
const db = client.db('nn_check_' + randomUUID().replaceAll('-', '').slice(0,20));
let server, uploadedId;
const messages = [];
cloudinary.config({cloud_name:process.env.CLOUDINARY_CLOUD_NAME,api_key:process.env.CLOUDINARY_API_KEY,api_secret:process.env.CLOUDINARY_API_SECRET});
try {
 await client.connect();
 const store = new MongoStore(db, client);
 const env = {...process.env, SUPER_EMAIL:'', SUPER_PASSWORD:''};
 const {app} = await createApplication({env, store, mailTransport:{sendMail:async message => messages.push(message)}});
 server = app.listen(0, '127.0.0.1');
 await new Promise(resolve => server.once('listening', resolve));
 const base = 'http://127.0.0.1:' + server.address().port;
 async function request(route, method='GET', body, token) {
  const response = await fetch(base + route, {method, headers:{'Content-Type':'application/json', ...(token?{Authorization:'Bearer '+token}:{})}, ...(body?{body:JSON.stringify(body)}:{})});
  const data = await response.json();
  assert.ok(response.ok, route + ': ' + JSON.stringify(data));
  return data;
 }
 const email = 'storage-check@example.test';
 const signup = await request('/api/user/signup','POST',{name:'Storage Check',user_name:'storage_check',email,number:'9999999999',password:'StorageCheck123!'});
 const challenge = await db.collection('challenges').findOne({_id:signup.challengeId});
 assert.ok(challenge.otpHash);
 const otp = messages[0].text.match(/\b\d{6}\b/)[0];
 assert.notEqual(challenge.otpHash, otp);
 const verified = await request('/api/user/signup/verify-otp','POST',{email,challengeId:signup.challengeId,otp});
 assert.equal(await db.collection('challenges').countDocuments({_id:signup.challengeId}),0);
 const login = await request('/api/user/login','POST',{email,password:'StorageCheck123!'});
 const token = login.jwtToken;
 assert.ok(verified.jwtToken && token);
 console.log('PASS: live MongoDB signup, hashed OTP verification and login (email delivery simulated).');
 const note = (await request('/api/home','POST',{},token)).data;
 let content = 'Live storage check: Hindi text bhi save hota hai. नमस्ते';
 await request('/api/home/'+note._id,'PUT',{content},token);
 assert.equal((await db.collection('notes').findOne({_id:note._id})).content, content);
 console.log('PASS: note text saved in live MongoDB.');
 const task = (await request('/api/task','POST',{},token)).data;
 await request('/api/task/'+task._id,'PUT',{text:'Persistent task check'},token);
 assert.equal((await db.collection('tasks').findOne({_id:task._id})).task[0].text,'Persistent task check');
 const readerBeforeUpload = new MongoClient(process.env.MONGODB_URI);
 try {await readerBeforeUpload.connect();assert.equal((await readerBeforeUpload.db(db.databaseName).collection('notes').findOne({_id:note._id})).content,content);} finally {await readerBeforeUpload.close();}
 assert.equal((await request('/api/home/'+note._id,'GET',undefined,token)).data.content,content);
 console.log('PASS: task storage and note retrieval through API and a fresh MongoDB connection.');
 const sign = await request('/api/uploads/sign','POST',{noteId:note._id},token);
 const form = new FormData();
 form.append('file', new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64')],{type:'image/png'}),'storage-check.png');
 form.append('api_key',sign.apiKey);form.append('signature',sign.signature);
 for(const [key,value] of Object.entries(sign.params))form.append(key,String(value));
 const uploadResponse = await fetch('https://api.cloudinary.com/v1_1/'+encodeURIComponent(sign.cloudName)+'/image/upload',{method:'POST',body:form});
 const upload = await uploadResponse.json();
 assert.ok(uploadResponse.ok, 'Cloudinary upload: '+(upload.error?.message||uploadResponse.status));
 uploadedId = upload.public_id;
 assert.ok(upload.secure_url);
 const image = await fetch(upload.secure_url);
 assert.ok(image.ok, 'Uploaded image must be readable');
 await image.arrayBuffer();
 content += '\n![Test image]('+upload.secure_url+')';
 await request('/api/home/'+note._id,'PUT',{content},token);
 // Read with a fresh client to verify persistence beyond the app's connection.
 const reader = new MongoClient(process.env.MONGODB_URI);
 try {await reader.connect();assert.equal((await reader.db(db.databaseName).collection('notes').findOne({_id:note._id})).content,content);} finally {await reader.close();}
 assert.equal((await request('/api/home/'+note._id,'GET',undefined,token)).data.content,content);
 console.log('PASS: actual signed Cloudinary upload, image retrieval, and image URL persisted with text in MongoDB.');
 console.log(process.env.SMTP_HOST?'SMTP configured; real inbox delivery was not tested.':'BLOCKED: SMTP missing; real signup email delivery requires SMTP credentials.');
} catch(error) {
 console.error('FAIL: '+error.message);
 process.exitCode=1;
} finally {
 if(uploadedId) {await cloudinary.uploader.destroy(uploadedId);console.log('Temporary Cloudinary image removed.');}
 if(server)await new Promise(resolve=>server.close(resolve));
 await db.dropDatabase();
 await client.close();
 console.log('Temporary test database removed.');
}
