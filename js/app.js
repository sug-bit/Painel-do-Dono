const $=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s);
const E=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);
const nf=new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}),brl=n=>nf.format(n);
const kk=n=>n>=1e6?(n/1e6).toFixed(1).replace(".",",")+" mi":n>=1e3?(n/1e3).toFixed(1).replace(".",",")+" mil":String(Math.round(n));
const k=n=>"R$ "+kk(n),fd=d=>d.split("-").reverse().join("/"),sum=o=>o.pago+o.pendente+o.atrasado;
const norm=s=>String(s).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]/g,"");
const TD=new Date().toLocaleDateString("sv-SE"),sgn=x=>x.tipo==="saida",P2=n=>String(n).padStart(2,"0");
const addm=(ym,d)=>{const[y,m]=ym.split("-").map(Number),t=new Date(y,m-1+d,1);return t.getFullYear()+"-"+P2(t.getMonth()+1)};

// ==============================================================
// COLE AQUI O SEU LINK GERADO NO GOOGLE SHEETS (PUBLICAR NA WEB - CSV)
// ==============================================================
const URL_NUVEM = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS5osAzdTkM1nyCXQg8WWxITtCqGzKg0TVnjsBOSB2KkJfNgW_-ZM_j6DjXc3rm4424emqzsmhgwt4i/pub?output=csv"; 

const LBL={pago:"Pago",pendente:"A receber",atrasado:"Em atraso"},SI={pago:"ok",pendente:"clock",atrasado:"warn"};
const P={left:'<path d="M15 5l-7 7 7 7"/>',right:'<path d="M9 5l7 7-7 7"/>',home:'<path d="M3 11l9-8 9 8M5 10v10h14V10"/>',list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',up:'<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',find:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',warn:'<path d="M12 3l10 18H2zM12 10v5M12 18h.01"/>',ok:'<path d="M5 12l5 5 9-10"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',trend:'<path d="M3 17l6-6 4 4 8-9"/>',bank:'<path d="M3 10l9-6 9 6M5 10v8M10 10v8M14 10v8M19 10v8M3 20h18"/>',sync:'<path d="M21 2v6h-6M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>'};
const ic=(n,s=20)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]}</svg>`;

function iso(v){
    if(typeof v==="number"&&v>20000) return new Date(Math.round((v-25569)*864e5)).toISOString().slice(0,10);
    const s=String(v).trim();
    const x=s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/);
    const z=s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if(x){let d=+x[1],m=+x[2],y=+x[3];if(y<100)y+=2000;return y+"-"+String(m).padStart(2,"0")+"-"+String(d).padStart(2,"0")}
    if(z) return z[1]+"-"+z[2]+"-"+z[3];
    return TD;
}

const K="painel-do-dono:v6";let S={rows:[],nome:"",err:"",f:"todos",q:"",view:"inicio",mes:"",msg:"",contas:[{id:"c1",nome:"Conta Principal",tipo:"corrente",saldo:0}]};
try{const j=JSON.parse(localStorage.getItem(K));if(j&&j.rows)Object.assign(S,j)}catch(e){}
const save=()=>{try{localStorage.setItem(K,JSON.stringify({rows:S.rows,nome:S.nome,contas:S.contas}))}catch(e){}};
const disp=()=>S.contas.reduce((q,c)=>q+c.saldo,0);

// --- MOTOR DE LEITURA (CSV NUVEM E EXCEL LOCAL) ---
function parseDados(json) {
    if(!json.length) throw new Error("Planilha vazia.");
    const keys = Object.keys(json[0]);
    const findKey = (terms) => keys.find(k => terms.some(t => norm(k).includes(t)));
    
    const mapData = findKey(["data", "vencimento"]);
    const mapValor = findKey(["valor", "total"]);
    const mapTipo = findKey(["tipo", "entrada", "saida"]);
    const mapCat = findKey(["categoria", "natureza", "grupo"]);
    const mapDesc = findKey(["descricao", "cliente", "nome", "historico"]);
    const mapStatus = findKey(["status", "situacao"]);

    if(!mapData || !mapValor) throw new Error("A planilha precisa ter colunas 'Data' e 'Valor'.");

    return json.map((row, i) => {
        let v = row[mapValor];
        if(typeof v === "string") v = parseFloat(v.replace(/[R$\s]/g,"").replace(/\./g,"").replace(",","."));
        let tp = mapTipo ? norm(row[mapTipo]) : "saida";
        if(tp.includes("entrada") || tp.includes("receita")) tp = "entrada"; else tp = "saida";
        let cat = mapCat ? row[mapCat] : "Variável";
        let st = mapStatus ? norm(row[mapStatus]) : "pendente";
        if(st.includes("pago") || st.includes("receb")) st = "pago"; else st = "pendente";

        return {
            id: "L" + Date.now() + "_" + i,
            data: iso(row[mapData]),
            valor: Math.abs(v),
            tipo: tp,
            nat: cat,
            cliente: row[mapDesc] || "Sem descrição",
            status: st,
            conta: "c1"
        };
    }).filter(x => x.valor > 0);
}

// 1. Sincronizar com a Nuvem (Google Sheets / OneDrive)
async function sincronizarNuvem(silencioso = false) {
    if(!URL_NUVEM || URL_NUVEM === "COLE_O_LINK_DO_GOOGLE_SHEETS_AQUI") {
        if(!silencioso) alert("Configure o link da nuvem no código primeiro.");
        return;
    }
    try {
        if(!silencioso) document.getElementById('sync-icon').style.animation = 'spin 1s linear infinite';
        
        // Evita cache do navegador para pegar sempre a versão mais nova
        const res = await fetch(URL_NUVEM + "&nocache=" + Date.now());
        const text = await res.text();
        
        // Usa o SheetJS para ler o CSV
        const wb = XLSX.read(text, {type: 'string'});
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, {defval: ""});
        
        S.rows = parseDados(json);
        S.nome = "Nuvem Sincronizada";
        S.err = "";
        save();
        render();
        
        if(!silencioso) alert("Dados sincronizados com sucesso!");
    } catch(e) {
        S.err = "Erro ao sincronizar: " + e.message;
        render();
    } finally {
        if(!silencioso) document.getElementById('sync-icon').style.animation = '';
    }
}

// 2. Leitura de arquivo manual (Fallback)
async function onFile(f){
    if(!f)return;
    try {
        const data = await f.arrayBuffer();
        const wb = XLSX.read(data, {type: 'array', cellDates: false});
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, {defval: ""});
        
        S.rows = parseDados(json); S.nome = f.name; S.err = "";
        save(); location.hash = "inicio";
    } catch(e) {
        S.err = "Erro: " + e.message; render();
    }
}
$("#file").onchange=e=>{onFile(e.target.files[0]);e.target.value=""};

// --- FUNÇÕES DE AGREGAÇÃO ---
function agg(){
    const t={pago:0,pendente:0,atrasado:0},s={...t};
    let fixas={pago:0,pendente:0,atrasado:0}, variaveis={pago:0,pendente:0,atrasado:0}, 
        prevencao={pago:0,pendente:0,atrasado:0}, credito={pago:0,pendente:0,atrasado:0}, 
        investimento={pago:0,pendente:0,atrasado:0};
    S.rows.forEach(x=>{
        const e=!sgn(x),m=x.data.slice(0,7);
        if(S.mes && m!==S.mes) return;
        const cat = norm(x.nat||""), st = x.status;
        if(e) t[st] += x.valor;
        else {
            s[st] += x.valor;
            if(cat.includes("fixa")) fixas[st] += x.valor;
            else if(cat.includes("variavel")) variaveis[st] += x.valor;
            else if(cat.includes("prevencao")) prevencao[st] += x.valor;
            else if(cat.includes("credito")) credito[st] += x.valor;
            else if(cat.includes("investimento")) investimento[st] += x.valor;
            else variaveis[st] += x.valor;
        }
    });
    return {
        t, s, totalReceitas: sum(t), totalGastos: sum(s), totalInvestimentos: sum(investimento),
        totalFixas: sum(fixas), totalVariaveis: sum(variaveis), totalPrevencao: sum(prevencao), totalCredito: sum(credito),
        cx: disp(), aReceber: t.pendente + t.atrasado, aPagar: s.pendente + s.atrasado, 
        livre: disp() + (t.pendente + t.atrasado) - (s.pendente + s.atrasado)
    };
}

// --- INTERFACE VISUAL ---
const row=x=>{const sg=sgn(x),ab=x.status!=="pago";return `<div class="row"><button class="st ${x.status}" data-pay="${E(x.id)}">${ic(SI[x.status],20)}</button><button class="rb"><div class="m"><b>${E(x.cliente)}</b><small>${E(x.nat||"")}</small></div><div class="r"><b>${sg?"−":""}${brl(x.valor)}</b><small>${fd(x.data)}</small></div></button></div>`};
const hb=(l,v,mx,c)=>`<div class="hb"><div><span>${E(l)}</span><b>${brl(v)}</b></div><i><u style="width:${v/mx*100}%;background:${c}"></u></i></div>`;
const mbar=()=>{if(!S.rows.length||!["inicio","lancamentos","analises","investimentos"].includes(S.view))return"";const l=S.mes?(t=>t[0].toUpperCase()+t.slice(1))(new Date(+S.mes.slice(0,4),+S.mes.slice(5)-1,1).toLocaleDateString("pt-BR",{month:"long",year:"numeric"}).replace(" de "," ")):"Todos os meses";return `<div class="mb"><button data-mv="-1"${S.mes?"":" disabled"}>${ic("left",18)}</button><button class="ml" data-act="todos">${l}</button><button data-mv="1"${S.mes?"":" disabled"}>${ic("right",18)}</button></div>`};

function home(){
    const A=agg();
    const eq=[["Saldo em conta", A.cx],["(+) A receber", A.aReceber],["(-) Contas Fixas", A.totalFixas],["(-) Contas Variáveis", A.totalVariaveis],["(-) Prevenção", A.totalPrevencao],["(-) Crédito", A.totalCredito]];
    return `<div class="g2"><div>
<section class="hero liquidez-box">
  <div class="t"><span>Liquidez Real Projetada</span><span>Nuvem</span></div>
  <div class="big" style="color:${A.livre>=0?'var(--ok)':'var(--bad)'}">${brl(A.livre)}</div>
  <div class="eq">${eq.map(([l,v])=>`<div><span>${l}</span><b>${brl(v)}</b></div>`).join("")}</div>
</section>
<section class="sec"><h2>Distribuição do Mês</h2><div class="nums">
  <div class="panel"><small>Receitas</small><b class="pos">${brl(A.totalReceitas)}</b></div>
  <div class="panel"><small>Despesas Totais</small><b class="neg">${brl(A.totalGastos)}</b></div>
  <div class="panel"><small>Investimentos</small><b style="color:var(--brand)">${brl(A.totalInvestimentos)}</b></div>
</div></section></div>
<div><section class="sec"><h2>Gastos Fixos</h2><div class="panel"><div class="sh"><b>${brl(A.totalFixas)}</b></div>${S.rows.filter(x=>sgn(x)&&norm(x.nat).includes("fixa")&&(!S.mes||x.data.startsWith(S.mes))).map(row).join("") || '<p class="note">Sem dados.</p>'}</div></section></div></div>`;
}

function inv(){
    const A=agg();
    return `<h1>Investimentos</h1><div class="nums">
        <div class="panel w1"><small>Total Investido no Mês</small><b style="color:var(--brand)">${brl(A.totalInvestimentos)}</b></div>
        <div class="panel"><small>Saldo em Conta</small><b>${brl(A.cx)}</b></div>
        <div class="panel"><small>Livre para Investir</small><b class="${A.livre>=0?'pos':'neg'}">${brl(A.livre)}</b></div>
    </div>`;
}

function list(){return `<h1>Lançamentos</h1><div class="search">${ic("find",18)}<input id="q" placeholder="Buscar" value="${E(S.q)}"></div><div id="lst"></div>`}
function paint(){const q=norm(S.q),r=S.rows.filter(x=>(!S.mes||x.data.startsWith(S.mes))&&(!q||norm(x.cliente+x.nat).includes(q))).sort((a,b)=>b.data.localeCompare(a.data));$("#lst").innerHTML=r.length?r.slice(0,60).map(row).join(""):'<p class="note">Nada encontrado.</p>'}

function ana(){const A=agg();return `<h1>Análises</h1><section><h2>Para onde o dinheiro vai</h2><div class="panel">${hb("Fixas", A.totalFixas, A.totalGastos, "#ef4444")}${hb("Variáveis", A.totalVariaveis, A.totalGastos, "#f59e0b")}${hb("Prevenção", A.totalPrevencao, A.totalGastos, "#3b82f6")}${hb("Crédito", A.totalCredito, A.totalGastos, "#8b5cf6")}${hb("Investimentos", A.totalInvestimentos, A.totalGastos + A.totalInvestimentos, "#10b981")}</div></section>`}

function imp(){
    return `<h1>Sincronização</h1>
    <div class="panel" style="margin-bottom:20px; border-left: 4px solid var(--brand); text-align: center;">
        <h3 style="margin-bottom: 8px;">Nuvem Conectada</h3>
        <p class="note" style="margin-bottom: 16px;">Puxe as últimas alterações feitas na sua planilha do Google Sheets.</p>
        <button class="btn" onclick="sincronizarNuvem()" style="width:100%; font-size: 16px; padding: 16px;">
            <span id="sync-icon">${ic("sync",20)}</span> Puxar Alterações da Nuvem
        </button>
    </div>
    <div class="panel">
        <h3>Importação Manual (Backup)</h3>
        <p class="note">Se preferir, arraste um arquivo Excel local.</p>
        <label class="drop" id="drop" for="file" style="margin-top:12px;"><span class="st brand">${ic("up",24)}</span><b>Arraste Excel/CSV</b></label>
    </div>
    ${S.err?`<div class="panel err" style="margin-top:16px; color:var(--bad)">${E(S.err)}</div>`:""}
    `;
}

function render(){
    const v=S.view;
    const h=!S.rows.length&&v!=="importar"?'<div class="empty"><h1>Sem dados</h1><a class="btn" href="#importar">Sincronizar</a></div>':({inicio:home,lancamentos:list,analises:ana,investimentos:inv,importar:imp})[v]();
    $("#app").innerHTML=mbar()+h;
    $("#sub").textContent = S.rows.length ? S.nome : "Aguardando Sincronização";
    $$(".dock a").forEach(a=>a.classList.toggle("on",a.hash==="#"+v));
    if(v==="lancamentos"&&S.rows.length){paint();$("#q").oninput=e=>{S.q=e.target.value;paint()}}
    const d=$("#drop");if(d){d.ondragover=e=>e.preventDefault();d.ondrop=e=>{e.preventDefault();onFile(e.dataTransfer.files[0])}}
}

document.addEventListener("click",e=>{
    const p=e.target.closest("[data-pay]"),m=e.target.closest("[data-mv]"),b=e.target.closest("[data-act]");
    if(p){const x=S.rows.find(y=>y.id===p.dataset.pay);if(x){x.status = x.status==="pago"?"pendente":"pago";save();render()}return}
    if(m){S.mes=addm(S.mes||TD.slice(0,7),+m.dataset.mv);render();return}
    if(b && b.dataset.act==="todos"){if(S.mes)S.mes="";else S.mes=TD.slice(0,7); render();}
});

$("#fab").style.display = "none";
$("#logo").innerHTML=ic("trend",22);
$("#dock").innerHTML=[["inicio","home","Início"],["lancamentos","list","Lançamentos"],["analises","chart","Análises"],["investimentos","bank","Investimentos"],["importar","sync","Nuvem"]].map(([h,i,l])=>`<a href="#${h}"${h==="importar"?' class="up"':""}>${ic(i,22)}<span>${l}</span></a>`).join("");

function route(){
    const h=location.hash.slice(1);
    S.view=["inicio","lancamentos","analises","investimentos","importar"].includes(h)?h:"inicio";
    render();
    // Se a pessoa entrar no app e tiver a URL configurada, ele puxa os dados sozinho!
    if(S.view === "inicio" && URL_NUVEM !== "COLE_O_LINK_DO_GOOGLE_SHEETS_AQUI") {
        sincronizarNuvem(true); // true = silencioso (não mostra alerta)
    }
    scrollTo(0,0);
}
addEventListener("hashchange",route);route();