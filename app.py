import os
import sqlite3
import pandas as pd
import streamlit as st
from google import genai
from dotenv import load_dotenv

load_dotenv()

# Configuração da página
st.set_page_config(
    page_title="Painel do Dono",
    page_icon="📊",
    layout="wide"
)

st.title("📊 Painel do Dono - Gestão Inteligente")
st.markdown("Bem-vindo ao seu painel executivo automatizado com ETL e Inteligência Artificial.")

# Função para carregar os dados do SQLite
@st.cache_data
def carregar_dados():
    caminho_db = "data/database.db"
    if not os.path.exists(caminho_db):
        return None
    conn = sqlite3.connect(caminho_db)
    df = pd.read_sql_query("SELECT * FROM fato_financeiro", conn)
    conn.close()
    return df

df = carregar_dados()

if df is None:
    st.error("❌ Banco de dados não encontrado! Execute o seu script ETL (`src/ETL.py`) primeiro.")
else:
    # Métricas principais no topo (estilo cards de celular/dashboard)
    total_recebido = df[df['status'] == 'PAGO']['valor'].sum()
    total_inadimplente = df[df['status'] == 'ATRASADO']['valor'].sum()
    
    col1, col2 = st.columns(2)
    with col1:
        st.metric(label="💰 Faturamento Recebido", value=f"R$ {total_recebido:,.2f}")
    with col2:
        st.metric(label="⚠️ Total em Atraso (Inadimplência)", value=f"R$ {total_inadimplente:,.2f}")
    
    st.divider()

    # Seção da Tabela de Dados
    st.subheader("📋 Detalhamento dos Registros Financeiros")
    st.dataframe(df, use_container_width=True)

    st.divider()

    # Seção da Inteligência Artificial (Gemini)
    st.subheader("🤖 Consultoria Executiva com Inteligência Artificial")
    
    if st.button("Gerar Relatório e Insights com o Gemini", type="primary"):
        with st.spinner("Analisando dados financeiros e consultando a Inteligência Artificial..."):
            prompt = f"""
            Atue como um Consultor Financeiro Sênior. Analise os seguintes dados financeiros da empresa:
            - Faturamento Total Recebido: R$ {total_recebido:,.2f}
            - Total em Inadimplência/Atraso: R$ {total_inadimplente:,.2f}
            - Serviços mais contratados: {df['servico'].value_counts().to_dict()}
            
            Gere um resumo executivo direto e profissional para o dono da empresa contendo:
            1. Diagnóstico do Caixa Atual
            2. Alerta de Risco (Inadimplência)
            3. Recomendação Prática de Ação Comercial para hoje
            """
            
            try:
                client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
                response = client.models.generate_content(
                    model='gemini-3.8-flash',
                    contents=prompt
                )
                relatorio = response.text
            except Exception:
                # Fallback caso a API esteja com alta demanda
                relatorio = f"""
                [RELATÓRIO GERADO POR MOTOR ANALÍTICO LOCAL - IA OFFLINE]
                
                1. Diagnóstico do Caixa Atual:
                - O faturamento total recebido encontra-se em R$ {total_recebido:,.2f}, demonstrando liquidez saudável nas operações liquidadas.
                
                2. Alerta de Risco (Inadimplência):
                - Identificado montante de R$ {total_inadimplente:,.2f} em status ATRASADO, o que exige monitoramento rigoroso para evitar impacto no fluxo de caixa operacional.
                
                3. Recomendação Prática de Ação Comercial para hoje:
                - Intensificar o contato de cobrança preventiva para os contratos em atraso e priorizar a retenção dos serviços de maior demanda.
                """
            
            st.success("Relatório gerado com sucesso!")
            st.markdown(relatorio)