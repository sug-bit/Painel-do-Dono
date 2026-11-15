// Rodar com: node --test tests/
const test = require("node:test");
const assert = require("node:assert/strict");
const D = require("../js/dados.js");
const HOJE = "2026-11-14";

test("num: formatos brasileiros e inválidos", () => {
  assert.equal(D.num("1.234,56"), 1234.56);
  assert.equal(D.num("R$ 1.250,00"), 1250);
  assert.equal(D.num("1234.56"), 1234.56);       // antes virava 123456
  assert.equal(D.num("1.250"), 1250);
  assert.equal(D.num("12,5"), 12.5);
  assert.equal(D.num("(50,00)"), -50);
  assert.equal(D.num("-R$ 30"), -30);
  assert.equal(D.num(42), 42);
  assert.ok(Number.isNaN(D.num("abc")));
  assert.ok(Number.isNaN(D.num("")));
  assert.ok(Number.isNaN(D.num("R$")));
  assert.ok(Number.isNaN(D.num(null)));
});

test("iso: datas válidas e nunca 'hoje' por engano", () => {
  assert.equal(D.iso("31/12/2026"), "2026-12-31");
  assert.equal(D.iso("5/3/26"), "2026-03-05");
  assert.equal(D.iso("2026-02-10"), "2026-02-10");
  assert.equal(D.iso(46000), "2025-12-09");        // série do Excel
  assert.equal(D.iso("31/02/2026"), null);          // dia inexistente
  assert.equal(D.iso("45/13/2026"), null);
  assert.equal(D.iso("texto"), null);
  assert.equal(D.iso(""), null);
});

test("addMonthsISO respeita fim de mês", () => {
  assert.equal(D.addMonthsISO("2026-01-31", 1), "2026-02-28");
  assert.equal(D.addMonthsISO("2026-11-15", 2), "2027-01-15");
  assert.equal(D.addm("2026-01", -1), "2025-12");
});

test("parseCSV: aspas, ponto e vírgula e BOM", () => {
  const r = D.parseCSV('\uFEFFa;b;c\n"x;y";2;"d ""q"""\n');
  assert.deepEqual(r, [["a", "b", "c"], ["x;y", "2", 'd "q"']]);
  assert.deepEqual(D.parseCSV("a,b\n1,2"), [["a", "b"], ["1", "2"]]);
});

test("tabela plana: header:1 (array de arrays) funciona", () => {
  const aoa = [
    ["ID", "Tipo", "Cliente", "CNPJ", "Serviço", "Valor", "Vencimento", "Status"],
    ["L1", "Entrada", "Clínica Vitta", "", "Consultoria", 490.67, 46000, "Pago"],
    ["L2", "Saída", "Aluguel", "", "Despesa fixa", "2.800,00", "05/12/2026", "A vencer"],
    ["L2", "Saída", "Repetido", "", "x", 10, "05/12/2026", ""],
    ["L3", "Saída", "Sem data", "", "x", 10, "31/02/2026", ""],
    ["L4", "Saída", "Valor ruim", "", "x", "abc", "05/12/2026", ""],
    ["L5", "Entrada", "A receber", "", "x", 100, "05/12/2026", "A receber"],
    ["", "", "", "", "", "", "", ""]
  ];
  const r = D.ingest(aoa, { hoje: HOJE });
  assert.equal(r.formato, "tabela");
  assert.equal(r.rows.length, 3);
  assert.equal(r.ignored.length, 3);
  const byId = Object.fromEntries(r.rows.map(x => [x.id, x]));
  assert.equal(byId.L1.status, "pago");
  assert.equal(byId.L1.tipo, "entrada");
  assert.equal(byId.L2.valor, 2800);
  assert.equal(byId.L2.status, "pendente");
  assert.equal(byId.L5.status, "pendente");          // "A receber" não é "pago"
  assert.ok(r.ignored.some(i => /ID repetido/.test(i.motivo)));
  assert.ok(r.ignored.some(i => /data inválida/.test(i.motivo)));
});

test("tabela plana: sem coluna Tipo usa o padrão e valor negativo inverte", () => {
  const aoa = [["Descrição", "Valor", "Data"], ["Mercado", 100, "01/11/2026"], ["Estorno", -30, "02/11/2026"]];
  const r = D.ingest(aoa, { hoje: HOJE, padrao: "saida" });
  assert.equal(r.rows[0].tipo, "saida");
  assert.equal(r.rows[1].tipo, "entrada");
  assert.equal(r.rows[1].valor, 30);
});

test("sem colunas reconhecíveis devolve erro claro", () => {
  const r = D.ingest([["a", "b"], [1, 2]], { hoje: HOJE });
  assert.match(r.erro, /Valor e Vencimento/);
});

test("matriz: meses exatos, seções e rótulos traiçoeiros", () => {
  const aoa = [
    ["Orçamento 2026", "", "", "", ""],
    ["", "Jan", "Fev", "Mar", "Abr"],
    ["Receitas", "", "", "", ""],
    ["Salário", 5000, 5000, "R$ 5.000,00", 5000],
    ["Outros", 100, "", "", ""],                      // "Outros" não é o mês "out"
    ["Despesas Fixas", "", "", "", ""],
    ["Aluguel", 1800, 1800, 1800, 1800],
    ["Totalpass", 120, 120, 120, 120],                // não pode ser descartado como "total"
    ["Cartão Nubank", 300, 300, 300, 300],            // não muda de seção sozinho
    ["Total", 2220, 2220, 2220, 2220],
    ["Variáveis", "", "", "", ""],
    ["Mercado", 600, "-", "abc", 650],
    ["Investimentos", "", "", "", ""],
    ["Tesouro", 500, 500, 500, 500]
  ];
  const r = D.ingest(aoa, { hoje: HOJE, nome: "Planilha" });
  assert.equal(r.formato, "matriz");
  const get = c => r.rows.filter(x => x.cliente === c);
  assert.equal(get("Salário").length, 4);
  assert.equal(get("Salário")[0].data, "2026-01-05");   // ano vem do título
  assert.equal(get("Salário")[2].valor, 5000);
  assert.equal(get("Outros").length, 1);
  assert.equal(get("Outros")[0].tipo, "entrada");       // ainda dentro de Receitas
  assert.equal(get("Totalpass").length, 4);
  assert.equal(get("Cartão Nubank")[0].nat, "Fixa");    // continua em Fixas
  assert.equal(get("Mercado").length, 2);               // "-" ignorado em silêncio, "abc" reportado
  assert.equal(get("Mercado")[0].nat, "Variável");
  assert.equal(get("Tesouro")[0].nat, "Investimento");
  assert.ok(r.ignored.some(i => /abc/.test(i.motivo)));
  assert.equal(r.rows.filter(x => x.cliente === "Total").length, 0);
  assert.equal(get("Aluguel")[0].status, "pago");       // mês já passado
});

test("matriz: dia 5 já passado vira pago, futuro fica pendente, ano padrão é o atual", () => {
  const aoa = [["", "Nov", "Dez", "Jan"], ["Receita", "", "", ""], ["Salário", 1, 1, 1]];
  const r = D.ingest(aoa, { hoje: HOJE });
  assert.deepEqual(r.rows.map(x => x.status + " " + x.data), ["pago 2026-11-05", "pendente 2026-12-05", "pago 2026-01-05"]);
});

test("clean: bloqueia dados inválidos e neutraliza fórmulas", () => {
  assert.equal(D.clean({ valor: 0, data: "2026-01-01" }), null);
  assert.equal(D.clean({ valor: 10, data: "lixo" }), null);
  assert.equal(D.clean(null), null);
  const c = D.clean({ valor: "10.555", data: "2026-01-01", tipo: "x", status: "<script>", cliente: "'=CMD()" });
  assert.equal(c.status, "pendente");
  assert.equal(c.tipo, "saida");
  assert.equal(c.cliente, "=CMD()");
});

test("catOf e eff", () => {
  assert.equal(D.catOf("Despesa fixa"), "Fixa");
  assert.equal(D.catOf("Cartão de crédito"), "Crédito");
  assert.equal(D.catOf("Qualquer coisa"), "Variável");
  assert.equal(D.eff({ status: "pendente", data: "2026-11-01" }, HOJE), "atrasado");
  assert.equal(D.eff({ status: "pendente", data: "2026-11-20" }, HOJE), "pendente");
  assert.equal(D.eff({ status: "pago", data: "2026-01-01" }, HOJE), "pago");
});

test("demo gera linhas válidas", () => {
  const d = D.demo(HOJE).map(D.clean);
  assert.ok(d.every(Boolean));
  assert.ok(d.length >= 10);
});
