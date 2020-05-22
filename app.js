const express = require('express')
const app = express()
const http = require('http').createServer(app)
const io = require('socket.io')(http)
const cookie = require('cookie')
const CopepodServer = require('./lib/CopepodServer.js')
const path = require('path')

app.use(express.static(path.join(__dirname, 'dist')))

app.get('/', (req, res) => {
	res.sendFile(__dirname + '/index.html')
})

const subscribers = {}

var namespace = io.of('/copepod')

const data = {}
subscribers['test-uid'] = new CopepodServer('test-uid', data, {
	namespace: namespace
})

let count = 0
setInterval(() => {
	let text = subscribers['test-uid'].obj.itsalive2 || 'from server'
	if (text) {
		text = text.replace(/[ \d]+$/, '')
	}
	subscribers['test-uid'].set('itsalive2', text + ' ' + (count++))
}, 5000)

namespace.on('connection', (socket) => {
	console.log('io connect')

	socket.on('authenticate', () => {
		const cookies = cookie.parse(socket.request.headers.cookie || '')
		if (!cookies['access-token']) {
			return socket.emit('autherror', {
				status: 400
			})
		}

		if (cookies['access-token'] !== 'mytoken') {
			return socket.emit('autherror', {
				status: 403
			})
		}

		socket.on('subscribe', (uid) => {
			socket.join(uid)
			socket.on('change', (msg) => {
				console.log('change: ', msg)
				subscribers[uid].set(msg.property, msg.value)
			})

			socket.on('unsubscribe', () => {
				console.log('unsubscribe')
				subscribers.splice(subscribers.indexOf(uid), 1)
			})

			socket.on('disconnect', () => {
				console.log('subscriber disconnect')
				subscribers.splice(subscribers.indexOf(uid), 1)
			})
		})

		socket.emit('authenticated', {
			user: 'testuser'
		})
	})

	socket.on('disconnect', () => {
		console.log('io disconnect')
	})
})

http.listen(3000, () => {
	console.log('listening on *:3000')
})
