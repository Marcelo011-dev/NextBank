const pool = require("../database/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

/**
 * ===================================================
 * REGISTRAR NOVA CONTA
 * ===================================================
 */
async function registrar(req, res) {

    try {

        const { nome, email, senha } = req.body;

        // -------------------------
        // Validação dos campos
        // -------------------------
        if (!nome || !email || !senha) {
            return res.status(400).json({
                erro: "Preencha todos os campos"
            });
        }

        // -------------------------
        // Verifica se email existe
        // -------------------------
        const contaExistente = await pool.query(
            "SELECT * FROM usuarios WHERE email = $1",
            [email]
        );

        if (contaExistente.rows.length > 0) {
            return res.status(400).json({
                erro: "E-mail já cadastrado"
            });
        }

        // -------------------------
        // Criptografa a senha
        // -------------------------
        const senhaHash = await bcrypt.hash(senha, 10);

        // -------------------------
        // Salva conta
        // -------------------------
        const resultado = await pool.query(
            `
            INSERT INTO usuarios (nome, email, senha)
            VALUES ($1, $2, $3)
            RETURNING *
            `,
            [nome, email, senhaHash]
        );

        const usuario = resultado.rows[0];

        return res.status(201).json({
            mensagem: "Conta criada com sucesso",
            conta: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email
            }
        });

    } catch (erro) {

        console.error(erro);

        return res.status(500).json({
            erro: "Erro interno do servidor"
        });

    }
}
/**
 * ===================================================
 * LOGIN
 * ===================================================
 */
async function login(req, res) {

    try {

        const { email, senha } = req.body;

        // -------------------------
        // Procura conta
        // -------------------------
        const resultado = await pool.query(
            "SELECT * FROM usuarios WHERE email = $1",
            [email]
        );

        const conta = resultado.rows[0];


        if (!conta) {
            return res.status(400).json({
                erro: "Usuário não encontrado"
            });
        }

        // -------------------------
        // Confere senha
        // -------------------------
        const senhaValida = await bcrypt.compare(
            senha,
            conta.senha
        );

        if (!senhaValida) {
            return res.status(400).json({
                erro: "Senha inválida"
            });
        }

        // -------------------------
        // Gera Token JWT
        // -------------------------
        const token = jwt.sign(
            {
                id: conta.id
            },
            "nextbank_secret",
            {
                expiresIn: "1d"
            }
        );

        return res.status(200).json({
            mensagem: "Login realizado com sucesso",
            token
        });

    } catch (erro) {

        console.error(erro);

        return res.status(500).json({
            erro: "Erro interno do servidor"
        });

    }
}

module.exports = {
    registrar,
    login
};
