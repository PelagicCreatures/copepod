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

/*
	TODO:

	initialize sync priority: data, input, socket

	for database connection
	set - update row
	notify - broadcast changed property to room
*/

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

			if (!subscribers[uid]) {
				subscribers[uid] = new CopepodServer(uid, null, {
					namespace: namespace
				})
			}

			socket.on('change', (msg) => {
				console.log('change: ', msg)
				if (subscribers[uid]) {
					subscribers[uid].set(msg.property, msg.value)
				}
			})

			socket.on('unsubscribe', () => {
				console.log('unsubscribe')
				if (subscribers[uid]) {
					subscribers[uid].destroy()
					delete subscribers[uid]
				}
			})

			socket.on('disconnect', () => {
				console.log('subscriber disconnect')
				if (subscribers[uid]) {
					subscribers[uid].destroy()
					delete subscribers[uid]
				}
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
