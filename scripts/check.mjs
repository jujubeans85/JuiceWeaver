import {readFile,readdir,stat} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {spawnSync} from 'node:child_process';
async function walk(dir){const paths=[];for(const ent of await readdir(dir,{withFileTypes:true})){const path=resolve(dir,ent.name);if(ent.isDirectory())paths.push(...await walk(path));else paths.push(path);}return paths;}
const js=(await Promise.all(['src','foundation','scripts'].map(walk))).flat().filter(p=>/\.m?js$/.test(p));
let issues=[];for(const path of js){const syntax=spawnSync(process.execPath,['--check',path],{encoding:'utf8'});if(syntax.status)issues.push(syntax.stderr);const text=await readFile(path,'utf8');if(!path.includes('/scripts/'))for(const match of text.matchAll(/(?:from\s*|import\s*)['"]([.][^'"]+)['"]/g)){try{await stat(resolve(dirname(path),match[1]));}catch{issues.push('Missing import '+match[1]+' in '+path);}}}
const html=await readFile('index.html','utf8');for(const match of html.matchAll(/(?:src|href)="([^"]+)"/g)){const path=match[1];if(/^(https?:|#|data:)/.test(path)||path==='./')continue;try{await stat(path);}catch{issues.push('Missing HTML asset '+path);}}
if(/\son\w+=|cdn\.tailwindcss|cdnjs|fonts\.googleapis/.test(html))issues.push('Production HTML contains inline handlers or a runtime CDN.');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);if(new Set(ids).size!==ids.length)issues.push('Duplicate HTML IDs.');
const app=await readFile('src/app.js','utf8');for(const match of app.matchAll(/\$\('([a-z][a-z0-9-]+)'\)/g)){if(!ids.includes(match[1]))issues.push('Controller target missing: '+match[1]);}
if(issues.length){console.error([...new Set(issues)].join('\n'));process.exit(1);}console.log(`Checked ${js.length} JS modules, local imports, page assets and controller targets.`);
