const jwt = require("jsonwebtoken");

/**
 * ===================================================
 * MIDDLEWARE DE AUTENTICAÇÃO
 * ===================================================
 *
 * Responsável por verificar se o usuário está logado.
 */

function authMiddleware(req, res, next) {

    try {

        // ==========================================
        // Captura o cabeçalho Authorization
        // ==========================================

        const authHeader = req.headers.authorization;

        if (!authHeader) {

            return res.status(401).json({
                erro: "Token não informado"
            });

        }

        // ==========================================
        // Remove a palavra Bearer
        // ==========================================

        const token = authHeader.split(" ")[1];

        // ==========================================
        // Verifica validade do token
        // ==========================================

        const decoded = jwt.verify(
            token,
            "nextbank_secret"
        );

        // ==========================================
        // Salva dados do usuário
        // ==========================================

        req.usuario = decoded;

        // ==========================================
        // Continua para a próxima etapa
        // ==========================================

        next();

    } catch (erro) {

        return res.status(401).json({
            erro: "Token inválido"
        });

    }

}

module.exports = authMiddleware;