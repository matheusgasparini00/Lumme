import mysql.connector
from mysql.connector import errorcode

config = {
    "host": "localhost",
    "user": "root",
    "password": ""
}

DB_NAME = "lumme"

TABLES = {
    "usuarios": (
        """
        CREATE TABLE usuarios (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nome VARCHAR(255),
            sobrenome VARCHAR(255),
            email VARCHAR(255) UNIQUE,
            data_nasc DATE,
            senha VARCHAR(255),
            avatar VARCHAR(255) DEFAULT NULL
        ) ENGINE=InnoDB
        """
    ),

    "orcamentos": (
        """
        CREATE TABLE orcamentos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            usuario_id INT NOT NULL,
            salario DECIMAL(10,2),
            despesa_total DECIMAL(10,2),
            superavit DECIMAL(10,2),
            data_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
            INDEX idx_usuario_mes (usuario_id, data_registro)
        ) ENGINE=InnoDB
        """
    ),

    "orcamento_despesas": (
        """
        CREATE TABLE orcamento_despesas (
            id INT AUTO_INCREMENT PRIMARY KEY,
            usuario_id INT NOT NULL,
            nome VARCHAR(100) NOT NULL,
            valor DECIMAL(10,2) NOT NULL,
            data_registro DATE NOT NULL,
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
        ) 
        """
    ),

    "metas": (
        """
        CREATE TABLE metas (
            id INT AUTO_INCREMENT PRIMARY KEY,
            usuario_id INT NOT NULL,
            titulo VARCHAR(255) NOT NULL,
            valor_objetivo DECIMAL(10,2) NOT NULL,
            valor_atual DECIMAL(10,2) DEFAULT 0.00,
            data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
        ) ENGINE=InnoDB
        """
    ),

    "diario_anotacoes": (
        """
        CREATE TABLE diario_anotacoes (
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        """
    ),

    "notificacoes": (
        """
        CREATE TABLE notificacoes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            usuario_id INT NOT NULL,
            mensagem VARCHAR(255) NOT NULL,
            url_destino VARCHAR(255),
            lida BOOLEAN DEFAULT FALSE,
            criada_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
        ) ENGINE=InnoDB
        """
    ),

    "configuracoes": (
        """
        CREATE TABLE configuracoes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            usuario_id INT NOT NULL,
            notificacoes_ativas BOOLEAN DEFAULT TRUE,
            sons_ativos BOOLEAN DEFAULT TRUE,
            dois_fatores BOOLEAN DEFAULT FALSE,
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
        ) ENGINE=InnoDB
        """
    )
}

TABLES["card_definitions"] = """
CREATE TABLE card_definitions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(40) NOT NULL UNIQUE,       -- ex.: META_CREATED, PCT_25, PCT_50, PCT_75, PCT_100
  label VARCHAR(100) NOT NULL,            -- ex.: "Meta criada", "25% da meta", etc.
  threshold_percent TINYINT NOT NULL      -- 0, 25, 50, 75, 100
) ENGINE=InnoDB
"""

TABLES["card_unlocks"] = """
CREATE TABLE card_unlocks (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  meta_id INT NOT NULL,
  card_code VARCHAR(40) NOT NULL,
  unlocked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_unlock (user_id, meta_id, card_code),
  FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (meta_id) REFERENCES metas(id) ON DELETE CASCADE
) ENGINE=InnoDB
"""


def criar_banco(cursor):
    try:
        cursor.execute(f"CREATE DATABASE {DB_NAME} DEFAULT CHARACTER SET 'utf8'")
        print(f"Banco de dados '{DB_NAME}' criado com sucesso.")
    except mysql.connector.Error as err:
        print(f"Erro ao criar banco de dados: {err}")

def criar_tabelas(cnx):
    cursor = cnx.cursor()
    for nome, ddl in TABLES.items():
        try:
            cursor.execute(ddl)
            print(f"Tabela '{nome}' criada com sucesso.")
        except mysql.connector.Error as err:
            if err.errno == errorcode.ER_TABLE_EXISTS_ERROR:
                print(f"Tabela '{nome}' já existe.")
            else:
                print(f"Erro ao criar a tabela '{nome}': {err}")
    cursor.close()

def seed_card_definitions(cnx):
    cur = cnx.cursor()
    cur.execute(
        "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=%s AND table_name='card_definitions'",
        (DB_NAME,)
    )
    exists = cur.fetchone()[0]
    cur.close()
    if not exists:
        return

    cur = cnx.cursor()
    cur.execute("SELECT COUNT(*) FROM card_definitions")
    count = cur.fetchone()[0]
    if count == 0:
        cur.executemany(
            "INSERT INTO card_definitions (code, label, threshold_percent) VALUES (%s,%s,%s)",
            [
                ("META_CREATED", "Meta criada", 0),
                ("PCT_25", "25% da meta", 25),
                ("PCT_50", "50% da meta", 50),
                ("PCT_75", "75% da meta", 75),
                ("PCT_100", "100% da meta", 100),
                ("META2_CREATED", "Segunda meta criada", 0),
                ("META2_50", "50% da segunda meta", 50),
                ("META2_100", "100% da segunda meta", 100),
            ]

        )
        cnx.commit()
        print("Seed de card_definitions aplicado.")
    cur.close()

def main():
    try:
        cnx = mysql.connector.connect(**config)
        cursor = cnx.cursor()

        try:
            cursor.execute(f"USE {DB_NAME}")
            print(f"Banco de dados '{DB_NAME}' já existe.")
        except mysql.connector.Error as err:
            if err.errno == errorcode.ER_BAD_DB_ERROR:
                criar_banco(cursor)
                cursor.execute(f"USE {DB_NAME}")
                criar_tabelas(cnx)
            else:
                print(err)

        criar_tabelas(cnx)
        seed_card_definitions(cnx)

        cursor.close()
        cnx.close()

    except mysql.connector.Error as err:
        print(f"Erro na conexão: {err}")

if __name__ == "__main__":
    main()
