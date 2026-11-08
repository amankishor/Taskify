import React,{useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {Aperture,Sun,Moon} from 'lucide-react';
export const dateLabel=d=>new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short'});
export async function api(url,{method='GET',body,signal}={}){
 const token=localStorage.getItem('token');
 const res=await fetch('/api'+url,{method,signal,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});
 const data=await res.json().catch(()=>({message:'Server could not be reached. Please try again.'}));
 if(!res.ok){if(res.status===401&&!url.startsWith('/user')){localStorage.removeItem('token');window.dispatchEvent(new Event('session-expired'));}throw new Error(data.message||'Could not complete the request.');}return data;
}
export function Brand({inverse=false}){return <Link className={`brand ${inverse?'inverse':''}`} to={localStorage.getItem('token')?'/home':'/login'} aria-label="NotesNexa home"><Aperture size={29} strokeWidth={1.6}/><span>notesnexa<span className="brand-period">.</span></span></Link>;}
export function Button({children,variant='',className='',...props}){return <button className={`button ${variant} ${className}`} {...props}>{children}</button>;}
export function IconButton({label,children,...props}){return <button type="button" className="icon-button" title={label} aria-label={label} {...props}>{children}</button>;}
export function ThemeToggle(){const[theme,setTheme]=useState(()=>localStorage.getItem('taskify-theme')||'light');useEffect(()=>{document.documentElement.dataset.theme=theme;localStorage.setItem('taskify-theme',theme);},[theme]);return <IconButton label={`Switch to ${theme==='dark'?'light':'dark'} mode`} onClick={()=>setTheme(t=>t==='dark'?'light':'dark')}>{theme==='dark'?<Sun size={19}/>:<Moon size={19}/>}</IconButton>;}
