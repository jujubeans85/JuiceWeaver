import { APP } from './config.js';
import { applyBrand, mountBrand, safeFilename } from '../foundation/brand.js';
import { icon, paintIcons } from './icons.js';
import { JuiceEngine } from './audio/engine.js';
import { createDemo } from './audio/demo.js';
import { GLITCH_CONTROL_RATE } from './audio/rhythm.js';
import { newSession, newTrack, cloneSession, validateSession, LIMITS, TRACK_BOUNDS, MASTER_DB_BOUNDS } from './core/model.js';
import { trackBounds, setExpanded, STEM_PRESETS, presetPatch } from './core/effects.js';
import { encodeProject, decodeProject, validateAssetReferences } from './core/project.js';
import { createRecoveryStore } from './core/storage.js';
import { interpretPrompt, PROMPT_EXAMPLES } from './core/prompts.js';
import { assetSize, checkedDecode, probeAudio } from './imports.js';
import { drawWaveform, secondsLabel } from './waveform.js';
import { enhanceSlider, refreshSlider } from './ui/slider.js';

const $ = id => document.getElementById(id);
const engine = new JuiceEngine();
const { saveRecovery, loadRecovery } = createRecoveryStore(APP.storageNamespace + (location.pathname.includes('/preview/') ? '.preview' : ''));
let exportToken=0, exportRunning=false, exportBytes=0, saveOperation=Promise.resolve();
let session = newSession(), assets = new Map(), selected = null;
let undo = [], redo = [], revision = 0, savedRevision = 0, saveTimer, saveRunning = false;
let busy = false, recovery = null, preview = null, promptRevision = 0, toastTimer, exportUrl = null, exportMode = 'wav';
let animation = 0, lastFrame = 0, seekActive = false, clipNotified = false;
const rowCanvases = new Map();

applyBrand(APP); mountBrand($('brand'), APP); paintIcons();
$('version').textContent = APP.version.replace('1.0.0-rc.','1.0 RC ');
const [masterMin,masterMax]=MASTER_DB_BOUNDS;
$('master-volume').min=masterMin;$('master-volume').max=masterMax;
for(const input of $('tone-controls').querySelectorAll('input[data-param]')) { const [min,max]=TRACK_BOUNDS[input.dataset.param];input.min=min;input.max=max; }

function textNode(tag, className, value) { const node=document.createElement(tag);if(className)node.className=className;if(value!==undefined)node.textContent=value;return node; }
function actionButton(label, className, content, callback) { const node=textNode('button',className);node.type='button';node.setAttribute('aria-label',label);if(content.startsWith('<svg'))node.innerHTML=content;else node.textContent=content;node.addEventListener('click',callback);return node; }
function message(text,persistent=false){if(persistent){$('notice-text').textContent=text;$('notice').hidden=false;}else{clearTimeout(toastTimer);$('toast').textContent=text;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,4500);}}
function failure(error){message(error?.message||'That did not finish. Your current mix is still available.',true);}
function setBusy(value,title='',detail='Everything happens on your device.'){busy=value;$('busy').hidden=!value;$('busy-title').textContent=title;$('busy-detail').textContent=detail;document.querySelector('.app-shell').inert=value;}
async function task(title,fn,detail){if(busy)return;setBusy(true,title,detail);try{await saveOperation.catch(()=>{});return await fn();}catch(error){failure(error);}finally{setBusy(false);}}
function snapshot(){return{session:cloneSession(session),assets:new Map(assets)};}
function equal(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function memoryFootprint(extra=[]){const seen=new Set();let bytes=exportBytes;for(const map of [assets,...undo.map(s=>s.assets),...redo.map(s=>s.assets),...(recovery?[recovery.assets]:[]),...extra])for(const a of map.values()){if(!seen.has(a.bytes)){seen.add(a.bytes);bytes+=a.bytes.byteLength;}if(a.buffer&&!seen.has(a.buffer)){seen.add(a.buffer);bytes+=a.buffer.length*a.buffer.numberOfChannels*4;}}return bytes;}
// Reserve both live and export control buffers, even before glitch is enabled.
const EFFECT_CONTROL_RESERVE_BYTES=2*LIMITS.MAX_DURATION_SECONDS*GLITCH_CONTROL_RATE*4;
function guardMemory(extraBytes=0,maps=[]){if(memoryFootprint(maps)+extraBytes+EFFECT_CONTROL_RESERVE_BYTES>256*1024*1024)throw new Error('This would exceed the working-memory budget. Download a project backup and reload before opening another session, or use shorter stems.');}
function trimHistory(){
  const retained=()=>{const seen=new Set();let total=0;for(const state of [{assets},...undo,...redo])for(const asset of state.assets.values())if(!seen.has(asset)){seen.add(asset);total+=(asset.buffer?asset.buffer.length*asset.buffer.numberOfChannels*4:0)+asset.bytes.byteLength;}return total;};
  while(undo.length>25||retained()>LIMITS.MAX_DECODED_BYTES*2.25){if(undo.length)undo.shift();else if(redo.length)redo.shift();else break;}
}
function record(before,description){
  if(before&&equal(before.session,session))return;
  if(before){undo.push(before);redo=[];}
  session.journal.push({at:new Date().toISOString(),text:description.slice(0,280)});session.journal=session.journal.slice(-50);
  session=validateSession(session);revision++;preview=null;$('prompt-preview').hidden=true;trimHistory();
  engine.update(session,assets);render();scheduleSave();
}
function scheduleSave(){clearTimeout(saveTimer);$('save-status').textContent='Changes ready to save on this device';saveTimer=setTimeout(flushSave,1800);}
async function flushSave(){
  if(saveRunning||revision===savedRevision)return;
  if(busy||exportRunning){saveTimer=setTimeout(flushSave,1800);return;}
  saveRunning=true;const target=revision, captured=snapshot();$('save-status').textContent='Saving on this device…';
  try{guardMemory(assetSize(captured.assets).source*3+LIMITS.MAX_MANIFEST_BYTES*2);saveOperation=saveRecovery(captured.session,captured.assets);await saveOperation;savedRevision=target;if(target===revision)$('save-status').textContent='Saved on this device · keep a project backup';}
  catch(error){$('save-status').textContent='Autosave unavailable · download a project backup';failure(error);}
  finally{saveRunning=false;if(target!==revision)scheduleSave();}
}
async function confirmReplace(copy='Save a .juice project first if you want to keep this version. Continuing replaces the open session.'){if(!session.tracks.length)return true;$('confirm-title').textContent='Start a different session?';$('confirm-copy').textContent=copy;const dialog=$('confirm-dialog');dialog.returnValue='cancel';dialog.showModal();return await new Promise(resolve=>dialog.addEventListener('close',()=>resolve(dialog.returnValue==='confirm'),{once:true}));}
function installSession(next,nextAssets){
  const validated=validateSession(next);validateAssetReferences(validated,nextAssets);guardMemory(assetSize(nextAssets).source*3+LIMITS.MAX_MANIFEST_BYTES*2,[nextAssets]);engine.stop();engine.update(validated,nextAssets);
  session=validated;assets=nextAssets;selected=session.tracks[0]?.id||null;undo=[];redo=[];recovery=null;$('recover-button').hidden=true;
  record(null,`Opened ${session.name}`);
}
function undoChange(forward=false){if(busy)return;const source=forward?redo:undo,target=forward?undo:redo;if(!source.length)return;target.push(snapshot());const next=source.pop();engine.pause();session=next.session;assets=next.assets;selected=session.tracks.some(t=>t.id===selected)?selected:session.tracks[0]?.id;revision++;preview=null;$('prompt-preview').hidden=true;engine.update(session,assets);render();scheduleSave();message(forward?'Change restored.':'Back one step.');}
function attachSlider(input, apply, description){
  let before=null;
  input.addEventListener('input',()=>{before??=snapshot();preview=null;$('prompt-preview').hidden=true;apply(Number(input.value));rangeFill(input);engine.update(session,assets);});
  const finish=()=>{const initial=before;before=null;if(initial)record(initial,description());};
  input.addEventListener('change',finish);input.addEventListener('blur',finish);
  enhanceSlider(input,{neutral:input.id==='master-volume'?-6:0});
}
function selectTrack(id){selected=id;for(const [key,{row}]of rowCanvases)row.classList.toggle('selected',key===id);renderInspector();}
function renderTracks(){
  const focusedId=document.activeElement?.id;
  $('tracks').replaceChildren();rowCanvases.clear();const hasSolo=session.tracks.some(t=>t.solo);
  session.tracks.forEach((track,index)=>{
    const asset=assets.get(track.assetId);if(!asset?.buffer)return;
    const row=textNode('article','stem-card');row.style.setProperty('--stem-color',track.color);row.classList.toggle('selected',track.id===selected);row.classList.toggle('muted',track.mute||(hasSolo&&!track.solo));row.dataset.trackId=track.id;
    const header=textNode('div','stem-header');header.append(textNode('span','stem-index',String(index+1).padStart(2,'0')));
    const name=actionButton(`Select ${track.name}`,'stem-title','',()=>selectTrack(track.id));name.append(textNode('strong','',track.name),textNode('span','stem-role',track.role));header.append(name,textNode('span','stem-meta',secondsLabel(asset.buffer.duration)));
    const actions=textNode('div','stem-actions');
    for(const [key,label,letter]of [['mute','Mute','M'],['solo','Solo','S']]){const button=actionButton(`${label} ${track.name}`,'stem-toggle',letter,()=>{const before=snapshot();track[key]=!track[key];record(before,`${track[key]?label:`Clear ${label.toLowerCase()}`} ${track.name}`);});button.id=`${key}-${track.id}`;button.setAttribute('aria-pressed',String(track[key]));actions.append(button);}
    actions.append(actionButton(`Remove ${track.name}`,'stem-remove',icon('remove'),()=>{const before=snapshot();engine.pause();session.tracks=session.tracks.filter(t=>t.id!==track.id);if(!session.tracks.some(t=>t.assetId===track.assetId))assets.delete(track.assetId);selected=session.tracks[0]?.id||null;record(before,`Removed ${track.name}`);message('Stem removed. Undo brings it back.');}));header.append(actions);row.append(header);
    const body=textNode('div','stem-body'),level=textNode('div','stem-volume'),label=textNode('label','');label.htmlFor=`level-${track.id}`;const output=textNode('output','stem-gain-value',`${track.gainDb} dB`);label.append(textNode('span','','Level'),output);
    const slider=document.createElement('input');slider.type='range';slider.min=TRACK_BOUNDS.gainDb[0];slider.max=TRACK_BOUNDS.gainDb[1];slider.step='.5';slider.value=track.gainDb;slider.id=label.htmlFor;slider.setAttribute('aria-label',`${track.name} level in decibels`);level.append(label,slider);attachSlider(slider,value=>{track.gainDb=value;output.textContent=`${value} dB`;},()=>`${track.name} level ${track.gainDb} dB`);
    const wave=textNode('div','waveform-wrap');const canvas=document.createElement('canvas');canvas.setAttribute('aria-label',`${track.name} waveform; ${secondsLabel(asset.buffer.duration)}`);canvas.setAttribute('role','img');wave.append(canvas);body.append(level,wave);row.append(body);$('tracks').append(row);rowCanvases.set(track.id,{canvas,row,asset,colour:track.color});
  });if(focusedId&&$(focusedId))$(focusedId).focus({preventScroll:true});requestAnimationFrame(drawWaves);
}
function drawWaves(){for(const {canvas,asset,colour}of rowCanvases.values())drawWaveform(canvas,asset.buffer,colour,engine.duration);}
function effectLabel(key,value){if(key==='pan')return value===0?'Centre':`${Math.round(Math.abs(value)*100)}% ${value<0?'L':'R'}`;if(key==='timbre')return value===0?'Neutral':`${value>0?'+':''}${Math.round(value*100)}%`;if(key==='glitch'&&value===0)return 'Off';if(['drive','space','glitch'].includes(key))return `${Math.round(value*100)}%`;return `${value>0?'+':''}${value} dB`;}
function renderInspector(){
  const track=session.tracks.find(t=>t.id===selected);$('tone-controls').disabled=!track;$('selected-name').textContent=track?.name||'Make it yours';$('selection-hint').textContent=track?`${track.role.charAt(0).toUpperCase()+track.role.slice(1)} · changes follow your ears`:'Select a stem to find its sweet spot.';
  for(const input of $('tone-controls').querySelectorAll('input[data-param]')){const value=track?.[input.dataset.param]||0;const [min,max]=trackBounds(track||false)[input.dataset.param];input.min=min;input.max=max;input.value=value;$(input.id+'-value').textContent=effectLabel(input.dataset.param,value);rangeFill(input);}
  $('widen-effects').checked=track?.expanded===true;
}
function rangeFill(input){const min=Number(input.min),max=Number(input.max);input.style.setProperty('--range-fill',`${(Number(input.value)-min)/(max-min)*100}%`);refreshSlider(input);}
function render(){
  const loaded=session.tracks.length>0; if(document.activeElement!==$('project-name'))$('project-name').value=session.name;
  $('empty-state').hidden=loaded;$('timeline-heading').hidden=!loaded;$('stem-count').textContent=`${session.tracks.length} stems`;
  for(const id of ['save-project','export-wav','play','rewind','loop','seek','master-volume','preview-prompt'])$(id).disabled=!loaded;
  $('add-stems').disabled=session.tracks.length>=LIMITS.MAX_TRACKS;$('undo-button').disabled=!undo.length;$('redo-button').disabled=!redo.length;
  $('loop').setAttribute('aria-pressed',String(session.loop));$('master-volume').value=session.masterDb;$('master-value').textContent=`${session.masterDb} dB`;
  $('seek').max=Math.max(.01,engine.duration);$('total-time').textContent=secondsLabel(engine.duration);$('session-length').textContent=`${secondsLabel(engine.duration)} / WHOLE SESSION`;
  const size=assetSize(assets);$('memory-label').textContent=loaded?`${(size.decoded/1024/1024).toFixed(1)} / 96 MiB audio`:'Up to 8 stems · local processing';
  renderTracks();renderInspector();renderTransport();for(const input of document.querySelectorAll('input[type=range]'))rangeFill(input);
}
function renderTransport(){const playing=engine.playing;$('play').innerHTML=icon(playing?'pause':'play');$('play').classList.toggle('is-playing',playing);$('play').setAttribute('aria-label',playing?'Pause mix':'Play mix');$('transport-state').textContent=playing?'IN THE GROOVE':session.tracks.length?'PRESS PLAY':'READY WHEN YOU ARE';if(!playing){$('current-time').textContent=secondsLabel(engine.position);$('seek').value=engine.position;$('meter-fill').style.width='0%';}}
function tick(now){animation=0;if(now-lastFrame>32){lastFrame=now;const position=engine.position;if(!seekActive)$('seek').value=position;$('current-time').textContent=secondsLabel(position);rangeFill($('seek'));const pct=engine.duration?position/engine.duration*100:0;for(const {row}of rowCanvases.values())row.style.setProperty('--playhead',`${Math.min(100,pct)}%`);const meter=engine.meter();$('meter-fill').style.width=`${Math.min(100,meter.peak*100)}%`;$('clip-label').hidden=!meter.clipped;if(meter.clipped&&!clipNotified){clipNotified=true;message('The output peaked. Lower Master or use peak protection when exporting.');}}
  if(engine.playing)animation=requestAnimationFrame(tick);else renderTransport();
}
engine.onStateChange=event=>{renderTransport();if(event.reason==='interrupted'||event.reason==='suspended')message('Audio paused. Tap Play when you’re ready.');if(engine.playing&&!animation)animation=requestAnimationFrame(tick);};

async function importFiles(fileList){
  const files=Array.from(fileList);if(!files.length)return;
  if(files.length===1&&files[0].name.toLowerCase().endsWith('.juice'))return openProjectFile(files[0]);
  if(session.tracks.length+files.length>LIMITS.MAX_TRACKS)return message('There is room for up to 8 stems. Add fewer files or remove a stem first.',true);
  // Import does not need playback permission. A resume() after the iOS Files
  // picker can remain pending; only an explicit Play should unlock audio.
  await task('Bringing in your stems',async()=>{
    const before=snapshot(),candidateAssets=new Map(assets),candidateTracks=[...session.tracks];let size=assetSize(candidateAssets);
    if(size.source+files.reduce((n,f)=>n+f.size,0)>LIMITS.MAX_TOTAL_SOURCE_BYTES)throw new Error('These source files exceed the 96 MiB project limit. Use shorter stems.');
    for(const [i,file]of files.entries()){
      $('busy-detail').textContent=`${i+1} of ${files.length} · ${file.name}`;
      if(file.size>LIMITS.MAX_SOURCE_BYTES)throw new Error(`${file.name}: the source file limit is 64 MiB.`);
      guardMemory(file.size*2,[candidateAssets]);const bytes=await file.arrayBuffer();const meta=await probeAudio(file,bytes);guardMemory(bytes.byteLength+meta.duration*48000*meta.channels*4*2,[candidateAssets]);const buffer=await checkedDecode(engine,file,bytes,size.decoded),id=`asset_${crypto.randomUUID()}`;
      const mime=/^audio\/[a-z0-9!#$&^_.+-]+$/i.test(file.type)?file.type:'application/octet-stream';
      candidateAssets.set(id,{id,name:file.name,mime,bytes,buffer});candidateTracks.push(newTrack({assetId:id,name:file.name.replace(/\.[^.]+$/,'')}));size=assetSize(candidateAssets);
    }
    validateAssetReferences({...session,tracks:candidateTracks},candidateAssets);
    guardMemory(assetSize(candidateAssets).source*3+LIMITS.MAX_MANIFEST_BYTES*2,[candidateAssets]);
    engine.pause();assets=candidateAssets;session.tracks=candidateTracks;selected=candidateTracks.at(-1).id;record(before,`Imported ${files.length} stem${files.length===1?'':'s'}`);message(`${files.length} stem${files.length===1?' is':'s are'} in. Press Play to listen.`);
  });
}
async function materialize(project){
  const nextAssets=new Map();let decoded=0;
  for(const asset of project.assets.values()){
    $('busy-detail').textContent=`Opening ${asset.name}`;
    const file=new File([asset.bytes],asset.name,{type:asset.mime});const meta=await probeAudio(file,asset.bytes);guardMemory(meta.duration*48000*meta.channels*4*2,[project.assets,nextAssets]);const buffer=await checkedDecode(engine,file,asset.bytes,decoded);decoded+=buffer.length*buffer.numberOfChannels*4;nextAssets.set(asset.id,{...asset,buffer});
  }
  return {session:project.session,assets:nextAssets};
}
async function openProjectFile(file){
  if(!file)return;if(file.size>LIMITS.MAX_PROJECT_BYTES)return message('That project is larger than the supported 96 MiB source budget.',true);
  if(!await confirmReplace())return;
  await task('Opening your project',async()=>{guardMemory(file.size*2);const project=await decodeProject(await file.arrayBuffer());const loaded=await materialize(project);installSession(loaded.session,loaded.assets);message('Project opened. Original stems and mix settings restored.');});
}
$('audio-files').addEventListener('change',async event=>{const files=[...event.target.files];event.target.value='';await importFiles(files);});
$('project-file').addEventListener('change',async event=>{const file=event.target.files[0];event.target.value='';await openProjectFile(file);});
for(const id of ['add-stems','empty-import'])$(id).addEventListener('click',()=>$('audio-files').click());
$('open-project').addEventListener('click',()=>$('project-file').click());
$('demo-button').addEventListener('click',async()=>{
  if(busy)return;try{await engine.unlock();}catch(error){failure(error);return;}
  if(!await confirmReplace())return;
  await task('Finding the groove',async()=>{guardMemory(60*1024*1024);const demo=await createDemo(engine);installSession(newSession({name:demo.name,bpm:demo.bpm,tracks:demo.tracks}),demo.assets);await engine.play(session,assets,0);message('Four original parts. Try soloing Keys, then bring the drums back.');});
});
$('recover-button').addEventListener('click',()=>task('Picking up where you left off',async()=>{if(!recovery)return;const loaded=await materialize(recovery);installSession(loaded.session,loaded.assets);message('Last saved session restored.');}));
$('play').addEventListener('click',async()=>{if(busy)return;try{if(engine.playing)engine.pause();else{clipNotified=false;await engine.play(session,assets,engine.position);}}catch(error){failure(error);}});
$('rewind').addEventListener('click',()=>{engine.seek(0);renderTransport();});
$('loop').addEventListener('click',()=>{const before=snapshot();session.loop=!session.loop;record(before,session.loop?'Loop enabled':'Loop disabled');});
$('seek').addEventListener('pointerdown',()=>seekActive=true);
document.addEventListener('pointerup',()=>seekActive=false);
document.addEventListener('pointercancel',()=>seekActive=false);
$('seek').addEventListener('input',()=>$('current-time').textContent=secondsLabel(Number($('seek').value)));
$('seek').addEventListener('change',()=>{engine.seek(Number($('seek').value));seekActive=false;renderTransport();});
attachSlider($('master-volume'),value=>{session.masterDb=value;$('master-value').textContent=`${value} dB`;},()=>`Master level ${session.masterDb} dB`);
for(const input of $('tone-controls').querySelectorAll('input[data-param]'))attachSlider(input,value=>{const track=session.tracks.find(t=>t.id===selected);if(track){track[input.dataset.param]=value;$(input.id+'-value').textContent=effectLabel(input.dataset.param,value);rangeFill(input);}},()=>`Adjusted ${input.dataset.param} on ${session.tracks.find(t=>t.id===selected)?.name||'stem'}`);
$('reset-tone').addEventListener('click',()=>{const track=session.tracks.find(t=>t.id===selected);if(!track)return;const before=snapshot();Object.assign(track,{lowDb:0,highDb:0,drive:0,space:0,pan:0,timbre:0,glitch:0});record(before,`Reset tone on ${track.name}`);});

$('widen-effects').addEventListener('change',()=>{const track=session.tracks.find(t=>t.id===selected);if(!track)return;const before=snapshot(),expanded=$('widen-effects').checked,patch=setExpanded(track,expanded);const clamped=Object.entries(patch).some(([key,value])=>key!=='expanded'&&track[key]!==value);Object.assign(track,patch);record(before,`${expanded?'Widened':'Restored normal'} effect ranges on ${track.name}`);message(expanded?'This stem’s effect ranges are 50% wider.':clamped?'Normal ranges restored; extended values brought back into range. Undo restores them.':'This stem’s normal effect ranges restored.');});
for(const preset of STEM_PRESETS){const option=textNode('option','',preset.name);option.value=preset.id;$('stem-preset').append(option);}
function describePreset(){$('preset-description').textContent=STEM_PRESETS.find(p=>p.id===$('stem-preset').value)?.description||'';}
$('stem-preset').addEventListener('change',describePreset);describePreset();
$('apply-stem-preset').addEventListener('click',()=>{const track=session.tracks.find(t=>t.id===selected);if(!track)return;const preset=STEM_PRESETS.find(p=>p.id===$('stem-preset').value);if(!preset)return;const before=snapshot();Object.assign(track,presetPatch(preset.id,track));record(before,`Applied ${preset.name} to ${track.name}`);message(`${preset.name} applied to ${track.name}. Undo is ready.`);});
$('undo-button').addEventListener('click',()=>undoChange());$('redo-button').addEventListener('click',()=>undoChange(true));
$('project-name').addEventListener('change',()=>{const before=snapshot();session.name=$('project-name').value.trim()||'Untitled session';record(before,'Renamed session');$('project-name').value=session.name;});
for(const example of PROMPT_EXAMPLES.slice(0,3)){const button=actionButton(example,'prompt-chip',example,()=>{$('weave-prompt').value=example;previewPrompt();});$('prompt-chips').append(button);}
function previewPrompt(){preview=interpretPrompt($('weave-prompt').value,session);promptRevision=revision;$('prompt-summary').textContent=preview.summary;$('prompt-preview').hidden=false;$('apply-prompt').hidden=!preview.understood||(!preview.changes.length&&!preview.masterPatch);}
$('preview-prompt').addEventListener('click',previewPrompt);
$('weave-prompt').addEventListener('input',()=>{preview=null;$('prompt-preview').hidden=true;});
$('cancel-prompt').addEventListener('click',()=>{preview=null;$('prompt-preview').hidden=true;});
$('apply-prompt').addEventListener('click',()=>{if(!preview||!preview.understood)return;if(promptRevision!==revision){previewPrompt();message('Your mix changed. Check the updated preview.');return;}const before=snapshot(),description=preview.summary;for(const change of preview.changes){const track=session.tracks.find(t=>t.id===change.id);if(track)Object.assign(track,change.patch);}if(preview.masterPatch)Object.assign(session,preview.masterPatch);record(before,description);message('A little change in feeling. Undo is right there.');});

function clearDownload(){exportBytes=0;if(exportUrl){URL.revokeObjectURL(exportUrl);exportUrl=null;}$('download-ready').hidden=true;$('download-ready').removeAttribute('href');$('export-ready').hidden=true;}
function openExport(mode){if(!session.tracks.length||busy)return;exportToken++;engine.pause();exportMode=mode;clearDownload();$('export-title').textContent=mode==='wav'?'Your mix, made tangible.':'Keep every possibility.';$('export-copy').textContent=mode==='wav'?'A stereo WAV of this mix, including its effects.':'A portable .juice project with original audio and editable settings.';$('export-spec').textContent=mode==='wav'?'WAV · 48 kHz · 16-bit stereo':`${session.tracks.length} stems · source audio preserved`;$('protect-label').hidden=mode!=='wav';$('prepare-download').textContent=mode==='wav'?'Prepare WAV':'Prepare project';$('prepare-download').hidden=false;$('prepare-download').disabled=false;$('export-dialog').showModal();}
$('save-project').addEventListener('click',()=>openExport('project'));$('export-wav').addEventListener('click',()=>openExport('wav'));
$('prepare-download').addEventListener('click',async()=>{
  if(exportRunning||busy)return;exportRunning=true;setBusy(true,'Preparing your download');const token=++exportToken,mode=exportMode,protect=$('protect-peaks').checked;
  const button=$('prepare-download');button.disabled=true;$('protect-peaks').disabled=true;button.textContent='Preparing on your device…';
  try{await saveOperation.catch(()=>{});const captured=snapshot();let blob,detail,extension;
    guardMemory(mode==='wav'?(engine.duration+2)*48000*2*12:assetSize(captured.assets).source*3+LIMITS.MAX_MANIFEST_BYTES*2);
    if(mode==='wav'){const result=await engine.render(captured.session,captured.assets,{normalize:protect});blob=result.blob;extension='.wav';detail=`${secondsLabel(result.duration)} · ${(blob.size/1024/1024).toFixed(1)} MiB${result.tail?' · includes room tail':''}${result.normalizationGain<1?` · peaks reduced ${(20*Math.log10(result.normalizationGain)).toFixed(1)} dB`:''}`;if(result.peak>1&&!protect)detail+=' · WARNING: unprotected peaks clip';}
    else{blob=await encodeProject(captured.session,captured.assets);extension='.juice';detail=`${captured.session.tracks.length} original stems + editable settings · ${(blob.size/1024/1024).toFixed(1)} MiB`;}
    if(token!==exportToken||!$('export-dialog').open)return;clearDownload();exportBytes=blob.size;exportUrl=URL.createObjectURL(blob);$('download-ready').href=exportUrl;$('download-ready').download=safeFilename(captured.session.name,extension);$('download-ready').textContent=mode==='wav'?'Download WAV':'Download project';$('download-ready').hidden=false;$('export-ready').textContent=detail;$('export-ready').hidden=false;button.hidden=true;
  }catch(error){if(token!==exportToken)return;$('export-ready').textContent=error.message;$('export-ready').hidden=false;button.textContent='Try again';}finally{exportRunning=false;setBusy(false);$('protect-peaks').disabled=false;button.disabled=false;}
});
$('export-close').addEventListener('click',()=>$('export-dialog').close());
$('export-dialog').addEventListener('close',()=>{exportToken++;});
$('protect-peaks').addEventListener('change',()=>{exportToken++;clearDownload();$('prepare-download').hidden=false;$('prepare-download').textContent='Prepare WAV';});
$('download-ready').addEventListener('click',()=>message('Download requested. On iPhone or iPad, check Files → Downloads.'));

for(const [button,dialog]of [['help-button','help-dialog'],['appearance-button','appearance-dialog']])$(button).addEventListener('click',()=>$(dialog).showModal());
for(const [button,dialog]of [['help-close','help-dialog'],['appearance-close','appearance-dialog']])$(button).addEventListener('click',()=>$(dialog).close());
$('notice-close').addEventListener('click',()=>$('notice').hidden=true);
const appearanceKey=APP.storageNamespace+'.appearance';
function saveAppearance(){const pref={background:document.querySelector('[name=background]:checked').value,accent:document.querySelector('[name=accent]:checked').value,motion:!$('reduce-motion').checked};document.documentElement.dataset.background=pref.background;applyBrand({...APP,accent:pref.accent,motion:pref.motion});try{localStorage.setItem(appearanceKey,JSON.stringify(pref));}catch{/* Optional visual preference only. */}}
try{const pref=JSON.parse(localStorage.getItem(appearanceKey)||'null');if(pref){if(['train','quiet'].includes(pref.background)){document.documentElement.dataset.background=pref.background;document.querySelector(`[name=background][value=${pref.background}]`).checked=true;}for(const radio of document.querySelectorAll('[name=accent]'))radio.checked=radio.value===pref.accent;if(!document.querySelector('[name=accent]:checked'))document.querySelector('[name=accent]').checked=true;$('reduce-motion').checked=pref.motion===false;applyBrand({...APP,accent:document.querySelector('[name=accent]:checked').value,motion:pref.motion!==false});}}catch{/* Default appearance remains usable. */}
for(const input of $('appearance-dialog').querySelectorAll('input'))input.addEventListener('change',saveAppearance);
document.addEventListener('keydown',event=>{if(busy||document.querySelector('dialog[open]')||event.target.closest('input,textarea,select,[contenteditable]'))return;if(event.code==='Space'&&!event.target.closest('button,a,summary,[role=button]')){event.preventDefault();$('play').click();}if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){event.preventDefault();undoChange(event.shiftKey);}});
let dragDepth=0;document.addEventListener('dragenter',event=>{if(event.dataTransfer?.types.includes('Files')){event.preventDefault();dragDepth++;$('drop-overlay').hidden=false;}});document.addEventListener('dragover',event=>{if(event.dataTransfer?.types.includes('Files'))event.preventDefault();});document.addEventListener('dragleave',()=>{dragDepth=Math.max(0,dragDepth-1);if(!dragDepth)$('drop-overlay').hidden=true;});document.addEventListener('drop',event=>{event.preventDefault();dragDepth=0;$('drop-overlay').hidden=true;if(!busy&&!document.querySelector('dialog[open]'))importFiles(event.dataTransfer.files);});
window.addEventListener('resize',()=>requestAnimationFrame(drawWaves));
window.addEventListener('pagehide',()=>engine.pause());
document.addEventListener('visibilitychange',()=>{if(document.hidden){engine.pause();clearTimeout(saveTimer);flushSave();}});
window.addEventListener('beforeunload',event=>{if(session.tracks.length&&revision!==savedRevision){event.preventDefault();event.returnValue='';}});
render();
loadRecovery().then(value=>{if(value&&value.session.tracks.length&&!session.tracks.length){recovery=value;$('recover-label').textContent=`Continue: ${value.session.name}`;$('recover-button').hidden=false;}}).catch(error=>{message(error.message,true);});
if('serviceWorker'in navigator&&location.protocol==='https:'){
  navigator.serviceWorker.register('./sw.js',{scope:'./'}).then(registration=>{
    function offer(worker){if(!worker)return;message('A studio update is ready. Save your project, then close every JuiceWeaver tab and reopen to use it.',true);}
    if(registration.waiting)offer(registration.waiting);
    registration.addEventListener('updatefound',()=>{const worker=registration.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)offer(worker);});});
  }).catch(()=>{/* Online studio works without offline support. */});
}
