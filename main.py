from src.ETL import executar_etl
from src.ai_insights import gerar_relatorio_executivo

if __name__ == "__main__":
    print("🚀 Iniciando Pipeline do Painel do Dono...\n")
    executar_etl()
    print("\n----------------------------------\n")
    gerar_relatorio_executivo()