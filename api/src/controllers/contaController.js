const pool = require("../database/db");

/**
 * ===================================================
 * BUSCAR DADOS DA CONTA
 * ===================================================
 */
function buscarConta(req, res) {

    try {

        // Procura a conta pelo ID que veio do JWT
        const conta = contas.find(
            conta => conta.id === req.usuario.id
        );

        // SEGURANÇA 
        if (!conta) {
            return res.status(404).json({
                erro: "Conta não encontrada"
            });
        }

        // RETORNA APENAS DADOS PÚBLICOS
        return res.status(200).json({
            id: conta.id,
            nome: conta.nome,
            email: conta.email,
            saldo: conta.saldo
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

function depositar(req, res) {

    try {

        const { valor } =req.body;

        if (!valor || valor <= 0) {
            return res.status(400).json({
                erro: "Valor inválido para depósito"
            });
        }

        
        const conta = contas.find(
            conta => conta.id === req.usuario.id
        );

        if (!conta) {
            return res.status(404).json({
                erro: "Conta não encontrada"
            });
        }

        // -------------------------
        // REALIZA DEPÓSITO
        // -------------------------
        conta.saldo += Number(valor);

        // -------------------------
        // REGISTRA MOVIMENTAÇÕES
        // -------------------------
        conta.extrato.push({
            tipo: "DEPOSITO",
            valor: Number(valor),
            data: new Date()
        });

        // -------------------------
        // RETORNA NOVO SALDO
        // -------------------------
        return res.status(200).json({
            mensagem: "Depósito realizado com sucesso",
            saldo: conta.saldo
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
 * SAQUE
 * ===================================================
 */
function sacar(req, res) {

    try {

        const { valor } = req.body;

        // -------------------------
        // VALIDAÇÃO DO VALOR
        // -------------------------
        if (!valor || valor <= 0) {
            return res.status(400).json({
                erro: "Valor inválido para saque"
            });
        }

        // -------------------------
        // PROCURA CONTA
        // -------------------------
        const conta = contas.find(
            conta => conta.id === req.usuario.id
        );

        if (!conta) {
            return res.status(404).json({
                erro: "Conta não encontrada"
            });
        }

        // -------------------------
        // SALDO INSUFICIENTE
        // -------------------------
        if (Number(valor) > conta.saldo) {
            return res.status(400).json({
                erro: "Saldo insuficiente"
            });
        }

        // -------------------------
        // REALIZA SAQUE
        // -------------------------
        conta.saldo -= Number(valor);

        conta.extrato.push({
            tipo: "SAQUE",
            valor: Number(valor),
            dara: new Date()
        });

        // -------------------------
        // RETORNA NOVO SALDO
        // -------------------------
        return res.status(200).json({
            mensagem: "Saque realizado com sucesso",
            saldo: conta.saldo
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
 * TRANSFERÊNCIA
 * ===================================================
 */
function transferir(req, res) {

    try {

        const { contaDestino, valor } = req.body;

        // -------------------------
        // VALIDAÇÃO DOS DADOS
        // -------------------------
        if (!contaDestino || !valor || valor <= 0) {
            return res.status(400).json({
                erro: "Dados inválidos para transferência"
            });
        }

        // -------------------------
        // CONTA DE ORIGEM
        // -------------------------
        const contaOrigem = contas.find(
            conta => conta.id === req.usuario.id
        );

        if (!contaOrigem) {
            return res.status(404).json({
                erro: "Conta de origem não encontrada"
            });
        }

        // -------------------------
        // CONTA DE DESTINO
        // -------------------------
        const contaDestinoEncontrada = contas.find(
            conta => conta.id === Number(contaDestino)
        );

        if (!contaDestinoEncontrada) {
            return res.status(404).json({
                erro: "Conta de destino não encontrada"
            });
        }

        // -------------------------
        // NÃO PERMITE TRANSFERIR
        // PARA SI MESMO
        // -------------------------
        if (contaOrigem.id === contaDestinoEncontrada.id) {
            return res.status(400).json({
                erro: "Não é possível transferir para a própria conta"
            });
        }

        // -------------------------
        // SALDO INSUFICIENTE
        // -------------------------
        if (Number(valor) > contaOrigem.saldo) {
            return res.status(400).json({
                erro: "Saldo insuficiente"
            });
        }

        // -------------------------
        // REALIZA TRANSFERÊNCIA
        // -------------------------
        contaOrigem.saldo -= Number(valor);

        contaDestinoEncontrada.saldo += Number(valor);

        // -------------------------
        // REGISTRA NO EXTRATO
        // DA CONTA DE ORIGEM
        // -------------------------
        contaOrigem.extrato.push({
            tipo: "TRANSFERENCIA",
            valor: Number(valor),
            destino: contaDestinoEncontrada.id,
            data: new Date()
        });

        // -------------------------
        // REGISTRA NO EXTRATO
        // DA CONTA DESTINO
        // -------------------------
        contaDestinoEncontrada.extrato.push({
            tipo: "TRANSFERENCIA_RECEBIDA",
            valor: Number(valor),
            origem: contaOrigem.id,
            data: new Date()
        });

        // -------------------------
        // RETORNO
        // -------------------------
        return res.status(200).json({
            mensagem: "Transferência realizada com sucesso",
            saldoAtual: contaOrigem.saldo
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
 * EXTRATO
 * ===================================================
 */
function consultarExtrato(req, res) {

    try {

        const conta = contas.find(
            conta => conta.id === req.usuario.id
        );

        if (!conta) {
            return res.status(404).json({
                erro: "Conta não encontrada"
            });
        }

        return res.status(200).json({
            saldo: conta.saldo,
            movimentacoes: conta.extrato
        });

    } catch (erro) {

        console.error(erro);

        return res.status(500).json({
            erro: "Erro interno do servidor"
        });

    }

}

module.exports = {
    buscarConta,
    depositar,
    sacar,
    transferir,
    consultarExtrato
    
};

