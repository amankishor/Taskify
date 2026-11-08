import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter,Navigate,useLocation,useNavigate} from 'react-router-dom';
import {Toaster,toast} from 'sonner';
const Auth=React.lazy(()=>import('./Auth'));
const Workspace=React.lazy(()=>import('./Workspace'));
import './fonts.css';
import './styles.css';
function App(){
 const location=useLocation(),navigate=useNavigate();const[session,setSession]=useState(()=>!!localStorage.getItem('token'));
 useEffect(()=>{const expired=()=>{setSession(false);navigate('/login');toast.error('Your session expired. Please sign in again.');};window.addEventListener('session-expired',expired);return()=>window.removeEventListener('session-expired',expired);},[navigate]);
 const login=data=>{localStorage.setItem('token',data.jwtToken);localStorage.setItem('loggedInName',data.users.name);localStorage.setItem('loggedInUserName',data.users.user_name);setSession(true);navigate('/home');};
 const logout=()=>{for(const k of ['token','loggedInName','loggedInUserName'])localStorage.removeItem(k);setSession(false);navigate('/login');};
 const isAuth=['/','/login','/signup'].includes(location.pathname);
 return <><a className="skip-link" href="#main">Skip to content</a>{isAuth?(session?<Navigate to="/home" replace/>:<Auth onLogin={login}/>):session?<Workspace onLogout={logout}/>:<Navigate to="/login" replace/>}<Toaster position="bottom-right" richColors closeButton toastOptions={{className:'app-toast'}}/></>;
}
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));
createRoot(document.getElementById('root')).render(<React.StrictMode><React.Suspense fallback={<div className="loading-state">Opening NotesNexa…</div>}><BrowserRouter><App/></BrowserRouter></React.Suspense></React.StrictMode>);
