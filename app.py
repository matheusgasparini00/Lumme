from flask import Flask, request, render_template, redirect, session, url_for, flash
import mysql.connector
from flask import jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
import re

app = Flask(__name__)
app.secret_key = 'sua_chave_secreta_aqui'

def conectar_banco():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="",
        database="lumme"
    )

def login_obrigatorio(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'usuario' not in session:
            return redirect('/login')
        return f(*args, **kwargs)
    return decorated_function

@app.route('/')
def home():
    return redirect('/login')

@app.route('/index')
@login_obrigatorio
def index():
    nome = session.get('nome')
    sobrenome = session.get('sobrenome')
    return render_template('index.html', nome=nome)

@app.context_processor
def inject_user_info():
    return dict(
        nome=session.get('nome'),
        sobrenome=session.get('sobrenome')
)

@app.route('/logout')
def logout():
    session.clear()
    return redirect('/login')

@app.route('/cadastro', methods=['GET', 'POST'])
def cadastro():
    if request.method == 'POST':
        nome = request.form['nome']
        sobrenome = request.form['sobrenome']
        email = request.form['email']
        data_nasc = request.form['data_nasc']
        senha = request.form['senha']
        confirmar_senha = request.form['confirmar_senha']

        if not all([nome, sobrenome, email, data_nasc, senha, confirmar_senha]):
            flash('Preencha todos os campos.', 'alerta')
            return redirect('/cadastro')

        if senha != confirmar_senha:
            flash('As senhas não coincidem.', 'erro')
            return redirect('/cadastro')

        regex = r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$"
        if not re.match(regex, senha):
            flash('A senha deve conter maiúscula, minúscula, número e símbolo.', 'alerta')
            return redirect('/cadastro')

        senha_hash = generate_password_hash(senha)

        try:
            conn = conectar_banco()
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM usuarios WHERE email = %s", (email,))
            if cursor.fetchone():
                flash('Email já cadastrado.', 'alerta')
                return redirect('/cadastro')

            cursor.execute("""
                INSERT INTO usuarios (nome, sobrenome, email, data_nasc, senha)
                VALUES (%s, %s, %s, %s, %s)
            """, (nome, sobrenome, email, data_nasc, senha_hash))
            conn.commit()
            flash('Cadastro realizado com sucesso!', 'sucesso')
            return redirect('/login')

        except Exception as e:
            flash(f'Erro ao cadastrar: {e}', 'erro')
            return redirect('/cadastro')

        finally:
            cursor.close()
            conn.close()

    return render_template('cadastro.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form['email']
        senha = request.form['senha']

        try:
            conn = conectar_banco()
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT * FROM usuarios WHERE email = %s", (email,))
            usuario = cursor.fetchone()

            if usuario and check_password_hash(usuario['senha'], senha):
                session['usuario'] = usuario['email']
                session['nome'] = usuario['nome']
                session['sobrenome'] = usuario['sobrenome']
                session['usuario_id'] = usuario['id']
                flash('Login realizado com sucesso.', 'sucesso')
                return render_template("login.html", redirecionar_para_index=True)
            else:
                flash('Email ou senha inválidos.', 'erro')
                return redirect('login')

        except Exception as e:
            flash(f'Erro: {e}','erro')
            return redirect('login')

        finally:
            cursor.close()
            conn.close()

    return render_template('login.html')

@app.route('/salvar_orcamentos', methods=['POST'])
def salvar_orcamentos():
    if 'usuario_id' not in session:
        return jsonify({'status': 'erro', 'mensagem': 'Usuário não autenticado'}), 401

    dados = request.get_json()
    salario = dados.get('salario')
    despesa_total = dados.get('despesa_total')
    superavit = dados.get('superavit')
    despesas = dados.get('despesas', [])
    usuario_id = session['usuario_id']

    try:
        conexao = conectar_banco()
        cursor = conexao.cursor()

        cursor.execute("SELECT id FROM orcamentos WHERE usuario_id = %s", (usuario_id,))
        resultado = cursor.fetchone()

        if resultado:
            cursor.execute("""
                UPDATE orcamentos
                SET salario = %s, despesa_total = %s, superavit = %s, data_registro = NOW()
                WHERE usuario_id = %s
            """, (salario, despesa_total, superavit, usuario_id))
        else:
            cursor.execute("""
                INSERT INTO orcamentos (usuario_id, salario, despesa_total, superavit)
                VALUES (%s, %s, %s, %s)
            """, (usuario_id, salario, despesa_total, superavit))

        cursor.execute("DELETE FROM orcamento_despesas WHERE usuario_id = %s", (usuario_id,))

        for despesa in despesas:
            nome = despesa.get('name') or despesa.get('nome')
            valor = despesa.get('amount') or despesa.get('valor')
            if nome and valor is not None:
                cursor.execute("""
                    INSERT INTO orcamento_despesas (usuario_id, nome, valor)
                    VALUES (%s, %s, %s)
                """, (usuario_id, nome, valor))

        conexao.commit()
        cursor.close()
        conexao.close()

        return jsonify({'status': 'sucesso'})

    except Exception as e:
        print("Erro ao salvar orçamento:", e)
        return jsonify({'status': 'erro', 'mensagem': str(e)}), 500

  
@app.route('/obter_orcamentos', methods=['GET'])
def obter_orcamentos():
    if 'usuario_id' not in session:
        return jsonify({'status': 'erro', 'mensagem': 'Usuário não autenticado'}), 401

    usuario_id = session['usuario_id']

    try:
        conexao = conectar_banco()
        cursor = conexao.cursor(dictionary=True)

        cursor.execute("""
            SELECT salario, despesa_total, superavit
            FROM orcamentos
            WHERE usuario_id = %s
            ORDER BY data_registro DESC
            LIMIT 1
        """, (usuario_id,))
        orcamentos = cursor.fetchone()

        cursor.execute("""
            SELECT nome AS name, valor AS amount
            FROM orcamento_despesas
            WHERE usuario_id = %s
            ORDER BY data_registro DESC
        """, (usuario_id,))
        despesas = cursor.fetchall()

        cursor.close()
        conexao.close()

        if orcamentos is None:
            orcamentos = {'salario': 0, 'despesa_total': 0, 'superavit': 0}

        return jsonify({
            **orcamentos,
            'despesas': despesas
        })

    except Exception as e:
        print("Erro ao obter orçamento:", e)
        return jsonify({'status': 'erro', 'mensagem': str(e)}), 500

@app.route('/desafios')
@login_obrigatorio
def desafios():
    return render_template('desafios.html')

@app.route('/orcamento')
@login_obrigatorio
def orcamento():
    return render_template('orcamento.html')

@app.route('/metas')
@login_obrigatorio
def metas():
    return render_template('metas.html')

@app.route('/diario')
@login_obrigatorio
def diario():
    return render_template('diario.html')

if __name__ == '__main__':
    app.run(debug=True, port=5500)
