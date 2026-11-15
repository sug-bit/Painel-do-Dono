# Painel do Dono: o que mudou na revisão v12

Esta revisão corrige os bugs e falhas de segurança encontrados na análise e transforma o app de **visualizador de planilha** em **ferramenta de edição**: agora dá para lançar, editar, marcar como pago e ver a planilha inteira dentro do app, com o Excel só como entrada e saída.

## 1. Mudança de arquitetura

| Antes (v11) | Agora (v12) |
| --- | --- |
| Fonte dos dados: link CSV do Google Sheets, somente leitura | Fonte dos dados: o próprio app, no aparelho |
| Link público da planilha guardado no `localStorage` | Nenhum link guardado. Google Sheets vira importação única |
| Sem nenhuma função de escrita | Criar, editar, excluir, marcar pago, repetir, parcelar |
| Sem backup | Backup/restauração em JSON, exportação para Excel e CSV |

Quem já tinha dados da v11 não perde nada: as linhas são migradas automaticamente (validadas) e o link antigo é descartado.

## 2. Bugs corrigidos

| # | Problema | Correção |
| --- | --- | --- |
| 1 | **Importação de lista (tabela plana) nunca funcionava.** O leitor pedia objetos, mas recebia arrays, então sempre dava "Não encontrei as colunas" | Parser reescrito sobre arrays, com mapeamento de colunas por nome. Testado com `exemplo_financeiro.xlsx` (52 linhas lidas) e `modelo_planilha.xlsx` |
| 2 | Service worker nunca era registrado: sem offline e sem instalação real | Registrado em `app.js` |
| 3 | Erro de sincronização não aparecia para quem já tinha link | Erros e relatório de importação aparecem na tela Dados |
| 4 | Não havia como trocar a planilha ou sair da conta | Tela **Dados** no menu, com importar, exportar, backup e apagar |
| 5 | Meses por prefixo: "Outros" virava **out**, "Marketing" virava **mar** | Só nomes exatos de mês (Jan/Janeiro, com ano opcional) |
| 6 | Linhas com "total" no nome (ex.: "Totalpass") eram descartadas | Só descarta linhas que **começam** com Total, Subtotal, Saldo ou Sobra |
| 7 | Um item chamado "Cartão Nubank" dentro de Fixas mudava a seção sozinho | Seção só muda em linhas que são títulos de seção |
| 8 | Colunas de mês de linhas anteriores vazavam para o cabeçalho real | Detecção de meses refeita por linha |
| 9 | Ano sempre igual ao atual e todo valor entrava como "pago" | Ano lido do título/aba; dia 5 já passado = pago, futuro = em aberto |
| 10 | `1234.56` virava 123456; valor inválido sumia em silêncio | `num()` entende `1.234,56`, `1234.56`, `R$`, `(50,00)` e negativos; inválidos são **listados** |
| 11 | Data inválida virava a data de **hoje** sem aviso | `iso()` devolve nulo; a linha é ignorada e reportada (inclui `31/02`) |
| 12 | Seção "Prevenção" sempre R$ 0,00 | Reconhecida na matriz e na lista |
| 13 | A conta da tela inicial não fechava (faltava a linha de Investimentos) | Todas as seis parcelas aparecem e somam a sobra |
| 14 | Ícone de "atrasado" não existia (`P.warn` indefinido) | Ícone criado; "atrasado" agora é calculado pelo vencimento |
| 15 | Aba escolhida pelo nome "monique" fixo no código | Tenta cada aba até achar dados |
| 16 | Dock estourava a largura em celulares de 360px | Só o item ativo mostra o texto |
| 17 | Contraste ruim da cor da marca no modo escuro; zoom automático no iOS ao focar campos | `--brand` clareado no escuro; campos com 16px |
| 18 | `share_target` do manifest sem tratamento no código | Texto compartilhado abre o formulário já preenchido |

## 3. Segurança e privacidade

- **Fim do link público guardado.** Planilha publicada na web pode ser lida por qualquer pessoa com o link. Agora o link só é usado numa importação única e não é salvo. A tela avisa para despublicar depois.
- **Link validado:** só `https://docs.google.com/spreadsheets/…`, com `credentials: omit` e sem referrer.
- **Service worker mais seguro:** só guarda arquivos do próprio app e de cdnjs/Google Fonts. Respostas do Google Sheets e outros domínios não entram mais no cache. Corrige também o crescimento ilimitado do cache (cada sync criava uma entrada nova) e a instalação que falhava se um único arquivo estivesse ausente.
- **Política de segurança (CSP)** no `index.html`: scripts só do próprio site e do cdnjs, sem `<form>`, sem objetos, sem `base`. Para isso, o `onclick` inline foi removido e os eventos passaram a ser delegados no JS.
- **Escape de HTML** agora cobre também `'`. Todo dado que entra (planilha, backup, formulário) passa por `clean()`, que valida tipo, status, data e tamanho. Isso fecha a injeção por `class=` com status malicioso.
- **Injeção de fórmula no Excel:** textos que começam com `=`, `+`, `-` ou `@` recebem apóstrofo ao exportar.
- **Limites:** arquivos de importação e backup acima de 5 MB são recusados.
- `navigator.storage.persist()` pede ao navegador que não apague os dados do app por falta de espaço.

## 4. Novas funcionalidades (edição dentro do app)

- **Botão +** com formulário em folha inferior: tipo, valor, descrição (com sugestões), categoria, vencimento, situação e repetição (3, 6, 12 meses) ou parcelamento (3x, 6x, 12x, com "(1/3)").
- **Marcar como pago com um toque** no círculo da linha. Tocar na linha edita ou exclui.
- **Tela Planilha:** matriz categorias × meses por ano. Tocar em um valor edita; célula vazia cria um lançamento; "+ linha" adiciona uma conta nova; totais por grupo e linha de **Sobra** por mês. Laranja = em aberto, vermelho = em atraso.
- **Lançamentos:** filtros (todos, em aberto, em atraso, pagos), "Ver mais" em vez do corte silencioso em 60 e **Trazer contas do mês anterior** sem duplicar.
- **Importar:** Excel, CSV, lista ou matriz, com escolha entre somar e substituir. Reimportar o mesmo arquivo com IDs não duplica. Relatório com as linhas ignoradas e o motivo.
- **Exportar** para Excel ou CSV (reimportável) e **backup/restauração** em JSON.
- **Colar notificação de Pix/cartão** no formulário usa o `captura.js`, que antes não era usado por nada.

## 5. Experiência do usuário

- **Onboarding com três portas:** *Começar do zero*, *Trazer minha planilha* e *Ver com dados de exemplo*. Antes era obrigatório colar um link "Publicar na Web > CSV", que quase ninguém sabe fazer.
- Início mais útil: em caixa, a pagar, a receber, contas em atraso e próximos vencimentos (já com o botão de pagar).
- Mensagens de erro dizem o que fazer, e confirmações curtas aparecem como aviso na tela.
- Menu com 5 seções; o antigo "Investimentos" virou uma barra em **Análises** e uma seção na **Planilha**.
- Foco visível no teclado, `aria-label` nos botões só com ícone, `aria-current` no menu e respeito a "reduzir movimento".

## 6. Arquivos

| Arquivo | Situação |
| --- | --- |
| `js/dados.js` | **Novo.** Lógica pura (valores, datas, CSV, parsers, validação) |
| `js/app.js` | **Reescrito** |
| `tests/dados.test.js`, `package.json` | **Novos.** 12 testes |
| `index.html`, `css/style.css`, `sw.js`, `manifest.webmanifest` | Atualizados |
| `README.md`, `DECISOES.md` | Atualizados |
| `js/captura.js`, ícones, planilhas de exemplo | Sem alteração |

## 7. Como foi verificado

- **12 testes automatizados** passando (`npm test`), cobrindo cada bug do parser acima.
- **Planilhas reais do projeto:** `exemplo_financeiro.xlsx` lê 52 linhas e reporta as 2 defeituosas de propósito; `modelo_planilha.xlsx` lê as 2 linhas do modelo.
- **Teste de fumaça do `app.js`** com DOM simulado: todas as telas, criar/editar/excluir, parcelamento, importar somar/substituir, reimportação sem duplicar, escape de HTML, persistência e exportação segura.

**O que eu não consegui verificar aqui:** abrir no navegador de verdade (layout, toque, tema escuro), instalar como PWA e testar o service worker, e rodar a leitura/escrita de `.xlsx` via SheetJS, pois este ambiente não tem navegador nem acesso à internet. Teste em um celular antes de entregar a clientes.

## 8. Pendências recomendadas

1. **SheetJS:** a versão do cdnjs (0.18.5) é antiga e o `<script>` não tem verificação de integridade (SRI). Baixe uma versão atual (0.20.x, do site oficial da SheetJS) para `vendor/xlsx.full.min.js`, aponte o `index.html` e o `sw.js` para ela e remova `cdnjs.cloudflare.com` do CSP. Importar CSV e exportar CSV já funcionam sem ela.
2. **Fonte Bricolage Grotesque:** hospede localmente (`fonts/`) para não depender do Google Fonts nem enviar o IP do usuário a terceiros.
3. **Cabeçalhos HTTP:** CSP, `X-Content-Type-Options` e `Referrer-Policy` pelo servidor (`_headers` no Netlify/Cloudflare) são mais fortes do que a `<meta>`.
4. **Troque `VERSAO` em `sw.js`** (hoje `pdd-v13`) a cada publicação.
5. **IndexedDB** no lugar de `localStorage` se o volume de lançamentos crescer (limite de ~5 MB).
6. **Login e sincronização (Supabase/Firebase):** resolve "perdi o celular, perdi tudo" e permite usar o mesmo painel em vários aparelhos. Também é o caminho para cobrar assinatura.
7. **Editar de volta no Google Sheets** exigiria OAuth da Google ou um Apps Script exposto. Deixei fora de propósito, por reabrir o problema de privacidade.
8. Revisar o app em tela de computador (a Planilha rola na horizontal) e adicionar gráfico mensal na tela Análises.

## 9. Mudanças de comportamento a comunicar

- O botão de **sincronizar** do topo foi removido, pois não há mais link guardado.
- A métrica **"Em dia"** do README antigo não existia no código v11 e não foi recriada.
- Matriz importada: meses passados entram como **pagos**; ajuste na lista ou na planilha se algum não for.
- Valores de lançamentos agora são arredondados em centavos ao salvar.

## 10. Redesign visual: janelas de vidro (estilo PS5)

- **Fundo:** azul-escuro com três luzes suaves (`.ambient`), sem imagens externas.
- **Janelas:** painéis, planilha, formulário e menu com fundo translúcido, `backdrop-filter` (desfoque) e borda de luz. Navegadores sem suporte caem para um fundo sólido.
- **Foco:** cada linha da lista ganha contorno branco ao passar o mouse ou navegar por teclado, como o item selecionado do console. O menu ativo e o filtro ativo são pílulas brancas.
- **Computador (900px ou mais):** o menu vira uma lista lateral flutuante com ícone e nome. No celular continua sendo a barra flutuante inferior.
- **Formulário:** folha inferior no celular e janela centralizada no computador, sobre um fundo desfocado.
- **Tema:** escuro por padrão. O tema claro existe via `data-theme="light"`; não segue mais o modo do sistema, para o efeito do vidro ficar consistente.
- **Também ajustado:** `theme-color` e `background_color` do manifest, `VERSAO` do service worker para `pdd-v14`.
- **Verificado** com capturas de tela no Chromium (390px e 1280px), sem erros de JavaScript. Os desfoques podem pesar em celulares antigos; se ocorrer, reduza `blur(26px)` em `style.css`.
