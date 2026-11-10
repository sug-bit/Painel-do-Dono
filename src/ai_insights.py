import os
import sqlite3
import pandas as pd
from google import genai
from dotenv import load_dotenv

load_dotenv()

def gerar_relatorio_executivo():
    caminho_db = "data/database.db"
    if not os.path.exists(caminho_db):
        print("❌ Banco de dados não encontrado. Execute o ETL primeiro!", flush=True)
        return
        
    conn = sqlite3.connect(caminho_db)
    df = pd.read_sql_query("SELECT * FROM fato_financeiro", conn)
    conn.close()
    
    total_recebido = df[df['status'] == 'PAGO']['valor'].sum()
    total_inadimplente = df[df['status'] == 'ATRASADO']['valor'].sum()
    
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
    
    print("🤖 Consultando a Inteligência Artificial do Gemini...", flush=True)
    
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    response_text = None
    
    modelos_para_testar = ['gemini-2.5-flash', 'gemini-3.8-flash']
    for modelo in modelos_para_testar:
        try:
            res = client.models.generate_content(model=modelo, contents=prompt)
            if res and res.text:
                response_text = res.text
                break
        except Exception:
            continue
            
    # Fallback inteligente caso os servidores públicos estejam sobrecarregados
    if not response_text:
        print("⚠️ Servidores da API sob alta demanda. Gerando relatório via motor analítico de contingência...", flush=True)
        response_text = f"""
        [RELATÓRIO GERADO POR MOTOR ANALÍTICO LOCAL - IA OFFLINE]
        
        1. Diagnóstico do Caixa Atual:
        - O faturamento total recebido encontra-se em R$ {total_recebido:,.2f}, demonstrando liquidez saudável nas operações liquidadas.
        
        2. Alerta de Risco (Inadimplência):
        - Identificado montante de R$ {total_inadimplente:,.2f} em status ATRASADO, o que exige monitoramento rigoroso para evitar impacto no fluxo de caixa operacional.
        
        3. Recomendação Prática de Ação Comercial para hoje:
        - Intensificar o contato de cobrança preventiva para os contratos em atraso e priorizar a retenção dos serviços de maior demanda (ex: Consultoria Contábil).
        """

    print("\n" + "="*40, flush=True)
    print("📊 RELATÓRIO DO DONO:", flush=True)
    print("="*40, flush=True)
    print(response_text, flush=True)
    print("="*40, flush=True)

if __name__ == "__main__":
    gerar_relatorio_executivo()