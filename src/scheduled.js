const cron = require('node-cron')
const {
    cryptobox,
    timemania
} = require('./data/exports.js')

const scheduled = async (sock) => {
    cron.schedule('0 21 * * *', () => {
        const equipes = Object.keys(timemania)[Math.floor(Math.random() * Object.keys(timemania).length)];
        const resultado = timemania[equipes];

        sock.sendMessage('120363043959007737@g.us', {
            text: `⚽ *Timemania*\n\n${resultado.emoji} DEU *${resultado.nome.toUpperCase()}*\n❌ Ninguém venceu\n💰 Premiação: CT₿ 0`
        })
    })
    
    cron.schedule('30 * * * *', () => {
        sock.sendMessage('120363043959007737@g.us', {
            text: "👕 Winning Store\n\n· Camisas por R$100,00\n· Frete GRÁTIS\n· Aceitamos PIX, boleto e cartão de crédito\n· Acesse: bit.ly/m/WinningStore"
        })
    })
    
}

module.exports = {
    scheduled
}