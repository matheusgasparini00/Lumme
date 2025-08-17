import mysql.connector
from mysql.connector import errorcode
import os

# ======== PREENCHA AQUI COM AS CREDENCIAIS DO RAILWAY ========
# (ou exporte como variáveis de ambiente no seu sistema)
config = {
    "host":     os.environ.get("MYSQLHOST",     "<MYSQLHOST>"),
    "port":     int(os.environ.get("MYSQLPORT", "3306")),
    "user":     os.environ.get("MYSQLUSER",     "<MYSQLUSER>"),
    "password": os.environ.get("MYSQLPASSWORD", "<MYSQLPASSWORD>"),
    "database": os.environ.get("MYSQLDATABASE", "<MYSQLDATABASE>"),
    "charset":  "utf8mb4"
}

TABLES = {
    "usuarios": """
        CREATE TABLE IF NOT EXISTS usuarios (
            id INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
            nome VARCHAR(255),
            sobrenome VARCHAR(255),
            email VARCHAR(255) UNIQUE,
            data_nasc DATE,
            senha VARCHAR(255)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """,

    "orcamentos": """
        CREATE TABLE IF NOT EXISTS orcamentos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            usuario_id INT NOT NULL,
            salario DECIMAL(12,2) DEFAULT 0,
            despesa_total DECIMAL(12,2) DEFAULT 0,
            superavit DECIMAL(12,2) DEFAULT 0,
            data_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
                ON DELETE CASCADE ON UPDATE RESTRICT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """,

    "orcamento_despesas": """
        CREATE TABLE IF NOT EXISTS orcamento_despesas (
            id INT AUTO_INCREMENT PRIMARY KEY,
            usuario_id INT NOT NULL,
            nome VARCHAR(255) NOT NULL,
            valor DECIMAL(12,2) NOT NULL DEFAULT 0,
            data_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
                ON DELETE CASCADE ON UPDATE RESTRICT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """,

    "metas": """
        CREATE TABLE IF NOT EXISTS metas (
            id INT AUTO_INCREMENT PRIMARY KEY,
            usuario_id INT NOT NULL,
            titulo VARCHAR(255) NOT NULL,
            valor_objetivo DECIMAL(12,2) NOT NULL,
            valor_atual DECIMAL(12,2) NOT NULL DEFAULT 0.00,
            data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
                ON DELETE CASCADE ON UPDATE RESTRICT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """,

    "diario_anotacoes": """
        CREATE TABLE IF NOT EXISTS diario_anotacoes (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          usuario_id INT NOT NULL,
          categoria VARCHAR(60) NOT NULL,
          titulo VARCHAR(120) NOT NULL,
          texto TEXT NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP NULL DEFAULT NULL,
          INDEX idx_user_cat (usuario_id, categoria),
          FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """
}

def criar_tabelas(cnx):
    cursor = cnx.cursor()
    for nome, ddl in TABLES.items():
        try:
            cursor.execute(ddl)
            print(f"✓ Tabela '{nome}' OK")
        except mysql.connector.Error as err:
            if err.errno == errorcode.ER_TABLE_EXISTS_ERROR:
                print(f"= Tabela '{nome}' já existe")
            else:
                print(f"! Erro ao criar '{nome}': {err}")
    cursor.close()

def main():
    try:
        cnx = mysql.connector.connect(**config)
        print("Conectado ao Railway com sucesso.")
        criar_tabelas(cnx)
        cnx.close()
        print("Concluído.")
    except mysql.connector.Error as err:
        print(f"Erro na conexão: {err}")

if __name__ == "__main__":
    main()
