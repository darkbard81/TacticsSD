import { createServer } from '/home/deck/Documents/TacticsSD/node_modules/vite/dist/node/index.js';
const server = await createServer({configFile:false,root:'/home/deck/Documents/TacticsSD',cacheDir:'/tmp/tacticssd-audit/vite-cache',server:{host:'127.0.0.1',port:4173,fs:{allow:['/home/deck/Documents/TacticsSD','/tmp/tacticssd-audit']}}});
await server.listen();console.log('Audit read-only source server 4173');
