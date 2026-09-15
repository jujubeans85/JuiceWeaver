import {createServer} from 'node:http';
import {readFile,stat,realpath} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=await realpath(process.cwd()),port=Number(process.env.PORT||8765),host=process.env.JUICE_DEV_HOST||'127.0.0.1';
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff':'font/woff','.wav':'audio/wav'};
createServer(async(req,res)=>{try{
  const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(path.split('/').some(part=>part.startsWith('.'))){res.writeHead(403).end('Forbidden');return;}
  const candidate=resolve(root,'.'+path);
  if(candidate!==root&&!candidate.startsWith(root+sep)){res.writeHead(403).end('Forbidden');return;}
  const s=await stat(candidate),file=await realpath(s.isDirectory()?resolve(candidate,'index.html'):candidate);
  if(!file.startsWith(root+sep)||file.slice(root.length+1).split(sep).some(part=>part.startsWith('.'))){res.writeHead(403).end('Forbidden');return;}
  const body=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(body);
}catch{res.writeHead(404).end('Not found');}}).listen(port,host,()=>console.log(`JuiceWeaver dev server http://${host}:${port}`));
