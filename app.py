import os
import sqlite3
import pandas as pd
import streamlit as st
from google import genai
from dotenv import load_dotenv

# Carrega variáveis locais
load_dotenv()

# Configuração da página em modo responsivo amplo
st.set_page_config(
    page_title="Painel do Dono | Gestão Financeira",
    page_icon="💳",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Estilização CSS leve para cara de aplicativo moderno
st.markdown("""
    <style>
    .stMetric {
        background-color: #1e222d;
        padding: 15px;
        border-radius: 10px;
        border: 1px solid #2e3440;
    }
    </style>
""", unsafe_allow_html=True)

CAMINHO_DB = "data/database.db"

# Função para garantir a existência do banco e carregar os dados
def obter_conexao():
    if not os.path.exists(CAMINHO_DB):
        os.makedirs("data", exist_ok=True)
        try:
            import sys
            sys.path.append(os.path.abspath("src"))
            from ETL import executar_etl
            executar_etl()
        except Exception:
            pass
    return sqlite3.connect(CAMINHO_DB)

def carregar_dados():
    conn = obter_conexao()
    try:
        df = pd.read_sql_query("SELECT * FROM fato_financeiro", conn)
    except Exception:
        df = pd.DataFrame()
    finally:
        conn.close()
    return df

# --- NAVEGAÇÃO LATERAL (MENU DE APP) ---
st.sidebar.image("https://cdn-icons-png.flaticon.com/512/2830/2830284.png", width=60)
st.sidebar.title("Painel do Dono")
st.sidebar.caption("Gestão Financeira & Inteligência Artificial")

menu = st.sidebar.radio(
    "Navegação",
    ["📊 Visão Geral", "➕ Cadastrar Pessoa / Lançamento", "🤖 Consultor Gemini IA"],
    index=0
)

df = carregar_dados()

# --- PÁGINA 1: VISÃO GERAL (DASHBOARD FINTECH) ---
if menu == "📊 Visão Geral":
    st.title("📊 Visão Geral do Caixa")
    st.caption("Acompanhamento das entradas, pendências e distribuição de serviços.")

    if df.empty:
        st.warning("Nenhum dado encontrado no banco. Cadastre um novo lançamento no menu lateral!")
    else:
        # Métricas de topo (Cards Estilo Fintech)
        total_pago = df[df['status'] == 'PAGO']['valor'].sum()
        total_atrasado = df[df['status'] == 'ATRASADO']['valor'].sum()
        total_geral = total_pago + total_atrasado
        taxa_recuperacao = (total_pago / total_geral * 100) if total_geral > 0 else 0

        c1, c2, c3 = st.columns(3)
        c1.metric("💰 Faturamento Recebido", f"R$ {total_pago:,.2f}")
        c2.metric("⚠️ Total em Inadimplência", f"R$ {total_atrasado:,.2f}", delta=f"-R$ {total_atrasado:,.2f}", delta_color="inverse")
        c3.metric("📈 Taxa de Adimplência", f"{taxa_recuperacao:.1f}%")

        st.divider()

        # Gráficos da aplicação
        g1, g2 = st.columns(2)
        with g1:
            st.subheader("📌 Receita por Serviço")
            grafico_servicos = df.groupby("servico")["valor"].sum().reset_index()
            st.bar_chart(grafico_servicos, x="servico", y="valor")

        with g2:
            st.subheader("⚖️ Status das Cobranças")
            grafico_status = df.groupby("status")["valor"].sum().reset_index()
            st.bar_chart(grafico_status, x="status", y="valor")

        st.divider()
        st.subheader("📋 Tabela de Lançamentos Recentes")
        st.dataframe(df, use_container_width=True)

# --- PÁGINA 2: FORMULÁRIO DE CADASTRO ---
elif menu == "➕ Cadastrar Pessoa / Lançamento":
    st.title("➕ Adicionar Nova Pessoa / Lançamento")
    st.markdown("Insira novos clientes ou movimentações financeiras diretamente na base do sistema.")

    with st.form("form_novo_registro", clear_on_submit=True):
        col_nome, col_servico = st.columns(2)
        with col_nome:
            cliente_nome = st.text_input("Nome do Cliente / Pessoa")
        with col_servico:
            servico_nome = st.text_input("Serviço Contratado", value="Consultoria")

        col_valor, col_status = st.columns(2)
        with col_valor:
            valor_registro = st.number_input("Valor (R$)", min_value=0.0, step=50.0, format="%.2f")
        with col_status:
            status_registro = st.selectbox("Status do Pagamento", ["PAGO", "ATRASADO"])

        btn_salvar = st.form_submit_button("💾 Salvar Registro")

    if btn_salvar:
        if not cliente_nome.strip():
            st.error("Por favor, preencha o nome do cliente!")
        else:
            conn = obter_conexao()
            cursor = conn.cursor()
            # Insere o novo lançamento na tabela do banco
            cursor.execute("""
                INSERT INTO fato_financeiro (cliente, servico, valor, status)
                VALUES (?, ?, ?, ?)
            """, (cliente_nome, servico_nome, valor_registro, status_registro))
            conn.commit()
            conn.close()
            
            st.success(f"✅ Lançamento para **{cliente_nome}** adicionado com sucesso!")
            st.cache_data.clear()

# --- PÁGINA 3: CONSULTOR GEMINI IA ---
elif menu == "🤖 Consultor Gemini IA":
    st.title("🤖 Consultoria Executiva com IA")
    st.markdown("Gere diagnósticos estratégicos baseados em todos os lançamentos cadastrados no sistema.")

    if df.empty:
        st.warning("Não há dados cadastrados para a IA analisar.")
    else:
        total_pago = df[df['status'] == 'PAGO']['valor'].sum()
        total_atrasado = df[df['status'] == 'ATRASADO']['valor'].sum()

        if st.button("🚀 Gerar Análise Financeira Completa", type="primary"):
            with st.spinner("O Gemini está analisando sua carteira de clientes..."):
                prompt = f"""
                Atue como um Consultor Financeiro Sênior. Analise os seguintes dados financeiros da empresa:
                - Faturamento Total Recebido: R$ {total_pago:,.2f}
                - Total em Inadimplência/Atraso: R$ {total_atrasado:,.2f}
                - Lista de Serviços: {df['servico'].value_counts().to_dict()}
                - Clientes Cadastrados: {df['cliente'].tolist()}
                
                Gere um resumo executivo direto e profissional contendo:
                1. Diagnóstico da Saúde do Caixa
                2. Alerta sobre os Clientes em Inadimplência
                3. Recomendação Estratégica para aumentar as receitas hoje
                """

                api_key = os.getenv("GEMINI_API_KEY")
                if not api_key and hasattr(st, "secrets") and "GEMINI_API_KEY" in st.secrets:
                    api_key = st.secrets["GEMINI_API_KEY"]

                relatorio = None
                if api_key:
                    client = genai.Client(api_key=api_key)
                    for modelo in ['gemini-2.5-flash', 'gemini-3.8-flash']:
                        try:
                            res = client.models.generate_content(model=modelo, contents=prompt)
                            if res and res.text:
                                relatorio = res.text
                                break
                        except Exception:
                            continue

                if not relatorio:
                    relatorio = f"""
                    [RELATÓRIO GERADO POR MOTOR ANALÍTICO LOCAL]
                    
                    1. Diagnóstico do Caixa:
                    - Faturamento liquidado: R$ {total_pago:,.2f}. Operações com saldo positivo.
                    
                    2. Alerta de Risco:
                    - Total inadimplente: R$ {total_atrasado:,.2f}. Recomenda-se acionar os contratos com pendências.
                    
                    3. Ação Comercial:
                    - Focar na conversão de novos serviços e na retenção da base atual de clientes.
                    """

                st.success("Relatório gerado!")
                st.markdown(relatorio)