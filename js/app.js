"use strict";
// Painel do Dono: o app é a fonte da verdade. Os dados ficam no aparelho (localStorage),
// a planilha serve para importar e exportar. A lógica pura está em js/dados.js.
const $ = s => document.querySelector(s), $$ = s => document.querySelectorAll(s);
const D = window.Dados;
const E = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const brl = n => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
const brl0 = n => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(n);
const hoje = () => new Date().toLocaleDateString("sv-SE"); // função: não congela se o app ficar aberto na virada do dia
const fd = d => d.split("-").reverse().join("/");
const rel = d => { const n = Math.round((new Date(d + "T00:00") - new Date(hoje() + "T00:00")) / 864e5); return n === 0 ? "Hoje" : n === 1 ? "Amanhã" : n === -1 ? "Ontem" : n < 0 ? `${-n} dias atrás` : n < 8 ? `em ${n} dias` : fd(d); };
const sum = o => o.pago + o.pendente + o.atrasado;
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const mesLabel = ym => MESES[+ym.slice(5) - 1] + " " + ym.slice(0, 4);
const uid = () => "x" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const GRUPOS_PLANILHA = [["Receita", "Receitas"], ["Fixa", "Despesas fixas"], ["Variável", "Despesas variáveis"], ["Prevenção", "Prevenção"], ["Crédito", "Cartão e crédito"], ["Investimento", "Investimentos"]];

const P = {
  left: '<path d="M15 5l-7 7 7 7"/>', right: '<path d="M9 5l7 7-7 7"/>',
  home: '<path d="M3 11l9-8 9 8M5 10v10h14V10"/>', list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', ok: '<path d="M5 12l5 5 9-10"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', warn: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>',
  trend: '<path d="M3 17l6-6 4 4 8-9"/>', grid: '<path d="M3 4h18v16H3zM3 10h18M3 15h18M9 4v16M15 4v16"/>',
  data: '<path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16"/>', plus: '<path d="M12 5v14M5 12h14"/>',
  file: '<path d="M6 3h8l4 4v14H6zM14 3v4h4"/>', gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>', cash: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>'
};
const ic = (n, s = 20) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]}</svg>`;
const SI = { pago: "ok", pendente: "clock", atrasado: "warn" };
const SL = { pago: "Pago", pendente: "Em aberto", atrasado: "Em atraso" };

// ---------- estado e armazenamento ----------
const K = "painel-do-dono:v12", K_OLD = "painel-do-dono:v11";
const S = { rows: [], cliente: "", iniciou: false, view: "inicio", mes: hoje().slice(0, 7), ano: +hoje().slice(0, 4), q: "", filtro: "todos", lim: 60, relat: null, impModo: "somar", impTipo: "saida" };

function garantirIds(rows) {
  const vistos = new Set();
  return rows.map(r => { if (!r.id || vistos.has(r.id)) r.id = uid(); vistos.add(r.id); return r; });
}
function save() {
  try { localStorage.setItem(K, JSON.stringify({ rows: S.rows, cliente: S.cliente, iniciou: S.iniciou })); return true; }
  catch (e) { toast("Não foi possível salvar neste aparelho (armazenamento cheio ou bloqueado)."); return false; }
}
(function carregar() {
  let migrou = false;
  try {
    let j = JSON.parse(localStorage.getItem(K) || "null");
    if (!j) { const o = JSON.parse(localStorage.getItem(K_OLD) || "null"); if (o) { j = { rows: o.rows, cliente: o.cliente, iniciou: true }; migrou = true; } }
    if (j) {
      S.rows = garantirIds((Array.isArray(j.rows) ? j.rows : []).map(D.clean).filter(Boolean));
      S.cliente = String(j.cliente || "").slice(0, 60);
      S.iniciou = !!j.iniciou || S.rows.length > 0;
    }
  } catch (e) { /* dados corrompidos: começa vazio */ }
  if (migrou && save()) { try { localStorage.removeItem(K_OLD); } catch (e) { } }
})();
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => { });

function toast(msg, undo) {
  const t = $("#toast"); t.textContent = msg;
  if (undo) { const b = document.createElement("button"); b.className = "toast-undo"; b.textContent = "Desfazer"; b.onclick = () => { t.hidden = true; undo(); }; t.append(" ", b); }
  t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, undo ? 6000 : 3200);
}

// ---------- cálculos ----------
const noMes = x => !S.mes || x.data.startsWith(S.mes);
function agg() {
  const h = hoje();
  const A = { rec: { pago: 0, pendente: 0, atrasado: 0 }, des: { pago: 0, pendente: 0, atrasado: 0 }, grp: { Fixa: 0, "Variável": 0, "Prevenção": 0, "Crédito": 0, Investimento: 0 }, nAtraso: 0 };
  S.rows.forEach(x => {
    if (!noMes(x)) return;
    const st = D.eff(x, h);
    if (x.tipo === "entrada") A.rec[st] += x.valor;
    else { A.des[st] += x.valor; A.grp[D.catOf(x.nat)] += x.valor; if (st === "atrasado") A.nAtraso++; }
  });
  A.totalRec = sum(A.rec); A.totalDes = sum(A.des);
  A.livre = A.totalRec - A.totalDes;                 // sobra projetada: tudo que entra menos tudo que sai
  A.caixa = A.rec.pago - A.des.pago;                 // o que já aconteceu de fato
  A.aPagar = A.des.pendente + A.des.atrasado;
  A.aReceber = A.rec.pendente + A.rec.atrasado;
  return A;
}
const topo = (rows, chave, n) => {
  const m = new Map(); rows.forEach(x => m.set(chave(x), (m.get(chave(x)) || 0) + x.valor));
  return [...m].sort((a, b) => b[1] - a[1]).slice(0, n);
};

// ---------- componentes ----------
function row(x) {
  const st = D.eff(x, hoje());
  return `<div class="row"><button class="st ${st}" data-pay="${E(x.id)}" aria-label="${x.status === "pago" ? "Marcar como em aberto" : "Marcar como pago"}: ${E(x.cliente)}" title="${SL[st]}">${ic(SI[st], 20)}</button>
<button class="rb" data-edit="${E(x.id)}"><span class="m"><b>${E(x.cliente)}</b><small>${E(x.nat)} · ${SL[st]}</small></span><span class="r"><b class="${x.tipo === "entrada" ? "pos" : ""}">${x.tipo === "saida" ? "−" : "+"}${brl(x.valor)}</b><small>${x.status === "pago" ? fd(x.data) : rel(x.data)}</small></span></button></div>`;
}
function mbar() {
  if (!["inicio", "lancamentos", "analises"].includes(S.view)) return "";
  return `<div class="mb"><button data-mv="-1"${S.mes ? "" : " disabled"} aria-label="Mês anterior">${ic("left", 18)}</button><button class="ml" data-act="todos">${S.mes ? mesLabel(S.mes) : "Todos os meses"}</button><button data-mv="1"${S.mes ? "" : " disabled"} aria-label="Próximo mês">${ic("right", 18)}</button></div>`;
}
const vazio = (txt) => `<div class="empty"><p>${txt}</p><button class="btn" data-act="add">Adicionar lançamento</button></div>`;
const hb = (l, v, mx, c) => `<div class="hb"><div><span>${E(l)}</span><b>${brl(v)}</b></div><i><u style="width:${Math.min(100, v / mx * 100)}%;background:${c}"></u></i></div>`;

// ---------- telas ----------
function onboarding() {
  return `<div class="empty" style="padding-top:20px"><div class="st brand" style="width:64px;height:64px;border-radius:20px;margin-bottom:12px">${ic("trend", 32)}</div>
<h1 style="margin:0">Bem-vindo ao Painel</h1><p>Controle o que entra e o que sai, direto no celular. Escolha como começar:</p></div>
<div class="doors">
<button class="door" data-act="comecar"><span class="st pago">${ic("plus")}</span><span><b>Começar do zero</b><small>Adicione o primeiro lançamento com o botão +</small></span></button>
<button class="door" data-act="ir-importar"><span class="st brand">${ic("file")}</span><span><b>Trazer minha planilha</b><small>Excel ou CSV, em matriz (meses nas colunas) ou lista</small></span></button>
<button class="door" data-act="demo"><span class="st pendente">${ic("chart")}</span><span><b>Ver com dados de exemplo</b><small>Você pode apagar tudo depois</small></span></button>
</div>`;
}

function home() {
  const A = agg();
  if (!S.rows.length) return vazio("Nenhum lançamento ainda.");
  const pct = (a, b) => b > 0 ? Math.min(100, Math.round(a / b * 100)) : 0;
  const cores = { Fixa: "#ef4444", "Variável": "#f59e0b", "Prevenção": "#3b82f6", "Crédito": "#8b5cf6", Investimento: "#10b981" };
  const nomes = { Fixa: "Despesas fixas", "Variável": "Despesas variáveis", "Prevenção": "Prevenção", "Crédito": "Cartão e crédito", Investimento: "Investimentos" };
  const gr = Object.keys(cores).filter(g => A.grp[g] > 0);
  const prox = S.rows.filter(x => noMes(x) && x.status !== "pago").sort((a, b) => a.data.localeCompare(b.data)).slice(0, 6);
  return `<div class="g2"><div>
<section class="hero"><div class="t"><span>Sobra do mês</span><span>${S.mes ? mesLabel(S.mes) : "Todos os meses"}</span></div>
<div class="big" style="color:${A.livre >= 0 ? "#7ee2a8" : "#ff8a73"}">${brl(A.livre)}</div>
<p class="sub">${A.livre >= 0 ? "depois de pagar tudo que está em aberto" : "faltam para cobrir as contas do mês"}</p>
<div class="flow"><div><small>Entra</small><b>${brl(A.totalRec)}</b><i><u style="width:${pct(A.rec.pago, A.totalRec)}%"></u></i><small>falta receber ${brl(A.aReceber)}</small></div>
<div><small>Sai</small><b>${brl(A.totalDes)}</b><i><u style="width:${pct(A.des.pago, A.totalDes)}%"></u></i><small>falta pagar ${brl(A.aPagar)}</small></div></div>
${gr.length ? `<details class="eqd"><summary>Para onde vai o dinheiro</summary><div class="stack">${gr.map(g => `<u style="flex:${A.grp[g]};background:${cores[g]}"></u>`).join("")}</div>
<div class="eq">${gr.map(g => `<div><span><i style="background:${cores[g]}"></i>${nomes[g]}</span><b>${brl(A.grp[g])}</b></div>`).join("")}</div></details>` : ""}</section></div>
<div><section class="sec"><h2>${prox.length ? "Próximos vencimentos" : "Contas do período"}</h2><div class="panel">${prox.length ? prox.map(row).join("") : '<p class="note" style="margin:0">Tudo em dia neste período.</p>'}</div>
<p class="note">Toque no círculo para marcar como pago. Toque na linha para editar.</p></section>
<section class="sec"><div class="nums">
<div class="panel"><small>Em caixa (já pago)</small><b class="${A.caixa >= 0 ? "pos" : "neg"}">${brl(A.caixa)}</b></div>
<div class="panel"><small>Em atraso${A.nAtraso ? " · " + A.nAtraso + (A.nAtraso === 1 ? " conta" : " contas") : ""}</small><b class="${A.des.atrasado ? "neg" : ""}">${brl(A.des.atrasado)}</b></div>
</div></section></div></div>`;
}

function list() {
  const chips = [["todos", "Todos"], ["aberto", "Em aberto"], ["atrasado", "Em atraso"], ["pago", "Pagos"]];
  return `<h1>Lançamentos</h1><div class="search"><input id="q" placeholder="Buscar lançamento" aria-label="Buscar lançamento" value="${E(S.q)}"></div>
<div class="chips">${chips.map(([k, l]) => `<button class="chip${S.filtro === k ? " on" : ""}" data-filtro="${k}">${l}</button>`).join("")}</div>
<div id="lst"></div>
<div class="acts" style="margin-top:16px"><button class="btn ghost" data-act="copiar">Trazer contas do mês anterior</button></div>`;
}
function grupos(rs, h) {
  const tit = { atrasado: "Em atraso", pendente: "A vencer", pago: "Pagos" }; let ult = "", out = "";
  rs.forEach(x => { const st = D.eff(x, h); if (st !== ult) { out += (ult ? "</div>" : "") + `<h2 class="gh2">${tit[st]}</h2><div class="panel">`; ult = st; } out += row(x); });
  return out + "</div>";
}
function paint() {
  const h = hoje(), q = D.norm(S.q);
  const r = S.rows.filter(x => {
    if (!noMes(x)) return false;
    const st = D.eff(x, h);
    if (S.filtro === "aberto" && st === "pago") return false;
    if (S.filtro === "atrasado" && st !== "atrasado") return false;
    if (S.filtro === "pago" && st !== "pago") return false;
    return !q || D.norm(x.cliente + x.nat).includes(q);
  });
  const ord = { atrasado: 0, pendente: 1, pago: 2 };
  r.sort((a, b) => { const sa = ord[D.eff(a, h)], sb = ord[D.eff(b, h)]; return sa - sb || (sa === 2 ? b.data.localeCompare(a.data) : a.data.localeCompare(b.data)); });
  const mais = r.length > S.lim;
  $("#lst").innerHTML = r.length ? `${grupos(r.slice(0, S.lim), h)}${mais ? `<div class="acts"><button class="btn ghost" data-act="mais">Ver mais (${r.length - S.lim})</button></div>` : ""}` : (S.rows.length ? '<p class="note">Nada encontrado neste filtro.</p>' : vazio("Nenhum lançamento ainda."));
}

function plan() {
  const h = hoje(), ano = S.ano, map = {};
  GRUPOS_PLANILHA.forEach(([g]) => map[g] = new Map());
  S.rows.forEach(x => {
    if (!x.data.startsWith(ano + "-")) return;
    const g = D.grp(x), m = +x.data.slice(5, 7);
    if (!map[g].has(x.cliente)) map[g].set(x.cliente, Array.from({ length: 13 }, () => ({ v: 0, rows: [], at: false, ab: false })));
    const c = map[g].get(x.cliente)[m];
    c.v += x.valor; c.rows.push(x);
    const st = D.eff(x, h); if (st === "atrasado") c.at = true; else if (st === "pendente") c.ab = true;
  });
  const tot = { Receita: Array(13).fill(0), saida: Array(13).fill(0) };
  const corpo = GRUPOS_PLANILHA.map(([g, titulo]) => {
    const sub = Array(13).fill(0);
    const linhas = [...map[g]].sort((a, b) => a[0].localeCompare(b[0], "pt-BR")).map(([desc, cs]) => {
      let soma = 0;
      const tds = cs.slice(1).map((c, i) => {
        soma += c.v; sub[i + 1] += c.v;
        const cls = c.v === 0 ? "vz" : c.at ? "at" : c.ab ? "pe" : "";
        return `<td><button class="cell ${cls}" data-cell="1" data-d="${E(desc)}" data-g="${g}" data-m="${i + 1}" aria-label="${E(desc)}, ${MESES[i]}">${c.v ? brl0(c.v) : "·"}</button></td>`;
      }).join("");
      return `<tr><th title="${E(desc)}">${E(desc)}</th>${tds}<td class="t">${brl0(soma)}</td></tr>`;
    }).join("");
    for (let i = 1; i <= 12; i++) { if (g === "Receita") tot.Receita[i] += sub[i]; else tot.saida[i] += sub[i]; }
    return `<tr class="gh"><th colspan="14"><span class="stk">${titulo}</span></th></tr>${linhas}
<tr><th colspan="14"><button class="addl" data-addlinha="${g}">+ linha em ${titulo.toLowerCase()}</button></th></tr>
<tr class="tot"><th>Total</th>${sub.slice(1).map(v => `<td class="t">${brl0(v)}</td>`).join("")}<td class="t">${brl0(sub.reduce((a, b) => a + b, 0))}</td></tr>`;
  }).join("");
  const sobra = tot.Receita.map((v, i) => v - tot.saida[i]);
  return `<h1>Planilha</h1>
<div class="mb"><button data-yv="-1" aria-label="Ano anterior">${ic("left", 18)}</button><button class="ml" disabled>${ano}</button><button data-yv="1" aria-label="Próximo ano">${ic("right", 18)}</button></div>
<div class="tw"><table class="pl"><thead><tr><th>Descrição</th>${MESES.map((m, i) => `<th${ano === +h.slice(0, 4) && i === +h.slice(5, 7) - 1 ? ' class="cur"' : ""}>${m.slice(0, 3)}</th>`).join("")}<th>Ano</th></tr></thead><tbody>${corpo}
<tr class="tot big"><th>Sobra</th>${sobra.slice(1).map(v => `<td class="t ${v < 0 ? "neg" : "pos"}">${brl0(v)}</td>`).join("")}<td class="t ${sobra.reduce((a, b) => a + b, 0) < 0 ? "neg" : "pos"}">${brl0(sobra.reduce((a, b) => a + b, 0))}</td></tr></tbody></table></div>
<p class="note">Toque em um valor para editar. Células vazias (·) criam um lançamento novo. Laranja = em aberto, vermelho = em atraso.</p>`;
}

function ana() {
  const A = agg(), mx = Math.max(...Object.values(A.grp), 1);
  if (!S.rows.length) return `<h1>Análises</h1>${vazio("Adicione lançamentos para ver as análises.")}`;
  const noPer = S.rows.filter(noMes);
  const rec = topo(noPer.filter(x => x.tipo === "entrada"), x => x.nat, 6), maiores = topo(noPer.filter(x => x.tipo === "saida"), x => x.cliente, 6);
  const y = S.mes ? S.mes.slice(0, 4) : String(S.ano), mm = Array.from({ length: 12 }, () => ({ e: 0, s: 0 }));
  S.rows.forEach(x => { if (!x.data.startsWith(y + "-")) return; const m = +x.data.slice(5, 7) - 1; if (x.tipo === "entrada") mm[m].e += x.valor; else mm[m].s += x.valor; });
  const mxa = Math.max(...mm.map(m => Math.max(m.e, m.s)), 1);
  const chart = `<section><h2>Entradas e saídas em ${y}</h2><div class="panel"><div class="yc">${mm.map((m, i) => { const ym = y + "-" + String(i + 1).padStart(2, "0"); return `<button class="yc-m${S.mes === ym ? " on" : ""}" data-ym="${ym}" aria-label="${MESES[i]}: entradas ${brl(m.e)}, saídas ${brl(m.s)}"><span class="bars"><u class="e" style="height:${m.e / mxa * 100}%"></u><u class="s" style="height:${m.s / mxa * 100}%"></u></span><small>${MESES[i][0]}</small></button>`; }).join("")}</div><p class="note">Verde: entradas. Vermelho: saídas. Toque num mês para ver os detalhes dele.</p></div></section>`;
  const mxr = Math.max(...rec.map(r => r[1]), 1), mxm = Math.max(...maiores.map(r => r[1]), 1);
  return `<h1>Análises</h1>${chart}
<section class="sec"><h2>Para onde o dinheiro vai</h2><div class="panel">${hb("Despesas fixas", A.grp.Fixa, mx, "#ef4444")}${hb("Despesas variáveis", A.grp["Variável"], mx, "#f59e0b")}${hb("Prevenção", A.grp["Prevenção"], mx, "#3b82f6")}${hb("Cartão e crédito", A.grp["Crédito"], mx, "#8b5cf6")}${hb("Investimentos", A.grp.Investimento, mx, "#10b981")}</div></section>
<section class="sec"><h2>De onde vem</h2><div class="panel">${rec.length ? rec.map(([k, v]) => hb(k, v, mxr, "#0f8a56")).join("") : '<p class="note" style="margin:0">Sem receitas neste período.</p>'}</div></section>
<section class="sec"><h2>Maiores gastos</h2><div class="panel">${maiores.length ? maiores.map(([k, v]) => hb(k, v, mxm, "#c43d2a")).join("") : '<p class="note" style="margin:0">Sem despesas neste período.</p>'}</div></section>`;
}

function dados() {
  const r = S.relat;
  const rel = !r ? "" : r.erro ? `<div class="panel rel err"><b>Não foi possível importar</b><p>${E(r.erro)}</p></div>`
    : `<div class="panel rel"><b>${r.novos} ${r.novos === 1 ? "lançamento importado" : "lançamentos importados"}</b><p>Formato lido: ${r.formato === "matriz" ? "matriz (meses nas colunas)" : "lista de lançamentos"}${r.aba ? ` · aba “${E(r.aba)}”` : ""}${r.jaExistiam ? ` · ${r.jaExistiam} já existiam e foram mantidos` : ""}</p>${r.ignored.length ? `<details open><summary>${r.ignored.length} linha(s) ignorada(s)</summary><ul>${r.ignored.slice(0, 30).map(i => `<li>${i.linha ? "Linha " + i.linha + ": " : ""}${E(i.motivo)}</li>`).join("")}${r.ignored.length > 30 ? `<li>…e mais ${r.ignored.length - 30}</li>` : ""}</ul></details>` : ""}</div>`;
  return `<h1>Dados</h1>${rel}
<section class="panel"><h3>Seu painel</h3><label class="f">Nome (aparece no topo)<input id="inp-cliente" maxlength="60" value="${E(S.cliente)}" placeholder="Ex.: Casa, Escritório Alpha"></label></section>
<section class="panel sec"><h3>Importar planilha</h3>
<label class="f">O que fazer com o que já existe<select id="imp-modo"><option value="somar"${S.impModo === "somar" ? " selected" : ""}>Somar (mantém o que já está no app)</option><option value="substituir"${S.impModo === "substituir" ? " selected" : ""}>Substituir tudo</option></select></label>
<label class="f">Se a planilha não tiver coluna Tipo, tratar como<select id="imp-tipo"><option value="saida"${S.impTipo === "saida" ? " selected" : ""}>Contas a pagar (saídas)</option><option value="entrada"${S.impTipo === "entrada" ? " selected" : ""}>Valores a receber (entradas)</option></select></label>
<div class="acts"><button class="btn" data-act="pickfile">Escolher arquivo (.xlsx, .xls, .csv)</button></div>
<p class="note">Aceita lista (Valor e Vencimento obrigatórios) ou matriz com Jan, Fev, Mar… nas colunas. Importar de novo o mesmo arquivo em “Somar” não duplica lançamentos que têm ID.</p>
<details class="adv"><summary>Importar de um link do Google Sheets (avançado)</summary>
<label class="f">Link “Publicar na Web” em CSV<input id="inp-url" inputmode="url" placeholder="https://docs.google.com/spreadsheets/d/e/…/pub?output=csv"></label>
<div class="acts"><button class="btn ghost" data-act="gsheet">Importar uma vez</button></div>
<p class="note">Importa uma única vez e o link não é guardado. Atenção: planilha publicada na web pode ser lida por qualquer pessoa que tenha o link. Despublique depois de importar.</p></details></section>
<section class="panel sec"><h3>Exportar e backup</h3>
<div class="acts wrap"><button class="btn" data-act="xlsx">Baixar Excel</button><button class="btn ghost" data-act="csv">Baixar CSV</button></div>
<div class="acts wrap"><button class="btn ghost" data-act="backup">Salvar backup</button><button class="btn ghost" data-act="restore">Restaurar backup</button></div>
<p class="note">Os dados ficam só neste aparelho. Se limpar o navegador ou trocar de celular, restaure o backup. O Excel exportado pode ser importado de volta.</p></section>
<section class="panel sec"><h3>Começar de novo</h3><div class="acts wrap"><button class="btn ghost" data-act="demo">Carregar exemplo</button><button class="btn danger" data-act="limpar">Apagar tudo</button></div></section>`;
}

// ---------- render e navegação ----------
const VIEWS = ["inicio", "lancamentos", "planilha", "analises", "importar"];
function compor(v) {
  const h = ({ inicio: home, lancamentos: list, planilha: plan, analises: ana, importar: dados })[v](), m = mbar(), i = h.indexOf("</h1>");
  return m && h.startsWith("<h1>") && i > 0 ? h.slice(0, i + 5) + m + h.slice(i + 5) : m + h;
}
function render() {
  const v = S.view, onb = !S.rows.length && !S.iniciou;
  $("#app").innerHTML = onb ? onboarding() : compor(v);
  $("#sub").textContent = S.cliente ? `Painel de ${S.cliente}` : "Gestão financeira";
  $("#dock").hidden = $("#gear").hidden = onb; $("#fab").hidden = onb || v === "importar";
  $$(".dock a").forEach(a => { const on = a.hash === "#" + v; a.classList.toggle("on", on); if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
  if (v === "lancamentos" && !onb) paint();
  if (v === "planilha" && !onb) { const w = $(".tw"), c = w && w.querySelector("th.cur"); if (w && c) w.scrollLeft = Math.max(0, c.offsetLeft - 150); }
}
$("#logo").innerHTML = ic("trend", 22);
$("#dock").innerHTML = [["inicio", "home", "Início"], ["lancamentos", "list", "Lançamentos"], ["+", "", ""], ["planilha", "grid", "Planilha"], ["analises", "chart", "Análises"]]
  .map(([h, i, l]) => h === "+" ? `<button class="dock-add" data-act="add" aria-label="Novo lançamento">${ic("plus", 26)}</button>` : `<a href="#${h}" aria-label="${l}">${ic(i, 22)}<span>${l}</span></a>`).join("");
$("#fab").innerHTML = ic("plus", 26); $("#gear").innerHTML = ic("data", 22);
function route() {
  const h = location.hash.slice(1);
  S.view = VIEWS.includes(h) ? h : h === "investimentos" ? "analises" : "inicio";
  S.lim = 60; render(); scrollTo(0, 0);
}
addEventListener("hashchange", route);

// ---------- formulário de lançamento ----------
let F = null;
function openForm(o = {}) {
  const x = o.id ? S.rows.find(r => r.id === o.id) : null;
  if (o.id && !x) return;
  F = x ? { ...x, editId: x.id, valor: String(x.valor).replace(".", ","), rep: "0" }
    : { editId: null, tipo: "saida", valor: "", cliente: "", nat: "Variável", data: hoje(), status: "pendente", rep: "0", ...o.novo };
  if (o.novo && typeof F.valor === "number") F.valor = String(F.valor).replace(".", ",");
  drawForm(); setTimeout(() => { const el = $("#f-valor"); if (el) el.focus(); }, 30);
}
function drawForm() {
  const ent = F.tipo === "entrada", novo = !F.editId;
  const ds = [...new Set(S.rows.filter(r => r.tipo === F.tipo).map(r => r.cliente))].slice(0, 40);
  $("#sheet").hidden = false;
  $("#sheet").innerHTML = `<div class="sh-bg" data-close="1"></div><div class="sh-p" role="dialog" aria-modal="true" aria-label="${novo ? "Novo lançamento" : "Editar lançamento"}">
<h2>${novo ? "Novo lançamento" : "Editar lançamento"}</h2>
${novo && typeof lerNotif === "function" ? `<details class="adv"><summary>Colar notificação do Pix ou cartão</summary><label class="f">Texto da notificação<textarea id="f-paste" rows="3" placeholder="Você recebeu um Pix de R$ 150,00 de Maria"></textarea></label></details>` : ""}
<div class="seg" role="group" aria-label="Tipo"><button data-tipo="saida" class="sai${ent ? "" : " on"}">Saída</button><button data-tipo="entrada" class="ent${ent ? " on" : ""}">Entrada</button></div>
<label class="f">Valor${novo ? " (de cada parcela ou repetição)" : ""}<input id="f-valor" inputmode="decimal" placeholder="0,00" value="${E(F.valor)}"></label>
<label class="f">Descrição<input id="f-desc" maxlength="120" list="dl" placeholder="${ent ? "Ex.: Salário, Cliente Alpha" : "Ex.: Aluguel, Mercado"}" value="${E(F.cliente)}"><datalist id="dl">${ds.map(d => `<option value="${E(d)}">`).join("")}</datalist></label>
${ent ? `<label class="f">Serviço ou origem<input id="f-nat" maxlength="60" value="${E(F.nat)}"></label>`
      : `<label class="f">Categoria<select id="f-nat">${D.GRUPOS.map(g => `<option value="${g}"${D.catOf(F.nat) === g ? " selected" : ""}>${g === "Fixa" ? "Despesa fixa" : g === "Variável" ? "Despesa variável" : g === "Crédito" ? "Cartão e crédito" : g}</option>`).join("")}</select></label>`}
<div class="two"><label class="f">Vencimento<input id="f-data" type="date" value="${E(F.data)}"></label>
<label class="f">Situação<select id="f-status"><option value="pendente"${F.status === "pendente" ? " selected" : ""}>${ent ? "A receber" : "A pagar"}</option><option value="pago"${F.status === "pago" ? " selected" : ""}>${ent ? "Recebido" : "Pago"}</option></select></label></div>
${novo ? `<label class="f">Repetição<select id="f-rep">${[["0", "Não repetir"], ["r3", "Repetir por 3 meses"], ["r6", "Repetir por 6 meses"], ["r12", "Repetir por 12 meses"], ["p3", "Parcelar em 3x"], ["p6", "Parcelar em 6x"], ["p12", "Parcelar em 12x"]].map(([v, l]) => `<option value="${v}"${F.rep === v ? " selected" : ""}>${l}</option>`).join("")}</select></label>` : ""}
<p id="f-err" class="err-t" role="alert"></p>
<div class="acts sticky"><button class="btn ghost" data-close="1">Cancelar</button><button class="btn" data-save="1">Salvar</button></div>
${novo ? "" : `<div class="acts"><button class="btn danger" data-del="1">Excluir lançamento</button></div>`}</div>`;
}
function closeForm() { F = null; $("#sheet").hidden = true; $("#sheet").innerHTML = ""; }
function formErro(m) { const e = $("#f-err"); if (e) e.textContent = m; }
function salvarForm() {
  const v = D.num(F.valor), d = D.iso(F.data), desc = F.cliente.trim();
  if (!(v > 0)) return formErro("Informe um valor maior que zero.");
  if (!d) return formErro("Escolha uma data de vencimento válida.");
  if (!desc) return formErro("Dê um nome ao lançamento.");
  const base = { tipo: F.tipo, valor: Math.abs(v), nat: F.tipo === "saida" ? D.catOf(F.nat) : (F.nat.trim() || "Receita"), status: F.status };
  if (F.editId) {
    const i = S.rows.findIndex(r => r.id === F.editId);
    const novo = i >= 0 && D.clean({ ...S.rows[i], ...base, cliente: desc, data: d, id: F.editId });
    if (!novo) return formErro("Não foi possível salvar esse lançamento.");
    S.rows[i] = novo;
  } else {
    const modo = F.rep[0], n = +F.rep.slice(1) || 1;
    for (let k = 0; k < n; k++) {
      const c = D.clean({ ...base, id: uid(), cliente: modo === "p" ? `${desc} (${k + 1}/${n})` : desc, data: D.addMonthsISO(d, k), status: k === 0 ? base.status : "pendente" });
      if (c) S.rows.push(c);
    }
  }
  S.iniciou = true; save(); closeForm(); render(); toast("Lançamento salvo.");
}
function excluirForm() {
  const i = S.rows.findIndex(r => r.id === F.editId); if (i < 0) return;
  const [x] = S.rows.splice(i, 1); save(); closeForm(); render();
  toast("Lançamento excluído.", () => { S.rows.splice(Math.min(i, S.rows.length), 0, x); save(); render(); toast("Lançamento restaurado."); });
}
function colarNotif(txt) {
  const n = typeof lerNotif === "function" ? lerNotif(txt) : null;
  if (!n) return;
  F.tipo = n.tipo === "entrada" ? "entrada" : "saida"; F.valor = String(n.valor).replace(".", ",");
  F.cliente = n.quem || n.meio; F.nat = F.tipo === "entrada" ? n.meio : "Variável"; F.status = "pago"; F.data = hoje();
  const antes = txt; drawForm(); const t = $("#f-paste"); if (t) { t.value = antes; t.closest("details").open = true; }
}

// ---------- ações ----------
function togglePago(id) { const x = S.rows.find(r => r.id === id); if (!x) return; x.status = x.status === "pago" ? "pendente" : "pago"; save(); render(); }
function copiarAnterior() {
  const alvo = S.mes || hoje().slice(0, 7), ant = D.addm(alvo, -1);
  const k = x => x.tipo + "|" + D.norm(x.nat) + "|" + D.norm(x.cliente);
  const existe = new Set(S.rows.filter(x => x.data.startsWith(alvo)).map(k));
  const novos = S.rows.filter(x => x.data.startsWith(ant) && !existe.has(k(x)) && !/\(\d+\/\d+\)$/.test(x.cliente))
    .map(x => ({ ...x, id: uid(), data: D.addMonthsISO(x.data, 1), status: "pendente" }));
  if (!novos.length) return toast("Nada novo para trazer de " + mesLabel(ant) + ".");
  S.rows.push(...novos); save(); render(); toast(`${novos.length} conta(s) trazida(s) de ${mesLabel(ant)}.`);
}
function aplicarDemo() {
  const novos = D.demo(hoje()).map(D.clean).map(x => ({ ...x, id: uid() }));
  S.rows.push(...novos); S.iniciou = true; S.mes = hoje().slice(0, 7); save(); location.hash = "inicio"; render();
}

// ---------- importação ----------
function aplicarImport(res, aba) {
  if (res.erro || !res.rows.length) { S.relat = { erro: res.erro || "Nenhuma linha válida encontrada.", ignored: [] }; return render(); }
  if (S.impModo === "substituir" && S.rows.length && !confirm(`Substituir os ${S.rows.length} lançamentos atuais pelos ${res.rows.length} da planilha?`)) return;
  const base = S.impModo === "substituir" ? [] : S.rows, ids = new Set(base.map(r => r.id));
  let ja = 0; const novos = [];
  res.rows.forEach(r => { if (r.id && ids.has(r.id)) { ja++; return; } novos.push({ ...r, id: r.id || uid() }); });
  S.rows = garantirIds(base.concat(novos)); S.iniciou = true;
  S.relat = { novos: novos.length, jaExistiam: ja, ignored: res.ignored, formato: res.formato, aba };
  const alvo = novos.length ? novos.map(r => r.data.slice(0, 7)).sort() : [];
  if (alvo.length && !S.rows.some(r => noMes(r) && novos.includes(r))) S.mes = alvo[alvo.length - 1];
  save(); render(); toast("Importação concluída.");
}
async function lerTexto(file) {
  const buf = await file.arrayBuffer();
  try { return new TextDecoder("utf-8", { fatal: true }).decode(buf); } catch (e) { return new TextDecoder("windows-1252").decode(buf); }
}
async function onFile(file) {
  try {
    if (file.size > 5 * 1024 * 1024) throw new Error("Arquivo muito grande (limite de 5 MB).");
    const ext = file.name.split(".").pop().toLowerCase();
    let folhas;
    if (ext === "csv" || ext === "txt") folhas = [{ nome: file.name, aoa: D.parseCSV(await lerTexto(file)) }];
    else if (ext === "xlsx" || ext === "xls") {
      if (!window.XLSX) throw new Error("A biblioteca de planilhas não carregou (sem internet?). Tente de novo online ou use um arquivo .csv.");
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      folhas = wb.SheetNames.map(n => ({ nome: n, aoa: XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: "", raw: true }) }));
    } else throw new Error("Use um arquivo .xlsx, .xls ou .csv.");
    let res = null, aba = "";
    for (const f of folhas) { const r = D.ingest(f.aoa, { nome: f.nome, padrao: S.impTipo, hoje: hoje() }); if (r.rows && r.rows.length) { res = r; aba = f.nome; break; } if (!res) res = r; }
    if (!res) throw new Error("A planilha não tem nenhuma aba com dados.");
    aplicarImport(res, folhas.length > 1 ? aba : "");
  } catch (e) { S.relat = { erro: e.message, ignored: [] }; render(); }
}
async function importarGoogle() {
  const erro = m => { S.relat = { erro: m, ignored: [] }; render(); };
  let u; try { u = new URL($("#inp-url").value.trim()); } catch (e) { return erro("Cole o link completo da planilha."); }
  if (u.protocol !== "https:" || u.hostname !== "docs.google.com" || !u.pathname.startsWith("/spreadsheets/")) return erro("Use um link do Google Sheets (docs.google.com/spreadsheets).");
  if (!u.pathname.includes("/pub")) return erro("Esse é o link de edição. No Google Sheets use Arquivo > Compartilhar > Publicar na Web, escolha CSV e cole aquele link.");
  u.searchParams.set("output", "csv");
  try {
    const res = await fetch(u.href, { cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer" });
    if (!res.ok) throw new Error("O Google respondeu com erro " + res.status + ". Confira se a planilha está publicada.");
    const t = await res.text();
    if (/^\s*<(!doctype|html)/i.test(t)) throw new Error("O link não devolveu um CSV. Publique a planilha como CSV.");
    aplicarImport(D.ingest(D.parseCSV(t), { padrao: S.impTipo, hoje: hoje() }), "");
  } catch (e) { erro(e.message || "Não foi possível acessar o link."); }
}

// ---------- exportar e backup ----------
function baixar(blob, nome) { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nome; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
const seguro = s => /^[=+\-@\t\r]/.test(s) ? "'" + s : s;           // evita fórmula maliciosa ao abrir no Excel
function linhasExport() {
  const h = hoje();
  return S.rows.slice().sort((a, b) => a.data.localeCompare(b.data)).map(x => { const st = D.eff(x, h); return [x.id, x.tipo === "entrada" ? "Entrada" : "Saída", seguro(x.cliente), seguro(x.nat), x.valor, fd(x.data), st === "pago" ? "Pago" : st === "atrasado" ? "Atrasado" : "A vencer"]; });
}
const CAB = ["ID", "Tipo", "Cliente", "Serviço", "Valor", "Vencimento", "Status"];
function exportarXlsx() {
  if (!S.rows.length) return toast("Não há lançamentos para exportar.");
  if (!window.XLSX) return toast("Biblioteca de planilhas indisponível. Baixando CSV no lugar."), exportarCsv();
  const ws = XLSX.utils.aoa_to_sheet([CAB, ...linhasExport()]); ws["!cols"] = [{ wch: 14 }, { wch: 9 }, { wch: 28 }, { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 10 }];
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Lançamentos"); XLSX.writeFile(wb, "painel-do-dono.xlsx");
}
function exportarCsv() {
  if (!S.rows.length) return toast("Não há lançamentos para exportar.");
  const q = v => /[;"\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v);
  const txt = [CAB, ...linhasExport().map(r => { r[4] = String(r[4]).replace(".", ","); return r; })].map(r => r.map(q).join(";")).join("\r\n");
  baixar(new Blob(["\uFEFF" + txt], { type: "text/csv;charset=utf-8" }), "painel-do-dono.csv");
}
function backup() { baixar(new Blob([JSON.stringify({ app: "painel-do-dono", versao: 12, cliente: S.cliente, rows: S.rows }, null, 1)], { type: "application/json" }), "painel-do-dono-backup.json"); }
async function restaurar(file) {
  try {
    if (file.size > 5 * 1024 * 1024) throw new Error("Arquivo muito grande.");
    const j = JSON.parse(await file.text());
    if (!j || j.app !== "painel-do-dono" || !Array.isArray(j.rows)) throw new Error("Esse arquivo não é um backup do Painel do Dono.");
    const rows = garantirIds(j.rows.map(D.clean).filter(Boolean));
    if (!confirm(`Restaurar ${rows.length} lançamentos? Isso substitui o que está no app.`)) return;
    S.rows = rows; S.cliente = String(j.cliente || "").slice(0, 60); S.iniciou = true; S.relat = null; save(); render(); toast("Backup restaurado.");
  } catch (e) { S.relat = { erro: e.message, ignored: [] }; render(); }
}

// ---------- eventos ----------
document.addEventListener("click", e => {
  const t = e.target, g = a => t.closest(a);
  let el;
  if (g("[data-close]") && F) return closeForm();
  if ((el = g("[data-ym]"))) { S.mes = el.dataset.ym; return render(); }
  if ((el = g("[data-mv]"))) { S.mes = D.addm(S.mes || hoje().slice(0, 7), +el.dataset.mv); S.lim = 60; return render(); }
  if ((el = g("[data-yv]"))) { S.ano += +el.dataset.yv; return render(); }
  if ((el = g("[data-pay]"))) return togglePago(el.dataset.pay);
  if ((el = g("[data-edit]"))) return openForm({ id: el.dataset.edit });
  if ((el = g("[data-filtro]"))) { S.filtro = el.dataset.filtro; S.lim = 60; return render(); }
  if ((el = g("[data-addlinha]"))) { const gr = el.dataset.addlinha; return openForm({ novo: { tipo: gr === "Receita" ? "entrada" : "saida", nat: gr === "Receita" ? "Receita" : gr, data: S.ano === +hoje().slice(0, 4) ? hoje() : S.ano + "-01-05" } }); }
  if ((el = g("[data-cell]"))) {
    const desc = el.dataset.d, gr = el.dataset.g, m = String(el.dataset.m).padStart(2, "0"), ym = S.ano + "-" + m;
    const rs = S.rows.filter(x => x.data.startsWith(ym) && x.cliente === desc && D.grp(x) === gr);
    if (rs.length === 1) return openForm({ id: rs[0].id });
    if (rs.length > 1) { S.q = desc; S.mes = ym; S.filtro = "todos"; location.hash = "lancamentos"; return; }
    return openForm({ novo: { tipo: gr === "Receita" ? "entrada" : "saida", nat: gr === "Receita" ? "Receita" : gr, cliente: desc, data: ym + "-05" } });
  }
  if (F) {
    if ((el = g("[data-tipo]"))) { F.tipo = el.dataset.tipo; F.nat = F.tipo === "entrada" ? "Receita" : "Variável"; return drawForm(); }
    if (g("[data-save]")) return salvarForm();
    if (g("[data-del]")) return excluirForm();
  }
  if ((el = g("[data-act]"))) {
    switch (el.dataset.act) {
      case "todos": S.mes = S.mes ? "" : hoje().slice(0, 7); return render();
      case "mais": S.lim += 60; return paint();
      case "add": return openForm();
      case "copiar": return copiarAnterior();
      case "comecar": S.iniciou = true; save(); return render();
      case "ir-importar": S.iniciou = true; save(); location.hash = "importar"; return render();
      case "demo": return aplicarDemo();
      case "pickfile": return $("#file").click();
      case "gsheet": return importarGoogle();
      case "xlsx": return exportarXlsx();
      case "csv": return exportarCsv();
      case "backup": return backup();
      case "restore": return $("#rest").click();
      case "limpar": if (confirm("Apagar TODOS os lançamentos deste aparelho? Faça um backup antes se precisar.")) { S.rows = []; S.relat = null; save(); render(); toast("Tudo apagado."); } return;
    }
  }
});
document.addEventListener("input", e => {
  const id = e.target.id;
  if (id === "q") { S.q = e.target.value; S.lim = 60; return paint(); }
  if (!F) return;
  if (id === "f-valor") F.valor = e.target.value;
  else if (id === "f-desc") F.cliente = e.target.value;
  else if (id === "f-nat") F.nat = e.target.value;
  else if (id === "f-data") F.data = e.target.value;
  else if (id === "f-status") F.status = e.target.value;
  else if (id === "f-rep") F.rep = e.target.value;
  else if (id === "f-paste") colarNotif(e.target.value);
});
document.addEventListener("change", e => {
  const id = e.target.id;
  if (id === "file") { const f = e.target.files[0]; e.target.value = ""; if (f) onFile(f); }
  else if (id === "rest") { const f = e.target.files[0]; e.target.value = ""; if (f) restaurar(f); }
  else if (id === "inp-cliente") { S.cliente = e.target.value.trim().slice(0, 60); save(); $("#sub").textContent = S.cliente ? `Painel de ${S.cliente}` : "Gestão financeira"; }
  else if (id === "imp-modo") S.impModo = e.target.value;
  else if (id === "imp-tipo") S.impTipo = e.target.value;
});
document.addEventListener("keydown", e => { if (e.key === "Escape" && F) closeForm(); });

// Notificação compartilhada (share_target do manifest) abre o formulário já preenchido.
(function compartilhado() {
  const p = new URLSearchParams(location.search), txt = [p.get("title"), p.get("text")].filter(Boolean).join(" ");
  if (!txt) return;
  history.replaceState(null, "", location.pathname + location.hash);
  S.iniciou = true; openForm(); colarNotif(txt);
})();

// Service worker: abre sem internet depois da primeira visita.
if ("serviceWorker" in navigator) addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => { }));

route();
