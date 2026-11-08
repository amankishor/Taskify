import 'dotenv/config';
import {readFileSync} from 'node:fs';
import {createStore} from '../server/store.js';
import {queueReminder} from '../server/reminders.js';
if(!process.env.MONGODB_URI)throw Error('Set MONGODB_URI first.');
const source=JSON.parse(readFileSync(process.env.DATA_FILE||'data/database.json','utf8'));
const store=await createStore();let imported=0,skipped=0;
try{
 for(const key of ['users','notes','tasks','events'])for(const original of source[key]||[]){const doc={...original};delete doc._rev;if(key==='users'){doc.email=doc.email.toLowerCase();doc.usernameKey=doc.user_name.toLowerCase();}
  const existing=await store.one(key,{_id:doc._id});if(existing){skipped++;continue;}
  // Never silently bind another account's notes to an email collision.
  if(key==='users'&&await store.one('users',{$or:[{email:doc.email},{usernameKey:doc.usernameKey}]}))throw Error('An account already exists with a different ID. Stop and resolve the collision before migrating notes.');
  await store.insert(key,doc);if(key!=='users')await queueReminder(store,key==='notes'?'note':key==='events'?'reminder':'task',doc);imported++;
 }
 console.log(`Migration complete: ${imported} imported, ${skipped} existing IDs left unchanged. Source file was not modified.`);
}finally{await store.close();}
