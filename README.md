# Painel do Dono

Controle financeiro em PWA, sem servidor e sem build. Lance entradas e saídas, marque contas como pagas e edite tudo numa visão de planilha direto no celular. Os dados ficam só no aparelho (`localStorage`). O Excel serve para importar e exportar.

## O que mudou (v12)

**Edição dentro do app**
- O app passou a ser a fonte dos dados. Antes, só lia um CSV do Google Sheets.
- Botão **+** para criar lançamentos, com repetição (3, 6, 12 meses) ou parcelamento (3x, 6x, 12x).
- Tocar no círculo marca como pago. Tocar na linha edita ou exclui.
- Tela **Planilha** (categorias × meses) com valores editáveis.
- Importar `.xlsx`, `.xls`, `.csv` (lista ou matriz), exportar Excel ou CSV, backup e restauração em JSON.
- Onboarding com três caminhos: começar do zero, trazer planilha ou ver exemplo.

**Bugs corrigidos**
- Importação de lista nunca funcionava. Reescrita e testada com as planilhas do projeto.
- Service worker nunca era registrado, então não havia modo offline.
- Meses lidos por prefixo ("Outros" virava outubro), linhas "Totalpass" descartadas e seções trocadas sozinhas na matriz.
- Valores como `1234.56` e datas inválidas eram lidos errado ou viravam "hoje" sem aviso. Agora entram num relatório de linhas ignoradas.
- Conta da tela inicial não fechava, ícone de atraso não existia e o menu estourava em telas de 360px.

**Segurança**
- O link público do Google Sheets não é mais guardado, só serve para uma importação única.
- Política de segurança (CSP), escape de HTML completo e validação de todo dado que entra (planilha, backup, formulário).
- Exportação neutraliza fórmulas maliciosas no Excel.
- O cache do service worker não guarda mais dados financeiros.

**Visual (janelas de vidro, estilo PS5)**
- Fundo azul-escuro com luzes suaves e janelas translúcidas com desfoque.
- Linhas com destaque branco de foco. O botão ativo do menu é uma pílula branca.
- No computador, o menu vira uma lista lateral, como a página de configurações do console.
- Escuro por padrão. Para o tema claro, use `<html data-theme="light">`.

Detalhes completos em [`MELHORIAS.md`](MELHORIAS.md).

## Rodar e testar

```bash
python -m http.server 5500   # abra http://localhost:5500
npm test                     # 12 testes da lógica de dados
```

É preciso internet na primeira visita (SheetJS e a fonte vêm de CDN). Depois o app abre offline.

## Estrutura

```text
index.html           casca da página e política de segurança
css/style.css        visual (tokens no :root)
js/dados.js          lógica pura: valores, datas, CSV, parsers, validação
js/app.js            telas, formulário, importação, exportação
js/captura.js        lê texto de notificação de Pix e cartão
sw.js                service worker (troque VERSAO a cada publicação)
tests/dados.test.js  testes
```

## Planilha aceita

- **Lista:** colunas **Valor** e **Vencimento** (ou Data) obrigatórias. Opcionais: Tipo, Cliente/Descrição, Serviço/Categoria, Status e ID.
- **Matriz:** uma linha com os meses (Jan, Fev… ou nomes completos) e seções como Receitas, Fixas, Variáveis, Cartão, Prevenção e Investimentos. Meses cujo dia 5 já passou entram como pagos.

## Pendências

1. Trocar o SheetJS do cdnjs (0.18.5, sem verificação de integridade) por uma versão atual hospedada no projeto.
2. Hospedar a fonte localmente.
3. Login e sincronização (Supabase ou Firebase). Hoje, limpar o navegador apaga os dados, então use o backup.
4. Testar em celular de verdade: PWA instalado e offline.
