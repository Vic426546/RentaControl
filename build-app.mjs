import fs from 'node:fs';
import zlib from 'node:zlib';

const parts = Array.from({length:13}, (_,i) => fs.readFileSync(`payload/p${String(i).padStart(2,'0')}.txt`, 'utf8'));
let html = zlib.gunzipSync(Buffer.from(parts.join(''), 'base64')).toString('utf8');

html = html.replace(
  "id:p.id,user_id:cloudUser.id,code:p.code||'',name:p.name||'',property_type:(p.type||'Departamento').toLowerCase(),",
  "id:p.id,user_id:cloudUser.id,code:String(p.code||p.name||'INMUEBLE').trim()||'INMUEBLE',name:p.name||'',property_type:(p.type||'Departamento').toLowerCase(),"
);
html = html.replace(
  "try{\n    const snap=cloneJson(state), shadow=cloudShadow||{properties:[],tenants:[],leases:[],charges:[],payments:[],expenses:[],deposits:[],documents:[],settings:{}};",
  "try{\n    state.properties.forEach(p=>{if(!String(p.code||'').trim())p.code=String(p.name||'INMUEBLE').trim()||'INMUEBLE';});\n    const snap=cloneJson(state), shadow=cloudShadow||{properties:[],tenants:[],leases:[],charges:[],payments:[],expenses:[],deposits:[],documents:[],settings:{}};"
);
html = html.replace(
  "try{const remote=await cloudFetchAll();cloudApplyRemote(remote);cloudReady=true;cloudSetStatus('ok','Sincronizado');render();}",
  [
    'try{',
    '       let remote=await cloudFetchAll(),recovered=0;',
    '       const cachedRaw=safeGet(cloudCacheKey());',
    '       if(cachedRaw){',
    '         try{',
    '           const cached=JSON.parse(cachedRaw);',
    "           if((cached.properties||[]).some(p=>!String(p.code||'').trim())){",
    "             for(const key of ['properties','tenants','leases','charges','payments','expenses','deposits','documents']){",
    '               const dest=Array.isArray(remote[key])?remote[key]:[],ids=new Set(dest.map(x=>x.id));',
    '               for(const row of (cached[key]||[])){if(row&&row.id&&!ids.has(row.id)){dest.push(row);ids.add(row.id);recovered++;}}',
    '               remote[key]=dest;',
    '             }',
    "             (remote.properties||[]).forEach(p=>{if(!String(p.code||'').trim())p.code=String(p.name||'INMUEBLE').trim()||'INMUEBLE';});",
    '           }',
    '         }catch(_){}',
    '       }',
    '       cloudApplyRemote(remote);cloudReady=true;',
    '       if(recovered){',
    "         cloudDirty=true;cloudSetStatus('busy','Recuperando cambios…');render();",
    '         const ok=await cloudSyncNow();',
    "         if(ok){await cloudPullState(true);toast('Se recuperaron y sincronizaron los cambios pendientes de la prueba.');}",
    "         else toast('Se recuperaron los cambios locales, pero aún falta sincronizarlos.');",
    "       }else{cloudSetStatus('ok','Sincronizado');render();}",
    '     }'
  ].join('\n')
);

html = html.replace(
  '.bottom-nav{display:none}',
  '.bottom-nav{display:none}.mobile-more-menu{display:none}.mobile-more-menu.show{display:grid;position:fixed;left:10px;right:10px;bottom:76px;z-index:40;background:#fff;border:1px solid var(--line);border-radius:18px;padding:10px;grid-template-columns:repeat(2,1fr);gap:6px;box-shadow:0 18px 48px rgba(16,47,73,.22)}.mobile-more-menu button{border:0;background:#f7f9fb;color:var(--text);padding:13px 12px;border-radius:12px;text-align:left;font-weight:650;display:flex;gap:9px;align-items:center}.mobile-more-menu button.active{background:#eaf3f9;color:var(--primary)}.mobile-more-backdrop{display:none;position:fixed;inset:0;z-index:35;background:rgba(12,31,47,.22)}.mobile-more-backdrop.show{display:block}'
);

const newRenderNav = [
  'function renderNav(){',
  "  const side=document.getElementById('sideNav');",
  '  side.innerHTML=NAV.map(([id,ico,label])=>`<button data-view="${id}" class="${currentView===id?\'active\':\'\'}"><span class="nav-icon">${ico}</span>${label}</button>`).join(\'\');',
  "  side.querySelectorAll('button').forEach(b=>b.onclick=()=>navigate(b.dataset.view));",
  "  const bottom=document.getElementById('bottomNav');",
  "  const mobile=NAV.filter(x=>['dashboard','properties','leases','payments'].includes(x[0]));",
  "  const moreIds=['calendar','tenants','expenses','deposits','documents','reports','settings'];",
  '  bottom.innerHTML=mobile.map(([id,ico,label])=>`<button data-view="${id}" class="${currentView===id?\'active\':\'\'}"><span class="nav-icon">${ico}</span>${label}</button>`).join(\'\')+`<button type="button" id="mobileMoreBtn" class="${moreIds.includes(currentView)?\'active\':\'\'}"><span class="nav-icon">⋯</span>Más</button>`;',
  "  bottom.querySelectorAll('button[data-view]').forEach(b=>b.onclick=()=>{closeMobileMore();navigate(b.dataset.view)});",
  "  let backdrop=document.getElementById('mobileMoreBackdrop');",
  "  if(!backdrop){backdrop=document.createElement('div');backdrop.id='mobileMoreBackdrop';backdrop.className='mobile-more-backdrop';document.body.appendChild(backdrop);backdrop.onclick=closeMobileMore;}",
  "  let menu=document.getElementById('mobileMoreMenu');",
  "  if(!menu){menu=document.createElement('div');menu.id='mobileMoreMenu';menu.className='mobile-more-menu';document.body.appendChild(menu);}",
  '  menu.innerHTML=NAV.filter(x=>moreIds.includes(x[0])).map(([id,ico,label])=>`<button data-more-view="${id}" class="${currentView===id?\'active\':\'\'}"><span class="nav-icon">${ico}</span>${label}</button>`).join(\'\');',
  "  menu.querySelectorAll('button').forEach(b=>b.onclick=()=>{closeMobileMore();navigate(b.dataset.moreView)});",
  "  const moreBtn=document.getElementById('mobileMoreBtn');if(moreBtn)moreBtn.onclick=()=>{menu.classList.toggle('show');backdrop.classList.toggle('show',menu.classList.contains('show'));};",
  '}'
].join('\n');
html = html.replace(/function renderNav\(\)\{[\s\S]*?\n\}\n\nconst viewMeta=/, newRenderNav+'\n\nconst viewMeta=');

html = html.replace(
  "function navigate(view){currentView=view;currentFilter='all';render();}",
  "function closeMobileMore(){var m=document.getElementById('mobileMoreMenu'),b=document.getElementById('mobileMoreBackdrop');if(m)m.classList.remove('show');if(b)b.classList.remove('show');}\nfunction navigate(view){closeMobileMore();currentView=view;currentFilter='all';render();}"
);
html = html.replace(
  "const name=v('propName').trim();if(!name)return toast('Captura un nombre para el inmueble.');\n  const obj={name,code:v('propCode'),type:v('propType'),furnishing:v('propFurnishing'),status:v('propStatus'),address:v('propAddress'),notes:v('propNotes')};",
  "const name=v('propName').trim();if(!name)return toast('Captura un nombre para el inmueble.');\n  const code=String(v('propCode')||'').trim();if(!code)return toast('Captura una clave o número para el inmueble.');\n  const duplicate=state.properties.some(x=>x.id!==(p&&p.id)&&String(x.code||'').trim().toLowerCase()===code.toLowerCase());if(duplicate)return toast('Ya existe otro inmueble con esa clave o número.');\n  const obj={name,code,type:v('propType'),furnishing:v('propFurnishing'),status:v('propStatus'),address:v('propAddress'),notes:v('propNotes')};"
);


html = html.replaceAll('Rentar departamento','Rentar inmueble');

html = html.replace(
  "recorded_at:p.createdAt?new Date(p.createdAt+'T12:00:00').toISOString():nowIso(),amount:Number(p.amount||0),payment_method:p.method||null,reference:p.reference||null,notes:p.notes||null,created_at:p.createdAt?new Date(p.createdAt+'T12:00:00').toISOString():nowIso()",
  "recorded_at:p.createdAt?(String(p.createdAt).includes('T')?new Date(p.createdAt).toISOString():new Date(p.createdAt+'T12:00:00').toISOString()):nowIso(),amount:Number(p.amount||0),payment_method:p.method||null,reference:p.reference||null,notes:p.notes||null,created_at:p.createdAt?(String(p.createdAt).includes('T')?new Date(p.createdAt).toISOString():new Date(p.createdAt+'T12:00:00').toISOString()):nowIso()"
);

html = html.replace(
  "if(changed.length){const {error}=await cloudClient.from(cfg.table).upsert(changed.map(cfg.toDb),{onConflict:'id'});if(error)throw error;}",
  "if(changed.length){const {error}=await cloudClient.from(cfg.table).upsert(changed.map(cfg.toDb),{onConflict:'id'});if(error)throw new Error(cfg.key+': '+(error.message||error));}"
);
html = html.replace(
  "if(removed.length){const {error}=await cloudClient.from(cfg.table).delete().in('id',removed);if(error)throw error;}",
  "if(removed.length){const {error}=await cloudClient.from(cfg.table).delete().in('id',removed);if(error)throw new Error(cfg.key+': '+(error.message||error));}"
);
html = html.replace(
  "finally{cloudSyncing=false;if(cloudDirty)cloudSyncTimer=setTimeout(cloudSyncNow,1200);}",
  "finally{cloudSyncing=false;}"
);
html = html.replace(
  'RentaControl 4.2 está conectado a Supabase.',
  'RentaControl 4.2.3 está conectado a Supabase.'
);

html = html.replaceAll('./icons/icon-192.png','./icons/icon.svg');
html = html.replaceAll('./icons/icon-512.png','./icons/icon.svg');
html = html.replace('<title>RentaControl 4.2</title>','<title>RentaControl 4.2.3</title>');

if(!html.includes('id="mobileMoreBtn"')) throw new Error('No se pudo aplicar el menú móvil');
if(!html.includes("code:String(p.code||p.name||'INMUEBLE')")) throw new Error('No se pudo aplicar la corrección de clave');

fs.writeFileSync('app.html', html, 'utf8');
console.log('app.html generado:', Buffer.byteLength(html), 'bytes');
