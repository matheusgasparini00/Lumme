# bootstrap_db.py
import os
import sys
import mysql.connector
from mysql.connector import errorcode

# ====== Config via variáveis de ambiente ======
# No Railway, pegue em "Connect/Variables": MYSQLHOST, MYSQLPORT, MYSQLUSER, MYSQLPASSWORD, MYSQLDATABASE
DB_HOST = os.environ.get("MYSQLHOST", os.environ.get("DB_HOST", "localhost"))
DB_PORT = int(os.environ.get("MYSQLPORT", os.environ.get("DB_PORT", "3306")))
DB_USER = os.environ.get("MYSQLUSER", os.environ.get("DB_USER", "root"))
DB_PASS = os.environ.get("MYSQLPASSWORD", os.environ.get("DB_PASSWORD", ""))
DB_NAME = os.environ.get("MYSQLDATABASE", os.environ.get("DB_NAME", "lumme"))

# Somente para AMBIENTE LOCAL: permitir criar o DATABASE automaticamente
# No Railway, deixe ALLOW_CREATE_DB vazio/0 (não cria DB)
ALLOW_CREATE_DB = os.environ.get("ALLOW_CREATE_DB", "0") in ("1", "true", "True")

# ====== DDLs idempotentes (IF NOT EXISTS) ======
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
            CONSTRAINT fk_orcamentos_user
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
            CONSTRAINT fk_despesas_user
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
            CONSTRAINT fk_metas_user
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
            CONSTRAINT fk_diario_user
              FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
              ON DELETE CASCADE ON UPDATE RESTRICT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """
}

def connect_no_db():
    """Conecta sem selecionar database (para criar DB localmente, se permitido)."""
    return mysql.connector.connect(
        host=DB_HOST, port=DB_PORT, user=DB_USER, password=DB_PASS,
        charset="utf8mb4"
    )

def connect_with_db():
    """Conecta já usando o database (modo Railway/produção)."""
    return mysql.connector.connect(
        host=DB_HOST, port=DB_PORT, user=DB_USER, password=DB_PASS,
        database=DB_NAME, charset="utf8mb4"
    )

def ensure_database():
    """Somente local: cria o database se não existir (idempotente)."""
    if not ALLOW_CREATE_DB:
        return
    cnx = connect_no_db()
    cur = cnx.cursor()
    try:
        cur.execute(f"CREATE DATABASE IF NOT EXISTS `{DB_NAME}` DEFAULT CHARACTER SET utf8mb4")
        print(f"✓ DATABASE `{DB_NAME}` ok (criado/confirmado).")
    finally:
        cur.close()
        cnx.close()

def create_tables():
    cnx = connect_with_db()
    cur = cnx.cursor()
    try:
        for name, ddl in TABLES.items():
            cur.execute(ddl)
            print(f"✓ TABLE `{name}` ok (criada/confirmada).")
    finally:
        cur.close()
        cnx.close()

def show_tables():
    cnx = connect_with_db()
    cur = cnx.cursor()
    try:
        cur.execute("SHOW TABLES")
        rows = cur.fetchall()
        names = [r[0] for r in rows]
        print("Tabelas existentes:", ", ".join(names) if names else "(nenhuma)")
    finally:
        cur.close()
        cnx.close()

def main():
    print(f"Conectando em {DB_HOST}:{DB_PORT} db={DB_NAME} user={DB_USER}")
    try:
        # 1) Em produção (Railway): NÃO cria DB; Local (se ALLOW_CREATE_DB=1): cria.
        ensure_database()
        # 2) Cria/garante tabelas (idempotente)
        create_tables()
        # 3) Lista para conferência
        show_tables()
        print("Concluído com sucesso.")
    except mysql.connector.Error as err:
        print("! Erro MySQL:", err)
        sys.exit(1)

if __name__ == "__main__":
    main()
