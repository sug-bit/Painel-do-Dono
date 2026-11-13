# Painel do Dono

App financeiro que roda no navegador. Você importa uma planilha de Excel e ele mostra quanto já entrou, quanto falta receber e o que está em atraso, com layout pensado primeiro para o celular.

Não tem servidor, banco de dados nem etapa de build. Os dados da planilha ficam só no aparelho de quem usa (`localStorage`).

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
| `agg` | Calcula totais por status, mês, serviço e cliente. É a única fonte dos números |
| `home`, `list`, `ana`, `imp` | Uma função por tela. Cada uma devolve HTML em texto |
| `render`, `route` | Desenha a tela atual. A navegação usa `#inicio`, `#lancamentos`, `#analises`, `#importar` |
| `onFile` | Lê o arquivo, escolhe a aba que tem as colunas Valor e Vencimento e chama `ingest` |

Regras de negócio que valem conferir:
- **Em dia** = `pago / (pago + atrasado)`. O que ainda não venceu não entra na conta.
- Datas são guardadas como texto `AAAA-MM-DD`, o que evita erro de fuso horário.
- Linha com valor zero, negativo ou data inválida é ignorada e listada na tela de importação, em vez de virar R$ 0,00 em silêncio.
- Status em branco ou desconhecido conta como "A receber".

## Planilha esperada

Primeira linha com os títulos, em qualquer ordem: **Valor** e **Vencimento** (obrigatórios), **Cliente**, **Serviço**, **Status**, **ID** e **CNPJ** (opcionais). A aba pode ter qualquer nome. Veja `modelo_planilha.xlsx`.

## Limites conhecidos

- Os "insights" são regras fixas sobre os números, não IA. O consultor com Gemini do projeto original precisa de um pequeno servidor que guarde a chave da API.
- Não há login nem multiusuário: cada pessoa vê só a planilha que importou no próprio aparelho.
- A tela de lançamentos mostra no máximo 60 linhas por vez (use a busca).
- CSV é lido como UTF-8 e, se falhar, como Windows-1252. Prefira `.xlsx`.
- Não há testes automatizados. Os pontos mais críticos para cobrir primeiro são `num`, `iso` e `ingest`.

## Próximos passos possíveis

- Filtro por período e comparação com o mês anterior.
- Nome e cor do cliente na barra do topo, para vender com a marca de cada um.
- Baixar a SheetJS para uma pasta `vendor/` e funcionar offline.
- Back-end com login, histórico de importações e o consultor de IA.
