const { makeWASocket, makeInMemoryStore, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys')

const fs = require('fs')
let pino = require('pino')

async function connectToWhatsApp() {
    const store = makeInMemoryStore({
        logger: pino().child({
            level: 'debug',
            stream: 'store'
        })
    })

    const { state, saveCreds } = await useMultiFileAuthState('./.log')
    const { version, isLatest } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
        version,  
        logger: pino({
            level: 'silent'
        }),
        printQRInTerminal: true,
        qrTimeout: 180000,
        browser: ['Elmo', 'Chrome', '1.0.0'],
        auth: state
    })
    store.bind(sock.ev)

    sock.ev.on('chats.set', () => {
        console.log('got chats', store.chats.all())
    })

    sock.ev.on('contacts.set', () => {
        console.log('got contacts', Object.values(store.contacts))
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('messages.upsert', async ({ messages }) => {
        
        const m = messages[0]
        if (!m.message) return
        
        const id = m.key.remoteJid
        
        var body = (type === 'conversation') ? m.message.conversation : (type == 'imageMessage') ? m.message.imageMessage.caption : (type == 'videoMessage') ? m.message.videoMessage.caption : (type == 'extendedTextMessage') ? m.message.extendedTextMessage.text : (type == 'buttonsResponseMessage') ? m.message.buttonsResponseMessage.selectedButtonId : (m.message.listResponseMessage && m.message.listResponseMessage.singleSelectReply.selectedRowId.startsWith(prefix) && m.message.listResponseMessage.singleSelectReply.selectedRowId) ? m.message.listResponseMessage.singleSelectReply.selectedRowId : (type == 'templateButtonReplyMessage') ? m.message.templateButtonReplyMessage.selectedId : (type === 'messagecontextInfo') ? (m.message.buttonsResponseMessage?.selectedButtonId || m.message.listResponseMessage?.singleSelectReply.selectedRowId || m.text) : ''
        const command = body.startsWith('!') ? body.toLowerCase().slice(1).trim() : null

        const send = (response) => {
            sock.sendMessage(id, { text: response }, { quoted: m })
        }
        
        switch (command) {
            case 'ping':
                send('pong')
                break
                
            default:
                send('unknown command')
        }
    })
    
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error.Boom)?.output?.statusCode !== DisconnectReason.loggedOut
            console.log('* \033[33mConnection closed due to ', lastDisconnect.error, ', reconnecting ', shouldReconnect, '\033[0m')
            if(shouldReconnect) {
                connectToWhatsApp()
            }
        } else if (connection === 'open') {
            console.log('* \033[34mOpened connection\033[0m')
        }
    })
}

connectToWhatsApp()

fs.watchFile('./index.js', (curr, prev) => {
    if (curr.mtime.getTime() !== prev.mtime.getTime()) {
        console.log('* \033[31mWaxing...\033[0m')
        process.exit()
    }
})
