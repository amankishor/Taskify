import express from 'express';
import helmet from 'helmet';
import {rateLimit} from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import {v2 as cloudinary} from 'cloudinary';
import {randomBytes,randomInt,randomUUID,createHash,timingSafeEqual} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createStore} from './store.js';
import {queueReminder,processReminders,nextOccurrence} from './reminders.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const fail=(message,status=400)=>Object.assign(Error(message),{status});
const str=(v,max=200)=>typeof v==='string'?v.trim().slice(0,max):'';
const hash=v=>createHash('sha256').update(v).digest('hex');
const now=()=>new Date().toISOString();
const safeItem=({_rev,...item})=>item;
const date=v=>{if(v===null||v==='')return null;if(typeof v!=='string'||!Number.isFinite(Date.parse(v)))throw fail('Invalid reminder date.');return new Date(v).toISOString();};
const publicUser=u=>({_id:u._id,name:u.name,user_name:u.user_name,email:u.email,number:u.number});
const todoChanges=(b,creating=false)=>{const out={};for(const k of ['completed_todo','impotent'])if(k in b){if(typeof b[k]!=='boolean')throw fail('Invalid task value.');out[k]=b[k];}if('status'in b){if(!['todo','in-progress','review','done'].includes(b.status))throw fail('Invalid task status.');out.status=b.status;out.completed_todo=b.status==='done';}if('priority'in b){if(!['low','medium','high'].includes(b.priority))throw fail('Invalid task priority.');out.priority=b.priority;}if('progress'in b){if(!Number.isInteger(b.progress)||b.progress<0||b.progress>100)throw fail('Progress must be between 0 and 100.');out.progress=b.progress;}if('dueDate'in b){out.dueDate=date(b.dueDate);out.reminderCompletedAt=null;}if('reminderCompleted'in b){if(typeof b.reminderCompleted!=='boolean')throw fail('Invalid reminder completion.');out.reminderCompletedAt=b.reminderCompleted?now():null;}if('completed_todo'in out){out.completedAt=out.completed_todo?now():null;if(!('status'in out))out.status=out.completed_todo?'done':'todo';if(out.completed_todo)out.progress=100;}return creating?{status:'todo',priority:'low',progress:0,...out}:out;};
export async function createApplication({env=process.env,store:providedStore,mailTransport}={}){
 const prod=env.NODE_ENV==='production'||Boolean(env.VERCEL);
 if(prod&&(env.JWT_SECRET||'').length<32)throw Error('Set JWT_SECRET to at least 32 random characters.');
 const secret=env.JWT_SECRET||randomBytes(48).toString('hex'),store=providedStore||await createStore(env);
 const superEmail=str(env.SUPER_EMAIL).toLowerCase(),superPassword=env.SUPER_PASSWORD;
 if(Boolean(superEmail)!==Boolean(superPassword))throw Error('Set both SUPER_EMAIL and SUPER_PASSWORD, or leave both empty.');
 if(superEmail){
  if(!/^\S+@\S+\.\S+$/.test(superEmail)||superPassword.length<12)throw Error('Owner email/password configuration is invalid.');
  let owner=await store.one('users',{email:superEmail});if(owner&&!owner.superAccount)throw Error('SUPER_EMAIL belongs to a regular account. Choose another email.');
  if(!owner){owner={_id:randomUUID(),email:superEmail,user_name:'super_'+randomBytes(5).toString('hex'),name:str(env.SUPER_NAME,100)||'Workspace Owner',number:'',createdAt:now(),superAccount:true,passwordHash:await bcrypt.hash(superPassword,12)};owner.usernameKey=owner.user_name;
   try{await store.insert('users',owner);}catch(err){if(err.code!==11000)throw err;owner=await store.one('users',{email:superEmail});if(!owner?.superAccount)throw Error('Owner account collision.');}
  }
  if(!await bcrypt.compare(superPassword,owner.passwordHash)||env.SUPER_NAME&&owner.name!==str(env.SUPER_NAME,100)){const passwordHash=await bcrypt.hash(superPassword,12);await store.mutate('users',{_id:owner._id},u=>({...u,passwordHash,name:str(env.SUPER_NAME,100)||u.name}));}
 }
 const transport=mailTransport||(env.SMTP_HOST?nodemailer.createTransport({host:env.SMTP_HOST,port:Number(env.SMTP_PORT||587),secure:env.SMTP_SECURE==='true',connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000,auth:env.SMTP_USER?{user:env.SMTP_USER,pass:env.SMTP_PASS}:undefined}):null);
 const runReminders=async()=>{if(!transport)throw fail('Configure SMTP credentials before sending email reminders.',503);return processReminders({store,sendMail:m=>transport.sendMail(m),from:env.SMTP_FROM,appUrl:(env.APP_URL||'').replace(/\/$/,'')});};
 const app=express();if(env.VERCEL)app.set('trust proxy',1);
 app.use(helmet({contentSecurityPolicy:{directives:{defaultSrc:["'self'"],scriptSrc:["'self'","'unsafe-inline'"],styleSrc:["'self'","'unsafe-inline'"],imgSrc:["'self'",'https:','data:','blob:'],connectSrc:["'self'",'https://api.cloudinary.com'],fontSrc:["'self'",'data:'],objectSrc:["'none'"]}}}));
 app.use(express.json({limit:'512kb'}));app.use('/api',(_,res,next)=>{res.set('Cache-Control','no-store');next();});
 // Persist production login/signup limits across serverless instances.
 app.use('/api/user',async(req,res,next)=>{if(!env.MONGODB_URI)return next();const window=15*60*1000,bucket=Math.floor(Date.now()/window),id=hash(`${req.ip}:${bucket}`);try{await store.insert('rateLimits',{_id:id,count:1,expireAt:new Date((bucket+2)*window)});}catch(err){if(err.code!==11000)return next(err);const limit=await store.mutate('rateLimits',{_id:id},b=>({...b,count:b.count+1}));if(limit?.count>40)return res.status(429).json({success:false,message:'Too many attempts. Try again later.'});}next();});
 app.use('/api/user',rateLimit({windowMs:15*60*1000,limit:40,standardHeaders:'draft-8',legacyHeaders:false,message:{success:false,message:'Too many attempts. Try again later.'}}));
 const authResult=u=>({success:true,message:'Welcome to NotesNexa',jwtToken:jwt.sign({sub:u._id},secret,{expiresIn:'7d'}),users:publicUser(u)});
 async function deliver(c){const otp=String(randomInt(100000,1000000)),changes={otpHash:hash(otp),expires:Date.now()+600000,sentAt:Date.now(),attempts:0};
  if(transport)await transport.sendMail({from:env.SMTP_FROM,to:c.email,subject:'Your NotesNexa verification code',text:`Your verification code is ${otp}. It expires in 10 minutes.`});
  else if(!prod&&env.DEV_OTP_LOG==='true')console.log(`[LOCAL SIGNUP] ${c.email}: ${otp}`);
  else throw fail('Email is not configured. Set SMTP credentials.',503);
  await store.mutate('challenges',{_id:c._id},v=>({...v,...changes}));return {success:true,email:c.email,challengeId:c._id,resendAfter:60,message:'Verification code sent. Check your inbox.'};
 }
 app.get('/api/health',(_,res)=>res.json({success:true,status:'ok',storage:env.MONGODB_URI?'mongodb':'local-development'}));
 app.get('/api/cron/reminders',async(req,res)=>{const expected=env.CRON_SECRET,actual=req.headers.authorization||'';if(!expected||!timingSafeEqual(Buffer.from(hash(actual)),Buffer.from(hash('Bearer '+expected))))throw fail('Unauthorized',401);const result=await runReminders();res.status(result.failed?502:200).json({success:result.failed===0,...result});});
 app.post('/api/user/signup',async(req,res)=>{
  const b=req.body||{},email=str(b.email).toLowerCase(),name=str(b.name,100),user_name=str(b.user_name,20),number=str(b.number,10),password=b.password;
  if(name.length<3||!/^\w{4,20}$/.test(user_name)||!/^\S+@\S+\.\S+$/.test(email)||!/^\d{10}$/.test(number)||typeof password!=='string'||password.length<6||password.length>100||!/[A-Z]/.test(password)||!/[0-9]/.test(password)||!/[^A-Za-z0-9]/.test(password))throw fail('Enter valid details and a password with uppercase, number and symbol.');
  if(await store.one('users',{$or:[{email},{usernameKey:user_name.toLowerCase()}]}))throw fail('Email or username already registered.',409);
  if(await store.one('challenges',{email,sentAt:{$gt:Date.now()-60000}}))throw fail('Wait 60 seconds before requesting another code.',429);
  const c={_id:randomUUID(),email,name,user_name,usernameKey:user_name.toLowerCase(),number,passwordHash:await bcrypt.hash(password,12),expires:Date.now()+600000,sentAt:0,attempts:0};
  await store.remove('challenges',{email});await store.insert('challenges',c);try{res.json(await deliver(c));}catch(err){await store.remove('challenges',{_id:c._id});throw err;}
 });
 app.post('/api/user/signup/resend-otp',async(req,res)=>{const c=await store.one('challenges',{_id:str(req.body.challengeId,100),email:str(req.body.email).toLowerCase()});if(!c)throw fail('Start signup again.');if(Date.now()-c.sentAt<60000)throw fail('Wait before resending.',429);res.json(await deliver(c));});
 app.post('/api/user/signup/verify-otp',async(req,res)=>{
  const c=await store.mutate('challenges',{_id:str(req.body.challengeId,100),email:str(req.body.email).toLowerCase()},c=>{if(c.expires<Date.now()||c.attempts>=5)throw fail('Code expired. Request another code.');return {...c,attempts:c.attempts+1};});
  if(!c||!c.otpHash)throw fail('Start signup again.');if(!timingSafeEqual(Buffer.from(hash(String(req.body.otp))),Buffer.from(c.otpHash)))throw fail('Incorrect verification code.');
  const u={_id:randomUUID(),name:c.name,user_name:c.user_name,usernameKey:c.usernameKey,email:c.email,number:c.number,passwordHash:c.passwordHash,createdAt:now()};await store.insert('users',u);await store.remove('challenges',{_id:c._id});res.status(201).json(authResult(u));
 });
 app.post('/api/user/login',async(req,res)=>{const b=req.body||{},id=str(b.email||b.user_name).toLowerCase(),u=await store.one('users',{$or:[{email:id},{usernameKey:id}]});if(!u||(u.superAccount&&u.email!==superEmail)||typeof b.password!=='string'||!await bcrypt.compare(b.password,u.passwordHash))throw fail('Invalid email/username or password.',401);res.json(authResult(u));});
 app.use('/api',async(req,res,next)=>{try{const p=jwt.verify(req.headers.authorization?.replace(/^Bearer /,'')||'',secret),u=await store.one('users',{_id:p.sub});if(!u||(u.superAccount&&u.email!==superEmail))throw Error('Missing user');req.uid=u._id;req.user=u;next();}catch(err){if(err.name==='MongoServerSelectionError')return next(err);res.status(401).json({success:false,message:'Please sign in again.'});}});
 const groupsFor=u=>u.groups||[{_id:'personal',name:'Personal'},{_id:'work',name:'Work'},{_id:'others',name:'Others'}];
 const validGroup=async(req,value)=>{const id=value==null?'others':str(value,100);const u=await store.one('users',{_id:req.uid});if(!groupsFor(u).some(g=>g._id===id))throw fail('Group not found.',404);return id;};
 app.get('/api/groups',async(req,res)=>res.json({success:true,data:groupsFor(await store.one('users',{_id:req.uid}))}));
 app.post('/api/groups',async(req,res)=>{const name=str(req.body.name,40);if(!name)throw fail('Group name is required.');const group={_id:randomUUID(),name};await store.mutate('users',{_id:req.uid},u=>{const groups=groupsFor(u);if(groups.length>=50)throw fail('You can create up to 50 groups.');if(groups.some(g=>g.name.toLowerCase()===name.toLowerCase()))throw fail('A group with that name already exists.',409);return {...u,groups:[...groups,group]};});res.status(201).json({success:true,data:group});});
 app.get('/api/reminders',async(req,res)=>res.json({success:true,data:(await store.find('events',{userId:req.uid})).map(safeItem)}));
 app.post('/api/reminders',async(req,res)=>{const b=req.body,title=str(b.title,200),remindAt=date(b.remindAt);if(!title||!remindAt)throw fail('Enter a reminder title, date and time.');if(!['none','daily','weekly','weekdays'].includes(b.repeat||'none'))throw fail('Invalid repeat setting.');if('notifyEmail'in b&&typeof b.notifyEmail!=='boolean')throw fail('Invalid notification setting.');const item={_id:randomUUID(),userId:req.uid,title,description:str(b.description,1000),groupId:await validGroup(req,b.groupId),remindAt,repeat:b.repeat||'none',notifyEmail:b.notifyEmail!==false,completedAt:null,createdAt:now(),updatedAt:now()};await store.insert('events',item);await queueReminder(store,'reminder',item);res.status(201).json({success:true,data:item});});
 app.patch('/api/reminders/:id',async(req,res)=>{const b=req.body,changes={};if('title'in b){if(!str(b.title,200))throw fail('Title is required.');changes.title=str(b.title,200);}if('description'in b)changes.description=str(b.description,1000);if('groupId'in b)changes.groupId=await validGroup(req,b.groupId);if('remindAt'in b){changes.remindAt=date(b.remindAt);if(!changes.remindAt)throw fail('Reminder date is required.');changes.completedAt=null;}if('repeat'in b){if(!['none','daily','weekly','weekdays'].includes(b.repeat))throw fail('Invalid repeat setting.');changes.repeat=b.repeat;}if('notifyEmail'in b){if(typeof b.notifyEmail!=='boolean')throw fail('Invalid notification setting.');changes.notifyEmail=b.notifyEmail;}if('completed'in b&&typeof b.completed!=='boolean')throw fail('Invalid completion setting.');const item=await store.mutate('events',{_id:req.params.id,userId:req.uid},old=>{const updated={...old,...changes,updatedAt:now()};if('completed'in b){if(b.completed&&updated.repeat!=='none'){updated.lastCompletedAt=now();updated.remindAt=nextOccurrence(updated.remindAt,updated.repeat,Date.now());updated.completedAt=null;}else updated.completedAt=b.completed?now():null;}return updated;});if(!item)throw fail('Reminder not found.',404);await queueReminder(store,'reminder',item);res.json({success:true,data:safeItem(item)});});
 app.delete('/api/reminders/:id',async(req,res)=>{if(!await store.remove('events',{_id:req.params.id,userId:req.uid}))throw fail('Reminder not found.',404);res.json({success:true});});
 app.get('/api/notifications',async(req,res)=>{const[n,t,r]=await Promise.all([store.find('notes',{userId:req.uid}),store.find('tasks',{userId:req.uid}),store.find('events',{userId:req.uid})]),data=[];for(const [items,kind,key]of [[n,'note','reminderAt'],[t,'task','dueDate'],[r,'reminder','remindAt']])for(const item of items)if(item[key]&&Date.parse(item[key])<=Date.now()&&!item.trashedAt&&!item.reminderCompletedAt&&!item.completedAt&&!(kind==='task'&&item.task.length&&item.task.every(t=>t.completed_todo)))data.push({notificationId:`${item._id}:${item[key]}`,kind,title:item.title});for(const list of t)for(const todo of list.task)if(todo.dueDate&&Date.parse(todo.dueDate)<=Date.now()&&!todo.completed_todo&&!todo.reminderCompletedAt)data.push({notificationId:`${list._id}:${todo._id}:${todo.dueDate}`,kind:'task',title:todo.text});res.json({success:true,data});});
 app.post('/api/uploads/sign',async(req,res)=>{
  if(!env.CLOUDINARY_CLOUD_NAME||!env.CLOUDINARY_API_KEY||!env.CLOUDINARY_API_SECRET)throw fail('Image uploads need Cloudinary credentials in server settings.',503);
  const note=await store.one('notes',{_id:str(req.body.noteId,100),userId:req.uid});if(!note||note.trashedAt)throw fail('Note not found.',404);
  const params={timestamp:Math.floor(Date.now()/1000),folder:`notesnexa/${req.uid}/${note._id}`,public_id:randomUUID(),allowed_formats:'jpg,png,webp,gif,avif',overwrite:false};if(env.CLOUDINARY_UPLOAD_PRESET)params.upload_preset=env.CLOUDINARY_UPLOAD_PRESET;
  res.json({success:true,cloudName:env.CLOUDINARY_CLOUD_NAME,apiKey:env.CLOUDINARY_API_KEY,params,signature:cloudinary.utils.api_sign_request(params,env.CLOUDINARY_API_SECRET)});
 });
 for(const[route,key,kind]of [['home','notes','note'],['task','tasks','task']]){
  const base='/api/'+route,query=req=>({_id:req.params.id,userId:req.uid});
  const mutate=async(req,res,fn)=>{const item=await store.mutate(key,query(req),old=>({...fn(old),updatedAt:now()}));if(!item)throw fail('Item not found.',404);await queueReminder(store,kind,item);res.json({success:true,data:safeItem(item)});};
  app.get(base,async(req,res)=>res.json({success:true,data:(await store.find(key,{userId:req.uid})).map(safeItem)}));
  app.post(base,async(req,res)=>{const item={_id:randomUUID(),userId:req.uid,title:kind==='note'?'Untitled Note':'Untitled Task',groupId:await validGroup(req,req.body.groupId),createdAt:now(),updatedAt:now(),...(kind==='note'?{content:'',pinned:req.body.collection==='favorites',archivedAt:req.body.collection==='archive'?now():null,trashedAt:null,reminderAt:null}:{priority:'low',task:[],dueDate:null})};await store.insert(key,item);res.status(201).json({success:true,data:item});});
  app.get(base+'/:id',async(req,res)=>{const item=await store.one(key,query(req));if(!item)throw fail('Item not found.',404);res.json({success:true,data:safeItem(item)});});
  app.patch(base+'/:id/group',async(req,res)=>{const groupId=await validGroup(req,req.body.groupId);await mutate(req,res,item=>({...item,groupId}));});
  app.patch(base+'/:id/title',async(req,res)=>{const title=str(req.body.title,200);if(!title)throw fail('Title is required.');await mutate(req,res,item=>({...item,title}));});
  app.delete(base+'/:id',async(req,res)=>{if(!await store.remove(key,query(req)))throw fail('Item not found.',404);res.json({success:true,message:'Deleted'});});
  app.put(base+'/:id',async(req,res)=>{if(kind==='note'){if(typeof req.body.content!=='string'||Buffer.byteLength(req.body.content)>262144)throw fail('Note must be text, up to 256 KB.');await mutate(req,res,item=>({...item,content:req.body.content}));}else{const text=str(req.body.text,5000);if(!text)throw fail('Write a task first.');const todo={_id:randomUUID(),text,completed_todo:false,impotent:false,createdAt:now(),...todoChanges(req.body,true)};await mutate(req,res,item=>({...item,task:[...item.task,todo]}));}});
  if(kind==='note')app.patch(base+'/:id/settings',async(req,res)=>{const b=req.body,changes={};for(const k of ['pinned','archived','trashed'])if(k in b&&typeof b[k]!=='boolean')throw fail('Invalid setting.');if('pinned'in b)changes.pinned=b.pinned;if('archived'in b)changes.archivedAt=b.archived?now():null;if('trashed'in b)changes.trashedAt=b.trashed?now():null;if('reminderAt'in b){changes.reminderAt=date(b.reminderAt);changes.reminderCompletedAt=null;}if('reminderCompleted'in b){if(typeof b.reminderCompleted!=='boolean')throw fail('Invalid reminder setting.');changes.reminderCompletedAt=b.reminderCompleted?now():null;}await mutate(req,res,item=>({...item,...changes}));});
  else{
   app.patch(base+'/:id/reminder',async(req,res)=>{const changes={};if('dueDate'in req.body){changes.dueDate=date(req.body.dueDate);changes.reminderCompletedAt=null;}if('completed'in req.body){if(typeof req.body.completed!=='boolean')throw fail('Invalid completion setting.');changes.reminderCompletedAt=req.body.completed?now():null;}await mutate(req,res,item=>({...item,...changes}));});
   app.delete(base+'/:id/:todoId',async(req,res)=>mutate(req,res,item=>{if(!item.task.some(t=>t._id===req.params.todoId))throw fail('Task not found.',404);return {...item,task:item.task.filter(t=>t._id!==req.params.todoId)};}));
   app.put(base+'/:id/:todoId',async(req,res)=>{const b=req.body,changes={};if('text'in b){if(!str(b.text,5000))throw fail('Task text required.');changes.text=str(b.text,5000);}Object.assign(changes,todoChanges(b));await mutate(req,res,item=>{if(!item.task.some(t=>t._id===req.params.todoId))throw fail('Todo not found.',404);return {...item,task:item.task.map(t=>t._id===req.params.todoId?{...t,...changes,...('completed_todo'in b?{completedAt:b.completed_todo?(t.completedAt||now()):null}:{})}:t)};});});
  }
 }
 app.use('/api',(_,res)=>res.status(404).json({success:false,message:'Endpoint not found'}));
 if(!env.VERCEL){app.use(express.static(path.join(root,'public'),{setHeaders:(res,file)=>{if(file.endsWith('sw.js')||file.endsWith('index.html'))res.set('Cache-Control','no-cache');}}));app.get('/{*path}',(_,res)=>res.sendFile(path.join(root,'public/index.html')));}
 app.use((err,req,res,next)=>{if(err.code===11000)return res.status(409).json({success:false,message:'Email or username already registered.'});if(!err.status)console.error('Request failed:',err.name);res.status(err.status||500).json({success:false,message:err.status?err.message:'Server error. Please try again.'});});
 return {app,store,runReminders};
}
