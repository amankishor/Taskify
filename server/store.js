import fs from 'node:fs';
import path from 'node:path';
import {MongoClient} from 'mongodb';
const clone=value=>structuredClone(value);
function matches(doc,query){return Object.entries(query).every(([key,value])=>{
 if(key==='$or')return value.some(q=>matches(doc,q));
 if(key==='$and')return value.every(q=>matches(doc,q));
 if(value&&typeof value==='object'&&!Array.isArray(value))return Object.entries(value).every(([op,v])=>op==='$lte'?doc[key]<=v:op==='$gt'?doc[key]>v:op==='$exists'?(doc[key]!==undefined)===v:op==='$in'?v.includes(doc[key]):false);
 return doc[key]===value;
});}
export class FileStore{
 constructor(file){this.file=file;this.db=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{};for(const key of ['users','challenges','notes','tasks','reminders','events'])this.db[key]||=[];this.db.users.forEach(u=>u.usernameKey=u.user_name.toLowerCase());}
 persist(){fs.mkdirSync(path.dirname(this.file),{recursive:true});fs.writeFileSync(this.file+'.tmp',JSON.stringify(this.db),{mode:0o600});fs.renameSync(this.file+'.tmp',this.file);}
 async find(key,query={}){return clone(this.db[key].filter(d=>matches(d,query)));}
 async one(key,query){return clone(this.db[key].find(d=>matches(d,query))||null);}
 async insert(key,doc){if(this.db[key].some(d=>d._id===doc._id||(key==='users'&&(d.email===doc.email||d.usernameKey===doc.usernameKey))))throw Object.assign(Error('Already exists'),{code:11000});this.db[key].push({...clone(doc),_rev:0});this.persist();return clone(doc);}
 async remove(key,query){const before=this.db[key].length;this.db[key]=this.db[key].filter(d=>!matches(d,query));this.persist();return before-this.db[key].length;}
 async mutate(key,query,fn){const index=this.db[key].findIndex(d=>matches(d,query));if(index<0)return null;const updated=fn(clone(this.db[key][index]));if(!updated)return null;updated._rev=(this.db[key][index]._rev||0)+1;this.db[key][index]=updated;this.persist();return clone(updated);}
 async close(){}
}
export class MongoStore{
 constructor(db,client){this.db=db;this.client=client;}
 async find(key,query={}){return this.db.collection(key).find(query).limit(5000).toArray();}
 async one(key,query){return this.db.collection(key).findOne(query);}
 async insert(key,doc){await this.db.collection(key).insertOne({...doc,_rev:0});return doc;}
 async remove(key,query){return (await this.db.collection(key).deleteMany(query)).deletedCount;}
 async mutate(key,query,fn){
  for(let attempt=0;attempt<8;attempt++){
   const current=await this.one(key,query);if(!current)return null;
   const next=fn(clone(current));if(!next)return null;next._rev=(current._rev||0)+1;
   const result=await this.db.collection(key).replaceOne({...query,_id:current._id,_rev:current._rev===undefined?{$exists:false}:current._rev},next);
   if(result.modifiedCount)return next;
  }throw Object.assign(Error('The item changed. Please retry.'),{status:409});
 }
 async close(){await this.client.close();}
}
let connection;
export async function createStore(env=process.env){
 if(env.MONGODB_URI&&/YOUR_CLUSTER_HOST|<[^>]+>/i.test(env.MONGODB_URI))throw Error('MONGODB_URI contains placeholder values. Paste your real MongoDB Atlas connection string, or leave MONGODB_URI empty for local development.');
 if(!env.MONGODB_URI){if(env.VERCEL||env.NODE_ENV==='production')throw Error('MONGODB_URI is required for deployment. Local files are development-only.');return new FileStore(path.resolve(env.DATA_FILE||'data/database.json'));}
 if(!connection)connection=(async()=>{
  const client=new MongoClient(env.MONGODB_URI,{maxPoolSize:10,minPoolSize:0,serverSelectionTimeoutMS:10000});await client.connect();
  const db=client.db(env.MONGODB_DB||'notesnexa');
 await Promise.all([db.collection('users').createIndex({email:1},{unique:true}),db.collection('users').createIndex({usernameKey:1},{unique:true,sparse:true}),db.collection('notes').createIndex({userId:1,updatedAt:-1}),db.collection('tasks').createIndex({userId:1,updatedAt:-1}),db.collection('events').createIndex({userId:1,remindAt:1}),db.collection('challenges').createIndex({email:1}),db.collection('reminders').createIndex({status:1,nextAttempt:1}),db.collection('rateLimits').createIndex({expireAt:1},{expireAfterSeconds:0})]);
  return new MongoStore(db,client);
 })().catch(err=>{connection=undefined;throw err;});
 return connection;
}
