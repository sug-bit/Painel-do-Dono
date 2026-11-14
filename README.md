# Painel do Dono

App financeiro que roda no navegador e pode ser instalado no celular como aplicativo (PWA). Você importa uma planilha de Excel ou lança entradas e saídas à mão, e ele mostra saldo, o que falta receber ou pagar e o que está em atraso, com layout pensado primeiro para o celular.

Não tem servidor, banco de dados nem etapa de build. Os dados ficam só no aparelho de quem usa (`localStorage`).

## O que ele faz

- **Início:** saldo em caixa (entradas pagas menos saídas pagas), situação das receitas, o que falta pagar e comparação mensal de entradas e saídas.
- **Mês a mês:** setas no topo trocam de mês (tocar no nome do mês alterna para "todos os meses"). Início, Lançamentos e Análises seguem o mês escolhido.
- **Lançamentos:** lista com busca e filtros. O círculo à esquerda de cada linha marca como pago (ou desfaz) com um toque. O botão **+** cria um lançamento, com opção de repetir por 3, 6 ou 12 meses. Tocar na linha edita ou exclui. **Trazer contas do mês anterior** copia o que ainda não existe no mês atual, em aberto.
- **Análises:** receitas por serviço, para onde o dinheiro vai (saídas por categoria) e clientes que mais pesam.
- **Importar e backup:** planilha Excel ou CSV, substituindo ou somando ao que já existe. Se a planilha não tiver a coluna Tipo, vale a escolha feita na tela: contas a pagar (padrão) ou valores a receber. Também baixa a planilha Excel com tudo o que está no app (pode ser importada de volta) e salva e restaura backup em arquivo.
- Lançamentos em aberto com vencimento no passado passam sozinhos para "em atraso".

## Como rodar no VS Code

1. Abra a pasta `painel-do-dono` no VS Code.
2. Instale a extensão **Live Server** (Ritwick Dey).
3. Clique com o botão direito em `index.html` e escolha **Open with Live Server**.

Alternativa pelo terminal, dentro da pasta:

```bash
python -m http.server 5500
# abra http://localhost:5500
```

É preciso internet: a biblioteca de planilhas (SheetJS) e a fonte (Bricolage Grotesque) vêm de CDN.

## Estrutura

```text
painel-do-dono/
├── index.html               # casca da página: cabeçalho, área principal, barra flutuante
├── css/style.css            # todo o visual (tokens de cor no :root, tema claro e escuro)
├── js/app.js                # toda a lógica
├── manifest.webmanifest     # nome, cores e ícones do app instalável
├── sw.js                    # service worker: abre sem internet depois da primeira visita
├── icons/                   # ícones 192, 512 e maskable
├── exemplo_financeiro.xlsx  # 42 linhas para testar (tem 1 ID repetido e 1 data inválida de propósito)
├── modelo_planilha.xlsx     # modelo em branco para entregar ao cliente
└── README.md
```

## Como o `js/app.js` está organizado

| Trecho | O que faz |
| --- | --- |
| `num`, `iso`, `stt` | Leem valor (`1.234,56`), data (`31/12/2026` ou data do Excel) e status (Pago, A vencer, Atrasado) |
| `AL` | Nomes de coluna aceitos. `norm()` ignora acento, maiúscula e espaço |
| `ingest` | Valida a planilha: descarta linhas inválidas, remove IDs repetidos e devolve o relatório |
| `demo` | Gera os dados de exemplo da primeira abertura, sempre relativos à data de hoje |
| `agg` | Calcula saldo, totais por status, mês, serviço, categoria de saída e cliente. É a única fonte dos números |
| `openForm` | Formulário do lançamento manual (novo, editar, excluir, repetir) |
| `copiar` | Traz as contas do mês anterior para o mês atual, sem duplicar |
| `exportXlsx`, `backup`, `#rest` | Exportam para Excel, geram e restauram o backup em JSON |
| `fix` | Marca como atrasado o que está em aberto e já venceu |
| `home`, `list`, `ana`, `imp` | Uma função por tela. Cada uma devolve HTML em texto |
| `render`, `route` | Desenha a tela atual. A navegação usa `#inicio`, `#lancamentos`, `#analises`, `#importar` |
| `onFile` | Lê o arquivo, escolhe a aba que tem as colunas Valor e Vencimento e chama `ingest` |

Regras de negócio que valem conferir:
- **Em dia** = `pago / (pago + atrasado)`. O que ainda não venceu não entra na conta.
- Datas são guardadas como texto `AAAA-MM-DD`, o que evita erro de fuso horário.
- Linha com valor zero, negativo ou data inválida é ignorada e listada na tela de importação, em vez de virar R$ 0,00 em silêncio.
- Status em branco ou desconhecido conta como "A receber".
- Coluna **Tipo** (Entrada ou Saída) é opcional e, quando existe, manda. Sem ela, vale a escolha feita ao importar; valor negativo conta como o oposto dessa escolha.
- **Em dia** considera só as receitas.

## Planilha esperada

Primeira linha com os títulos, em qualquer ordem: **Valor** e **Vencimento** (obrigatórios), **Cliente**, **Serviço**, **Status**, **Tipo**, **ID** e **CNPJ** (opcionais). A aba pode ter qualquer nome. Veja `modelo_planilha.xlsx`.

## Limites conhecidos

- Os "insights" são regras fixas sobre os números, não IA. O consultor com Gemini do projeto original precisa de um pequeno servidor que guarde a chave da API.
- Não há login nem sincronização: os dados ficam no navegador do aparelho. Se a pessoa limpar os dados do navegador ou trocar de celular, perde tudo, então vale orientar o uso do backup.
- A tela de lançamentos mostra no máximo 60 linhas por vez (use a busca).
- CSV é lido como UTF-8 e, se falhar, como Windows-1252. Prefira `.xlsx`.
- Não há testes automatizados. Os pontos mais críticos para cobrir primeiro são `num`, `iso` e `ingest`.

## Como compartilhar e instalar

1. **Publique a pasta** em uma hospedagem estática com HTTPS (o app instalável exige HTTPS). Opções gratuitas: Netlify (arrastar a pasta em app.netlify.com/drop), Cloudflare Pages, GitHub Pages ou Vercel. Você recebe um link para mandar aos clientes. Um domínio próprio melhora a imagem de produto.
2. **Instalar no celular:** no Android, abra o link no Chrome e toque em "Instalar app". No iPhone, abra no Safari, toque em Compartilhar e em "Adicionar à Tela de Início". O app abre em tela cheia, com ícone próprio, e funciona sem internet depois da primeira visita.
3. **Lojas de aplicativos (opcional):** o mesmo código pode virar app da Google Play e da App Store com Capacitor ou PWABuilder. Isso exige conta de desenvolvedor paga em cada loja e revisão da Apple. Confira os valores atuais antes de decidir.

Para vender com cobrança e dados sincronizados entre aparelhos, o passo seguinte é um back-end (por exemplo Supabase ou Firebase) com login e pagamento recorrente.

## Próximos passos possíveis

- Filtro por período e comparação com o mês anterior.
- Nome e cor do cliente na barra do topo, para vender com a marca de cada um.
- Baixar a SheetJS para uma pasta `vendor/` e funcionar offline.
- Back-end com login, sincronização, histórico de importações e o consultor de IA.
