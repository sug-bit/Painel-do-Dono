import pandas as pd
import sqlite3
import re
import os

def limpar_cnpj(cnpj):
    if pd.isna(cnpj): return None
    digits = re.sub(r'\D', '', str(cnpj))
    return digits if len(digits) == 14 else None

def executar_etl():
    print("🔄 Rodando o ETL: Limpando e unificando dados...")
    os.makedirs("data", exist_ok=True)
    caminho_csv = "data/raw_planilhas/exemplo_financeiro.csv"
    caminho_db = "data/database.db"

    if not os.path.exists(caminho_csv):
        print(f"❌ Arquivo {caminho_csv} não encontrado!")
        return

    df = pd.read_csv(caminho_csv)
    df['cnpj_limpo'] = df['cnpj'].apply(limpar_cnpj)
    df['valor'] = pd.to_numeric(df['valor'], errors='coerce').fillna(0.0)
    df['data_vencimento'] = pd.to_datetime(df['data_vencimento'])
    df = df.drop_duplicates(subset=['id_transacao'])

    conn = sqlite3.connect(caminho_db)
    df.to_sql('fato_financeiro', conn, if_exists='replace', index=False)
    conn.close()
    print("✅ Sucesso! Dados salvos e limpos no Data Warehouse local.")

if __name__ == "__main__":
    executar_etl()