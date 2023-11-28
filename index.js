const { makeWASocket, makeInMemoryStore, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys')

const fs = require('fs')
let pino = require('pino')

const { commands } = require('./src/commands.js')
const { scheduled } = require('./src/scheduled.js')

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
        try {
            if (!messages[0].key.fromMe) {
        		commands(sock, messages)
            }
    	} catch(err) {
    		console.error('* Error:', err)
    	}
    })
    
    try {
        scheduled(sock)
    } catch(err) {
        console.error('* Error:', err)
    }
    
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