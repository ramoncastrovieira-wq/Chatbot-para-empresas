let ALLOWED_QUEUE_NAMES=['Várzea Paulista - Centro','Várzea Paulista - Jd. América','Francisco Morato','Taipas'];let API_KEY='tico_api_base';let TOKEN_KEY='tico_token';let USER_KEY='tico_user';let state={api:localStorage.getItem(API_KEY)||'/api/v1',token:localStorage.getItem(TOKEN_KEY)||'',user:JSON.parse(localStorage.getItem(USER_KEY)||'null'),view:'inicio',summary:{},users:[],contacts:[],conversations:[],queues:[],attendants:[],selectedConversation:null,messages:[],poll:null,status:'offline',waGateway:localStorage.getItem('tico_wa_gateway')||'http://127.0.0.1:3001',wa:{status:'OFFLINE',has_qr:false,connected:false},waPoll:null};let $=s=>document.querySelector(s);let el=(tag,cls,html)=>{let n=document.createElement(tag);if(cls)n.className=cls;if(html!==undefined)n.innerHTML=html;return n};function roleLabel(role){if(role==='admin')return'Admin';if(role==='attendant')return'Atendente';return'Supervisor'}function profileRole(){return state.user?.role==='admin'?'admin':state.user?.role==='attendant'?'attendant':'supervisor'}function headers(){return {'Content-Type':'application/json',...(state.token?{Authorization:'Bearer '+state.token}:{})}}async function api(path,opt={}){let r=await fetch(state.api+path,{...opt,headers:{...headers(),...(opt.headers||{})}});let txt=await r.text();let data={};try{data=txt?JSON.parse(txt):{}}catch{data={raw:txt}}if(!r.ok)throw new Error(data.detail||data.message||('Erro '+r.status));return data}function saveSession(data){state.token=data.access_token;state.user=data.user;localStorage.setItem(TOKEN_KEY,state.token);localStorage.setItem(USER_KEY,JSON.stringify(state.user))}function logout(){localStorage.removeItem(TOKEN_KEY);localStorage.removeItem(USER_KEY);state.token='';state.user=null;clearInterval(state.poll);clearInterval(state.waPoll);render()}async function checkHealth(){try{await api('/health');state.status='online'}catch{state.status='offline'}}async function loadAll(silent=false){try{await checkHealth();let [summary,users,contacts,conversations,queues,attendants]=await Promise.all([api('/dashboard/summary').catch(()=>({})),api('/users').catch(()=>[]),api('/contacts').catch(()=>[]),api('/conversations').catch(()=>[]),api('/queues').catch(()=>[]),api('/attendants').catch(()=>[])]);queues=(queues||[]).filter(q=>ALLOWED_QUEUE_NAMES.includes(q.name));Object.assign(state,{summary,users,contacts,conversations,queues,attendants});if(!silent)renderMain()}catch(e){console.error('Falha ao carregar dados do painel:', e);state.status='offline';if(!silent)toast(e.message)}}function toast(msg){console.error(msg); if(!window.__lastToast || window.__lastToast!==msg){ window.__lastToast=msg; alert(msg); }}function render(){if(!state.user){renderLogin();return}renderShell();loadAll(true).then(renderMain);clearInterval(state.poll);state.poll=setInterval(()=>loadAll(true).then(()=>{if(profileRole()==='attendant'&&state.view==='atendimento')renderMain(false)}),7000)}function renderLogin(){document.body.innerHTML='<div id="app"></div>';$('#app').innerHTML=`<div class="login"><div class="login-card"><div class="login-hero"><h1>Hub WhatsApp Tico Auto Peças</h1><p>Entrada separada para Admin, Supervisor e Atendente. Cada perfil enxerga apenas o que precisa para operar sem confusão.</p><p><b>Primeiro acesso:</b> caso não exista usuário, crie um admin pelo botão abaixo.</p></div><div class="login-form"><h2>Entrar no sistema</h2><label>URL da API</label><input id="apiBase" value="${state.api}"><label>Usuário</label><input id="loginUser" placeholder="admin"><label>Senha</label><input id="loginPass" type="password" placeholder="123456"><button id="btnLogin">Entrar</button><button class="secondary" id="btnCreateAdmin">Criar admin inicial</button><p class="hint">Supervisor usa o perfil interno <b>user</b> por compatibilidade com o backend atual. O frontend mostra como Supervisor.</p><div id="loginMsg" class="hint"></div></div></div></div>`;$('#btnLogin').onclick=async()=>{try{state.api=$('#apiBase').value.trim()||'/api/v1';localStorage.setItem(API_KEY,state.api);let data=await api('/auth/login',{method:'POST',body:JSON.stringify({username:$('#loginUser').value,password:$('#loginPass').value})});saveSession(data);render()}catch(e){$('#loginMsg').textContent=e.message}};$('#btnCreateAdmin').onclick=async()=>{try{state.api=$('#apiBase').value.trim()||'/api/v1';localStorage.setItem(API_KEY,state.api);await api('/auth/register',{method:'POST',body:JSON.stringify({username:$('#loginUser').value||'admin',email:'admin@tico.local',password:$('#loginPass').value||'123456',role:'admin'})});$('#loginMsg').textContent='Admin criado. Agora clique em Entrar.'}catch(e){$('#loginMsg').textContent=e.message}}}function navFor(role){let all={admin:[['inicio','🏠 Início'],['atendimento','💬 Atendimento'],['supervisor','📊 Supervisor'],['admin','🛠️ Admin'],['simulador','🧪 Simulador'],['config','⚙️ Configuração']],supervisor:[['inicio','🏠 Início'],['supervisor','📊 Operação'],['atendimento','💬 Conversas'],['clientes','👥 Clientes'],['simulador','🧪 Simulador'],['config','⚙️ Configuração']],attendant:[['atendimento','💬 Atendimento'],['clientes','👥 Clientes'],['simulador','🧪 Simulador'],['config','⚙️ Configuração']]};return all[role]||all.attendant}function renderShell(){let role=profileRole();$('#app').innerHTML=`<div class="app"><aside class="sidebar"><div class="brand"><div class="logo">🔧</div><div><b>Tico Auto Peças</b><small>Hub de atendimento</small></div></div><nav class="nav">${navFor(role).map(([id,t])=>`<button data-view="${id}" class="${state.view===id?'active':''}">${t}</button>`).join('')}</nav><div class="side-note"><b>${roleLabel(state.user.role)}</b><br>${state.user.username}<br><br>As telas mudam conforme o perfil logado.</div><button class="ghost" id="logout">Sair</button></aside><main class="main"><div class="topbar"><div><h1 id="title"></h1><p id="subtitle"></p></div><div class="userbox"><div class="pill ${state.status==='online'?'online':''}">● API ${state.status==='online'?'online':'offline'}</div><button class="secondary" id="refresh">Atualizar</button></div></div><div id="content"></div></main></div>`;document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{state.view=b.dataset.view;renderShell();renderMain()});$('#logout').onclick=logout;$('#refresh').onclick=()=>loadAll(false)}function setTitle(t,s){$('#title').textContent=t;$('#subtitle').textContent=s||''}function renderMain(){if(!state.user)return;let r=profileRole();if(r==='attendant'&&state.view==='inicio')state.view='atendimento';if(state.view==='inicio')return renderHome();if(state.view==='atendimento')return renderAttendance();if(state.view==='supervisor')return renderSupervisor();if(state.view==='admin')return renderAdmin();if(state.view==='clientes')return renderClients();if(state.view==='simulador')return renderSimulator();if(state.view==='whatsapp')return renderWhatsApp();if(state.view==='config')return renderConfig()}function stat(label,val){return`<div class="card stat"><small>${label}</small><strong>${val??0}</strong></div>`}function renderHome(){setTitle('Painel inicial','Visão simples das unidades, SLA e atendimentos de hoje. Modo interno: WhatsApp/Evolution pulado por enquanto.');$('#content').innerHTML=`<div class="grid cols-4">${stat('Clientes',state.summary.contacts)}${stat('Conversas abertas',state.summary.open_conversations)}${stat('Em atendimento',state.summary.in_progress_conversations)}${stat('SLA vermelho',dailyUrgent())}</div><div class="card" style="margin-top:16px"><div class="section-title"><h2>Resumo diário</h2><button class="secondary small" onclick="loadAll(false)">Atualizar</button></div>${dailyReportHtml()}<p class="hint">Verde: até 9 minutos sem atualização. Amarelo: 10 a 29 minutos. Vermelho: 30 minutos ou mais.</p></div><div class="card" style="margin-top:16px"><div class="section-title"><h2>Filas por unidade</h2></div><div class="queue-dashboard">${queueCardsHtml(false)}</div></div><div class="grid cols-2" style="margin-top:16px"><div class="card"><h2>Como ler o painel</h2><p class="empty"><b>Aguardando atendimento</b>: cliente entrou e ainda não foi assumido.<br><b>Em atendimento</b>: alguém já pegou a conversa.<br><b>SLA vermelho</b>: risco de perda de lead ou demora operacional.</p></div><div class="card"><h2>Status</h2><p class="empty">API: ${state.status}. Backend: ${state.api}. Modo: painel interno sem WhatsApp externo. Usuário: ${state.user.username} (${roleLabel(state.user.role)}).</p></div></div>`}function convName(c){let contact=state.contacts.find(x=>x.id===c.contact_id);return contact?.name||c.title||('Cliente #'+c.contact_id)}function attendantByUser(){return state.attendants.find(a=>a.user_id===state.user.id)||state.attendants[0]}
function queueById(id){return state.queues.find(q=>Number(q.id)===Number(id))||null}
function queueName(id){return queueById(id)?.name||'Sem fila definida'}function queueShortName(id){let n=queueName(id);return n.replace('Várzea Paulista - ','VP - ').replace('Jd. América','Jd. América')}
function queueColorClass(q){let name=String(typeof q==='object'?q?.name:queueName(q)).toLowerCase();if(name.includes('centro'))return'queue-red';if(name.includes('américa')||name.includes('america'))return'queue-orange';if(name.includes('morato'))return'queue-blue';if(name.includes('taipas'))return'queue-purple';return'queue-gray'}
function statusLabel(s){return({open:'Aguardando atendimento',in_progress:'Em atendimento',closed:'Finalizado',waiting:'Na fila',processing:'Em atendimento',completed:'Finalizado'})[s]||s||'Sem status'}
function statusClass(s){return s==='closed'?'ok':s==='in_progress'||s==='processing'?'warn':'bad'}
function queueConversationCount(id){return state.conversations.filter(c=>Number(c.queue_id)===Number(id)&&c.status!=='closed').length}
function queueWaitingCount(id){return state.conversations.filter(c=>Number(c.queue_id)===Number(id)&&c.status==='open').length}
function queueCardsHtml(clickable=false){if(!state.queues.length)return'<p class="empty">Nenhuma fila cadastrada. Clique em Admin/Supervisor e crie as filas padrão.</p>';return state.queues.map(q=>`<div class="queue-card ${queueColorClass(q)} ${queueSlaClass(q.id)} ${clickable?'clickable':''}" ${clickable?`data-qcard="${q.id}"`:''}><div><small>Unidade</small><b>${escapeHtml(q.name)}</b><span>${escapeHtml(q.description||'Atendimento da unidade')}</span></div><strong>${queueConversationCount(q.id)}</strong><em>${queueWaitingCount(q.id)} aguardando • mais antigo ${oldestWaiting(q.id)}</em></div>`).join('')}
function queuePill(id){return`<span class="queue-pill ${queueColorClass(id)}">${escapeHtml(queueShortName(id))}</span>`}
function convMeta(c){return c?.metadata||{}}
function convCategory(c){return convMeta(c).selected_category||convMeta(c).category||''}
function convTags(c){let tags=convMeta(c).tags||[];if(typeof tags==='string')tags=tags.split(',').map(x=>x.trim()).filter(Boolean);return Array.isArray(tags)?tags:[]}
function tagsHtml(c){let tags=convTags(c);if(convCategory(c)&&!tags.includes(convCategory(c)))tags=[convCategory(c),...tags];return tags.length?tags.map(t=>`<span class="tag info">${escapeHtml(t)}</span>`).join(' '):'<span class="tag">sem tag</span>'}
function todayIso(){return new Date().toISOString().slice(0,10)}
function isToday(d){try{return new Date(d).toISOString().slice(0,10)===todayIso()}catch{return false}}
function qConvs(qid){return state.conversations.filter(c=>Number(c.queue_id)===Number(qid))}
function qMetric(qid,status){return qConvs(qid).filter(c=>!status?true:c.status===status).length}
function qDoneToday(qid){return qConvs(qid).filter(c=>c.status==='closed'&&isToday(c.updated_at)).length}
function minutesSince(d){try{return Math.max(0,Math.round((Date.now()-new Date(d).getTime())/60000))}catch{return 0}}
function slaMinutes(c){return minutesSince(c.updated_at||c.created_at)}
function slaClassByMinutes(min){if(min<10)return'sla-green';if(min<30)return'sla-yellow';return'sla-red'}
function slaLabelByMinutes(min){if(min<10)return'OK';if(min<30)return'Atenção';return'Atrasado'}
function slaBadge(c){if(!c||c.status==='closed')return'<span class="sla-badge sla-done">Finalizado</span>';let min=slaMinutes(c);return`<span class="sla-badge ${slaClassByMinutes(min)}">${slaLabelByMinutes(min)} • ${min} min</span>`}
function oldestWaiting(qid){let rows=qConvs(qid).filter(c=>c.status==='open').sort((a,b)=>new Date(a.updated_at||a.created_at)-new Date(b.updated_at||b.created_at));if(!rows.length)return '-';return minutesSince(rows[0].updated_at||rows[0].created_at)+' min'}
function queueSlaClass(qid){let rows=qConvs(qid).filter(c=>c.status!=='closed');if(!rows.length)return'sla-green';let max=Math.max(...rows.map(c=>slaMinutes(c)));return slaClassByMinutes(max)}
function dailyTotal(){return state.conversations.filter(c=>isToday(c.created_at)||isToday(c.updated_at)).length}
function dailyClosed(){return state.conversations.filter(c=>c.status==='closed'&&isToday(c.updated_at)).length}
function dailyOpen(){return state.conversations.filter(c=>c.status==='open').length}
function dailyInProgress(){return state.conversations.filter(c=>c.status==='in_progress').length}
function dailyUrgent(){return state.conversations.filter(c=>c.status!=='closed'&&slaMinutes(c)>=30).length}
function dailyReportHtml(){return`<div class="daily-report"><div><small>Total monitorado</small><strong>${dailyTotal()}</strong></div><div><small>Aguardando</small><strong>${dailyOpen()}</strong></div><div><small>Em atendimento</small><strong>${dailyInProgress()}</strong></div><div><small>Finalizados hoje</small><strong>${dailyClosed()}</strong></div><div><small>SLA vermelho</small><strong>${dailyUrgent()}</strong></div></div>`}
function rulesHtml(){return`<div class="rules-box"><h2>Regras operacionais</h2><p><b>1.</b> Toda conversa aberta deve ser assumida por um atendente.</p><p><b>2.</b> Conversas com SLA amarelo devem ser priorizadas.</p><p><b>3.</b> Conversas com SLA vermelho exigem ação imediata do supervisor.</p><p><b>4.</b> Use tags para classificar orçamento, freios, suspensão, motor, urgente ou cliente recorrente.</p><p><b>5.</b> Finalize somente após orientar o cliente ou registrar o próximo encaminhamento.</p></div>`}
function operationalChecklistHtml(){return `<div class="checklist"><b>Checklist operacional diário</b><label><input type="checkbox"> Conferir filas abertas no início do expediente</label><label><input type="checkbox"> Verificar clientes em SLA amarelo/vermelho</label><label><input type="checkbox"> Distribuir atendimentos por unidade</label><label><input type="checkbox"> Garantir que conversas resolvidas sejam finalizadas</label><label><input type="checkbox"> Revisar tags e categorias antes do fechamento</label><label><input type="checkbox"> Anotar gargalos do dia para o supervisor</label></div>`}function renderAttendance(){setTitle('Atendimento','Escolha uma conversa, veja a unidade por cor e responda no histórico interno.');let my=profileRole()==='attendant';let convs=state.conversations.filter(c=>c.status!=='closed');if(my)convs=convs.filter(c=>!c.assigned_attendant_id||c.assigned_attendant_id===state.user.id);$('#content').innerHTML=`<div class="queue-strip">${queueCardsHtml(true)}</div><div class="chat-layout"><div class="conversation-list"><header><b>Conversas</b><p class="hint">A cor mostra para qual unidade o cliente foi direcionado.</p><label>Filtrar por status</label><select id="convFilter"><option value="">Todas</option><option value="open">Aguardando atendimento</option><option value="in_progress">Em atendimento</option></select><label>Filtrar por unidade</label><select id="convQueueFilter"><option value="">Todas as unidades</option>${state.queues.map(q=>`<option value="${q.id}">${q.name}</option>`).join('')}</select><button id="newDemo" class="secondary" style="margin-top:10px;width:100%">Criar cliente teste</button></header><div id="convRows"></div></div><div class="chat"><header><div><b id="chatTitle">Selecione uma conversa</b><div class="hint" id="chatSub">As mensagens aparecerão aqui.</div></div><div><button class="secondary small" id="btnAssume">Assumir</button><button class="danger small" id="btnClose">Finalizar</button></div></header><div class="messages" id="messages"><p class="empty">Nenhuma conversa selecionada.</p></div><div class="composer"><textarea id="msgText" placeholder="Digite a resposta para o cliente..."></textarea><button id="sendMsg">Enviar</button></div></div><aside class="panel-right"><h2>Atalho por unidade</h2><p class="hint">Escolha a unidade e puxe o próximo cliente daquela fila.</p><label>Unidade</label><select id="queueSelect">${state.queues.map(q=>`<option value="${q.id}">${q.name}</option>`).join('')}</select><button id="nextQueue" style="width:100%;margin-top:10px">Puxar próximo cliente</button><div id="nextBox" class="notice" style="margin-top:12px">Escolha uma unidade e clique para carregar o próximo atendimento.</div><hr><h2>Dados do cliente</h2><div id="customerInfo" class="empty">Selecione uma conversa.</div><hr>${rulesHtml()}</aside></div>`;let drawRows=()=>{let f=$('#convFilter').value;let qf=$('#convQueueFilter').value;let rows=convs.filter(c=>(!f||c.status===f)&&(!qf||Number(c.queue_id)===Number(qf)));rows.sort((a,b)=>new Date(b.updated_at)-new Date(a.updated_at));$('#convRows').innerHTML=rows.map(c=>`<div class="conversation-row ${queueColorClass(c.queue_id)} ${state.selectedConversation?.id===c.id?'active':''}" data-cid="${c.id}"><div class="row-main"><b>${escapeHtml(convName(c))}</b>${queuePill(c.queue_id)}</div><span>#${c.id} • ${statusLabel(c.status)} • ${new Date(c.updated_at).toLocaleString()} • ${slaBadge(c)}</span></div>`).join('')||'<p class="empty" style="padding:14px">Nenhuma conversa neste filtro.</p>';document.querySelectorAll('[data-cid]').forEach(x=>x.onclick=()=>selectConversation(Number(x.dataset.cid)))};$('#convFilter').onchange=drawRows;$('#convQueueFilter').onchange=drawRows;document.querySelectorAll('[data-qcard]').forEach(card=>card.onclick=()=>{$('#convQueueFilter').value=card.dataset.qcard;drawRows()});drawRows();$('#sendMsg').onclick=sendCurrentMessage;let msgBox=$('#msgText');if(msgBox)msgBox.onkeydown=(ev)=>{if(ev.key==='Enter'&&!ev.shiftKey){ev.preventDefault();sendCurrentMessage();}};$('#btnAssume').onclick=assumeCurrent;$('#btnClose').onclick=closeCurrent;$('#nextQueue').onclick=pullNext;$('#newDemo').onclick=openDemoModal;if(state.selectedConversation)selectConversation(state.selectedConversation.id,false)}async function selectConversation(id,rerender=true){try{let c=await api('/conversations/'+id);state.selectedConversation=c;let msgs=[];try{msgs=await api(`/conversations/${id}/messages?limit=200`)}catch(_){msgs=c.messages||[]}state.messages=Array.isArray(msgs)?msgs:(c.messages||[]);state.messages.sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));if(rerender)renderAttendance();let meta=c.metadata||{};let category=meta.selected_category?` • ${meta.selected_category}`:'';$('#chatTitle').innerHTML=`${escapeHtml(convName(c))} ${queuePill(c.queue_id)}`;$('#chatSub').textContent=`Conversa #${c.id} • ${statusLabel(c.status)}${category}`;$('#messages').innerHTML=state.messages.map(m=>`<div class="bubble ${m.sender_type}">${escapeHtml(m.content)}<small>${m.sender_type} • ${new Date(m.created_at).toLocaleString()}</small></div>`).join('')||'<p class="empty">Sem mensagens ainda.</p>';let ct=c.contact||state.contacts.find(x=>x.id===c.contact_id);let displayName=meta.customer_name||ct?.name||convName(c);let tagList=convTags(c).join(', ');$('#customerInfo').innerHTML=`<div class="customer-card"><b>${escapeHtml(displayName)}</b>${queuePill(c.queue_id)}<p>Telefone: ${escapeHtml(ct?.phone||'-')}</p><p>E-mail: ${escapeHtml(ct?.email||'-')}</p><p>Status: <b>${statusLabel(c.status)}</b> ${slaBadge(c)}</p><p>Unidade: <b>${escapeHtml(meta.selected_unit||queueName(c.queue_id))}</b></p><p>Categoria: <b>${escapeHtml(meta.selected_category||'-')}</b></p><p>${tagsHtml(c)}</p><hr><label>Classificação</label><select id="tagPreset"><option value="">Selecione...</option><option>Orçamento</option><option>Freios</option><option>Suspensão</option><option>Motor</option><option>Urgente</option><option>Cliente recorrente</option><option>Pós-venda</option></select><input id="customTags" placeholder="Tags extras separadas por vírgula" value="${escapeHtml(tagList)}"><button class="secondary small" onclick="saveConversationTags()">Salvar tags</button><label>Transferir para unidade</label><select id="transferQueue">${state.queues.map(q=>`<option value="${q.id}" ${Number(q.id)===Number(c.queue_id)?'selected':''}>${q.name}</option>`).join('')}</select><button class="secondary small" onclick="transferCurrentConversation()">Transferir</button></div>`;$('#messages').scrollTop=$('#messages').scrollHeight}catch(e){toast(e.message)}}async function saveConversationTags(){let c=state.selectedConversation;if(!c)return toast('Selecione uma conversa.');let preset=$('#tagPreset')?.value||'';let extra=($('#customTags')?.value||'').split(',').map(x=>x.trim()).filter(Boolean);let tags=[...new Set([preset,...extra].filter(Boolean))];let metadata={...(c.metadata||{}),tags};try{await api(`/conversations/${c.id}`,{method:'PATCH',body:JSON.stringify({metadata})});await loadAll(true);await selectConversation(c.id,false);toast('Tags salvas.')}catch(e){toast(e.message)}}
async function transferCurrentConversation(){let c=state.selectedConversation;if(!c)return toast('Selecione uma conversa.');let qid=Number($('#transferQueue')?.value||0);let q=queueById(qid);if(!q)return toast('Selecione uma unidade válida.');let metadata={...(c.metadata||{}),selected_unit:q.name,transfer_history:[...((c.metadata||{}).transfer_history||[]),{to:q.name,at:new Date().toISOString(),by:state.user?.username||'sistema'}]};try{await api(`/conversations/${c.id}`,{method:'PATCH',body:JSON.stringify({queue_id:qid,metadata})});await loadAll(true);await selectConversation(c.id,false);toast('Conversa transferida.')}catch(e){toast(e.message)}}
async function sendCurrentMessage(){
  let c=state.selectedConversation;
  if(!c)return toast('Selecione uma conversa.');
  let box=$('#msgText');
  let t=(box?.value||'').trim();
  if(!t)return;
  try{
    $('#sendMsg').disabled=true;
    let att=attendantByUser();
    if(att&&!c.assigned_attendant_id){
      try{
        await api(`/conversations/${c.id}/assign/${att.id}`,{method:'POST'});
        c.assigned_attendant_id=att.id;
      }catch(assignErr){
        console.warn('Não foi possível assumir automaticamente, mas o envio continuará:', assignErr);
      }
    }

    let payload={
      conversation_id:c.id,
      contact_id:c.contact_id,
      content:t,
      sender_type:'attendant',
      message_type:'text',
      metadata:{sent_from_panel:true}
    };

    let result;
    try{
      result=await api('/panel/send-message',{method:'POST',body:JSON.stringify(payload)});
    }catch(panelErr){
      console.warn('Endpoint /panel/send-message falhou. Tentando /messages:', panelErr);
      result=await api('/messages',{method:'POST',body:JSON.stringify(payload)});
    }

    box.value='';
    await selectConversation(c.id,false);
    await loadAll(true);

    if(result&&result.gateway&&result.gateway.sent===false&&result.gateway.reason!=='external_messaging_disabled'){
      console.warn('Mensagem salva, mas não enviada ao provedor externo:', result.gateway);
      toast('Mensagem salva no sistema. O provedor externo não confirmou envio.');
    }
  }catch(e){
    console.error(e);
    toast(e.message||'Erro ao enviar mensagem.');
  }finally{
    let btn=$('#sendMsg');
    if(btn)btn.disabled=false;
  }
}
async function assumeCurrent(){let c=state.selectedConversation;if(!c)return toast('Selecione uma conversa.');let att=attendantByUser();if(!att)return toast('Cadastre um atendente vinculado a este usuário.');try{await api(`/conversations/${c.id}/assign/${att.id}`,{method:'POST'});await loadAll(true);await selectConversation(c.id,false)}catch(e){toast(e.message)}}async function closeCurrent(){let c=state.selectedConversation;if(!c)return toast('Selecione uma conversa.');try{await api(`/conversations/${c.id}/close`,{method:'POST'});state.selectedConversation=null;await loadAll(true);renderAttendance()}catch(e){toast(e.message)}}async function pullNext(){let q=$('#queueSelect').value;if(!q)return toast('Crie uma fila primeiro.');try{let n=await api(`/queues/${q}/next`);if(!n.conversation_id){$('#nextBox').textContent='Fila vazia.';return}await selectConversation(n.conversation_id);$('#nextBox').textContent='Cliente carregado. Clique em Assumir.'}catch(e){toast(e.message)}}function renderSupervisor(){setTitle('Supervisor','Métricas diárias, SLA visual e governança da operação.');let recent=state.conversations.slice().sort((a,b)=>new Date(b.updated_at)-new Date(a.updated_at)).slice(0,25);$('#content').innerHTML=`<div class="grid cols-4">${stat('Aguardando',dailyOpen())}${stat('Em atendimento',dailyInProgress())}${stat('Finalizados hoje',dailyClosed())}${stat('SLA vermelho',dailyUrgent())}</div><div class="card" style="margin-top:16px"><div class="section-title"><h2>Relatório diário</h2><button class="secondary small" onclick="loadAll(false)">Atualizar</button></div>${dailyReportHtml()}<p class="hint">Use esse bloco para a rotina diária do supervisor: abrir, distribuir, acompanhar e fechar atendimentos.</p></div><div class="grid cols-2" style="margin-top:16px"><div class="card"><div class="section-title"><h2>SLA por unidade</h2><button class="secondary small" onclick="openQueueModal()">Nova fila</button></div><div class="metrics-table"><div class="metrics-head"><span>Unidade</span><span>Aguardando</span><span>Em atendimento</span><span>Finalizados hoje</span><span>SLA mais antigo</span></div>${state.queues.map(q=>`<div class="metrics-row ${queueColorClass(q)} ${queueSlaClass(q.id)}"><strong>${escapeHtml(q.name)}</strong><span>${qMetric(q.id,'open')}</span><span>${qMetric(q.id,'in_progress')}</span><span>${qDoneToday(q.id)}</span><span>${oldestWaiting(q.id)}</span></div>`).join('')||'<p class="empty">Nenhuma fila.</p>'}</div></div><div class="card">${operationalChecklistHtml()}<hr>${rulesHtml()}</div></div><div class="card" style="margin-top:16px"><h2>Conversas recentes</h2><div class="list">${recent.map(c=>`<div class="item conversation-item ${queueColorClass(c.queue_id)} ${slaClassByMinutes(slaMinutes(c))}"><div class="item-top"><div><b>${escapeHtml(convName(c))}</b><p>#${c.id} • ${statusLabel(c.status)} • ${new Date(c.updated_at).toLocaleString()} • ${tagsHtml(c)}</p></div><div>${queuePill(c.queue_id)} ${slaBadge(c)} <span class="tag ${statusClass(c.status)}">${statusLabel(c.status)}</span></div></div><div class="actions"><button class="secondary small" onclick="state.view='atendimento';state.selectedConversation={id:${c.id}};renderShell();renderMain()">Abrir conversa</button></div></div>`).join('')||'<p class="empty">Nenhuma conversa.</p>'}</div></div>`}function renderClients(){setTitle('Clientes','Cadastro e consulta de clientes.');$('#content').innerHTML=`<div class="card"><div class="section-title"><h2>Clientes</h2><button class="small" onclick="openClientModal()">Novo cliente</button></div><div class="list">${state.contacts.map(c=>`<div class="item"><div class="item-top"><div><b>${c.name}</b><p>${c.phone} • ${c.email||'sem e-mail'}</p></div><span class="tag ${c.is_active?'ok':''}">${c.is_active?'ativo':'inativo'}</span></div></div>`).join('')||'<p class="empty">Nenhum cliente.</p>'}</div></div>`}function renderAdmin(){setTitle('Admin','CRUD do sistema: usuários, atendentes, filas e clientes.');$('#content').innerHTML=`<div class="grid cols-3"><div class="card"><div class="section-title"><h2>Usuários</h2><button class="small" onclick="openUserModal()">Novo</button></div><div class="list">${state.users.map(u=>`<div class="item"><b>${u.username}</b><p>${u.email||'-'} • ${roleLabel(u.role)} • #${u.id}</p><div class="actions"><button class="secondary small" onclick="editUser(${u.id})">Editar</button></div></div>`).join('')}</div></div><div class="card"><div class="section-title"><h2>Atendentes</h2><button class="small" onclick="openAttendantModal()">Novo</button></div><div class="list">${state.attendants.map(a=>`<div class="item"><b>${a.name}</b><p>Usuário #${a.user_id} • ${a.description||'-'}</p><span class="tag ${a.is_active?'ok':''}">${a.is_active?'ativo':'inativo'}</span></div>`).join('')}</div></div><div class="card"><div class="section-title"><h2>Filas</h2><button class="small" onclick="openQueueModal()">Nova</button></div><div class="list">${state.queues.map(q=>`<div class="item"><b>${q.name}</b><p>${q.description||'-'} • prioridade ${q.priority}</p><div class="actions"><button class="secondary small" onclick="editQueue(${q.id})">Editar</button></div></div>`).join('')}</div></div></div>`}

async function loadWaStatus(silent=false){
  try{
    state.wa=await api('/whatsapp/status');
    if(state.view==='whatsapp'&&!silent)renderWhatsApp();
    return state.wa;
  }catch(e){
    state.wa={provider:'meta_cloud_api',configured:false,ready_to_send:false,last_error:e.message};
    if(state.view==='whatsapp'&&!silent)renderWhatsApp();
    return state.wa;
  }
}
async function sendWaTest(){
  try{
    let phone=$('#waTestPhone').value.trim();
    let message=$('#waTestMsg').value.trim();
    if(!phone||!message)return toast('Informe telefone e mensagem.');
    let result=await api('/whatsapp/test-send',{method:'POST',body:JSON.stringify({phone,message})});
    if(result.ok){toast('Mensagem enviada pela WhatsApp Cloud API.')}
    else{toast('Envio não confirmado. Verifique as credenciais no .env e o retorno técnico na tela.')}
    $('#waTestResult').textContent=JSON.stringify(result,null,2);
  }catch(e){toast(e.message)}
}
function renderWhatsApp(){
  setTitle('Integração externa pausada','Evolution/Meta/WhatsApp foram pulados por enquanto. Use o Simulador interno.');
  clearInterval(state.waPoll);
  state.waPoll=setInterval(()=>{if(state.view==='whatsapp')loadWaStatus(true).then(()=>{let s=$('#waStatusLine');if(s)s.innerHTML=waStatusHtml();let c=$('#waConfigBox');if(c)c.innerHTML=waConfigHtml();})},10000);
  let wa=state.wa||{};
  $('#content').innerHTML=`<div class="grid cols-2">
    <div class="card">
      <div class="section-title"><h2>Status da integração</h2><button class="secondary small" id="btnWaRefresh">Atualizar</button></div>
      <div id="waStatusLine">${waStatusHtml()}</div>
      <div id="waConfigBox" class="notice" style="margin-top:12px">${waConfigHtml()}</div>
      <p class="hint">Esta versão remove o fluxo por QR Code. O WhatsApp passa a operar por API profissional, com webhook e credenciais oficiais.</p>
    </div>
    <div class="card">
      <h2>Configuração necessária no .env</h2>
      <pre class="code-box">WHATSAPP_PHONE_NUMBER_ID=seu_phone_number_id
WHATSAPP_ACCESS_TOKEN=seu_token_meta
WHATSAPP_WEBHOOK_TOKEN=token_de_verificacao
</pre>
      <p class="hint">Use o token de verificação no painel da Meta ao cadastrar o webhook.</p>
    </div>
  </div>
  <div class="grid cols-2" style="margin-top:16px">
    <div class="card">
      <h2>Webhook oficial</h2>
      <p class="empty"><b>Verificação:</b><br>${escapeHtml(location.origin)}/webhooks/whatsapp<br><br><b>Recebimento:</b><br>${escapeHtml(location.origin)}/webhooks/whatsapp</p>
      <p class="hint">Em produção, esta URL precisa estar publicada em HTTPS na VPS/domínio.</p>
    </div>
    <div class="card">
      <h2>Teste de envio pela API oficial</h2>
      <label>Telefone com DDI e DDD</label>
      <input id="waTestPhone" placeholder="5511999999999">
      <label>Mensagem</label>
      <textarea id="waTestMsg">Teste de envio pelo HUB Tico Auto Peças.</textarea>
      <button id="btnWaSend">Enviar pela API oficial</button>
      <pre id="waTestResult" class="code-box" style="margin-top:12px">Aguardando teste...</pre>
    </div>
  </div>
  <div class="card" style="margin-top:16px">
    <h2>Próximo passo profissional</h2>
    <p class="empty">Publicar o backend em uma VPS com HTTPS, configurar o webhook no painel da Meta e validar mensagens reais via Cloud API. O gateway por navegador/QR Code não é mais necessário neste fluxo.</p>
  </div>`;
  $('#btnWaRefresh').onclick=()=>loadWaStatus(false);
  $('#btnWaSend').onclick=sendWaTest;
  loadWaStatus(true).then(()=>{let s=$('#waStatusLine');if(s)s.innerHTML=waStatusHtml();let c=$('#waConfigBox');if(c)c.innerHTML=waConfigHtml();});
}
function waStatusHtml(){
  let wa=state.wa||{};
  let ready=!!wa.ready_to_send;
  let cls=ready?'ok':(wa.configured?'warn':'bad');
  return `<div class="wa-status ${cls}"><b>${ready?'API pronta para envio':'API não configurada'}</b><span>${ready?'Credenciais mínimas presentes.':'Configure as credenciais oficiais da Meta no arquivo .env.'}</span></div>${wa.last_error?`<p class="hint bad">Erro: ${escapeHtml(wa.last_error)}</p>`:''}`;
}
function waConfigHtml(){
  let wa=state.wa||{};
  return `<b>Provedor:</b> ${escapeHtml(wa.provider||'meta_cloud_api')}<br>
<b>Modo:</b> ${escapeHtml(wa.mode||'professional_api')}<br>
<b>QR Code:</b> desativado<br>
<b>Phone Number ID:</b> ${wa.phone_number_id_configured?'configurado':'pendente'}<br>
<b>Access Token:</b> ${wa.access_token_configured?'configurado':'pendente'}<br>
<b>Webhook Token:</b> ${wa.verify_token_configured?'configurado':'pendente'}`;
}


function renderSimulator(){
  setTitle('Simulador interno','Teste o fluxo completo sem Evolution, Meta, QR Code ou WhatsApp real.');
  $('#content').innerHTML=`<div class="grid cols-2">
    <div class="card">
      <h2>Simular entrada de cliente</h2>
      <p class="hint">Use esta tela para validar o MVP operacional: triagem, unidade, nome, categoria, fila, assumir, responder e finalizar.</p>
      <label>Nome inicial</label>
      <input id="simName" value="Cliente teste">
      <label>Telefone fictício</label>
      <input id="simPhone" value="119${Date.now().toString().slice(-8)}">
      <label>Mensagem do cliente</label>
      <textarea id="simMsg">Olá</textarea>
      <button id="simSend">Enviar mensagem simulada</button>
      <pre id="simResult" class="code-box" style="margin-top:12px">Aguardando simulação...</pre>
    </div>
    <div class="card">
      <h2>Fluxo recomendado de teste</h2>
      <p class="empty">
        1. Envie <b>Olá</b> pelo simulador.<br>
        2. Abra a conversa criada em Atendimento.<br>
        3. Responda como cliente usando 1, 2, 3 ou 4 pelo simulador com o mesmo telefone.<br>
        4. Informe um nome pelo simulador.<br>
        5. Informe uma categoria pelo simulador.<br>
        6. Assuma a conversa e responda pelo painel.
      </p>
      <p class="hint">Nesta etapa, o botão Enviar do atendente salva no histórico interno. A integração externa será plugada depois.</p>
    </div>
  </div>
  <div class="card" style="margin-top:16px">
    <h2>Modo atual do projeto</h2>
    <p class="empty"><b>Integração externa:</b> pausada.<br><b>Foco:</b> painel operacional, filas, atendentes, histórico, métricas e governança.</p>
  </div>`;
  $('#simSend').onclick=async()=>{
    try{
      let r=await api('/demo-chatbot/send',{method:'POST',body:JSON.stringify({name:$('#simName').value,phone:$('#simPhone').value,content:$('#simMsg').value})});
      $('#simResult').textContent=JSON.stringify(r,null,2);
      state.selectedConversation={id:r.conversation_id};
      await loadAll(true);
    }catch(e){
      $('#simResult').textContent=e.message;
      toast(e.message);
    }
  };
}

function renderConfig(){setTitle('Configuração','Ajustes locais do navegador.');$('#content').innerHTML=`<div class="card"><label>URL da API</label><input id="apiCfg" value="${state.api}"><button id="saveApi">Salvar URL</button><p class="hint">Exemplo local: /api/v1 ou http://127.0.0.1:8000/api/v1. Integração externa está pausada nesta versão.</p></div>`;$('#saveApi').onclick=()=>{state.api=$('#apiCfg').value.trim();localStorage.setItem(API_KEY,state.api);loadAll(false)}}function modal(html){let b=el('div','modal-back',`<div class="modal">${html}<div class="actions"><button class="secondary" onclick="closeModal()">Cancelar</button></div></div>`);document.body.appendChild(b)}function closeModal(){document.querySelector('.modal-back')?.remove()}function openUserModal(u=null){modal(`<h2>${u?'Editar':'Novo'} usuário</h2><div class="form-grid"><div><label>Usuário</label><input id="mUser" value="${u?.username||''}"></div><div><label>E-mail</label><input id="mEmail" value="${u?.email||''}"></div><div><label>Senha ${u?'(não altera se vazio)':''}</label><input id="mPass" type="password"></div><div><label>Perfil</label><select id="mRole"><option value="admin">Admin</option><option value="user">Supervisor</option><option value="attendant">Atendente</option></select></div></div><button onclick="saveUser(${u?.id||0})">Salvar</button>`);if(u)$('#mRole').value=u.role}function editUser(id){openUserModal(state.users.find(u=>u.id===id))}async function saveUser(id){try{let body={username:$('#mUser').value,email:$('#mEmail').value||null,role:($('#mRole').value==='supervisor'?'user':$('#mRole').value)};if(!id){body.password=$('#mPass').value||'123456';await api('/auth/register',{method:'POST',body:JSON.stringify(body)})}else{await api('/users/'+id,{method:'PATCH',body:JSON.stringify(body)})}closeModal();await loadAll(false)}catch(e){toast(e.message)}}function openAttendantModal(){modal(`<h2>Novo atendente</h2><label>Usuário vinculado</label><select id="mAttUser">${state.users.map(u=>`<option value="${u.id}">#${u.id} ${u.username} (${roleLabel(u.role)})</option>`).join('')}</select><label>Nome do atendente</label><input id="mAttName"><label>Descrição</label><input id="mAttDesc"><button onclick="saveAttendant()">Salvar</button>`)}async function saveAttendant(){try{await api('/attendants',{method:'POST',body:JSON.stringify({user_id:Number($('#mAttUser').value),name:$('#mAttName').value,description:$('#mAttDesc').value})});closeModal();await loadAll(false)}catch(e){toast(e.message)}}function openQueueModal(q=null){modal(`<h2>${q?'Editar':'Nova'} fila/cidade</h2><label>Nome</label><input id="mQName" value="${q?.name||''}"><label>Descrição</label><input id="mQDesc" value="${q?.description||''}"><label>Prioridade</label><input id="mQPrio" type="number" value="${q?.priority||0}"><button onclick="saveQueue(${q?.id||0})">Salvar</button>`)}function editQueue(id){openQueueModal(state.queues.find(q=>q.id===id))}async function saveQueue(id){try{let body={name:$('#mQName').value,description:$('#mQDesc').value,priority:Number($('#mQPrio').value||0)};await api(id?('/queues/'+id):'/queues',{method:id?'PATCH':'POST',body:JSON.stringify(body)});closeModal();await loadAll(false)}catch(e){toast(e.message)}}function openClientModal(){modal(`<h2>Novo cliente</h2><label>Nome</label><input id="mCName"><label>Telefone</label><input id="mCPhone"><label>E-mail</label><input id="mCEmail"><button onclick="saveClient()">Salvar</button>`)}async function saveClient(){try{await api('/contacts',{method:'POST',body:JSON.stringify({name:$('#mCName').value,phone:$('#mCPhone').value,email:$('#mCEmail').value||null,metadata:{}})});closeModal();await loadAll(false)}catch(e){toast(e.message)}}function openDemoModal(){modal(`<h2>Criar cliente teste</h2><p class="hint">Simula uma mensagem recebida de cliente e usa a triagem por unidade do HUB, sem depender de WhatsApp/Evolution.</p><label>Nome</label><input id="dName" value="Cliente teste"><label>Telefone</label><input id="dPhone" value="119${Date.now().toString().slice(-8)}"><label>Mensagem inicial</label><textarea id="dMsg">Olá</textarea><p class="hint">Depois de criar, abra a conversa e responda 1, 2, 3 ou 4 como se fosse o cliente escolhendo a unidade.</p><button onclick="saveDemo()">Criar atendimento</button>`)}async function saveDemo(){try{let r=await api('/demo-chatbot/send',{method:'POST',body:JSON.stringify({name:$('#dName').value,phone:$('#dPhone').value,content:$('#dMsg').value})});state.selectedConversation={id:r.conversation_id};closeModal();await loadAll(true);renderAttendance()}catch(e){toast(e.message)}}function escapeHtml(s){return String(s||'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]))}render();