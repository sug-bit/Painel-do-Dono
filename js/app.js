const $=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s);
const E=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);
const nf=new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}),brl=n=>nf.format(n);
const kk=n=>n>=1e6?(n/1e6).toFixed(1).replace(".",",")+" mi":n>=1e3?(n/1e3).toFixed(1).replace(".",",")+" mil":String(Math.round(n));
const k=n=>"R$ "+kk(n),fd=d=>d.split("-").reverse().join("/"),sum=o=>o.pago+o.pendente+o.atrasado;
const norm=s=>String(s).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]/g,"");
const TD=new Date().toLocaleDateString("sv-SE"),sgn=x=>x.tipo==="saida",P2=n=>String(n).padStart(2,"0");
const addm=(ym,d)=>{const[y,m]=ym.split("-").map(Number),t=new Date(y,m-1+d,1);return t.getFullYear()+"-"+P2(t.getMonth()+1)};

const LBL={pago:"Pago",pendente:"A receber",atrasado:"Em atraso"},SI={pago:"ok",pendente:"clock",atrasado:"warn"};
const P={left:'<path d="M15 5l-7 7 7 7"/>',right:'<path d="M9 5l7 7-7 7"/>',home:'<path d="M3 11l9-8 9 8M5 10v10h14V10"/>',list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',up:'<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',find:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',warn:'<path d="M12 3l10 18H2zM12 10v5M12 18h.01"/>',ok:'<path d="M5 12l5 5 9-10"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',trend:'<path d="M3 17l6-6 4 4 8-9"/>',bank:'<path d="M3 10l9-6 9 6M5 10v8M10 10v8M14 10v8M19 10v8M3 20h18"/>',sync:'<path d="M21 2v6h-6M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>'};
const ic=(n,s=20)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${P[n]}</svg>`;

// ESTADO GLOBAL
const K="painel-do-dono:v9";
let S={rows:[], urlNuvem:"", cliente:"", view:"inicio", mes:"", f:"todos", q:"", err:""};
try{const j=JSON.parse(localStorage.getItem(K));if(j)Object.assign(S,j)}catch(e){}
const save=()=>{try{localStorage.setItem(K,JSON.stringify({rows:S.rows,urlNuvem:S.urlNuvem,cliente:S.cliente}))}catch(e){}};

// ==========================================
// O CÉREBRO HÍBRIDO (LÊ MATRIZ E TABELA PLANA)
// ==========================================
function parseSpreadsheetUniversal(json) {
    const rows = [];
    let idCounter = 0;
    const anoAtual = new Date().getFullYear().toString();

    let isMatriz = false;
    let headerRowIndex = -1;
    let colunasMeses = {}; 

    const nomesMeses = {"jan":"01","fev":"02","mar":"03","abr":"04","mai":"05","jun":"06","jul":"07","ago":"08","set":"09","out":"10","nov":"11","dez":"12"};

    // Tenta detectar se é matriz (meses nas colunas)
    for (let i = 0; i < Math.min(15, json.length); i++) {
        const row = json[i];
        let mesesEncontrados = 0;
        for (let j = 0; j < row.length; j++) {
            const cell = norm(String(row[j] || ""));
            for (const [key, val] of Object.entries(nomesMeses)) {
                if (cell === key || cell.startsWith(key)) { colunasMeses[j] = val; mesesEncontrados++; break; }
            }
        }
        if (mesesEncontrados >= 3) { isMatriz = true; headerRowIndex = i; break; }
    }

    if (isMatriz) {
        let currentSection = "Variável";
        for (let i = headerRowIndex + 1; i < json.length; i++) {
            const row = json[i];
            if (!row || row.length === 0) continue;
            const textoLinha = norm(row.join(" "));
            if (textoLinha.includes("receita")) currentSection = "Receita";
            else if (textoLinha.includes("fixa")) currentSection = "Fixa";
            else if (textoLinha.includes("variavel")) currentSection = "Variável";
            else if (textoLinha.includes("investimento")) currentSection = "Investimento";
            else if (textoLinha.includes("credito") || textoLinha.includes("cartao")) currentSection = "Crédito";
            if (textoLinha.includes("total")) continue;

            let minColMes = Math.min(...Object.keys(colunasMeses).map(Number));
            let descricao = "Sem descrição";
            for(let c = 0; c < minColMes; c++) { if(row[c] && String(row[c]).trim() !== "") descricao = String(row[c]).trim(); }

            for (const [colIndexStr, mesNum] of Object.entries(colunasMeses)) {
                let valor = row[colIndexStr];
                if (typeof valor === "string") valor = parseFloat(valor.replace(/[R$\s]/g,"").replace(/\./g,"").replace(",","."));
                if (typeof valor === "number" && valor > 0) {
                    rows.push({
                        id: `MAT_${idCounter++}`, data: `${anoAtual}-${mesNum}-05`, valor: valor,
                        tipo: currentSection === "Receita" ? "entrada" : "saida",
                        nat: currentSection, cliente: descricao, status: "pago"
                    });
                }
            }
        }
    } else {
        if(json.length === 0) return [];
        const keys = Object.keys(json[0]);
        const findKey = (terms) => keys.find(k => terms.some(t => norm(k).includes(t)));
        const mapData = findKey(["data", "vencimento"]), mapValor = findKey(["valor", "total"]);
        const mapTipo = findKey(["tipo", "entrada", "saida"]), mapCat = findKey(["categoria", "natureza"]);
        const mapDesc = findKey(["descricao", "cliente", "nome", "historico"]), mapStatus = findKey(["status", "situacao"]);

        if(!mapData || !mapValor) throw new Error("Não encontrei as colunas de Data e Valor.");

        rows.push(...json.map((row, i) => {
            let v = row[mapValor];
            if(typeof v === "string") v = parseFloat(v.replace(/[R$\s]/g,"").replace(/\./g,"").replace(",","."));
            let tp = mapTipo ? norm(row[mapTipo]) : "saida";
            if(tp.includes("entrada") || tp.includes("receita")) tp = "entrada"; else tp = "saida";
            let st = mapStatus ? norm(row[mapStatus]) : "pendente";
            if(st.includes("pago") || st.includes("receb")) st = "pago"; else st = "pendente";
            return {
                id: "L" + i, data: iso(row[mapData]), valor: Math.abs(v), tipo: tp,
                nat: mapCat ? row[mapCat] : "Variável", cliente: row[mapDesc] || "Sem descrição", status: st
            };
        }).filter(x => x.valor > 0));
    }
    return rows;
}

// ==========================================
// SINCRONIZAÇÃO E SETUP
// ==========================================
async function conectarPlanilha(url) {
    try {
        // Verifica se o ícone existe antes de tentar animar (evita o erro na tela inicial)
        const icon = document.getElementById('sync-icon');
        if (icon) icon.style.animation = 'spin 1s linear infinite';
        
        const res = await fetch(url + "&nocache=" + Date.now());
        const text = await res.text();
        
        if (text.includes("<!DOCTYPE html>")) {
            throw new Error("O link não é um CSV válido. No Google Sheets, vá em 'Arquivo > Compartilhar > Publicar na Web' e escolha o formato CSV.");
        }
        
        const wb = XLSX.read(text, {type: 'string'});
        let sheetName = wb.SheetNames.find(n => n.toLowerCase().includes("monique")) || wb.SheetNames[0];
        const json = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {header: 1, defval: ""});
        
        const novasRows = parseSpreadsheetUniversal(json);
        if (novasRows.length === 0) throw new Error("Nenhum dado válido encontrado na planilha.");

        S.rows = novasRows;
        S.urlNuvem = url;
        save();
        location.hash = "inicio";
        
        if (icon) icon.style.animation = ''; // Remove a animação
    } catch(e) {
        S.err = "Erro ao conectar: " + e.message;
        render();
    }
}

function salvarDadosCliente() {
    const nome = $("#inp-cliente").value.trim();
    const url = $("#inp-url").value.trim();
    if(!nome || !url) return alert("Preencha o nome e o link.");
    
    S.cliente = nome;
    conectarPlanilha(url);
}

async function atualizarDados() {
    if(!S.urlNuvem) return alert("Nenhuma planilha conectada.");
    await conectarPlanilha(S.urlNuvem);
}

// ==========================================
// AGREGAÇÃO DE DADOS E INTERFACE
// ==========================================
function agg(){
    const t={pago:0,pendente:0,atrasado:0},s={...t};
    let fixas=0, variaveis=0, prevencao=0, credito=0, investimento=0;
    S.rows.forEach(x=>{
        const e=!sgn(x),m=x.data.slice(0,7);
        if(S.mes && m!==S.mes) return;
        const cat = norm(x.nat||"");
        if(e) t[x.status] += x.valor;
        else {
            s[x.status] += x.valor;
            if(cat.includes("fixa")) fixas += x.valor;
            else if(cat.includes("variavel")) variaveis += x.valor;
            else if(cat.includes("prevencao")) prevencao += x.valor;
            else if(cat.includes("credito")) credito += x.valor;
            else if(cat.includes("investimento")) investimento += x.valor;
            else variaveis += x.valor;
        }
    });
    const totalReceitas = sum(t), totalGastos = sum(s) - investimento;
    const livre = totalReceitas - totalGastos - investimento;
    return {t, s, totalReceitas, totalGastos, fixas, variaveis, prevencao, credito, investimento, livre};
}

const row=x=>{const sg=sgn(x),ab=x.status!=="pago";return `<div class="row"><button class="st ${x.status}" data-pay="${E(x.id)}">${ic(SI[x.status],20)}</button><div class="rb"><div class="m"><b>${E(x.cliente)}</b><small style="color:var(--mute); text-transform: capitalize;">${E(x.nat)}</small></div><div class="r"><b>${sg?"−":""}${brl(x.valor)}</b><small>${fd(x.data)}</small></div></div></div>`};
const mbar=()=>{if(!S.rows.length||!["inicio","lancamentos","analises","investimentos"].includes(S.view))return"";const l=S.mes?(t=>t[0].toUpperCase()+t.slice(1))(new Date(+S.mes.slice(0,4),+S.mes.slice(5)-1,1).toLocaleDateString("pt-BR",{month:"long",year:"numeric"}).replace(" de "," ")):"Todos os meses";return `<div class="mb"><button data-mv="-1"${S.mes?"":" disabled"}>${ic("left",18)}</button><button class="ml" data-act="todos">${l}</button><button data-mv="1"${S.mes?"":" disabled"}>${ic("right",18)}</button></div>`};

function home(){
    const A=agg();
    const eq=[["Receitas", A.totalReceitas],["(-) Despesas Fixas", A.fixas],["(-) Despesas Variáveis", A.variaveis],["(-) Prevenção", A.prevencao],["(-) Crédito", A.credito]];
    return `<div class="g2"><div>
<section class="hero liquidez-box">
  <div class="t"><span>Liquidez Real Projetada</span><span>${S.mes ? S.mes : "Total"}</span></div>
  <div class="big" style="color:${A.livre>=0?'#7ee2a8':'#ff8a73'}">${brl(A.livre)}</div>
  <div class="eq">${eq.map(([l,v])=>`<div><span>${l}</span><b>${brl(v)}</b></div>`).join("")}</div>
</section>
<section class="sec"><h2>Distribuição</h2><div class="nums">
  <div class="panel"><small>Receitas</small><b class="pos">${brl(A.totalReceitas)}</b></div>
  <div class="panel"><small>Despesas Totais</small><b class="neg">${brl(A.totalGastos)}</b></div>
  <div class="panel w1"><small>Investimentos</small><b style="color:var(--brand)">${brl(A.investimento)}</b></div>
</div></section></div>
<div>
<section class="sec"><h2>Despesas Fixas</h2>
<div class="panel"><div class="sh"><b>${brl(A.fixas)}</b></div>${S.rows.filter(x=>sgn(x)&&norm(x.nat).includes("fixa")&&(!S.mes||x.data.startsWith(S.mes))).slice(0,5).map(row).join("")}</div>
</section>
<section class="sec"><h2>Prevenção e Crédito</h2>
<div class="panel"><div class="sh"><b>${brl(A.prevencao + A.credito)}</b></div>${S.rows.filter(x=>sgn(x)&&(norm(x.nat).includes("prevencao")||norm(x.nat).includes("credito"))&&(!S.mes||x.data.startsWith(S.mes))).slice(0,5).map(row).join("")}</div>
</section>
</div></div>`;
}

function inv(){
    const A=agg();
    return `<h1>Investimentos</h1>
    <div class="nums">
        <div class="panel w1"><small>Total Investido</small><b style="color:var(--brand)">${brl(A.investimento)}</b></div>
        <div class="panel"><small>Sobra Livre</small><b class="${A.livre>=0?'pos':'neg'}">${brl(A.livre)}</b></div>
    </div>
    <section class="sec"><h2>Aportes</h2>
    <div class="panel">${S.rows.filter(x=>norm(x.nat).includes("investimento")&&(!S.mes||x.data.startsWith(S.mes))).map(row).join("") || '<p class="note">Sem aportes neste mês.</p>'}</div>
    </section>`;
}

function list(){return `<h1>Lançamentos</h1><div class="search"><input id="q" placeholder="Buscar lançamento" value="${E(S.q)}"></div><div id="lst"></div>`}
function paint(){const q=norm(S.q),r=S.rows.filter(x=>(!S.mes||x.data.startsWith(S.mes))&&(!q||norm(x.cliente+x.nat).includes(q))).sort((a,b)=>b.data.localeCompare(a.data));$("#lst").innerHTML=r.length?r.slice(0,60).map(row).join(""):'<p class="note">Nada encontrado.</p>'}

function ana(){
    const A=agg();
    const maxG = Math.max(A.fixas, A.variaveis, A.prevencao, A.credito, 1);
    return `<h1>Análises</h1>
    <section><h2>Para onde o dinheiro vai</h2><div class="panel">
    ${hb("Despesas Fixas", A.fixas, maxG, "#ef4444")}
    ${hb("Despesas Variáveis", A.variaveis, maxG, "#f59e0b")}
    ${hb("Prevenção", A.prevencao, maxG, "#3b82f6")}
    ${hb("Crédito", A.credito, maxG, "#8b5cf6")}
    </div></section>`;
}
const hb=(l,v,mx,c)=>`<div class="hb"><div><span>${E(l)}</span><b>${brl(v)}</b></div><i><u style="width:${v/mx*100}%;background:${c}"></u></i></div>`;

function setup(){
    return `<div class="empty" style="padding-top:20px;">
        <div class="st brand" style="width:64px;height:64px;border-radius:20px;margin-bottom:16px;">${ic("trend",32)}</div>
        <h1 style="margin:0;">Bem-vindo ao Painel</h1>
        <p style="color:var(--mute); max-width:40ch; margin:10px auto 30px;">Conecte a sua planilha do Google Sheets (formato CSV) para que o aplicativo monte o seu dashboard automaticamente.</p>
    </div>
    <div class="panel" style="max-width:500px; margin:0 auto; border-top:4px solid var(--brand);">
        <label class="f">Seu nome ou Empresa</label>
        <input type="text" id="inp-cliente" placeholder="Ex: Monique, Escritório Alpha..." style="width:100%; padding:12px; border-radius:8px; border:1px solid var(--line); background:var(--bg); color:var(--ink); margin-bottom:12px;">
        
        <label class="f">Link da Planilha (Publicar na Web > CSV)</label>
        <input type="text" id="inp-url" placeholder="https://docs.google.com/spreadsheets/d/e/.../pub?output=csv" style="width:100%; padding:12px; border-radius:8px; border:1px solid var(--line); background:var(--bg); color:var(--ink); margin-bottom:16px;">
        
        <button class="btn" onclick="salvarDadosCliente()" style="width:100%; font-size:16px; padding:16px;">🚀 Conectar e Iniciar</button>
        ${S.err?`<p style="color:var(--bad); margin-top:12px; font-size:14px;">${E(S.err)}</p>`:""}
    </div>`;
}

// ==========================================
// RENDERIZAÇÃO E ROTEAMENTO
// ==========================================
function render(){
    const v=S.view;
    
    // Se não tem URL conectada e o usuário não está na tela de setup, força o setup
    if(!S.urlNuvem && v !== "importar") { location.hash = "importar"; return; }

    let h;
    if(!S.urlNuvem) {
        h = setup();
    } else {
        h = ({inicio:home,lancamentos:list,analises:ana,investimentos:inv,importar:setup})[v]();
    }

    $("#app").innerHTML = mbar() + h;
    $("#sub").textContent = S.cliente ? `Painel de ${S.cliente}` : "Gestão Financeira";
    
    // Esconde o dock se estiver no setup inicial
    $("#dock").style.display = S.urlNuvem ? "flex" : "none";
    
    $$(".dock a").forEach(a=>a.classList.toggle("on",a.hash==="#"+v));
    if(v==="lancamentos"&&S.rows.length){paint();$("#q").oninput=e=>{S.q=e.target.value;paint()}}
}

document.addEventListener("click",e=>{
    const p=e.target.closest("[data-pay]"),m=e.target.closest("[data-mv]"),b=e.target.closest("[data-act]");
    if(p){const x=S.rows.find(y=>y.id===p.dataset.pay);if(x){x.status = x.status==="pago"?"pendente":"pago";save();render()}return}
    if(m){S.mes=addm(S.mes||TD.slice(0,7),+m.dataset.mv);render();return}
    if(b && b.dataset.act==="todos"){if(S.mes)S.mes="";else S.mes=TD.slice(0,7); render();}
});

$("#logo").innerHTML=ic("trend",22);
$("#dock").innerHTML=[["inicio","home","Início"],["lancamentos","list","Lançamentos"],["analises","chart","Análises"],["investimentos","bank","Investimentos"]].map(([h,i,l])=>`<a href="#${h}">${ic(i,22)}<span>${l}</span></a>`).join("");

function route(){
    const h=location.hash.slice(1);
    S.view=["inicio","lancamentos","analises","investimentos","importar"].includes(h)?h:"inicio";
    render();
    scrollTo(0,0);
}
addEventListener("hashchange",route);
route();