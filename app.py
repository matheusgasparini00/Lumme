import os
import time
from flask import Flask, request, render_template, redirect, session, url_for, flash, jsonify
import mysql.connector
from mysql.connector import pooling, Error as MySQLError
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
import re
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.secret_key = os.environ.get('FLASK_SECRET', 'sua_chave_secreta_aqui')

DB_HOST = os.environ.get("DB_HOST", "localhost")
DB_PORT = int(os.environ.get("DB_PORT", "3306"))
DB_USER = os.environ.get("DB_USER", "root")
DB_PASSWORD = os.environ.get("DB_PASSWORD", "")
DB_NAME = os.environ.get("DB_NAME", "lumme")

_db_config = {
    "host": DB_HOST,
    "port": DB_PORT,
    "user": DB_USER,
    "password": DB_PASSWORD,
    "database": DB_NAME,
    "charset": "utf8mb4",
    "collation": "utf8mb4_unicode_ci",
    "use_pure": True,
    "connection_timeout": 10,
}

_db_pool = pooling.MySQLConnectionPool(
    pool_name="lumme_pool",
    pool_size=5,
    **_db_config
)

# pasta onde vão os avatares (dentro de static/uploads)
UPLOAD_FOLDER = os.path.join(app.root_path, "static", "uploads")  # <-- use root_path
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

def conectar_banco():
    """Obtém conexão do pool e garante que está viva."""
    conn = _db_pool.get_connection()
    try:
        conn.ping(reconnect=True, attempts=1, delay=0)
    except MySQLError:
        try:
            conn.close()
        except Exception:
            pass
        conn = _db_pool.get_connection()
        conn.ping(reconnect=True, attempts=1, delay=0)
    return conn

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

@app.route("/health")
def health():
    return {"status": "ok"}, 200

@app.route("/dbping")
def dbping():
    t0 = time.perf_counter()
    try:
        cnx = conectar_banco()
        cur = cnx.cursor()
        cur.execute("SELECT 1")
        cur.fetchone()
        cur.close(); cnx.close()
        ms = (time.perf_counter() - t0) * 1000
        return {"ok": True, "ms": round(ms, 1)}, 200
    except Exception as e:
        ms = (time.perf_counter() - t0) * 1000
        return {"ok": False, "ms": round(ms, 1), "error": str(e)}, 500

@app.route("/dbcheck")
def dbcheck():
    try:
        cnx = conectar_banco()
        cur = cnx.cursor()
        cur.execute("SHOW TABLES")
        tables = [r[0] for r in cur.fetchall()]
        cur.close(); cnx.close()
        return {"ok": True, "tables": tables}, 200
    except Exception as e:
        return {"ok": False, "error": str(e)}, 500

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
            try:
                cursor.close()
                conn.close()
            except:
                pass

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
            try:
                cursor.close()
                conn.close()
            except:
                pass

    return render_template('login.html')

@app.route('/salvar_orcamentos', methods=['POST'])
def salvar_orcamentos():
    if 'usuario_id' not in session:
        return jsonify({'status': 'erro', 'mensagem': 'Usuário não autenticado'}), 401

    dados = request.get_json()
    salario = dados.get('salario') or 0
    despesa_total = dados.get('despesa_total') or 0
    despesas = dados.get('despesas', [])
    usuario_id = session['usuario_id']

    try:
        conexao = conectar_banco()
        cursor = conexao.cursor()

        cursor.execute("SELECT COALESCE(SUM(valor_atual),0) FROM metas WHERE usuario_id=%s", (usuario_id,))
        total_metas = cursor.fetchone()[0] or 0

        superavit_calc = float(salario) - float(despesa_total) - float(total_metas)

        cursor.execute("SELECT id FROM orcamentos WHERE usuario_id = %s", (usuario_id,))
        resultado = cursor.fetchone()
        if resultado:
            cursor.execute("""
                UPDATE orcamentos
                SET salario=%s, despesa_total=%s, superavit=%s, data_registro=NOW()
                WHERE usuario_id=%s
            """, (salario, despesa_total, superavit_calc, usuario_id))
        else:
            cursor.execute("""
                INSERT INTO orcamentos (usuario_id, salario, despesa_total, superavit)
                VALUES (%s, %s, %s, %s)
            """, (usuario_id, salario, despesa_total, superavit_calc))

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
        cursor.close(); conexao.close()

        return jsonify({'status': 'sucesso', 'superavit': superavit_calc})

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
        orcamento = cursor.fetchone()

        if not orcamento:
            orcamento = {"salario": 0.0, "despesa_total": 0.0, "superavit": 0.0}

        cursor.execute("""
            SELECT nome AS name, valor AS amount
            FROM orcamento_despesas
            WHERE usuario_id = %s
            ORDER BY data_registro DESC
        """, (usuario_id,))
        despesas = cursor.fetchall()

        cursor.execute("""
            SELECT COALESCE(SUM(valor_atual),0) AS total_metas
            FROM metas
            WHERE usuario_id = %s
        """, (usuario_id,))
        metas = cursor.fetchone() or {"total_metas": 0.0}
        total_metas = float(metas.get("total_metas", 0) or 0)

        cursor.close()
        conexao.close()

        salario = float(orcamento.get("salario", 0) or 0)
        despesa_total = float(orcamento.get("despesa_total", 0) or 0)
        superavit = salario - despesa_total - total_metas

        return jsonify({
            "salario": salario,
            "despesa_total": despesa_total,
            "superavit": superavit,
            "total_metas": total_metas,
            "despesas": despesas
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
    usuario_id = session.get('usuario_id')

    try:
        conexao = conectar_banco()
        cursor = conexao.cursor(dictionary=True)
        cursor.execute("""
            SELECT superavit
            FROM orcamentos
            WHERE usuario_id = %s
            ORDER BY data_registro DESC
            LIMIT 1
        """, (usuario_id,))
        resultado = cursor.fetchone()
        superavit = resultado['superavit'] if resultado else 0.00
        cursor.close()
        conexao.close()
    except Exception as e:
        print("Erro ao obter superavit:", e)
        superavit = 0.00

    return render_template('metas.html', superavit=superavit)

@app.route('/salvar_meta', methods=['POST'])
@login_obrigatorio
def salvar_meta():
    usuario_id = session.get('usuario_id')
    dados = request.get_json()
    titulo = dados.get('titulo')
    valor_objetivo = dados.get('valor_objetivo')

    if not titulo or not valor_objetivo:
        return jsonify({'status': 'erro', 'mensagem': 'Dados incompletos'}), 400

    try:
        conexao = conectar_banco()
        cursor = conexao.cursor()
        cursor.execute("""
            INSERT INTO metas (usuario_id, titulo, valor_objetivo)
            VALUES (%s, %s, %s)
        """, (usuario_id, titulo, valor_objetivo))
        conexao.commit()
        cursor.close()
        conexao.close()
        return jsonify({'status': 'sucesso'})
    except Exception as e:
        print("Erro ao salvar meta:", e)
        return jsonify({'status': 'erro', 'mensagem': str(e)}), 500

@app.route('/obter_metas')
@login_obrigatorio
def obter_metas():
    usuario_id = session.get('usuario_id')
    try:
        conexao = conectar_banco()
        cursor = conexao.cursor(dictionary=True)
        cursor.execute("""
            SELECT id, titulo AS name, valor_objetivo AS targetAmount, valor_atual AS currentAmount
            FROM metas
            WHERE usuario_id = %s
        """, (usuario_id,))
        metas = cursor.fetchall()
        cursor.close()
        conexao.close()
        return jsonify(metas)
    except Exception as e:
        print("Erro ao obter metas:", e)
        return jsonify({'status': 'erro', 'mensagem': str(e)}), 500

@app.route('/deletar_meta/<int:meta_id>', methods=['POST','DELETE'])
@login_obrigatorio
def deletar_meta(meta_id):
    usuario_id = session.get('usuario_id')

    try:
        conexao = conectar_banco()
        cursor = conexao.cursor()

        cursor.execute("DELETE FROM metas WHERE id=%s AND usuario_id=%s", (meta_id, usuario_id))

        cursor.execute("""
            SELECT salario, despesa_total
            FROM orcamentos
            WHERE usuario_id=%s
            ORDER BY data_registro DESC
            LIMIT 1
        """, (usuario_id,))
        orcamento = cursor.fetchone() or (0,0)
        salario, despesa_total = orcamento

        cursor.execute("SELECT COALESCE(SUM(valor_atual),0) FROM metas WHERE usuario_id=%s", (usuario_id,))
        total_metas = cursor.fetchone()[0] or 0

        superavit = float(salario) - float(despesa_total) - float(total_metas)

        cursor.execute("""
            UPDATE orcamentos
            SET superavit=%s, data_registro=NOW()
            WHERE usuario_id=%s
        """, (superavit, usuario_id))

        conexao.commit()
        cursor.close(); conexao.close()
        return jsonify({'status': 'sucesso', 'superavit': superavit})

    except Exception as e:
        print("Erro ao deletar meta:", e)
        return jsonify({'status': 'erro', 'mensagem': str(e)}), 500

@app.route('/atualizar_meta', methods=['POST'])
@login_obrigatorio
def atualizar_meta():
    usuario_id = session.get('usuario_id')
    dados = request.get_json()
    meta_id = dados.get('id')
    valor_atual = dados.get('valor_atual')

    if meta_id is None or valor_atual is None:
        return jsonify({'status': 'erro', 'mensagem': 'Dados incompletos'}), 400

    try:
        conexao = conectar_banco()
        cursor = conexao.cursor()

        cursor.execute("""
            UPDATE metas
            SET valor_atual = %s
            WHERE id = %s AND usuario_id = %s
        """, (valor_atual, meta_id, usuario_id))

        cursor.execute("""
            SELECT salario, despesa_total
            FROM orcamentos
            WHERE usuario_id = %s
            ORDER BY data_registro DESC
            LIMIT 1
        """, (usuario_id,))
        orcamento = cursor.fetchone() or (0,0)
        salario, despesa_total = orcamento

        cursor.execute("SELECT COALESCE(SUM(valor_atual),0) FROM metas WHERE usuario_id=%s", (usuario_id,))
        total_metas = cursor.fetchone()[0] or 0

        superavit = float(salario) - float(despesa_total) - float(total_metas)

        cursor.execute("""
            UPDATE orcamentos
            SET superavit=%s, data_registro=NOW()
            WHERE usuario_id=%s
        """, (superavit, usuario_id))

        conexao.commit()
        cursor.close(); conexao.close()
        return jsonify({'status': 'sucesso', 'superavit': superavit})

    except Exception as e:
        print("Erro ao atualizar meta:", e)
        return jsonify({'status': 'erro', 'mensagem': str(e)}), 500

@app.route('/atualizar_superavit',  methods=['POST','DELETE'])
@login_obrigatorio
def atualizar_superavit():
    usuario_id = session.get('usuario_id')
    data = request.get_json()
    superavit = data.get('superavit')

    print("Novo superavit recebido:", superavit)
    print("Usuário logado:", usuario_id)

    try:
        conexao = conectar_banco()
        cursor = conexao.cursor()
        cursor.execute("""
            UPDATE orcamentos
            SET superavit = %s, data_registro = NOW()
            WHERE usuario_id = %s
        """, (superavit, usuario_id))
        conexao.commit()

        print("Superavit salvo com sucesso no banco:", superavit)

        cursor.close()
        conexao.close()
        return jsonify({'status': 'sucesso'})
    except Exception as e:
        return jsonify({'status': 'erro', 'mensagem': str(e)}), 500

@app.route('/api/diario/notes', methods=['GET'])
@login_obrigatorio
def api_listar_notas():
    usuario_id = session.get('usuario_id')
    q = (request.args.get('q') or '').strip()
    categoria = (request.args.get('categoria') or '').strip()

    cnx = conectar_banco()
    cur = cnx.cursor(dictionary=True)

    sql = """
        SELECT id, categoria, titulo, texto, created_at, updated_at
          FROM diario_anotacoes
         WHERE usuario_id = %s AND deleted_at IS NULL
    """
    params = [usuario_id]

    if categoria:
        sql += " AND categoria = %s"
        params.append(categoria)

    if q:
        sql += " AND (titulo LIKE %s OR texto LIKE %s)"
        like = f"%{q}%"
        params.extend([like, like])

    sql += " ORDER BY categoria ASC, id DESC LIMIT 1000"

    cur.execute(sql, tuple(params))
    rows = cur.fetchall()
    cur.close(); cnx.close()
    return jsonify(rows)

@app.route('/api/diario/notes', methods=['POST'])
@login_obrigatorio
def api_criar_nota():
    usuario_id = session.get('usuario_id')
    data = request.get_json(silent=True) or {}

    categoria = (data.get('categoria') or '').strip()
    titulo = (data.get('titulo') or '').strip()
    texto = (data.get('texto') or '').strip()

    if not categoria or not titulo or not texto:
        return jsonify({'status': 'erro', 'mensagem': 'categoria, titulo e texto são obrigatórios.'}), 400

    cnx = conectar_banco()
    cur = cnx.cursor()
    cur.execute("""
        INSERT INTO diario_anotacoes (usuario_id, categoria, titulo, texto)
        VALUES (%s, %s, %s, %s)
    """, (usuario_id, categoria, titulo, texto))
    cnx.commit()
    new_id = cur.lastrowid
    cur.close(); cnx.close()

    return jsonify({'status': 'sucesso', 'id': new_id})

@app.route('/api/diario/notes/<int:note_id>', methods=['PUT'])
@login_obrigatorio
def api_editar_nota(note_id):
    usuario_id = session.get('usuario_id')
    data = request.get_json(silent=True) or {}

    categoria = (data.get('categoria') or '').strip()
    titulo = (data.get('titulo') or '').strip()
    texto = (data.get('texto') or '').strip()

    if not categoria or not titulo or not texto:
        return jsonify({'status': 'erro', 'mensagem': 'categoria, titulo e texto são obrigatórios.'}), 400

    cnx = conectar_banco()
    cur = cnx.cursor()
    cur.execute("""
        UPDATE diario_anotacoes
           SET categoria=%s, titulo=%s, texto=%s
         WHERE id=%s AND usuario_id=%s AND deleted_at IS NULL
    """, (categoria, titulo, texto, note_id, usuario_id))
    cnx.commit()
    cur.close(); cnx.close()
    return jsonify({'status': 'sucesso'})

@app.route('/api/diario/notes/<int:note_id>', methods=['DELETE'])
@login_obrigatorio
def api_excluir_nota(note_id):
    usuario_id = session.get('usuario_id')
    cnx = conectar_banco()
    cur = cnx.cursor()
    cur.execute("""
        UPDATE diario_anotacoes
           SET deleted_at = CURRENT_TIMESTAMP
         WHERE id=%s AND usuario_id=%s AND deleted_at IS NULL
    """, (note_id, usuario_id))
    cnx.commit()
    cur.close(); cnx.close()
    return jsonify({'status': 'sucesso'})

@app.route('/diario')
@login_obrigatorio
def diario():
    return render_template('diario.html')

@app.route('/perfil', methods=['GET', 'POST'])
@login_obrigatorio
def perfil():
    usuario_id = session.get('usuario_id')

    conn = conectar_banco()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT id, nome, sobrenome, email, data_nasc, avatar, senha FROM usuarios WHERE id=%s", (usuario_id,))
    usuario = cursor.fetchone()
    if not usuario:
        cursor.close(); conn.close()
        flash('Usuário não encontrado.', 'erro')
        return redirect(url_for('logout'))

    if request.method == 'POST':
        novo_nome      = (request.form.get('nome') or '').strip()
        novo_sobrenome = (request.form.get('sobrenome') or '').strip()
        novo_email     = (request.form.get('email') or '').strip()
        data_nasc      = (request.form.get('data_nasc') or None)
        senha_atual    = request.form.get('senha_atual') or ''   
        nova_senha     = request.form.get('senha') or ''       

        avatar_rel_path = None
        file = request.files.get('avatar')
        if file and file.filename:
            from werkzeug.utils import secure_filename
            ALLOWED = {'png','jpg','jpeg','gif','webp'}
            ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
            if ext not in ALLOWED:
                flash('Formato de imagem inválido. Use PNG, JPG, JPEG, GIF ou WEBP.', 'alerta')
                cursor.close(); conn.close()
                return redirect(url_for('perfil'))
            fname = secure_filename(f"user{usuario_id}_{int(time.time())}.{ext}")
            save_path = os.path.join(app.config['UPLOAD_FOLDER'], fname)
            file.save(save_path)
            avatar_rel_path = f"uploads/{fname}"  

        if nova_senha:
            if not senha_atual:
                flash('Informe a senha atual para alterá-la.', 'alerta')
                cursor.close(); conn.close()
                return redirect(url_for('perfil'))

            if not check_password_hash(usuario['senha'], senha_atual):
                flash('Senha atual incorreta.', 'erro')
                cursor.close(); conn.close()
                return redirect(url_for('perfil'))

            regex = r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$"
            if not re.match(regex, nova_senha):
                flash('A nova senha deve conter maiúscula, minúscula, número e símbolo (mín. 8).', 'alerta')
                cursor.close(); conn.close()
                return redirect(url_for('perfil'))

            senha_hash = generate_password_hash(nova_senha)
        else:
            senha_hash = None 

        if novo_email and novo_email != usuario['email']:
            cursor.execute("SELECT id FROM usuarios WHERE email=%s AND id<>%s", (novo_email, usuario_id))
            existe = cursor.fetchone()
            if existe:
                flash('Este e-mail já está em uso por outro usuário.', 'alerta')
                cursor.close(); conn.close()
                return redirect(url_for('perfil'))

        campos = ["nome=%s", "sobrenome=%s", "email=%s"]
        valores = [novo_nome, novo_sobrenome, novo_email]

        if data_nasc:
            campos.append("data_nasc=%s")
            valores.append(data_nasc)

        if senha_hash:
            campos.append("senha=%s")
            valores.append(senha_hash)

        if avatar_rel_path:
            campos.append("avatar=%s")
            valores.append(avatar_rel_path)

        valores.append(usuario_id)
        sql = f"UPDATE usuarios SET {', '.join(campos)} WHERE id=%s"
        cursor.execute(sql, tuple(valores))
        conn.commit()

        session['nome'] = novo_nome
        session['sobrenome'] = novo_sobrenome
        session['usuario'] = novo_email

        flash('Perfil atualizado com sucesso!', 'sucesso')
        cursor.close(); conn.close()
        return redirect(url_for('perfil'))

    usuario.pop('senha', None)
    cursor.close(); conn.close()
    return render_template('perfil.html', usuario=usuario)


@app.route('/notificacoes')
@login_obrigatorio
def notificacoes():
    usuario_id = session.get('usuario_id')
    conn = conectar_banco()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT id, mensagem, url_destino, lida, criada_em
        FROM notificacoes
        WHERE usuario_id = %s
        ORDER BY criada_em DESC
    """, (usuario_id,))
    notificacoes = cursor.fetchall()
    cursor.close(); conn.close()
    return render_template('notificacoes.html', notificacoes=notificacoes)

@app.route('/notificacoes/<int:notif_id>/excluir', methods=['POST'])
@login_obrigatorio
def excluir_notificacao(notif_id):
    usuario_id = session.get('usuario_id')
    conn = conectar_banco()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM notificacoes WHERE id=%s AND usuario_id=%s", (notif_id, usuario_id))
    conn.commit()
    cursor.close(); conn.close()
    flash("Notificação excluída!", "sucesso")
    return redirect(url_for('notificacoes'))


@app.route('/configuracoes', methods=['GET', 'POST'])
@login_obrigatorio
def configuracoes():
    usuario_id = session.get('usuario_id')
    conn = conectar_banco()
    cursor = conn.cursor(dictionary=True)

    if request.method == 'POST':
        notificacoes_ativas = bool(request.form.get('notificacoes_ativas'))
        sons_ativos = bool(request.form.get('sons_ativos'))
        dois_fatores = bool(request.form.get('dois_fatores'))

        cursor.execute("SELECT id FROM configuracoes WHERE usuario_id=%s", (usuario_id,))
        existente = cursor.fetchone()
        if existente:
            cursor.execute("""
                UPDATE configuracoes SET notificacoes_ativas=%s, sons_ativos=%s, dois_fatores=%s
                WHERE usuario_id=%s
            """, (notificacoes_ativas, sons_ativos, dois_fatores, usuario_id))
        else:
            cursor.execute("""
                INSERT INTO configuracoes (usuario_id, notificacoes_ativas, sons_ativos, dois_fatores)
                VALUES (%s, %s, %s, %s)
            """, (usuario_id, notificacoes_ativas, sons_ativos, dois_fatores))

        conn.commit()
        flash("Configurações salvas!", "sucesso")
        return redirect(url_for('configuracoes'))

    cursor.execute("SELECT * FROM configuracoes WHERE usuario_id=%s", (usuario_id,))
    config = cursor.fetchone() or {"notificacoes_ativas": 1, "sons_ativos": 1, "dois_fatores": 0}

    cursor.close(); conn.close()
    return render_template('configuracoes.html', config=config)

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.config["TEMPLATES_AUTO_RELOAD"] = True
    app.config["SEND_FILE_MAX_AGE_DEFAULT"] = 0

    @app.after_request
    def add_header(response):
        response.cache_control.no_store = True
        return response

    app.run(host="0.0.0.0", port=port, debug=True, use_reloader=True)