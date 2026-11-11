import os
import sqlite3
from contextlib import closing
from pathlib import Path
import re

import pandas as pd
import streamlit as st
import plotly.express as px
import plotly.graph_objects as go
from google import genai
from dotenv import load_dotenv

load_dotenv()

# ============================================================
# CONFIGURAÇÃO DE PÁGINA E CAMINHOS
# ============================================================
st.set_page_config(
    page_title="Central de Inteligência Financeira",
    page_icon="💼",
    layout="wide",
    initial_sidebar_state="expanded",
)

BASE_DIR = Path(__file__).resolve().parent
CAMINHO_DB = BASE_DIR / "data" / "database.db"
CAMINHO_CSV = BASE_DIR / "data" / "raw_planilhas" / "exemplo_financeiro.csv"

# ============================================================
# CSS PREMIUM (ADAPTÁVEL AO TEMA CLARO/ESCURO)
# ============================================================
st.markdown(
    """
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    /* Fonte Global */
    html, body, [class*="css"] { font-family: 'Inter', sans-serif; }
    footer {visibility: hidden;}
    
    /* Estilo dos Cards (Métricas) */
    div[data-testid="metric-container"] {
        background-color: var(--secondary-background-color);
        border: 1px solid rgba(128, 128, 128, 0.15);
        border-radius: 16px;
        padding: 24px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        transition: all 0.3s ease;
    }
    div[data-testid="metric-container"]:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 20px -8px rgba(0, 0, 0, 0.15);
        border-color: #1e40af;
    }
    
    /* Rótulos e Valores dos Cards */
    div[data-testid="metric-container"] label { 
        color: var(--text-color) !important; 
        opacity: 0.7; 
        font-weight: 500;
        text-transform: uppercase;
        font-size: 0.75rem !important;
        letter-spacing: 0.5px;
    }
    div[data-testid="metric-container"] div[data-testid="stMetricValue"] { 
        color: var(--text-color) !important; 
        font-weight: 700; 
        font-size: 2rem !important;
    }
    
    /* Estilo para a Tabela e Containers de Gráficos */
    div[data-testid="stVerticalBlockBorderWrapper"] {
        border-radius: 16px;
        border: 1px solid rgba(128, 128, 128, 0.15) !important;
        background-color: var(--secondary-background-color);
        padding: 16px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.02);
    }
    
    /* Botões */
    .stButton button {
        border-radius: 10px;
        font-weight: 600;
        transition: all 0.2s;
        border: 1px solid rgba(128, 128, 128, 0.2);
    }
    .stButton button:hover {
        border-color: #1e40af;
        color: #1e40af;
    }
    
    /* Títulos */
    h1 { font-weight: 700 !important; letter-spacing: -0.5px; }
    h2, h3 { font-weight: 600 !important; }
    </style>
    """,
    unsafe_allow_html=True,
)

def formata_moeda(valor):
    return f"R$ {valor:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

# ============================================================
# AUTO-ETL E LEITURA (CORRIGIDO)
# ============================================================
def limpar_cnpj(cnpj):
    if pd.isna(cnpj): return None
    digits = re.sub(r'\D', '', str(cnpj))
    return digits if len(digits) == 14 else None

def garantir_banco_de_dados():
    precisa_gerar = False
    if not CAMINHO_DB.exists():
        precisa_gerar = True
    else:
        try:
            with sqlite3.connect(CAMINHO_DB) as conn:
                df_check = pd.read_sql_query("SELECT count(*) as qtd FROM fato_financeiro", conn)
                if df_check['qtd'].iloc[0] == 0: precisa_gerar = True
        except Exception:
            precisa_gerar = True

    if precisa_gerar and CAMINHO_CSV.exists():
        os.makedirs(CAMINHO_DB.parent, exist_ok=True)
        df = pd.read_csv(CAMINHO_CSV)
        if 'cnpj' in df.columns:
            df['cnpj_limpo'] = df['cnpj'].apply(limpar_cnpj)
        df['valor'] = pd.to_numeric(df['valor'], errors='coerce').fillna(0.0)
        df['data_vencimento'] = pd.to_datetime(df['data_vencimento'])
        df = df.drop_duplicates(subset=['id_transacao'])
        
        conn = sqlite3.connect(CAMINHO_DB)
        df.to_sql('fato_financeiro', conn, if_exists='replace', index=False)
        conn.close()

garantir_banco_de_dados()

def carregar_dados() -> pd.DataFrame:
    try:
        with closing(sqlite3.connect(CAMINHO_DB)) as conn:
            df = pd.read_sql_query("SELECT * FROM fato_financeiro", conn)
        if not df.empty and "data_vencimento" in df.columns:
            df["data_vencimento"] = pd.to_datetime(df["data_vencimento"], errors='coerce')
        return df
    except Exception:
        return pd.DataFrame()

df_original = carregar_dados()

# ============================================================
# INTELIGÊNCIA ARTIFICIAL
# ============================================================
def consultar_ia(pergunta: str, contexto_dados: str) -> str:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key: return "⚠️ Configure a `GEMINI_API_KEY` no arquivo `.env`."
    try:
        client = genai.Client(api_key=api_key)
        prompt = f"Você é um consultor financeiro. Analise:\n{contexto_dados}\nPergunta: {pergunta}\nResponda em português."
        response = client.models.generate_content(model="gemini-2.0-flash", contents=prompt)
        return response.text
    except Exception as e:
        return f"❌ Erro: {e}"

# ============================================================
# BARRA LATERAL E FILTROS
# ============================================================
with st.sidebar:
    st.markdown("## 💼 Central Financeira")
    st.caption("Gestão Contábil Inteligente")
    st.divider()
    
    pagina = st.radio("Navegação", ["📊 Visão Geral", "📋 Dados Brutos", "🤖 Consultor IA"], label_visibility="collapsed")
    st.divider()
    
    if pagina == "📊 Visão Geral" and not df_original.empty:
        st.markdown("### 🔍 Filtros")
        
        data_min = df_original["data_vencimento"].min()
        data_max = df_original["data_vencimento"].max()
        
        if pd.notnull(data_min) and pd.notnull(data_max):
            filtro_data = st.date_input("Período de Vencimento", [data_min.date(), data_max.date()])
        else:
            filtro_data = []
        
        valor_max = float(df_original["valor"].max()) if pd.notnull(df_original["valor"].max()) else 10000.0
        filtro_valor = st.slider("Valor Mínimo (R$)", 0.0, valor_max, 0.0, step=100.0)
        
        busca_cnpj = st.text_input("Buscar CNPJ (apenas números)")
        st.divider()

    if st.button("🔄 Recriar Banco e Recarregar", use_container_width=True):
        if CAMINHO_DB.exists():
            os.remove(CAMINHO_DB)
        garantir_banco_de_dados()
        st.rerun()
        
    st.caption("© 2025 - Uso Interno")

# ============================================================
# APLICAÇÃO DOS FILTROS
# ============================================================
df = df_original.copy()

if pagina == "📊 Visão Geral" and not df.empty:
    if len(filtro_data) == 2:
        df = df[(df["data_vencimento"].dt.date >= filtro_data[0]) & (df["data_vencimento"].dt.date <= filtro_data[1])]
    
    df = df[df["valor"] >= filtro_valor]
    
    if busca_cnpj:
        df = df[df["cnpj"].astype(str).str.contains(busca_cnpj)]

# ============================================================
# CÁLCULO DAS MÉTRICAS
# ============================================================
if not df.empty and "valor" in df.columns:
    total_geral = df["valor"].sum()
    qtd_transacoes = len(df)
    ticket_medio = total_geral / qtd_transacoes if qtd_transacoes > 0 else 0
    clientes_unicos = df["cnpj"].nunique() if "cnpj" in df.columns else 0
    
    if "status" in df.columns:
        df["status"] = df["status"].astype(str).str.upper()
        total_recebido = df.loc[df["status"] == "PAGO", "valor"].sum()
        total_atrasado = df.loc[df["status"] == "ATRASADO", "valor"].sum()
    else:
        total_recebido = total_geral
        total_atrasado = 0.0
        
    adimplencia = (total_recebido / total_geral * 100) if total_geral > 0 else 0
else:
    total_geral = total_recebido = total_atrasado = qtd_transacoes = ticket_medio = clientes_unicos = adimplencia = 0

# ============================================================
# PÁGINA: VISÃO GERAL
# ============================================================
if pagina == "📊 Visão Geral":
    st.markdown("<p style='color: #64748b; font-weight: 600; font-size: 0.85rem; letter-spacing: 1px; text-transform: uppercase;'>CENTRAL DE INTELIGÊNCIA FINANCEIRA</p>", unsafe_allow_html=True)
    st.title("Visão Geral do Negócio")
    st.markdown("Acompanhe os indicadores em tempo real e filtre os dados na barra lateral.")
    
    st.write("")

    # Linha 1: KPIs Principais
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        with st.container(border=True): 
            st.metric("Faturamento (Pago)", formata_moeda(total_recebido), delta="Caixa Realizado", delta_color="normal")
    with col2:
        with st.container(border=True): 
            st.metric("Valores Vencidos", formata_moeda(total_atrasado), delta="Atenção Necessária", delta_color="inverse")
    with col3:
        with st.container(border=True): 
            st.metric("Volume Financeiro", formata_moeda(total_geral), delta="Volume Total", delta_color="off")
    with col4:
        with st.container(border=True): 
            st.metric("Adimplência", f"{adimplencia:.1f}%", delta="Saúde do Caixa", delta_color="normal")

    st.write("")
    
    # Linha 2: KPIs Secundários
    col5, col6, col7 = st.columns(3)
    with col5:
        with st.container(border=True): st.metric("Transações no Filtro", qtd_transacoes)
    with col6:
        with st.container(border=True): st.metric("Ticket médio", formata_moeda(ticket_medio))
    with col7:
        with st.container(border=True): st.metric("Empresas (CNPJs)", clientes_unicos)

    st.write("")
    st.divider()

    if not df.empty:
        # Linha 3: Gráficos
        col_graf1, col_graf2 = st.columns([2, 1])
        
        with col_graf1:
            st.subheader("Receita por Serviço")
            servico_data = df.groupby("servico")["valor"].sum().reset_index().sort_values(by="valor", ascending=False)
            fig_bar = px.bar(
                servico_data, x="servico", y="valor",
                labels={"servico": "", "valor": "Faturamento (R$)"},
                color_discrete_sequence=["#1e40af"],
                text_auto='.2s'
            )
            fig_bar.update_layout(
                margin=dict(l=0, r=0, t=20, b=0),
                paper_bgcolor="rgba(0,0,0,0)",
                plot_bgcolor="rgba(0,0,0,0)",
                xaxis=dict(showgrid=False),
                yaxis=dict(showgrid=True, gridcolor="rgba(128,128,128,0.1)")
            )
            st.plotly_chart(fig_bar, use_container_width=True)
            
        with col_graf2:
            st.subheader("Status Financeiro")
            if "status" in df.columns:
                pizza_data = df.groupby("status")["valor"].sum().reset_index()
            else:
                pizza_data = pd.DataFrame({"status": ["Faturado"], "valor": [total_geral]})
                
            fig_pie = px.pie(
                pizza_data, names="status", values="valor", hole=0.65,
                color="status",
                color_discrete_map={"PAGO": "#10b981", "ATRASADO": "#ef4444"}
            )
            fig_pie.update_traces(textposition='inside', textinfo='percent+label')
            fig_pie.update_layout(
                margin=dict(l=0, r=0, t=20, b=0),
                paper_bgcolor="rgba(0,0,0,0)",
                plot_bgcolor="rgba(0,0,0,0)",
                showlegend=False
            )
            st.plotly_chart(fig_pie, use_container_width=True)

        st.write("")
        # Linha 4: Tabela de Transações
        with st.container(border=True):
            st.subheader("Últimas Transações Registradas")
            
            # Prepara o DF para a tabela
            df_tabela = df.sort_values(by="data_vencimento", ascending=False).head(6).copy()
            
            st.dataframe(
                df_tabela[["id_transacao", "cnpj", "servico", "valor", "data_vencimento", "status"]],
                use_container_width=True,
                hide_index=True,
                column_config={
                    "id_transacao": "ID",
                    "cnpj": "CNPJ",
                    "servico": "Serviço",
                    "valor": st.column_config.NumberColumn("Valor", format="R$ %.2f"),
                    "data_vencimento": st.column_config.DateColumn("Vencimento", format="DD/MM/YYYY"),
                    "status": st.column_config.TextColumn("Status", help="Situação da transação")
                },
            )

# ============================================================
# PÁGINA: DADOS BRUTOS
# ============================================================
elif pagina == "📋 Dados Brutos":
    st.title("📋 Base de Dados Completa")
    st.caption("Visualização e exportação dos dados vindos do ETL.")
    
    if not df_original.empty:
        csv = df_original.to_csv(index=False).encode('utf-8')
        st.download_button(
            label="📥 Baixar Base em CSV",
            data=csv,
            file_name='dados_financeiros.csv',
            mime='text/csv',
            type="primary"
        )
        st.write("")
        
        st.dataframe(
            df_original,
            use_container_width=True,
            hide_index=True,
            column_config={
                "valor": st.column_config.NumberColumn("Valor (R$)", format="R$ %.2f"),
                "data_vencimento": st.column_config.DateColumn("Vencimento", format="DD/MM/YYYY"),
            },
        )

# ============================================================
# PÁGINA: IA
# ============================================================
elif pagina == "🤖 Consultor IA":
    st.title("🤖 Consultor Financeiro IA")
    st.markdown("Utilize o poder do Gemini para analisar sua base de dados atual e obter insights estratégicos.")
    
    if not df_original.empty:
        resumo = f"Dados financeiros: Total de {len(df_original)} transações, somando {formata_moeda(df_original['valor'].sum())}. Ticket médio de {formata_moeda(df_original['valor'].mean())}. {df_original['cnpj'].nunique()} clientes únicos."
        
        with st.container(border=True):
            pergunta = st.text_area("O que você gostaria de saber sobre o seu negócio?", placeholder="Ex.: Como está a saúde do meu fluxo de caixa? Quais serviços estão me dando mais lucro?", height=120)
            
            col_btn, _ = st.columns([1, 3])
            with col_btn:
                if st.button("🚀 Gerar Análise", type="primary", use_container_width=True):
                    if pergunta.strip():
                        with st.spinner("Analisando dados..."):
                            resposta = consultar_ia(pergunta, resumo)
                        
                        st.markdown("### 💡 Insights da IA")
                        with st.container(border=True):
                            st.markdown(resposta)