const $=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s);
const E=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);
const nf=new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}),brl=n=>nf.format(n);
const kk=n=>n>=1e6?(n/1e6).toFixed(1).replace(".",",")+" mi":n>=1e3?(n/1e3).toFixed(1).replace(".",",")+" mil":String(Math.round(n));
const k=n=>"R$ "+kk(n),fd=d=>d.split("-").reverse().join("/"),sum=o=>o.pago+o.pendente+o.atrasado;
const norm=s=>String(s).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]/g,"");
const LBL={pago:"Pago",pendente:"A receber",atrasado:"Em atraso"},SI={pago:"ok",pendente:"clock",atrasado:"warn"};
const AL={id:["idtransacao","id","codigo","lancamento"],cliente:["cliente","empresa","razaosocial","nome"],cnpj:["cnpj","cpfcnpj","documento"],servico:["servico","descricao","produto","categoria"],valor:["valor","valortotal","total"],data:["datavencimento","vencimento","data"],status:["status","situacao"]};
const P={home:'<path d="M3 11l9-8 9 8M5 10v10h14V10"/>',list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',up:'<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',find:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',warn:'<path d="M12 3l10 18H2zM12 10v5M12 18h.01"/>',ok:'<path d="M5 12l5 5 9-10"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',trend:'<path d="M3 17l6-6 4 4 8-9"/>',file:'<path d="M6 3h8l4 4v14H6zM14 3v4h4"/>'};
const ic=(n,s=20)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]}</svg>`;

function num(v){if(typeof v==="number")return v;let s=String(v).replace(/[R$\s]/g,"");if(s.includes(","))s=s.replace(/\./g,"").replace(",",".");return s?Number(s):NaN}
function iso(v){let y,m,d;if(typeof v==="number"&&v>20000)return new Date(Math.round((v-25569)*864e5)).toISOString().slice(0,10);
const s=String(v).trim(),x=s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/),z=s.match(/^(\d{4})-(\d{2})-(\d{2})/);
if(x){d=+x[1];m=+x[2];y=+x[3];if(y<100)y+=2000}else if(z){y=+z[1];m=+z[2];d=+z[3]}else return null;
if(m<1||m>12||d<1||d>31)return null;return y+"-"+String(m).padStart(2,"0")+"-"+String(d).padStart(2,"0")}
function stt(v){const s=norm(v);return /^(pag|receb|liquid|quit)/.test(s)?"pago":/^(atras|venc|inadim)/.test(s)?"atrasado":"pendente"}

function demo(){let s=11;const R=()=>(s=s*16807%2147483647)/2147483647,
C=["Studio Aurora","Mercearia Boa Vista","Clínica Vitta","Oficina Torres","Café Lumiar","Construtora Delta","Pet Nativa","Escola Brisa","Grupo Ápia","Ótica Foco"],
V=["Consultoria contábil","Folha de pagamento","Abertura de empresa","BPO financeiro","Planejamento tributário"],o=[];
for(let i=0;i<70;i++){const off=Math.round(-150+i*2.5+R()*4),d=new Date();d.setDate(d.getDate()+off);const late=off<0&&R()<(off>-45?.3:.06);
o.push({id:"L"+(1001+i),cliente:C[Math.floor(R()*C.length)],servico:V[Math.floor(R()*V.length)],valor:Math.round((250+R()*R()*6200)*100)/100,data:d.toLocaleDateString("sv-SE"),status:off>0?"pendente":late?"atrasado":"pago"})}return o}

const temColunas=j=>{const h=Object.keys(j[0]||{}).map(norm);return h.some(x=>AL.valor.includes(x))&&h.some(x=>AL.data.includes(x))};
function ingest(rows){const keys=Object.keys(rows[0]||{}),m={};for(const c in AL)m[c]=keys.find(h=>AL[c].includes(norm(h)));
if(!m.valor||!m.data)return{erro:"Não encontrei as colunas Valor e Vencimento. Confira os títulos na primeira linha da planilha."};
const seen=new Set(),out=[],bad=[];let dup=0;
rows.forEach((r,i)=>{const v=num(r[m.valor]),d=iso(r[m.data]);if(!(v>0)||!d){bad.push(i+2);return}
const id=m.id&&r[m.id]!==""?String(r[m.id]):"L"+(i+1);if(m.id&&seen.has(id)){dup++;return}seen.add(id);
out.push({id,cliente:String(r[m.cliente]||r[m.cnpj]||"").trim()||"Sem identificação",servico:String(r[m.servico]||"").trim()||"Outros",valor:v,data:d,status:stt(m.status?r[m.status]:"")})});
return{out,rep:{dup,bad}}}

const K="painel-do-dono:v1";let S={rows:[],nome:"",demo:true,rep:null,err:"",f:"todos",q:"",view:"inicio"};
try{const j=JSON.parse(localStorage.getItem(K));if(j&&j.rows)Object.assign(S,j)}catch(e){}
if(!S.rows.length&&S.demo){S.rows=demo();S.nome="Dados de exemplo"}
const save=()=>{try{localStorage.setItem(K,JSON.stringify({rows:S.rows,nome:S.nome,demo:S.demo,rep:S.rep}))}catch(e){}};

function agg(){const t={pago:0,pendente:0,atrasado:0},sv={},cl={},mo={};
S.rows.forEach(x=>{t[x.status]+=x.valor;sv[x.servico]=(sv[x.servico]||0)+x.valor;const c=cl[x.cliente]||(cl[x.cliente]={v:0,a:0});c.v+=x.valor;if(x.status==="atrasado")c.a+=x.valor;
const m=x.data.slice(0,7),o=mo[m]||(mo[m]={pago:0,pendente:0,atrasado:0});o[x.status]+=x.valor});
const due=t.pago+t.atrasado;return{t,mo,tot:sum(t),ad:due?t.pago/due*100:100,sv:Object.entries(sv).sort((a,b)=>b[1]-a[1]),cl:Object.entries(cl).sort((a,b)=>b[1].v-a[1].v)}}

const row=x=>`<div class="row"><span class="st ${x.status}">${ic(SI[x.status],20)}<span class="vh">${LBL[x.status]}</span></span><div class="m"><b>${E(x.cliente)}</b><small>${E(x.servico)}</small></div><div class="r"><b>${brl(x.valor)}</b><small>${fd(x.data)}</small></div></div>`;
const hb=(l,v,mx,c,extra="")=>`<div class="hb"><div><span>${E(l)}</span><b>${brl(v)}</b></div><i><u style="width:${v/mx*100}%;background:${c}"></u></i>${extra}</div>`;
const mes=m=>new Date(+m.slice(0,4),+m.slice(5,7)-1,1).toLocaleDateString("pt-BR",{month:"short"}).replace(".","");
const empty=()=>`<div class="empty"><span class="st brand">${ic("file",22)}</span><h1>Nenhum dado ainda</h1><p>Importe uma planilha do Excel para ver o resumo do seu dinheiro.</p><a class="btn" href="#importar">Importar planilha</a></div>`;

function home(){const A=agg(),t=A.t,late=A.cl.filter(c=>c[1].a>0).sort((a,b)=>b[1].a-a[1].a),lead=A.sv[0],
ms=Object.keys(A.mo).sort().slice(-6),mx=Math.max(...ms.map(m=>sum(A.mo[m])));
const seg=[["pago","#7ee2a8","Recebido"],["pendente","#ffd36e","A receber"],["atrasado","#ff8f7a","Em atraso"]];
const ins=[["trend","brand",`Já entraram ${brl(t.pago)} e ainda há ${brl(t.pendente)} para receber.`],
t.atrasado>0?["warn","warn",`${brl(t.atrasado)} estão em atraso, de ${late.length} cliente${late.length>1?"s":""}. O maior valor é de ${E(late[0][0])}.`]:["ok","ok","Nada em atraso. A carteira está em dia."],
lead?["chart","brand",`${E(lead[0])} é o serviço que mais fatura: ${(lead[1]/A.tot*100).toFixed(0)}% do total.`]:null].filter(Boolean);
const bars=ms.map(m=>{const o=A.mo[m];return `<div class="col"><div class="plot"><small>${kk(sum(o))}</small><div class="bar" style="height:calc((100% - 20px)*${sum(o)/mx})">${["pago","pendente","atrasado"].map(s=>o[s]?`<i class="${s}" style="flex:${o[s]}"></i>`:"").join("")}</div></div><small>${mes(m)}</small></div>`}).join("");
const lt=S.rows.filter(x=>x.status==="atrasado").sort((a,b)=>b.valor-a.valor).slice(0,4);
return `<div class="g2"><div><section class="hero"><div class="t"><span>Já recebido</span><span>${A.ad.toFixed(0)}% em dia</span></div><div class="big">${brl(t.pago)}</div>
<div class="strip" role="img" aria-label="Proporção entre recebido, a receber e em atraso">${seg.map(([s,c])=>t[s]?`<i style="flex:${t[s]};background:${c}"></i>`:"").join("")}</div>
<div class="leg">${seg.map(([s,c,l])=>`<div><span><em style="background:${c}"></em>${l}</span><b>${k(t[s])}</b></div>`).join("")}</div></section>
<section class="sec"><h2>O que chama atenção</h2>${ins.map(i=>`<div class="ins"><span class="st ${i[1]}">${ic(i[0],20)}</span><p>${i[2]}</p></div>`).join("")}</section></div>
<div><section class="sec"><h2>Movimento por mês</h2><div class="panel"><div class="bars">${bars}</div><div class="lg">${["pago","pendente","atrasado"].map(s=>`<span><i class="d ${s}"></i>${s==="pago"?"Recebido":LBL[s]}</span>`).join("")}</div></div></section>
${lt.length?`<section class="sec"><h2>Maiores valores em atraso</h2>${lt.map(row).join("")}</section>`:""}</div></div>`}

function list(){return `<h1>Lançamentos</h1><div class="search">${ic("find",18)}<input id="q" placeholder="Buscar cliente ou serviço" value="${E(S.q)}" aria-label="Buscar"></div>
<div class="chips">${[["todos","Todos"],["pago","Pagos"],["pendente","A receber"],["atrasado","Em atraso"]].map(([c,l])=>`<button class="chip${S.f===c?" on":""}" data-f="${c}">${l}</button>`).join("")}</div><div id="lst"></div>`}
function paint(){const q=norm(S.q),r=S.rows.filter(x=>(S.f==="todos"||x.status===S.f)&&(!q||norm(x.cliente+x.servico).includes(q))).sort((a,b)=>b.data.localeCompare(a.data));
$("#lst").innerHTML=r.length?`<p class="note" style="margin:0 0 6px">${r.length} lançamento${r.length>1?"s":""}, somando ${brl(r.reduce((s,x)=>s+x.valor,0))}</p>`+r.slice(0,60).map(row).join("")+(r.length>60?`<p class="note">Mostrando 60 de ${r.length}. Use a busca para ver os outros.</p>`:""):'<p class="note">Nada encontrado com esse filtro.</p>'}

function ana(){const A=agg(),t=A.t,tot=A.tot||1,p=t.pago/tot*100,q=p+t.pendente/tot*100,sm=A.sv[0][1],cm=A.cl[0][1].v;
return `<h1>Análises</h1><section><h2>Situação da carteira</h2><div class="panel sit"><div class="donut" style="--g:conic-gradient(var(--ok) 0 ${p}%,var(--warn) ${p}% ${q}%,var(--bad) ${q}% 100%)" role="img" aria-label="${A.ad.toFixed(0)}% em dia"><div><b>${A.ad.toFixed(0)}%</b><small>em dia</small></div></div>
<ul>${["pago","pendente","atrasado"].map(s=>`<li><span><i class="d ${s}"></i>${s==="pago"?"Recebido":LBL[s]}</span><b>${brl(t[s])}</b></li>`).join("")}</ul></div></section>
<div class="g2"><section class="sec"><h2>Quanto cada serviço fatura</h2><div class="panel">${A.sv.map(([l,v])=>hb(l,v,sm,"var(--brand)")).join("")}</div></section>
<section class="sec"><h2>Clientes que mais pesam</h2><div class="panel">${A.cl.slice(0,6).map(([l,c])=>hb(l,c.v,cm,"var(--brand)",c.a?`<small>${brl(c.a)} em atraso</small>`:"")).join("")}</div></section></div>`}

function imp(){const r=S.rep;return `<h1>Importar planilha</h1><label class="drop" id="drop" for="file"><span class="st brand">${ic("up",24)}</span><b>Escolha o arquivo</b><small>Excel (.xlsx, .xls) ou CSV. Você também pode arrastar para cá.</small></label>
${S.err?`<div class="panel err" role="alert">${E(S.err)}</div>`:""}
${r&&!S.demo?`<section class="sec"><h2>Última importação</h2><div class="panel"><b>${E(S.nome)}</b><div class="res"><div><b>${S.rows.length}</b><span>importados</span></div><div><b>${r.dup}</b><span>repetidos</span></div><div><b>${r.bad.length}</b><span>com problema</span></div></div>${r.bad.length?`<p class="note">Valor ou data inválidos nas linhas ${r.bad.slice(0,10).join(", ")}${r.bad.length>10?" e outras":""}. Elas ficaram de fora.</p>`:""}</div><div class="acts"><a class="btn" href="#inicio">Ver o painel</a></div></section>`:""}
<section class="sec"><h2>Como preparar a planilha</h2><div class="panel"><p class="note" style="margin:0 0 14px">Use estes títulos na primeira linha. A ordem não importa.</p><dl class="cols"><dt>Valor</dt><dd>Obrigatório. Aceita 1234,56 e 1.234,56.</dd><dt>Vencimento</dt><dd>Obrigatório. Formato 31/12/2026 ou data do Excel.</dd><dt>Cliente</dt><dd>Nome ou empresa.</dd><dt>Serviço</dt><dd>O que foi vendido.</dd><dt>Status</dt><dd>Pago, A vencer ou Atrasado.</dd><dt>ID</dt><dd>Opcional. Serve para ignorar linhas repetidas.</dd></dl></div>
<p class="note">Seus dados ficam só neste aparelho. Nada é enviado para servidor.</p>
<div class="acts"><button class="btn g" data-act="demo">Ver dados de exemplo</button><button class="btn g" data-act="limpar">Apagar dados deste aparelho</button></div></section>`}

function render(){const v=S.view,h=!S.rows.length&&v!=="importar"?empty():({inicio:home,lancamentos:list,analises:ana,importar:imp})[v]();
$("#app").innerHTML=h;$("#sub").textContent=S.rows.length?S.nome:"Sem dados";$("#tag").hidden=!S.demo;
$$(".dock a").forEach(a=>a.classList.toggle("on",a.hash==="#"+v));
if(v==="lancamentos"&&S.rows.length){paint();$("#q").oninput=e=>{S.q=e.target.value;paint()};$$("[data-f]").forEach(b=>b.onclick=()=>{S.f=b.dataset.f;render()})}
const d=$("#drop");if(d){d.ondragover=e=>e.preventDefault();d.ondrop=e=>{e.preventDefault();onFile(e.dataTransfer.files[0])}}}

function onFile(f){if(!f)return;const r=new FileReader();r.onload=()=>{try{
if(typeof XLSX==="undefined")throw Error("A biblioteca de planilhas não carregou. Verifique a conexão e tente de novo.");
let wb;if(/\.csv$/i.test(f.name)){let t=new TextDecoder("utf-8").decode(r.result);if(t.includes("\ufffd"))t=new TextDecoder("windows-1252").decode(r.result);wb=XLSX.read(t,{type:"string",raw:true})}else wb=XLSX.read(r.result,{type:"array"});
let best=[];wb.SheetNames.forEach(n=>{const j=XLSX.utils.sheet_to_json(wb.Sheets[n],{defval:""});if(temColunas(j)&&j.length>best.length)best=j});
if(!best.length)throw Error("Não encontrei uma aba com as colunas Valor e Vencimento.");
const R=ingest(best);if(R.erro)throw Error(R.erro);if(!R.out.length)throw Error("Nenhuma linha válida. Confira valores e datas.");
Object.assign(S,{rows:R.out,nome:f.name,demo:false,rep:R.rep,err:""});save()}catch(e){S.err=e.message||"Não foi possível ler o arquivo."}
render()};r.readAsArrayBuffer(f)}
$("#file").onchange=e=>{onFile(e.target.files[0]);e.target.value=""};
document.addEventListener("click",e=>{const b=e.target.closest("[data-act]");if(!b)return;
if(b.dataset.act==="demo"){Object.assign(S,{rows:demo(),nome:"Dados de exemplo",demo:true,rep:null,err:""});save();location.hash="inicio"}
else{Object.assign(S,{rows:[],nome:"",demo:false,rep:null,err:""});save()}render()});

function route(){const h=location.hash.slice(1);S.view=["inicio","lancamentos","analises","importar"].includes(h)?h:"inicio";render();scrollTo(0,0)}
$("#logo").innerHTML=ic("trend",22);
$("#dock").innerHTML=[["inicio","home","Início"],["lancamentos","list","Lançamentos"],["analises","chart","Análises"],["importar","up","Importar"]].map(([h,i,l])=>`<a href="#${h}" aria-label="${l}"${h==="importar"?' class="up"':""}>${ic(i,22)}<span>${l}</span></a>`).join("");
addEventListener("hashchange",route);route();
