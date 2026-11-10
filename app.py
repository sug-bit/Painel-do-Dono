import os
import sqlite3
import pandas as pd
import streamlit as st
from google import genai
from dotenv import load_dotenv

# Tenta carregar o arquivo .env local (se estiver rodando no PC)
load_dotenv()

# Configuração da página do dashboard
st.set_page_config(
    page_title="Painel do Dono",
    page_icon="📊",
    layout="wide"
)

st.title("📊 Painel do Dono - Gestão Inteligente")
st.markdown("Bem-vindo ao seu painel executivo automatizado com ETL e Inteligência Artificial.")

# Função para garantir que o banco de dados exista e carregar os dados
@st.cache_data
def carregar_dados():
    caminho_db = "data/database.db"
    
    # Se o banco não existir, executa o script de ETL para gerá-lo automaticamente
    if not os.path.exists(caminho_db):
        os.makedirs("data", exist_ok=True)
        try:
            # Importa e executa a função de ETL para criar a base
            import sys
            sys.path.append(os.path.abspath("src"))
            from ETL import executar_etl
            executar_etl()
        except Exception:
            pass
            
    if not os.path.exists(caminho_db):
        return None
        
    conn = sqlite3.connect(caminho_db)
    df = pd.read_sql_query("SELECT * FROM fato_financeiro", conn)
    conn.close()
    return df

df = carregar_dados()

if df is None or df.empty:
    st.error("❌ Banco de dados não encontrado ou vazio! Verifique se os dados brutos e o ETL estão configurados corretamente na pasta src/.")
else:
    # Métricas principais no topo (Cards)
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
            
            # Pega a chave da API (funciona via .env local ou via Secrets do Streamlit Cloud)
            api_key = os.getenv("GEMINI_API_KEY")
            if not api_key and hasattr(st, "secrets") and "GEMINI_API_KEY" in st.secrets:
                api_key = st.secrets["GEMINI_API_KEY"]
                
            relatorio = None
            if api_key:
                client = genai.Client(api_key=api_key)
                modelos_para_testar = ['gemini-2.5-flash', 'gemini-3.8-flash']
                for modelo in modelos_para_testar:
                    try:
                        res = client.models.generate_content(model=modelo, contents=prompt)
                        if res and res.text:
                            relatorio = res.text
                            break
                    except Exception:
                        continue
            
            # Fallback inteligente caso a IA esteja temporariamente instável na nuvem
            if not relatorio:
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