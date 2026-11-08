import {spawnSync} from 'node:child_process';
const result=spawnSync(process.execPath,['--test','tests/mongo.test.js'],{stdio:'inherit',env:{...process.env,RUN_MONGO_TESTS:'1'}});process.exit(result.status||0);
