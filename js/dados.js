// Lógica pura de dados do Painel do Dono: leitura de valores e datas, parsers de
// planilha (matriz e tabela plana), CSV e validação. Não toca no DOM, então roda
// no navegador (window.Dados) e no Node (tests/dados.test.js).
(function (root) {
  "use strict";

  const P2 = n => String(n).padStart(2, "0");
  const norm = s => String(s == null ? "" : s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

  // ---------- valores ----------
  // Aceita 1.234,56 | 1234.56 | R$ 1.250 | (50,00) | -50 e devolve NaN se não for número.
  function num(v) {
    if (typeof v === "number") return Number.isFinite(v) ? v : NaN;
    let s = String(v == null ? "" : v).trim();
    if (!s) return NaN;
    let neg = false;
    if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
    s = s.replace(/R\$|\s/g, "");
    if (s[0] === "-") { neg = true; s = s.slice(1); } else if (s[0] === "+") s = s.slice(1);
    if (!/^[\d.,]+$/.test(s) || !/\d/.test(s)) return NaN;
    const lc = s.lastIndexOf(","), ld = s.lastIndexOf(".");
    if (lc >= 0 && ld >= 0) s = lc > ld ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
    else if (lc >= 0) s = (s.match(/,/g).length > 1) ? s.replace(/,/g, "") : s.replace(",", ".");
    else if (ld >= 0 && /^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
    const n = Number(s);
    return Number.isFinite(n) ? (neg ? -n : n) : NaN;
  }

  // ---------- datas ----------
  function validISO(y, m, d) {
    const t = new Date(Date.UTC(y, m - 1, d));
    return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d ? `${y}-${P2(m)}-${P2(d)}` : null;
  }
  // Devolve AAAA-MM-DD ou null. Nunca "chuta" a data de hoje.
  function iso(v) {
    if (v instanceof Date) return isNaN(v) ? null : validISO(v.getFullYear(), v.getMonth() + 1, v.getDate());
    if (typeof v === "number") {
      if (!(v > 20000 && v < 80000)) return null; // série de data do Excel
      const t = new Date((Math.floor(v) - 25569) * 864e5);
      return validISO(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
    }
    const s = String(v == null ? "" : v).trim();
    let m;
    if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return validISO(+m[1], +m[2], +m[3]);
    if ((m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/))) { let y = +m[3]; if (y < 100) y += 2000; return validISO(y, +m[2], +m[1]); }
    if (/^\d{5}(\.\d+)?$/.test(s)) return iso(Number(s));
    return null;
  }
  const addm = (ym, d) => { const [y, m] = ym.split("-").map(Number), t = new Date(y, m - 1 + d, 1); return t.getFullYear() + "-" + P2(t.getMonth() + 1); };
  function addMonthsISO(dt, n) {
    const [y, m, d] = dt.split("-").map(Number);
    const ym = addm(dt.slice(0, 7), n), [yy, mm] = ym.split("-").map(Number);
    return `${ym}-${P2(Math.min(d, new Date(yy, mm, 0).getDate()))}`;
  }

  // ---------- CSV ----------
  function parseCSV(text) {
    text = String(text).replace(/^\uFEFF/, "");
    const first = text.split(/\r?\n/, 1)[0] || "";
    const c = { ",": first.split(",").length, ";": first.split(";").length, "\t": first.split("\t").length };
    const delim = c[";"] > c[","] ? ";" : c["\t"] > c[","] ? "\t" : ",";
    const rows = []; let row = [], cur = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) {
        if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch;
      } else if (ch === '"') q = true;
      else if (ch === delim) { row.push(cur); cur = ""; }
      else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cur); rows.push(row); row = []; cur = ""; }
      else cur += ch;
    }
    if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
    return rows;
  }

  // ---------- categorias ----------
  const GRUPOS = ["Fixa", "Variável", "Prevenção", "Crédito", "Investimento"];
  function catOf(nat) {
    const n = norm(nat);
    if (n.includes("fixa")) return "Fixa";
    if (n.includes("prevenc") || n.includes("reserva") || n.includes("emergenc")) return "Prevenção";
    if (n.includes("credito") || n.includes("cartao") || n.includes("fatura")) return "Crédito";
    if (n.includes("invest")) return "Investimento";
    return "Variável";
  }
  const grp = x => x.tipo === "entrada" ? "Receita" : catOf(x.nat);
  const eff = (x, hoje) => x.status === "pago" ? "pago" : x.data < hoje ? "atrasado" : "pendente";

  // ---------- validação de uma linha (import, backup, formulário) ----------
  function clean(x) {
    if (!x || typeof x !== "object") return null;
    const valor = Number(x.valor), data = iso(x.data);
    if (!(valor > 0) || !Number.isFinite(valor) || !data) return null;
    const tipo = x.tipo === "entrada" ? "entrada" : "saida";
    const txt = (s, max) => String(s == null ? "" : s).replace(/^'(?=[=+\-@])/, "").trim().slice(0, max);
    return {
      id: txt(x.id, 40) || null, data, valor: Math.round(valor * 100) / 100, tipo,
      nat: txt(x.nat, 60) || (tipo === "entrada" ? "Receita" : "Variável"),
      cliente: txt(x.cliente, 120) || "Sem descrição",
      status: x.status === "pago" ? "pago" : "pendente"
    };
  }

  // ---------- parser: matriz (meses nas colunas) ----------
  const MES_RE = /^(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)(?:eiro|ereiro|co|il|o|ho|sto|embro|ubro)?(\d{2}|\d{4})?$/;
  const MES_N = { jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12 };
  function mesDe(cell) {
    const m = norm(cell).match(MES_RE);
    if (!m) return null;
    let ano = m[2] ? +m[2] : 0; if (ano && ano < 100) ano += 2000;
    return { mes: MES_N[m[1]], ano };
  }
  const TITULO_RE = /^(receitas?|entradas?|rendas?|(despesas|gastos|contas)?(fixas?|variaveis)|investimentos?|(cartao|cartoes|credito|(cartao|cartoes)decredito)|prevencao|reservas?)$/;
  function secaoDe(label) {
    const n = norm(label);
    if (/^(receita|entrada|renda|rendimento)/.test(n)) return "Receita";
    if (n.includes("fixa")) return "Fixa";
    if (n.includes("variavel") || n.includes("variaveis")) return "Variável";
    if (n.includes("invest")) return "Investimento";
    if (n.includes("credito") || n.includes("cartao") || n.includes("cartoes")) return "Crédito";
    if (n.includes("prevenc") || n.includes("reserva")) return "Prevenção";
    return null;
  }
  const VAZIO = v => v == null || /^[\s\-–—]*$/.test(String(v));

  function parseMatriz(aoa, opt) {
    let hdr = -1, cols = null, anoHint = 0;
    for (let i = 0; i < Math.min(15, aoa.length); i++) {
      const c = {}, vistos = new Set(); let n = 0, a = 0;
      (aoa[i] || []).forEach((cell, j) => {
        const m = mesDe(cell);
        if (m && !vistos.has(m.mes)) { vistos.add(m.mes); c[j] = m.mes; n++; if (m.ano) a = m.ano; }
      });
      if (n >= 3) { hdr = i; cols = c; anoHint = a; break; }
    }
    if (hdr < 0) return null;
    let ano = anoHint;
    if (!ano) {
      const alvo = [opt.nome || ""];
      for (let i = 0; i < Math.min(hdr + 1, 15); i++) alvo.push((aoa[i] || []).join(" "));
      const m = alvo.join(" ").match(/\b(20\d\d)\b/);
      ano = m ? +m[1] : +opt.hoje.slice(0, 4);
    }
    const minCol = Math.min(...Object.keys(cols).map(Number));
    const rows = [], ignored = [];
    let secao = "Variável";
    for (let i = hdr + 1; i < aoa.length; i++) {
      const row = aoa[i] || [];
      const labels = row.slice(0, minCol).filter(c => typeof c === "string" && c.trim() !== "").map(c => c.trim());
      if (!labels.length) continue;
      const label = labels[labels.length - 1];
      if (/^\s*(sub)?total\b/i.test(label) || /^\s*(saldo|sobra)\b/i.test(label)) continue;
      const temValor = Object.keys(cols).some(j => Number.isFinite(num(row[j])));
      if (TITULO_RE.test(norm(label)) || (!temValor && secaoDe(label))) { secao = secaoDe(label) || secao; continue; }
      for (const [j, mes] of Object.entries(cols)) {
        const raw = row[j];
        if (VAZIO(raw)) continue;
        const v = num(raw);
        if (!Number.isFinite(v)) { ignored.push({ linha: i + 1, motivo: `valor inválido ("${String(raw).slice(0, 20)}") em ${label}` }); continue; }
        if (v === 0) continue;
        const data = validISO(ano, mes, 5);
        let tipo = secao === "Receita" ? "entrada" : "saida";
        if (v < 0) tipo = tipo === "entrada" ? "saida" : "entrada";
        rows.push({
          id: null, data, valor: Math.abs(v), tipo, nat: tipo === "entrada" ? "Receita" : secao,
          cliente: label, status: data < opt.hoje ? "pago" : "pendente"
        });
      }
    }
    return { rows, ignored, formato: "matriz" };
  }

  // ---------- parser: tabela plana (uma linha por lançamento) ----------
  const AL = {
    data: ["vencimento", "data", "dtvenc", "datavencimento"],
    valor: ["valor", "valortotal", "quantia"],
    tipo: ["tipo", "entradasaida", "movimento"],
    nat: ["categoria", "servico", "natureza", "grupo"],
    desc: ["descricao", "cliente", "nome", "historico", "favorecido", "fornecedor"],
    status: ["status", "situacao"],
    id: ["id", "codigo"]
  };
  function mapCols(cells) {
    const n = cells.map(norm), out = {};
    for (const [k, termos] of Object.entries(AL)) {
      let j = -1;
      for (const t of termos) { j = n.indexOf(t); if (j >= 0) break; }
      if (j < 0 && k !== "id") for (const t of termos) { if (t.length < 4) continue; j = n.findIndex(c => c.startsWith(t)); if (j >= 0) break; }
      if (j >= 0) out[k] = j;
    }
    return out;
  }
  function parsePlano(aoa, opt) {
    let hdr = -1, m = null;
    for (let i = 0; i < Math.min(10, aoa.length); i++) {
      const c = mapCols(aoa[i] || []);
      if (c.data != null && c.valor != null) { hdr = i; m = c; break; }
    }
    if (hdr < 0) return null;
    const rows = [], ignored = [], ids = new Set();
    for (let i = hdr + 1; i < aoa.length; i++) {
      const r = aoa[i] || [];
      if (r.every(VAZIO)) continue;
      let v = num(r[m.valor]);
      if (!Number.isFinite(v) || v === 0) { ignored.push({ linha: i + 1, motivo: "valor inválido, vazio ou zero" }); continue; }
      const data = iso(r[m.data]);
      if (!data) { ignored.push({ linha: i + 1, motivo: "data inválida" }); continue; }
      let tipo;
      if (m.tipo != null) {
        const t = norm(r[m.tipo]);
        tipo = /entrada|receita|recebimento|credito/.test(t) ? "entrada" : /saida|despesa|pagamento|custo|debito/.test(t) ? "saida" : opt.padrao;
        v = Math.abs(v);
      } else {
        tipo = opt.padrao;
        if (v < 0) { tipo = tipo === "entrada" ? "saida" : "entrada"; v = -v; }
      }
      const st = m.status != null ? norm(r[m.status]) : "";
      const status = /^(pago|paga|recebid|quitad|liquidad)/.test(st) ? "pago" : "pendente";
      let id = m.id != null && !VAZIO(r[m.id]) ? String(r[m.id]).trim() : null;
      if (id) { if (ids.has(id)) { ignored.push({ linha: i + 1, motivo: `ID repetido (${id})` }); continue; } ids.add(id); }
      rows.push({
        id, data, valor: v, tipo, status,
        nat: m.nat != null && !VAZIO(r[m.nat]) ? String(r[m.nat]) : (tipo === "entrada" ? "Receita" : "Variável"),
        cliente: m.desc != null && !VAZIO(r[m.desc]) ? String(r[m.desc]) : "Sem descrição"
      });
    }
    return { rows, ignored, formato: "tabela" };
  }

  // Lê uma matriz de células (array de arrays) e devolve {rows, ignored, formato} ou {erro}.
  function ingest(aoa, opt) {
    opt = Object.assign({ padrao: "saida", hoje: new Date().toLocaleDateString("sv-SE"), nome: "" }, opt || {});
    if (!Array.isArray(aoa) || !aoa.length) return { erro: "A planilha está vazia." };
    const res = parseMatriz(aoa, opt) || parsePlano(aoa, opt);
    if (!res) return { erro: "Não encontrei as colunas Valor e Vencimento, nem uma linha com os meses (Jan, Fev, Mar…)." };
    const limpas = [];
    for (const r of res.rows) {
      const c = clean(r);
      if (c) limpas.push(c); else res.ignored.push({ linha: 0, motivo: "linha inválida" });
    }
    res.rows = limpas;
    return res;
  }

  function demo(hoje) {
    const ym = hoje.slice(0, 7), a = addm(ym, -1);
    const L = (ym2, dia, tipo, nat, cliente, valor, status) => ({ id: null, data: `${ym2}-${P2(dia)}`, tipo, nat, cliente, valor, status });
    return [
      L(ym, 5, "entrada", "Receita", "Salário", 5200, "pago"),
      L(ym, 20, "entrada", "Receita", "Freelance", 1400, "pendente"),
      L(ym, 6, "saida", "Fixa", "Aluguel", 1800, "pago"),
      L(ym, 10, "saida", "Fixa", "Internet", 120, "pago"),
      L(ym, 28, "saida", "Fixa", "Energia", 210, "pendente"),
      L(ym, 12, "saida", "Variável", "Mercado", 640, "pago"),
      L(ym, 22, "saida", "Variável", "Transporte", 300, "pendente"),
      L(ym, 15, "saida", "Crédito", "Cartão Nubank", 980, "pendente"),
      L(ym, 8, "saida", "Prevenção", "Reserva de emergência", 300, "pago"),
      L(ym, 9, "saida", "Investimento", "Tesouro Selic", 500, "pago"),
      L(a, 5, "entrada", "Receita", "Salário", 5200, "pago"),
      L(a, 6, "saida", "Fixa", "Aluguel", 1800, "pago"),
      L(a, 15, "saida", "Crédito", "Cartão Nubank", 870, "pago"),
      L(a, 12, "saida", "Variável", "Mercado", 710, "pago")
    ];
  }

  const api = { norm, num, iso, validISO, addm, addMonthsISO, parseCSV, catOf, grp, eff, clean, ingest, demo, GRUPOS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Dados = api;
})(typeof window !== "undefined" ? window : globalThis);
