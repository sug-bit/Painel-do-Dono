const $=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s);
const E=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);
const nf=new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}),brl=n=>nf.format(n);
const kk=n=>n>=1e6?(n/1e6).toFixed(1).replace(".",",")+" mi":n>=1e3?(n/1e3).toFixed(1).replace(".",",")+" mil":String(Math.round(n));
const k=n=>"R$ "+kk(n),fd=d=>d.split("-").reverse().join("/"),sum=o=>o.pago+o.pendente+o.atrasado;
const norm=s=>String(s).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]/g,"");
const TD=new Date().toLocaleDateString("sv-SE"),sgn=x=>x.tipo==="saida",P2=n=>String(n).padStart(2,"0"),addm=(ym,d)=>{const[y,m]=ym.split("-").map(Number),t=new Date(y,m-1+d,1);return t.getFullYear()+"-"+P2(t.getMonth()+1)},dm=(ym,dd)=>{const[y,m]=ym.split("-").map(Number);return ym+"-"+P2(Math.min(+dd,new Date(y,m,0).getDate()))};
function autoMes(){const ms=[...new Set(S.rows.map(x=>x.data.slice(0,7)))].sort(),c=TD.slice(0,7);S.mes=ms.includes(c)?c:ms[ms.length-1]||c}
const LBL={pago:"Pago",pendente:"A receber",atrasado:"Em atraso"},SI={pago:"ok",pendente:"clock",atrasado:"warn"};
const AL={id:["idtransacao","id","codigo","lancamento"],cliente:["cliente","empresa","razaosocial","nome","conta","fornecedor","beneficiario","favorecido"],cnpj:["cnpj","cpfcnpj","documento"],servico:["servico","descricao","produto","categoria","grupo"],valor:["valor","valortotal","total"],data:["datavencimento","vencimento","data"],status:["status","situacao","pago","paga","pagamento","quitado"],tipo:["tipo","natureza"]};
const P={left:'<path d="M15 5l-7 7 7 7"/>',right:'<path d="M9 5l7 7-7 7"/>',plus:'<path d="M12 5v14M5 12h14"/>',home:'<path d="M3 11l9-8 9 8M5 10v10h14V10"/>',list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',up:'<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',find:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',warn:'<path d="M12 3l10 18H2zM12 10v5M12 18h.01"/>',ok:'<path d="M5 12l5 5 9-10"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',trend:'<path d="M3 17l6-6 4 4 8-9"/>',file:'<path d="M6 3h8l4 4v14H6zM14 3v4h4"/>'};
const ic=(n,s=20)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]}</svg>`;

function num(v){if(typeof v==="number")return v;let s=String(v).replace(/[R$\s]/g,"");if(s.includes(","))s=s.replace(/\./g,"").replace(",",".");return s?Number(s):NaN}
function iso(v){let y,m,d;if(typeof v==="number"&&v>20000)return new Date(Math.round((v-25569)*864e5)).toISOString().slice(0,10);
const s=String(v).trim(),x=s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/),z=s.match(/^(\d{4})-(\d{2})-(\d{2})/);
if(x){d=+x[1];m=+x[2];y=+x[3];if(y<100)y+=2000}else if(z){y=+z[1];m=+z[2];d=+z[3]}else return null;
if(m<1||m>12||d<1||d>31)return null;return y+"-"+String(m).padStart(2,"0")+"-"+String(d).padStart(2,"0")}
function stt(v){const s=norm(v);return /^(pag|receb|liquid|quit|sim|ok|true|verdadeiro|x$|s$|1$)/.test(s)?"pago":/^(atras|venc|inadim)/.test(s)?"atrasado":"pendente"}

function demo(){let s=11;const R=()=>(s=s*16807%2147483647)/2147483647,
C=["Studio Aurora","Mercearia Boa Vista","Clínica Vitta","Oficina Torres","Café Lumiar","Construtora Delta","Pet Nativa","Escola Brisa","Grupo Ápia","Ótica Foco"],
V=["Consultoria contábil","Folha de pagamento","Abertura de empresa","BPO financeiro","Planejamento tributário"],o=[];
for(let i=0;i<70;i++){const off=Math.round(-150+i*2.5+R()*4),d=new Date();d.setDate(d.getDate()+off);const late=off<0&&R()<(off>-45?.3:.06);
o.push({id:"L"+(1001+i),cliente:C[Math.floor(R()*C.length)],servico:V[Math.floor(R()*V.length)],valor:Math.round((250+R()*R()*6200)*100)/100,data:d.toLocaleDateString("sv-SE"),status:off>0?"pendente":late?"atrasado":"pago",tipo:"entrada"})}
const G=[["Aluguel",2800],["Energia e internet",640],["Fornecedores",1900],["Marketing",780],["Impostos",1350],["Pró-labore",3500]];
for(let m=-5;m<=0;m++)G.forEach(([c,v],j)=>{const d=new Date();d.setMonth(d.getMonth()+m,5+j*4);const z=d.toLocaleDateString("sv-SE");o.push({id:"S"+(m+5)+j,cliente:c,servico:j%2?"Despesa variável":"Despesa fixa",valor:Math.round(v*(.9+R()*.25)*100)/100,data:z,status:z>TD?"pendente":"pago",tipo:"saida"})});return o}

const temColunas=j=>{const h=Object.keys(j[0]||{}).map(norm);return h.some(x=>AL.valor.includes(x))&&h.some(x=>AL.data.includes(x))};
function ingest(rows,forca){const keys=Object.keys(rows[0]||{}),m={};for(const c in AL)m[c]=keys.find(h=>AL[c].includes(norm(h)));
if(!m.valor||!m.data)return{erro:"Não encontrei as colunas Valor e Vencimento. Confira os títulos na primeira linha da planilha."};
const seen=new Set(),out=[],bad=[];let dup=0;
rows.forEach((r,i)=>{let v=num(r[m.valor]);const d=iso(r[m.data]);if(!(Math.abs(v)>0)||!d){bad.push(i+2);return}const tp0=(m.tipo&&/^(sai|desp|gast|custo)/.test(norm(r[m.tipo])))||(!m.tipo&&v<0)?"saida":"entrada",tp=m.tipo?tp0:(v<0?(forca==="entrada"?"saida":"entrada"):(forca||"saida"));v=Math.abs(v);
const id=m.id&&r[m.id]!==""?String(r[m.id]):"L"+(i+1);if(m.id&&seen.has(id)){dup++;return}seen.add(id);
out.push({id,cliente:String(r[m.cliente]||r[m.cnpj]||r[m.servico]||"").trim()||"Sem identificação",servico:String(r[m.servico]||"").trim()||"Outros",tipo:tp,valor:v,data:d,status:stt(m.status?r[m.status]:"")})});
return{out,rep:{dup,bad}}}

const K="painel-do-dono:v2";let S={rows:[],nome:"",demo:true,rep:null,err:"",f:"todos",q:"",view:"inicio",mes:"",msg:"",conf:0};
try{const j=JSON.parse(localStorage.getItem(K));if(j&&j.rows)Object.assign(S,j)}catch(e){}
if(!S.rows.length&&S.demo){S.rows=demo();S.nome="Dados de exemplo"}
const fix=()=>S.rows.forEach(x=>{if(x.status==="pendente"&&x.data<TD)x.status="atrasado"});fix();autoMes();
const save=()=>{try{localStorage.setItem(K,JSON.stringify({rows:S.rows,nome:S.nome,demo:S.demo,rep:S.rep}))}catch(e){}};

function agg(){const t={pago:0,pendente:0,atrasado:0},s={pago:0,pendente:0,atrasado:0},sv={},cl={},gs={},mo={};
S.rows.forEach(x=>{const e=!sgn(x),m=x.data.slice(0,7),o=mo[m]||(mo[m]={e:0,s:0});o[e?"e":"s"]+=x.valor;if(S.mes&&m!==S.mes)return;(e?t:s)[x.status]+=x.valor;
if(e){sv[x.servico]=(sv[x.servico]||0)+x.valor;const c=cl[x.cliente]||(cl[x.cliente]={v:0,a:0});c.v+=x.valor;if(x.status==="atrasado")c.a+=x.valor}else gs[x.servico]=(gs[x.servico]||0)+x.valor});
const due=t.pago+t.atrasado;return{t,s,mo,saldo:t.pago-s.pago,tot:sum(t),ad:due?t.pago/due*100:100,sv:Object.entries(sv).sort((a,b)=>b[1]-a[1]),gs:Object.entries(gs).sort((a,b)=>b[1]-a[1]),cl:Object.entries(cl).sort((a,b)=>b[1].v-a[1].v)}}
const row=x=>{const sg=sgn(x),ab=x.status!=="pago";return `<div class="row"><button class="st ${x.status}" data-pay="${E(x.id)}" aria-label="${ab?"Marcar como pago":"Desfazer pagamento"}: ${E(x.cliente)}">${ic(SI[x.status],20)}</button><button class="rb" data-id="${E(x.id)}"><div class="m"><b>${E(x.cliente)}</b><small>${E(x.servico)}${ab?`<span class="vh"> ${sg&&x.status==="pendente"?"A pagar":LBL[x.status]}</span>`:""}</small></div><div class="r"><b>${sg?"−":""}${brl(x.valor)}</b><small>${fd(x.data)}</small></div></button></div>`};
const mbar=()=>{if(!S.rows.length||!["inicio","lancamentos","analises"].includes(S.view))return"";const l=S.mes?(t=>t[0].toUpperCase()+t.slice(1))(new Date(+S.mes.slice(0,4),+S.mes.slice(5)-1,1).toLocaleDateString("pt-BR",{month:"long",year:"numeric"}).replace(" de "," ")):"Todos os meses";
return `<div class="mb"><button data-mv="-1" aria-label="Mês anterior"${S.mes?"":" disabled"}>${ic("left",18)}</button><button class="ml" data-act="todos" title="Alternar entre um mês e todos">${l}</button><button data-mv="1" aria-label="Próximo mês"${S.mes?"":" disabled"}>${ic("right",18)}</button></div>`};
const hb=(l,v,mx,c,extra="")=>`<div class="hb"><div><span>${E(l)}</span><b>${brl(v)}</b></div><i><u style="width:${v/mx*100}%;background:${c}"></u></i>${extra}</div>`;
const mes=m=>new Date(+m.slice(0,4),+m.slice(5,7)-1,1).toLocaleDateString("pt-BR",{month:"short"}).replace(".","");
const empty=()=>`<div class="empty"><span class="st brand">${ic("file",22)}</span><h1>Nenhum dado ainda</h1><p>Importe uma planilha do Excel para ver o resumo do seu dinheiro.</p><a class="btn" href="#importar">Importar planilha</a></div>`;

function home(){const A=agg(),old=S.mes?S.rows.filter(x=>x.status==="atrasado"&&x.data.slice(0,7)<S.mes):[],t=A.t,s=A.s,ap=s.pendente+s.atrasado,late=A.cl.filter(c=>c[1].a>0).sort((a,b)=>b[1].a-a[1].a),lead=A.sv[0],
ms=Object.keys(A.mo).sort().slice(-6),mx=Math.max(1,...ms.map(m=>Math.max(A.mo[m].e,A.mo[m].s)));
const seg=[["pago","#7ee2a8","Recebido"],["pendente","#ffd36e","A receber"],["atrasado","#ff8f7a","Em atraso"]];
const ins=[["trend","brand",`Entraram ${brl(t.pago)} e saíram ${brl(s.pago)}. Ainda há ${brl(t.pendente+t.atrasado)} para receber.`],
old.length?["warn","warn",`${old.length} lançamento${old.length>1?"s":""} de meses anteriores segue${old.length>1?"m":""} em atraso, somando ${brl(old.reduce((q,x)=>q+x.valor,0))}. Toque em “Todos os meses” para ver.`]:null,
ap>0?["clock","brand",`Há ${brl(ap)} para pagar${s.atrasado?`, sendo ${brl(s.atrasado)} já vencidos`:""}.`]:null,
t.atrasado>0?["warn","warn",`${brl(t.atrasado)} estão em atraso, de ${late.length} cliente${late.length>1?"s":""}. O maior valor é de ${E(late[0][0])}.`]:t.pago?["ok","ok","Nenhuma receita em atraso."]:null,
lead?["chart","brand",`${E(lead[0])} é o que mais entra: ${(lead[1]/A.tot*100).toFixed(0)}% das receitas.`]:null].filter(Boolean);
const bars=ms.map(m=>{const o=A.mo[m];return `<div class="col"><div class="plot"><div class="pair" title="Entradas ${brl(o.e)}, saídas ${brl(o.s)}"><i class="e" style="height:${o.e/mx*100}%"></i><i class="s" style="height:${o.s/mx*100}%"></i></div></div><small>${mes(m)}</small></div>`}).join("");
const lt=S.rows.filter(x=>x.status==="atrasado").sort((a,b)=>b.valor-a.valor).slice(0,4);
return `<div class="g2"><div><section class="hero"><div class="t"><span>${S.mes?"Saldo do mês":"Saldo em caixa"}</span><span>${A.ad.toFixed(0)}% em dia</span></div><div class="big">${brl(A.saldo)}</div>
<p class="hl">Suas receitas</p><div class="strip" role="img" aria-label="Proporção entre recebido, a receber e em atraso">${seg.map(([q,c])=>t[q]?`<i style="flex:${t[q]};background:${c}"></i>`:"").join("")}</div>
<div class="leg">${seg.map(([q,c,l])=>`<div><span><em style="background:${c}"></em>${l}</span><b>${k(t[q])}</b></div>`).join("")}</div>
<p class="hn">Já saíram ${brl(s.pago)}. Falta pagar ${brl(ap)}.</p></section>
<section class="sec"><h2>O que chama atenção</h2>${ins.map(i=>`<div class="ins"><span class="st ${i[1]}">${ic(i[0],20)}</span><p>${i[2]}</p></div>`).join("")}</section></div>
<div><section class="sec"><h2>Entradas e saídas por mês</h2><div class="panel"><div class="bars">${bars}</div><div class="lg"><span><i class="d pago"></i>Entradas</span><span><i class="d atrasado"></i>Saídas</span></div></div></section>
${lt.length?`<section class="sec"><h2>Maiores valores em atraso</h2>${lt.map(row).join("")}</section>`:""}</div></div>`}

function list(){return `<h1>Lançamentos</h1><div class="search">${ic("find",18)}<input id="q" placeholder="Buscar cliente ou serviço" value="${E(S.q)}" aria-label="Buscar"></div>
<div class="chips">${[["todos","Todos"],["entrada","Entradas"],["saida","Saídas"],["aberto","Em aberto"]].map(([c,l])=>`<button class="chip${S.f===c?" on":""}" data-f="${c}">${l}</button>`).join("")}</div>${S.mes?`<button class="btn g sm" data-act="copiar">Trazer contas do mês anterior</button>`:""}<p class="note" style="margin:0 0 8px">Toque no ícone à esquerda para marcar como pago.</p>${S.msg?`<p class="note" role="status">${S.msg}</p>`:""}<div id="lst"></div>`}
function paint(){const q=norm(S.q),r=S.rows.filter(x=>(!S.mes||x.data.startsWith(S.mes))&&(S.f==="todos"||(S.f==="aberto"?x.status!=="pago":S.f==="entrada"?!sgn(x):sgn(x)))&&(!q||norm(x.cliente+x.servico).includes(q))).sort((a,b)=>S.mes?a.data.localeCompare(b.data):b.data.localeCompare(a.data));
$("#lst").innerHTML=r.length?`<p class="note" style="margin:0 0 6px">${r.length} lançamento${r.length>1?"s":""}, resultado de ${brl(r.reduce((s,x)=>s+(sgn(x)?-x.valor:x.valor),0))}</p>`+r.slice(0,60).map(row).join("")+(r.length>60?`<p class="note">Mostrando 60 de ${r.length}. Use a busca para ver os outros.</p>`:""):'<p class="note">Nada encontrado com esse filtro.</p>'}

function ana(){const A=agg(),t=A.t,tot=A.tot||1,p=t.pago/tot*100,q=p+t.pendente/tot*100,sm=(A.sv[0]||[0,1])[1],cm=(A.cl[0]||[0,{v:1}])[1].v,gm=(A.gs[0]||[0,1])[1];
return `<h1>Análises</h1><section><h2>Situação das receitas</h2><div class="panel sit"><div class="donut" style="--g:conic-gradient(var(--ok) 0 ${p}%,var(--warn) ${p}% ${q}%,var(--bad) ${q}% 100%)" role="img" aria-label="${A.ad.toFixed(0)}% em dia"><div><b>${A.ad.toFixed(0)}%</b><small>em dia</small></div></div>
<ul>${["pago","pendente","atrasado"].map(s=>`<li><span><i class="d ${s}"></i>${s==="pago"?"Recebido":LBL[s]}</span><b>${brl(t[s])}</b></li>`).join("")}</ul></div></section>
<div class="g2">${A.sv.length?`<section class="sec"><h2>Quanto cada serviço fatura</h2><div class="panel">${A.sv.map(([l,v])=>hb(l,v,sm,"var(--brand)")).join("")}</div></section>`:""}
${A.gs.length?`<section class="sec"><h2>Para onde o dinheiro vai</h2><div class="panel">${A.gs.map(([l,v])=>hb(l,v,gm,"var(--bad)")).join("")}</div></section>`:""}
${A.cl.length?`<section class="sec"><h2>Clientes que mais pesam</h2><div class="panel">${A.cl.slice(0,6).map(([l,c])=>hb(l,c.v,cm,"var(--brand)",c.a?`<small>${brl(c.a)} em atraso</small>`:"")).join("")}</div></section>`:""}</div>`}

function imp(){const r=S.rep;return `<h1>Importar e backup</h1>${S.msg?`<p class="note" role="status">${S.msg}</p>`:""}<label class="drop" id="drop" for="file"><span class="st brand">${ic("up",24)}</span><b>Escolha o arquivo</b><small>Excel (.xlsx, .xls) ou CSV. Você também pode arrastar para cá.</small></label><label class="f">Esta planilha tem<select id="tp"><option value="saida">Contas a pagar (saídas)</option><option value="entrada">Valores a receber (entradas)</option></select></label>${!S.demo&&S.rows.length?`<label class="chk"><input type="checkbox" id="merge"> Somar aos lançamentos que já tenho</label>`:""}
${S.err?`<div class="panel err" role="alert">${E(S.err)}</div>`:""}
${r&&!S.demo?`<section class="sec"><h2>Última importação</h2><div class="panel"><b>${E(S.nome)}</b><div class="res"><div><b>${S.rows.length}</b><span>importados</span></div><div><b>${r.dup}</b><span>repetidos</span></div><div><b>${r.bad.length}</b><span>com problema</span></div></div>${r.bad.length?`<p class="note">Valor ou data inválidos nas linhas ${r.bad.slice(0,10).join(", ")}${r.bad.length>10?" e outras":""}. Elas ficaram de fora.</p>`:""}</div><div class="acts"><a class="btn" href="#inicio">Ver o painel</a></div></section>`:""}
<section class="sec"><h2>Como preparar a planilha</h2><div class="panel"><p class="note" style="margin:0 0 14px">Use estes títulos na primeira linha. A ordem não importa.</p><dl class="cols"><dt>Valor</dt><dd>Obrigatório. Aceita 1234,56 e 1.234,56.</dd><dt>Vencimento</dt><dd>Obrigatório. Formato 31/12/2026 ou data do Excel.</dd><dt>Cliente</dt><dd>Nome ou empresa.</dd><dt>Serviço</dt><dd>O que foi vendido.</dd><dt>Status</dt><dd>Pago, A vencer ou Atrasado.</dd><dt>Tipo</dt><dd>Opcional. Entrada ou Saída. Valor negativo também conta como saída.</dd><dt>ID</dt><dd>Opcional. Serve para ignorar linhas repetidas.</dd></dl></div>
${S.rows.length?`<h2 style="margin-top:26px">Levar seus dados</h2><div class="acts" style="margin-top:0"><button class="btn g" data-act="xlsx">Baixar planilha Excel</button><button class="btn g" data-act="backup">Baixar backup</button><label class="btn g" for="rest">Restaurar backup</label></div><p class="note">Faça um backup de vez em quando: os dados ficam só neste aparelho.</p>`:""}<p class="note">Nada é enviado para servidor.</p>
<div class="acts"><button class="btn g" data-act="demo">Ver dados de exemplo</button><button class="btn g" data-act="limpar">${S.conf?"Toque de novo para apagar tudo":"Apagar dados deste aparelho"}</button></div></section>`}

function render(){const v=S.view,h=!S.rows.length&&v!=="importar"?empty():({inicio:home,lancamentos:list,analises:ana,importar:imp})[v]();
$("#app").innerHTML=mbar()+h;S.msg="";$("#sub").textContent=S.rows.length?S.nome:"Sem dados";$("#tag").hidden=!S.demo;
$$(".dock a").forEach(a=>a.classList.toggle("on",a.hash==="#"+v));
if(v==="lancamentos"&&S.rows.length){paint();$("#q").oninput=e=>{S.q=e.target.value;paint()};$$("[data-f]").forEach(b=>b.onclick=()=>{S.f=b.dataset.f;render()})}
const d=$("#drop");if(d){d.ondragover=e=>e.preventDefault();d.ondrop=e=>{e.preventDefault();onFile(e.dataTransfer.files[0])}}}

function onFile(f){if(!f)return;const r=new FileReader();r.onload=()=>{try{
if(typeof XLSX==="undefined")throw Error("A biblioteca de planilhas não carregou. Verifique a conexão e tente de novo.");
let wb;if(/\.csv$/i.test(f.name)){let t=new TextDecoder("utf-8").decode(r.result);if(t.includes("\ufffd"))t=new TextDecoder("windows-1252").decode(r.result);wb=XLSX.read(t,{type:"string",raw:true})}else wb=XLSX.read(r.result,{type:"array"});
let best=[];wb.SheetNames.forEach(n=>{const j=XLSX.utils.sheet_to_json(wb.Sheets[n],{defval:""});if(temColunas(j)&&j.length>best.length)best=j});
if(!best.length)throw Error("Não encontrei uma aba com as colunas Valor e Vencimento.");
const R=ingest(best,$("#tp")?$("#tp").value:"");if(R.erro)throw Error(R.erro);if(!R.out.length)throw Error("Nenhuma linha válida. Confira valores e datas.");
const ant=$("#merge")&&$("#merge").checked&&!S.demo?S.rows:[];Object.assign(S,{rows:ant.concat(R.out),nome:ant.length?"Planilhas e lançamentos":f.name,demo:false,rep:R.rep,err:""});fix();autoMes();save()}catch(e){S.err=e.message||"Não foi possível ler o arquivo."}
render()};r.readAsArrayBuffer(f)}
$("#file").onchange=e=>{onFile(e.target.files[0]);e.target.value=""};
document.addEventListener("click",e=>{const T=e.target,b=T.closest("[data-act]"),p=T.closest("[data-pay]"),r=T.closest(".rb[data-id]"),m=T.closest("[data-mv]");
if(p){const x=S.rows.find(y=>y.id===p.dataset.pay);if(x){x.status=x.status==="pago"?"pendente":"pago";fix();save();render()}return}
if(r){const x=S.rows.find(y=>y.id===r.dataset.id);if(x)openForm(x);return}
if(m){S.mes=addm(S.mes||TD.slice(0,7),+m.dataset.mv);render();return}
if(!b)return;const a=b.dataset.act;
if(a==="demo"){Object.assign(S,{rows:demo(),nome:"Dados de exemplo",demo:true,rep:null,err:""});autoMes();save();location.hash="inicio"}
else if(a==="limpar"){if(!S.conf){S.conf=1}else{Object.assign(S,{rows:[],nome:"",demo:false,rep:null,err:"",conf:0});autoMes();save()}}
else if(a==="todos"){if(S.mes)S.mes="";else autoMes()}
else if(a==="copiar")copiar();
else if(a==="xlsx")exportXlsx();
else if(a==="backup")backup();
render()});

function copiar(){if(!S.mes)return;const p=addm(S.mes,-1),ex=new Set(S.rows.filter(x=>x.data.startsWith(S.mes)).map(x=>x.tipo+x.cliente+x.servico));let n=0;
S.rows.filter(x=>x.data.startsWith(p)&&!ex.has(x.tipo+x.cliente+x.servico)).forEach(x=>{const{g,...y}=x;S.rows.push({...y,id:"M"+Date.now()+"c"+n++,data:dm(S.mes,x.data.slice(8)),status:"pendente"})});
fix();save();S.msg=n?n+" lançamento"+(n>1?"s":"")+" trazido"+(n>1?"s":"")+" do mês anterior, em aberto.":"Nada novo para trazer: as contas do mês anterior já estão neste mês."}
function exportXlsx(){try{if(typeof XLSX==="undefined")throw 0;const d=s=>{const[y,m,z]=s.split("-").map(Number);return new Date(y,m-1,z)},T={pago:"Pago",pendente:"A vencer",atrasado:"Atrasado"};
const ws=XLSX.utils.aoa_to_sheet([["Tipo","Cliente","Serviço","Valor","Vencimento","Status","ID"],...S.rows.map(x=>[sgn(x)?"Saída":"Entrada",x.cliente,x.servico,x.valor,d(x.data),T[x.status],x.id])],{cellDates:true});
S.rows.forEach((x,i)=>{ws["D"+(i+2)].z="#,##0.00";ws["E"+(i+2)].z="dd/mm/yyyy"});ws["!cols"]=[8,26,24,12,13,11,14].map(w=>({wch:w}));
const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Lançamentos");XLSX.writeFile(wb,"painel-do-dono-"+TD+".xlsx",{cellDates:true});S.msg="Planilha gerada. Ela pode ser importada de volta quando quiser."}catch(e){S.err="Não foi possível gerar a planilha neste ambiente."}}
function backup(){try{const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify({v:2,nome:S.nome,rows:S.rows})],{type:"application/json"}));a.download="painel-do-dono-backup-"+TD+".json";document.body.appendChild(a);a.click();a.remove();S.msg="Backup gerado."}catch(e){S.err="Não foi possível gerar o backup neste ambiente."}}
$("#rest").onchange=e=>{const f=e.target.files[0];e.target.value="";if(!f)return;const r=new FileReader();r.onload=()=>{try{const j=JSON.parse(r.result);if(!Array.isArray(j.rows))throw 0;
const ok=j.rows.filter(x=>x&&x.id&&typeof x.valor==="number"&&/^\d{4}-\d{2}-\d{2}$/.test(x.data)&&["pago","pendente","atrasado"].includes(x.status)).map(x=>({...x,cliente:String(x.cliente||"Sem identificação"),servico:String(x.servico||"Outros"),tipo:x.tipo==="saida"?"saida":"entrada"}));if(!ok.length)throw 0;
Object.assign(S,{rows:ok,nome:j.nome||"Backup restaurado",demo:false,rep:null,err:""});fix();autoMes();save();S.msg="Backup restaurado: "+ok.length+" lançamentos."}catch(x){S.err="Esse arquivo não parece um backup do Painel do Dono."}render()};r.readAsText(f)};
function route(){S.conf=0;const h=location.hash.slice(1);S.view=["inicio","lancamentos","analises","importar"].includes(h)?h:"inicio";render();scrollTo(0,0)}
function openForm(x){const f=$("#frm"),n=!x;S.edit=x?x.id:null;$("#dt").textContent=n?"Novo lançamento":"Editar lançamento";
f.tipo.value=x?x.tipo||"entrada":"entrada";f.cliente.value=x?x.cliente:"";f.servico.value=x?x.servico:"";f.valor.value=x?x.valor:"";f.data.value=x?x.data:TD;f.status.value=x&&x.status==="pago"?"pago":"pendente";
$("#del").hidden=n;$("#repw").hidden=!n;$("#dall").hidden=!(x&&x.g);f.rep.value="1";S.eg=x&&x.g?[x.g,x.data]:null;$("#dn").hidden=!(S.demo&&n);
$("#cats").innerHTML=[...new Set(S.rows.map(r=>r.servico))].slice(0,40).map(c=>`<option value="${E(c)}">`).join("");$("#dlg").showModal()}
$("#frm").onsubmit=e=>{e.preventDefault();const f=e.target,v=Math.abs(parseFloat(f.valor.value));if(!(v>0))return;
if(S.demo){S.rows=[];S.demo=false;S.nome="Meus lançamentos";S.rep=null}
const o={tipo:f.tipo.value,cliente:f.cliente.value.trim(),servico:f.servico.value.trim()||"Outros",valor:v,data:f.data.value,status:f.status.value},i=S.rows.findIndex(r=>r.id===S.edit);
if(i>=0)S.rows[i]={...S.rows[i],...o};else{const n=+f.rep.value||1,g=n>1?"G"+Date.now():null;for(let j=0;j<n;j++)S.rows.push({id:"M"+Date.now()+"_"+j,...o,...(g?{g}:{}),data:j?dm(addm(o.data.slice(0,7),j),o.data.slice(8)):o.data,status:j?"pendente":o.status})}
S.nome=S.nome||"Meus lançamentos";S.mes=o.data.slice(0,7);fix();save();$("#dlg").close();render()};
$("#cx").onclick=()=>$("#dlg").close();
$("#del").onclick=()=>{S.rows=S.rows.filter(r=>r.id!==S.edit);save();$("#dlg").close();render()};
$("#fab").onclick=()=>openForm();
$("#dall").onclick=()=>{const[g,d]=S.eg;S.rows=S.rows.filter(r=>!(r.g===g&&r.data>=d));save();$("#dlg").close();render()};
$("#fab").innerHTML=ic("plus",26);
$("#logo").innerHTML=ic("trend",22);
$("#dock").innerHTML=[["inicio","home","Início"],["lancamentos","list","Lançamentos"],["analises","chart","Análises"],["importar","up","Importar"]].map(([h,i,l])=>`<a href="#${h}" aria-label="${l}"${h==="importar"?' class="up"':""}>${ic(i,22)}<span>${l}</span></a>`).join("");
addEventListener("hashchange",route);route();
try{if("serviceWorker"in navigator&&location.protocol.startsWith("http"))navigator.serviceWorker.register("sw.js").catch(()=>{})}catch(e){}
