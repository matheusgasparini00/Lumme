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
