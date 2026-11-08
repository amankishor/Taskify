import {createApplication} from '../server/app.js';
let runtime;
export default async function handler(req,res){
 try{runtime||=createApplication().catch(err=>{runtime=undefined;throw err;});const {app}=await runtime;return app(req,res);}catch{res.statusCode=503;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({success:false,message:'Server configuration or database connection is unavailable. Check deployment environment variables.'}));}
}
