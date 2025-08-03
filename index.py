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
            id INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
            nome VARCHAR(255),
            sobrenome VARCHAR(255),
            email VARCHAR(255),
            data_nasc DATE,
            senha VARCHAR(255)
        )
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
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        )
        """
    ),

      "orcamento_despesas": (
        """
        CREATE TABLE orcamento_despesas (
            id INT AUTO_INCREMENT PRIMARY KEY,
            usuario_id INT NOT NULL,
            nome VARCHAR(255) NOT NULL,
            valor DECIMAL(10,2) NOT NULL,
            data_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
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
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    )
    """
)

}

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
        cursor.close()
        cnx.close()

    except mysql.connector.Error as err:
        print(f"Erro na conexão: {err}")

if __name__ == "__main__":
    main()
