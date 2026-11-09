import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {toast} from 'sonner';
import {api} from './shared';
export function EditableTitle({value,onSave,saveRef}){
 const[title,setTitle]=useState(value),field=useRef(null),draft=useRef(value),saved=useRef(value),dirty=useRef(false),pending=useRef(Promise.resolve()),saveHandler=useRef(onSave);saveHandler.current=onSave;
 useEffect(()=>{saved.current=value;if(!dirty.current){draft.current=value;setTitle(value);}},[value]);
 const commit=()=>{const job=pending.current.catch(()=>{}).then(async()=>{const next=draft.current.trim();if(!next){draft.current=saved.current;dirty.current=false;setTitle(saved.current);return;}if(next===saved.current)return;await saveHandler.current(next);saved.current=next;if(draft.current.trim()===next){dirty.current=false;setTitle(next);}});pending.current=job;return job;};
 useEffect(()=>{if(saveRef)saveRef.current=commit;return()=>{if(saveRef)saveRef.current=async()=>{};};},[saveRef]);
 useLayoutEffect(()=>{const fit=()=>{if(field.current){field.current.style.height='auto';field.current.style.height=field.current.scrollHeight+'px';}};fit();window.addEventListener('resize',fit);return()=>window.removeEventListener('resize',fit);},[title]);
 return <textarea ref={field} rows={1} className="editor-title" aria-label="Title" value={title} onChange={e=>{const next=e.target.value.replace(/\n/g,' ');draft.current=next;dirty.current=true;setTitle(next);}} maxLength={200} onBlur={()=>commit().catch(()=>{})} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();e.currentTarget.blur();}}}/>;
}
export function useRename(base,item,onUpdate){return async title=>{try{onUpdate((await api(`${base}/${item._id}/title`,{method:'PATCH',body:{title}})).data);}catch(err){toast.error(err.message);throw err;}};}
