const fs = require('fs')
const axios = require('axios')
const OpenAI = require('openai')

const {
    host,
    owner,
    prefix 
} = require('./data/config.js')

const commands = async (sock, messages) => {

    const m = messages[0]
    if (!m.message) return
    
    const id = m.key.remoteJid

    await sock.readMessages([m.key])
    if (m.key && m.key.remoteJid == 'status@broadcast') return
    const altpdf = Object.keys(m.message)
    const type = altpdf[0] == 'senderKeyDistributionMessage' ? altpdf[1] == 'messagecontextInfo' ? altpdf[2] : altpdf[1] : altpdf[0]

    var body = (type === 'conversation') ? m.message.conversation : (type == 'imageMessage') ? m.message.imageMessage.caption : (type == 'videoMessage') ? m.message.videoMessage.caption : (type == 'extendedTextMessage') ? m.message.extendedTextMessage.text : (type == 'buttonsResponseMessage') ? m.message.buttonsResponseMessage.selectedButtonId : (m.message.listResponseMessage && m.message.listResponseMessage.singleSelectReply.selectedRowId.startsWith(prefix) && m.message.listResponseMessage.singleSelectReply.selectedRowId) ? m.message.listResponseMessage.singleSelectReply.selectedRowId : (type == 'templateButtonReplyMessage') ? m.message.templateButtonReplyMessage.selectedId : (type === 'messagecontextInfo') ? (m.message.buttonsResponseMessage?.selectedButtonId || m.message.listResponseMessage?.singleSelectReply.selectedRowId || m.text) : ''
    const command = body.startsWith(prefix) ? body.slice(prefix.length).trim().split(/ +/).shift().toLocaleLowerCase() : null
    var texto_exato = (type === 'conversation') ? m.message.conversation : (type === 'extendedTextMessage') ? m.message.extendedTextMessage.text : ''
    const texto = texto_exato.slice(0).trim().split(/ +/).shift().toLowerCase()

    const send = (response) => {
        sock.sendMessage(id, { text: response }, { quoted: m })
    }

    const group = id.endsWith('@g.us') ? true : false
    const metadata = group? await sock.groupMetadata(m.key.remoteJid) : null
    const admins = group? metadata.participants.filter(item => item.admin === 'admin' || item.admin === 'superadmin') : null
    const numero = group? m.key.participant : m.key.remoteJid
    const nome = m.pushName ? m.pushName : ""
    
    const {
        cryptobox,
        cards
    } = require('./data/exports.js')

    if (command !== null) {
        if (cryptobox[numero]) {
            cryptobox[numero].pts += 1
            fs.writeFileSync('./src/json/cryptobox.json', JSON.stringify(cryptobox, null, 2), 'utf-8')
        }
    }

    const args = body.toLowerCase().split(" ")

    if (m.message.extendedTextMessage && m.message.extendedTextMessage.contextInfo && m.message.extendedTextMessage.contextInfo.mentionedJid) {
        var mentioned = m.message.extendedTextMessage.contextInfo.mentionedJid.length > 0 ? m.message.extendedTextMessage.contextInfo.mentionedJid[0] : m.message.extendedTextMessage.contextInfo.participant
    }

    if (mentioned === host || body.toLowerCase().includes('elmo')) {
        const openai = new OpenAI({
            //apiKey: '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'
            apiKey: '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'
        })
        async function chatgpt() {
            try {
                const completion = await openai.chat.completions.create({
                    messages: [
                        {
                            role: "system",
                            content: `Você é uma personificação do Elmo de Vila Sésamo malandra, sarcástica e mal educada. fala sobre tudo, independente do teor. O destinatário da mensagem se chama ${nome}. Dê respostas curtas.`
                        },
                        {
                            role: "user",
                            content: body
                        },
                    ],
                    model: "gpt-3.5-turbo-0613"
                })
                send(completion.choices[0].message.content)
            } catch(err) {
                console.error(err)
            }
        }
        chatgpt()
    }

    if (admins.some(admin => admin.id === numero)) {
        switch (command) {
            case 'ban':
                if (typeof mentioned !== 'undefined') {
                    await sock.groupParticipantsUpdate(m.key.remoteJid, [mentioned], "remove")
                    send("[ADM] Usuário banido.")
                } else {
                    send("Marque ou cite o destinatário.")
                }
                break
        
            case 'promover':
                if (typeof mentioned !== 'undefined') {
                    await sock.groupParticipantsUpdate(m.key.remoteJid, [mentioned], "promote")
                    send("[ADM] Novo administrador.")
                } else {
                    send("Marque ou cite o destinatário.")
                }
                break
        
            case 'rebaixar':
                if (typeof mentioned !== 'undefined') {
                    await sock.groupParticipantsUpdate(m.key.remoteJid, [mentioned], "demote")
                    send("[ADM] Este usuário não é mais administrador.")
                } else {
                    send("Marque ou cite o destinatário.")
                }
                break
        
            case 'depositar':
                if (typeof mentioned !== 'undefined') {
                    if (cryptobox[mentioned]) {
                        cryptobox[mentioned].ctb += parseFloat(args[1])
                        send("[ADM] Depósito realizado.")
                        fs.writeFileSync('./src/json/cryptobox.json', JSON.stringify(cryptobox, null, 2), 'utf-8')
                    } else {
                        send("Usuário não registrado.")
                    }
                } else {
                    send("Marque ou cite o destinatário.")
                }
                break
    
            case 'multar':
                if (typeof mentioned !== 'undefined') {
                    if (cryptobox[mentioned]) {
                        cryptobox[mentioned].ctb -= parseFloat(args[1])
                        send("[ADM] Multa aplicada.")
                        fs.writeFileSync('./src/json/cryptobox.json', JSON.stringify(cryptobox, null, 2), 'utf-8')
                    } else {
                        send("Usuário não registrado.")
                    }
                } else {
                    send("Marque ou cite o destinatário.")
                }
                break
        }
    }

    switch (command) {
        
        case 'menu':
            fs.readFile('./src/menu', 'utf8', (err, menu) => {
                if (err) {
                    console.error('Erro ao ler o arquivo ./src/menu:', err)
                } else {
                    send(menu)
                }
            })
        break
   
        case 'gift':
            if (args[1]) {
                if (!isNaN(args[1])) {
                    if (typeof mentioned !== 'undefined') {
                        if (cryptobox[mentioned]) {
                            send(`🎁 *${cryptobox[numero].cards[args[1] -1].split("(")[0]}* enviado como presente.`)
                            cryptobox[mentioned].cards.push(cryptobox[numero].cards[args[1] -1])
                            cryptobox[numero].cards.splice(parseInt(args[1]) - 1, 1)
                            fs.writeFileSync('./src/json/cryptobox.json', JSON.stringify(cryptobox, null, 2), 'utf-8')
                        } else {
                            send("Destinatário desconhecido.")
                        }
                    } else {
                        send("Marque ou cite o destinatário.")
                    }
                } else {
                    send("Card desconhecido ou não possui.")
                }
            } else {
                send("Correção: *!gift* (número do card) + (@ do destinatário).")
            }
        break
    
        case 'pix':
            if (args[1]) {
                if (!isNaN(args[1])) {
                    if (cryptobox[numero].ctb && cryptobox[numero].ctb >= args[1]) {
                        if (typeof mentioned !== 'undefined') {
                            if (cryptobox[mentioned]) {
                                cryptobox[numero].ctb -= args[1]
                                cryptobox[mentioned].ctb += parseFloat(args[1])
                                send("💸 Transferência realizada com sucesso!")
                                fs.writeFileSync('./src/json/cryptobox.json', JSON.stringify(cryptobox, null, 2), 'utf-8')
                            } else {
                                send("Destinatário desconhecido.")
                            }
                        } else {
                            send("Marque ou cite o destinatário.")
                        }
                    } else {
                        send(`Cryptobox insuficientes. Saldo disponível: CT₿ ${cryptobox[numero].ctb}.`)
                    }
                } else {
                    send("Valor inválido.")
                }
            } else {
                send("Correção: *!pix* (valor) + (@ do destinatário).")
            }
        break
    
        case 'trocar':
            if (cryptobox[numero]) {
                if (!isNaN(args[1]) && args[1] >= 10) {
                    if (cryptobox[numero].pts >= parseInt(args[1])) {
                        cryptobox[numero].pts -= parseInt(args[1])
                        cryptobox[numero].ctb += parseInt(args[1])
                        fs.writeFileSync('./src/json/cryptobox.json', JSON.stringify(cryptobox, null, 2), 'utf-8')
                        send("Troca efetuada com sucesso. 🤑")
                    } else {
                        send("Pontuação insuficiente.")
                    }
                } else {
                    send("Você só pode trocar 10 ou mais pontos.")
                }
            } else {
                send("Usuário não registrado.")
            }
        break
    
        case 'pack':
            if (args[1]) {
                if (args[1] === "bronze" || args[1] === "prata" || args[1] === "ouro" || args[1] === "platina" || args[1] === "cartola" || args[1] === "diamante" || args[1] === "nba" || args[1] === "f1") {
                    let cardJogadores = `💾 *Pack de ${args[1].toUpperCase()}*\n\n`
                    cards[args[1]].jogadores.forEach((jogador, index) => {
                    cardJogadores += `${index + 1}. ${jogador}\n`
                    })
                    cardJogadores += `\nPreço: CT₿ ${cards[args[1]].valor}`
                    send(cardJogadores)
                } else {
                    send("Pacote inexistente.")
                }
            } else {
                send("Correção: *!pack* (nome do pacote desejado).")
            }
        break
    
        case 'unpack':
            if (args[1]) {
                if (args[1] === "bronze" || args[1] === "prata" || args[1] === "ouro" || args[1] === "platina" || args[1] === "cartola" || args[1] === "diamante" || args[1] === "nba" || args[1] === "f1") {
                    if (cryptobox[numero] && cryptobox[numero].ctb >= cards[args[1]].valor) {
                        const openPack = Math.floor(Math.random() * cards[args[1]].jogadores.length)
                        const path = `./assets/packs/${args[1]}/${openPack +1}.webp`
                        
                    if (args[1] === "nba") {
                    send(`🍀 Você recebeu *${cards[args[1]].jogadores[openPack]}* no pack ${args[1].toUpperCase()} por ${cards[args[1]].valor} cryptobox.`)
                    } else {
                        sock.sendMessage(id, {image: fs.readFileSync(path), caption: `🍀 Você recebeu *${cards[args[1]].jogadores[openPack]}* no pack ${args[1]} por ${cards[args[1]].valor} cryptobox.`}, {quoted: m})
                    }
                    
                        if (!cryptobox[numero].cards) {
                            cryptobox[numero].cards = []
                        }
                        cryptobox[numero].cards.push(`${cards[args[1]].jogadores[openPack]}`)
                        cryptobox[numero].ctb -= cards[args[1]].valor
                        fs.writeFileSync('./src/json/cryptobox.json', JSON.stringify(cryptobox, null, 2), 'utf-8')
                    } else {
                        send(`Cryptobox insuficientes. Este pacote custa CT₿ ${cards[args[1]].valor}.`)
                    }
                } else {
                    send("Pacote inexistente.")
                }
            } else {
                send("Correção: *!unpack* (nome do pacote desejado).")
            }
        break
    
        case 'card':
            if (args[1] || args[2]) {
                if (args[1] === "bronze" || args[1] === "prata" || args[1] === "ouro" || args[1] === "platina" || args[1] === "cartola" || args[1] === "diamante" || args[1] === "f1") {
                    const path = `./assets/packs/${args[1]}/${args[2]}.webp`
                    if (fs.existsSync(path)) {
                        sock.sendMessage(id, {sticker: fs.readFileSync(path)}, {quoted: m})
                    } else {
                        send("Card não encontrado.")
                    }
                } else {
                    send("Pacote inexistente.")
                }
            } else {
                send(`Correção: *!card* (nome do pacote) + (número do card).`)
            }
        break
    
        case 'credito':
            send("💱 Créditobox\n\n*Bronze*\nR$  1,00 → CT₿ 200\n\n*Prata*\nR$  3,00 → CT₿ 700\n\n*Ouro*\nR$  5,00 → CT₿ 1.5K\n\n*Platina*\nR$ 10,00 → CT₿ 3.0K\n\n*Cartola*\nR$ 15,00 → CT₿ 5.0K\n\n*Diamante*\nR$ 20,00 → CT₿ 8.0K\n\nPix copia e cola: bit.ly/creditobox\n\nA principal finalidade é apoiar e garantir a estabilidade em possíveis quedas.")
        break
    
        case 'forbes':
            const sortedForbes = Object.entries(cryptobox).sort((a, b) => b[1].ctb - a[1].ctb)
            let forbes = '💸 *Ranking de Cryptobox*\n\n'
            sortedForbes.forEach(([name, m], index) => {
                forbes += `${m.nome} - CT₿ ${m.ctb}\n`
            })
            send(forbes)
        break
    
        case 'registrar':
            if (cryptobox[numero]) {
                send("Você já possui registro. Digite *!editar* (com seu nome) para alterar seu perfil.")
            } else {
                if (body.slice(11).trim() !== '') {
                    cryptobox[numero] = { nome: body.slice(11), ctb: 100, pts: 0}
                    fs.writeFileSync('./src/json/cryptobox.json', JSON.stringify(cryptobox, null, 2), 'utf-8')
                    send("Registrado com sucesso!")
                } else {
                    send("Correção: *!registrar* (seu nome).")
                }
            }
        break
    
        case 'editar':
            if (body.slice(8).trim() !== '') {
                cryptobox[numero].nome = body.slice(8)
                fs.writeFileSync('./src/json/cryptobox.json', JSON.stringify(cryptobox, null, 2), 'utf-8')
                send("Editado com sucesso!")
            } else {
                send("Correção: *!editar* (seu nome).")
            }
        break
    
        case 'perfil':
            if (typeof mentioned !== 'undefined') {
                if (cryptobox[mentioned]) {
                    send (`👤 *Perfil de ${cryptobox[mentioned].nome}*\n💰 Saldo: CT₿ ${cryptobox[mentioned].ctb}\n🔸 Pontos: ${cryptobox[mentioned].pts}`)
                  } else {
                    send("Usuário não registrado.")
                  }
            } else {
                if (cryptobox[numero]) {
                    send (`👤 *Perfil de ${cryptobox[numero].nome}*\n💰 Saldo: CT₿ ${cryptobox[numero].ctb}\n🔸 Pontos: ${cryptobox[numero].pts}`)
                } else {
                    send("Você não possui registro")
                }
            }
        break
    
        case 'deck':
            if (typeof mentioned !== 'undefined') {
                if (cryptobox[mentioned]) {
                    if (cryptobox[mentioned].cards) {
                        let deck = `*Coleção de ${cryptobox[mentioned].nome}*`
                        cryptobox[mentioned].cards.forEach((collection, index) => {
                            deck += `\n${index +1}. ${collection}`
                        })
                        send(deck)
                    } else {
                        send("Este usuário não possui cards.")
                    }
                } else {
                    send("Usuário não registrado.")
                }
            } else {
                if (cryptobox[numero].cards) {
                    let deck = `*Coleção de ${cryptobox[numero].nome}*`
                    cryptobox[numero].cards.forEach((collection, index) => {
                        deck += `\n${index +1}. ${collection}`
                    })
                    send(deck)
                } else {
                    send("Você não possui cards.")
                }
            }
        break
    
        case 'minerar':
            const mineradas = Math.floor(Math.random() * 50) +50 +1
            if (cryptobox[numero]) {
                if (cryptobox[numero].minerou === new Date().toLocaleDateString()) {
                    send("Você já minerou cryptobox hoje.")
                } else {
                    cryptobox[numero].ctb += mineradas
                    cryptobox[numero].minerou = new Date().toLocaleDateString()
                    fs.writeFileSync('./src/json/cryptobox.json', JSON.stringify(cryptobox, null, 2), 'utf-8')
                    send(`⛏️ Você minerou ${mineradas} cryptobox!`)
                }
            } else {
                send('Digite *!registrar* (com seu nome) antes de minerar.')
            }
        break
    
        case 'freepack':
            if (new Date().getDay() === 5) {
                if (cryptobox[numero]) {
                    if (cryptobox[numero].pass === new Date().toLocaleDateString()) {
                        send("Você já recebeu sua caixa hoje.")
                    } else {
                        const randomPack = Object.keys(cards)[Math.floor(Math.random() * Object.keys(cards).length)]
                        const randomCard = Math.floor(Math.random() * cards[randomPack].jogadores.length)
                        if (!cryptobox[numero].cards) {
                            cryptobox[numero].cards = []
                        }
                        cryptobox[numero].cards.push(`${cards[randomPack].jogadores[randomCard]}`)
                        cryptobox[numero].pass = new Date().toLocaleDateString()
                        const path = `./assets/packs/${randomPack}/${randomCard +1}.webp`
                    
                        if (randomPack === 'nba') {
                            send(`📦 Você ganhou *${cards[randomPack].jogadores[randomCard]}* no pack ${randomPack.toUpperCase()} de graça.`)
                        } else {
                            sock.sendMessage(id, {image: fs.readFileSync(path), caption: `📦 Você ganhou *${cards[randomPack].jogadores[randomCard]}* no pack ${randomPack} de graça.`}, {quoted: m})
                        }
                    
                        fs.writeFileSync('./src/json/cryptobox.json', JSON.stringify(cryptobox, null, 2), 'utf-8')
                    }
                } else {
                    send('Digite *!registrar* (com seu nome) para pegar seu presente.')
                }
            } else {
                send("Este comando só pode ser executado na sexta-feira.")
            } 
        break
    
        case 'penalti':
            const gol = Math.random() < 0.75
            if (gol) {
                send(`🥅 Cobrança de pênalti\n\n⚽ ${nome} converte a cobrança!`)
            } else {
                send("🥅 Cobrança de pênalti\n\n🚫 Goleiro defende o chute.")
            }
        break
    
        case 'lancelivre':
            const cesta = Math.random() < 0.75
            if (cesta) {
                send(`🏀 Lance livre\n\n👌 ${nome} acerta o arremesso!`)
            } else {
                send(`🏀 Lance livre\n\n🚫 ${nome} erra o arremesso.`)
            }
        break
    
        case 'prever':
            const mandante = Math.floor(Math.random() * 4)
            const visitante = Math.floor(Math.random() * 4)
            send(`🐙 Resultado: ${mandante}x${visitante}`)
        break
    
        case 'chance':
            const chance = Math.floor(Math.random() * 101)
            send(`🔮 Tem ${chance}% de chances disso acontecer.`)
        break

        case 'gaydar':
            const gaydar = Math.floor(Math.random() * (100 - 50 + 1)) + 50
            send(`🏳️‍🌈 É... ${gaydar}% de homossexualidade.`)
        break

        case 'casal':
            const casal = Math.floor(Math.random() * 101)
            send(`💌 Consta no meu sistema ${casal}% de compatibilidade.`)
        break

        case 'gado':
            const gado = Math.floor(Math.random() * 101)
            send(`🐂 Pelo odor do estrume ${gado}% gado.`)
        break
    
        case 'detectar':
            const detector = Math.floor(Math.random() * 101)
            send(`📊 Monitor indica ${detector}% de chances de ser mentira.`)
        break
    
        case 'cassino': case 'niquel':
            if (cryptobox[numero] && cryptobox[numero].ctb >= 10) {
                const emojis = ["🍒", "🍋", "🔔", "💰", "💎", "🍉", "🍌", "💯", "💸", "🍇"]

                function sortearEmoji() {
                    const randomIndex = Math.floor(Math.random() * emojis.length)
                    return emojis[randomIndex]
                }

                const tabuleiro = []
                for (let i = 0; i < 3; i++) {
                    const linha = []
                    for (let j = 0; j < 3; j++) {
                        linha.push(sortearEmoji())
                    }
                    tabuleiro.push(linha)
                }

                function verificarCombinações(tabuleiro) {
                    let ganhou = false
                    let premio = 0

                    for (let i = 0; i < 3; i++) {
                        if (tabuleiro[i][0] === tabuleiro[i][1] && tabuleiro[i][1] === tabuleiro[i][2]) {
                            ganhou = true
                            premio += 100
                        }
                    }

                    for (let j = 0; j < 3; j++) {
                        if (tabuleiro[0][j] === tabuleiro[1][j] && tabuleiro[1][j] === tabuleiro[2][j]) {
                            ganhou = true
                            premio += 100
                        }
                    }

                    if ((tabuleiro[0][0] === tabuleiro[1][1] && tabuleiro[1][1] === tabuleiro[2][2]) || (tabuleiro[0][2] === tabuleiro[1][1] && tabuleiro[1][1] === tabuleiro[2][0])) {
                        ganhou = true
                        premio += 100
                    }

                    return { ganhou, premio }
                }

                const resultado = verificarCombinações(tabuleiro)
        
                if (resultado.ganhou) {
                    cryptobox[numero].ctb += resultado.premio
                    send(`🎰 *Caça-níqueis*\n\n|  ${tabuleiro[0].join('  |  ')}  |\n|  ${tabuleiro[1].join('  |  ')}  |\n|  ${tabuleiro[2].join('  |  ')}  |\n\nVocê ganhou CT₿ ${resultado.premio} 🎉`)
                } else {
                    cryptobox[numero].ctb -= 10
                    send(`🎰 *Caça-níqueis*\n\n|  ${tabuleiro[0].join('  |  ')}  |\n|  ${tabuleiro[1].join('  |  ')}  |\n|  ${tabuleiro[2].join('  |  ')}  |\n\nNão foi dessa vez 😔`)
                }
                fs.writeFileSync('./src/json/cryptobox.json', JSON.stringify(cryptobox, null, 2), 'utf-8')
            } else {
                send("Cryptobox insuficientes. Para jogar no cassino você precisa de pelo menos CT₿ 10.")
            }
        break
    }
}

module.exports = {
    commands
}