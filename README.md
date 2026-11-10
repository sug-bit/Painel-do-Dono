# 📊 Painel do Dono - Pipeline de Dados & IA

Pipeline de Engenharia de Dados (ETL) desenvolvido em Python que processa dados financeiros brutos, armazena em um Data Warehouse local (SQLite) e integra a API do Google Gemini para gerar análises financeiras e resumos executivos automatizados.

---

## 🚀 Tecnologias Utilizadas

* **Python 3.x**
* **Pandas** (Manipulação e Limpeza de Dados)
* **SQLAlchemy & SQLite** (Modelagem e Armazenamento no Data Warehouse)
* **Google GenAI SDK** (Integração com Inteligência Artificial / Gemini)
* **Python-Dotenv** (Gerenciamento seguro de variáveis de ambiente)

---

## 📂 Estrutura do Projeto

```text
painel-do-dono/
├── data/
│   ├── raw_planilhas/      # Arquivos CSV de entrada (dados brutos)
│   └── database.db         # Data Warehouse local (SQLite)
├── src/
│   ├── ETL.py              # Script de extração, tratamento e carga
│   └── ai_insights.py      # Módulo de conexão e geração de insights com IA
├── .env                    # Variáveis de ambiente (Chave da API)
├── .gitignore
├── main.py                 # Orquestrador principal do pipeline
└── requirements.txt        # Dependências do projeto