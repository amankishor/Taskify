import {spawnSync} from 'node:child_process';
for(const args of [['node_modules/vite/bin/vite.js','build'],['scripts/build-sw.js']]){
 const result=spawnSync(process.execPath,args,{stdio:'inherit'});
 if(result.status!==0)process.exit(result.status||1);
}
