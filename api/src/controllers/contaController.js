const pool = require("../database/db");

/**
 * ===================================================
 * BUSCAR DADOS DA CONTA
 * ===================================================
 */
async function buscarConta(req, res) {
    try {
        const resultado = await pool.query(
            `
            SELECT id, nome, email, saldo
            FROM usuarios
            WHERE id = $1
            `,
            [req.usuario.id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                erro: "Conta não encontrada"
            });
        }

        return res.status(200).json({
            ...resultado.rows[0],
            saldo: Number(resultado.rows[0].saldo)
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
 * DEPÓSITO
 * ===================================================
 */
async function depositar(req, res) {
    const client = await pool.connect();

    try {
        const { valor } = req.body;
        const valorNumerico = Number(valor);

        if (!valorNumerico || valorNumerico <= 0) {
            return res.status(400).json({
                erro: "Valor inválido para depósito"
            });
        }

        await client.query('BEGIN');

        // Atualiza o saldo
        const resultado = await client.query(
            `
            UPDATE usuarios
            SET saldo = saldo + $1
            WHERE id = $2
            RETURNING saldo
            `,
            [valorNumerico, req.usuario.id]
        );

        if (resultado.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                erro: "Conta não encontrada"
            });
        }

        // Registra a movimentação
        await client.query(
            `
            INSERT INTO movimentacoes (usuario_id, tipo, valor)
            VALUES ($1, $2, $3)
            `,
            [req.usuario.id, "DEPOSITO", valorNumerico]
        );

        await client.query('COMMIT');

        return res.status(200).json({
            mensagem: "Depósito realizado com sucesso",
            saldo: Number(resultado.rows[0].saldo)
        });

    } catch (erro) {
        await client.query('ROLLBACK');
        console.error(erro);
        return res.status(500).json({
            erro: "Erro interno do servidor"
        });
    } finally {
        client.release();
    }
}

/**
 * ===================================================
 * SAQUE
 * ===================================================
 */
async function sacar(req, res) {
    const client = await pool.connect();

    try {
        const { valor } = req.body;
        const valorNumerico = Number(valor);

        if (!valorNumerico || valorNumerico <= 0) {
            return res.status(400).json({
                erro: "Valor inválido para saque"
            });
        }

        await client.query('BEGIN');

        // Busca o saldo atual do usuário para validar
        const usuario = await client.query(
            `
            SELECT saldo 
            FROM usuarios 
            WHERE id = $1
            `,
            [req.usuario.id]
        );

        if (usuario.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                erro: "Conta não encontrada"
            });
        }

        const saldoAtual = Number(usuario.rows[0].saldo);

        // Valida se o usuário tem saldo suficiente
        if (valorNumerico > saldoAtual) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                erro: "Saldo insuficiente"
            });
        }

        // Atualiza o saldo subtraindo o valor
        const resultado = await client.query(
            `
            UPDATE usuarios
            SET saldo = saldo - $1
            WHERE id = $2
            RETURNING saldo
            `,
            [valorNumerico, req.usuario.id]
        );

        // Registra a movimentação de SAQUE
        await client.query(
            `
            INSERT INTO movimentacoes (usuario_id, tipo, valor)
            VALUES ($1, $2, $3)
            `,
            [req.usuario.id, "SAQUE", valorNumerico]
        );

        await client.query('COMMIT');

        return res.status(200).json({
            mensagem: "Saque realizado com sucesso",
            saldo: Number(resultado.rows[0].saldo)
        });

    } catch (erro) {
        await client.query('ROLLBACK');
        console.error(erro);
        return res.status(500).json({
            erro: "Erro interno do servidor"
        });
    } finally {
        client.release();
    }
}

/**
 * ===================================================
 * TRANSFERÊNCIA
 * ===================================================
 */
async function transferir(req, res) {
    const client = await pool.connect();

    try {
        const { contaDestino, valor } = req.body;
        const usuarioOrigemId = req.usuario.id;
        const valorNumerico = Number(valor);

        // Validação: Valor precisa ser maior que zero e ter conta de destino
        if (!contaDestino || !valorNumerico || valorNumerico <= 0) {
            return res.status(400).json({
                erro: "Dados inválidos para transferência"
            });
        }
        
        // Validação: Impedir transferir para a própria conta
        if (Number(contaDestino) === usuarioOrigemId) {
            return res.status(400).json({
                erro: "Não é possível transferir para a própria conta"
            });
        }

        await client.query('BEGIN');

        // Busca o saldo atual do usuário de origem
        const resOrigem = await client.query(
            'SELECT saldo FROM usuarios WHERE id = $1',
            [usuarioOrigemId]
        );

        if (resOrigem.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ erro: "Conta de origem não encontrada" });
        }

        const saldoOrigem = Number(resOrigem.rows[0].saldo);

        // Validação: Saldo suficiente
        if (valorNumerico > saldoOrigem) {
            await client.query('ROLLBACK');
            return res.status(400).json({ erro: "Saldo insuficiente" });
        }

        // Valida se a conta de destino existe
        const resDestino = await client.query(
            'SELECT id FROM usuarios WHERE id = $1',
            [contaDestino]
        );

        if (resDestino.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ erro: "Conta de destino não encontrada" });
        }

        // TIRA o dinheiro de quem enviou
        const resNovoSaldo = await client.query(
            'UPDATE usuarios SET saldo = saldo - $1 WHERE id = $2 RETURNING saldo',
            [valorNumerico, usuarioOrigemId]
        );

        // Adiciona no destino
        await client.query(
            'UPDATE usuarios SET saldo = saldo + $1 WHERE id = $2',
            [valorNumerico, contaDestino]
        );

        // Registra no extrato de quem ENVIOU
        await client.query(
            `INSERT INTO movimentacoes (usuario_id, tipo, valor) 
             VALUES ($1, $2, $3)`,
            [usuarioOrigemId, 'TRANSFERENCIA_ENVIADA', valorNumerico]
        );

        // Registra no extrato de quem RECEBEU
        await client.query(
            `INSERT INTO movimentacoes (usuario_id, tipo, valor) 
             VALUES ($1, $2, $3)`,
            [contaDestino, 'TRANSFERENCIA_RECEBIDA', valorNumerico]
        );

        await client.query('COMMIT');

        return res.status(200).json({
            mensagem: "Transferência realizada com sucesso",
            saldoAtual: Number(resNovoSaldo.rows[0].saldo)
        });

    } catch (erro) {
        await client.query('ROLLBACK');
        console.error(erro);
        return res.status(500).json({ erro: "Erro interno do servidor" });
    } finally {
        client.release();
    }
}

/**
 * ===================================================
 * EXTRATO
 * ===================================================
 */
async function consultarExtrato(req, res) {
    try {
        const usuarioId = req.usuario.id;

        const resUsuario = await pool.query(
            'SELECT saldo FROM usuarios WHERE id = $1',
            [usuarioId]
        );

        if (resUsuario.rows.length === 0) {
            return res.status(404).json({ erro: "Conta não encontrada" });
        }

        const resMovimentacoes = await pool.query(
            `SELECT id, tipo, valor, data 
             FROM movimentacoes 
             WHERE usuario_id = $1 
             ORDER BY data DESC`,
            [usuarioId]
        );

        return res.status(200).json({
            saldo: Number(resUsuario.rows[0].saldo),
            movimentacoes: resMovimentacoes.rows
        });

    } catch (erro) {
        console.error(erro);
        return res.status(500).json({ erro: "Erro interno do servidor" });
    }
}

module.exports = {
    buscarConta,
    depositar,
    sacar,
    transferir,
    consultarExtrato
};