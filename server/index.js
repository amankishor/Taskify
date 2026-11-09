import 'dotenv/config';
import {createApplication} from './app.js';
let application;try{application=await createApplication();}catch(err){console.error(err.code==='ENOTFOUND'?'Database connection failed: MongoDB hostname could not be found. Check MONGODB_URI in .env.':err.message);process.exit(1);}
const {app,runReminders,runCleanup}=application;
app.listen(Number(process.env.PORT||3000),process.env.HOST||'127.0.0.1',()=>console.log(`NotesNexa: http://${process.env.HOST||'127.0.0.1'}:${process.env.PORT||3000}`));
if(!process.env.VERCEL){let running=false;const timer=setInterval(async()=>{if(running)return;running=true;try{if(process.env.SMTP_HOST)await runReminders();else await runCleanup();}catch(err){console.error('Reminder worker:',err.message);}finally{running=false;}},30000);timer.unref();}
