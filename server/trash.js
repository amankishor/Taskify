import {queueReminder} from './reminders.js';
export const TRASH_DAYS=30;
const lifetime=TRASH_DAYS*86400000;
const collections={note:'notes',task:'tasks',reminder:'events'};
const groups=u=>u.groups||[{_id:'personal',name:'Personal'},{_id:'work',name:'Work'},{_id:'others',name:'Others'}];
const fail=(message,status=400)=>Object.assign(Error(message),{status});
export const trashStamp=(time=Date.now())=>({trashedAt:new Date(time).toISOString(),trashExpiresAt:new Date(time+lifetime).toISOString()});
const expired=(item,time)=>Date.parse(item.trashExpiresAt||new Date(Date.parse(item.trashedAt)+lifetime).toISOString())<=time;
export async function cleanupExpiredTrash(store,{userId,clock=()=>Date.now()}={}){
 const time=clock(),scope=userId?{userId}:{},removed={notes:0,tasks:0,reminders:0};
 for(const[kind,key]of Object.entries(collections))for(const item of await store.find(key,{...scope,$or:[{trashExpiresAt:{$lte:new Date(time).toISOString()}},{trashedAt:{$lte:new Date(time-lifetime).toISOString()}}]}))if(item.trashedAt&&expired(item,time)){const count=await store.remove(key,{_id:item._id,userId:item.userId,trashedAt:item.trashedAt});removed[kind==='reminder'?'reminders':key]+=count;if(count)await store.remove('reminders',{itemId:item._id,userId:item.userId});}
 for(const user of await store.find('users',userId?{_id:userId}:{}))if(user.trashedGroups?.some(g=>expired(g,time)))await store.mutate('users',{_id:user._id},u=>({...u,trashedGroups:(u.trashedGroups||[]).filter(g=>!expired(g,time))}));
 return removed;
}
export async function trashGroup(store,userId,id){
 if(id==='others')throw fail('Others is the default group and cannot be deleted.');const user=await store.one('users',{_id:userId}),group=groups(user).find(g=>g._id===id);if(!group)throw fail('Group not found.',404);
 const stamp=trashStamp(),moved={notes:0,tasks:0,reminders:0};
 for(const[kind,key]of Object.entries(collections))for(const item of await store.find(key,{userId,groupId:id}))if(!item.trashedAt){const changed=await store.mutate(key,{_id:item._id,userId,groupId:id},current=>current.trashedAt?null:{...current,...stamp,trashedGroupId:id,updatedAt:stamp.trashedAt});if(changed)moved[kind==='reminder'?'reminders':key]++;}
 await store.mutate('users',{_id:userId},u=>({...u,groups:groups(u).filter(g=>g._id!==id),trashedGroups:[...(u.trashedGroups||[]).filter(g=>g._id!==id),{...group,...stamp}]}));return moved;
}
async function restoreGroupMetadata(store,userId,id){
 let groupId=id||'others';await store.mutate('users',{_id:userId},u=>{const active=groups(u);if(active.some(g=>g._id===groupId))return null;const trashed=(u.trashedGroups||[]).find(g=>g._id===groupId&&!expired(g,Date.now()));if(!trashed){groupId='others';return null;}return {...u,groups:[...active,{_id:trashed._id,name:trashed.name}],trashedGroups:(u.trashedGroups||[]).filter(g=>g._id!==groupId)};});return groupId;
}
export async function restoreTrashItem(store,userId,kind,id){
 const key=collections[kind];if(!key)throw fail('Invalid item type.');const item=await store.one(key,{_id:id,userId});if(!item?.trashedAt)throw fail('Trashed item not found.',404);if(expired(item,Date.now()))throw fail('The 30-day restore period has expired.',410);
 const groupId=await restoreGroupMetadata(store,userId,item.groupId);const restored=await store.mutate(key,{_id:id,userId,trashedAt:item.trashedAt},current=>({...current,groupId,trashedAt:null,trashExpiresAt:null,trashedGroupId:null,updatedAt:new Date().toISOString()}));if(!restored)throw fail('Item changed. Please try again.',409);await queueReminder(store,kind,restored);return restored;
}
export async function restoreTrashedGroup(store,userId,id){
 const user=await store.one('users',{_id:userId});const tombstone=(user.trashedGroups||[]).find(g=>g._id===id);const members=[];for(const[kind,key]of Object.entries(collections))for(const item of await store.find(key,{userId,trashedGroupId:id}))if(item.trashedAt&&!expired(item,Date.now()))members.push({kind,item});
 if(!tombstone&&!members.length)throw fail('Trashed group not found.',404);if(tombstone&&expired(tombstone,Date.now()))throw fail('The 30-day restore period has expired.',410);await restoreGroupMetadata(store,userId,id);for(const{kind,item}of members)await restoreTrashItem(store,userId,kind,item._id);return members.length;
}
export async function permanentlyDeleteTrashItem(store,userId,kind,id){const key=collections[kind];if(!key)throw fail('Invalid item type.');const item=await store.one(key,{_id:id,userId});if(!item?.trashedAt)throw fail('Trashed item not found.',404);await store.remove(key,{_id:id,userId,trashedAt:item.trashedAt});await store.remove('reminders',{itemId:id,userId});}
