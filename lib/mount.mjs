import cookie from 'cookie'
import io from 'socket.io'
import {
	CopepodServer
}
	from './CopepodServer.mjs'

/*
	listen for connectons on namespace and authenticate access

	Once authenticated, instantiate requested subclass of CopepodServer to handle
	'change' messages from client
	*/
const mount = (http, options = {}) => {
	const namespace = io(http).of(options.namespace || '/copepod')
	const subscribers = {}
	const data = {}

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

			socket.on('subscribe', (persistOptions) => {
				const uid = persistOptions.uid

				socket.join(uid)

				// instantiate if needed and start listening
				if (!subscribers[uid]) {
					const Constructor = options.class || CopepodServer
					subscribers[uid] = new Constructor(uid, data, {
						namespace: namespace,
						socket: socket,
						db: options.db,
						table: persistOptions.table,
						row: persistOptions.row
					})
					subscribers[uid].listen(socket)
				} else {
					subscribers[uid].listen(socket)
				}

				subscribers[uid].syncAll()

				socket.on('unsubscribe', () => {
					console.log('unsubscribe')
					if (subscribers[uid]) {
						subscribers[uid].stopListening(socket)
						if (subscribers[uid].sockets.length === 0) {
							subscribers[uid].destroy()
							delete subscribers[uid]
						}
					}
				})

				socket.on('disconnect', () => {
					console.log('subscriber disconnect')
					if (subscribers[uid]) {
						subscribers[uid].stopListening(socket)
						if (subscribers[uid].sockets.length === 0) {
							subscribers[uid].destroy()
							delete subscribers[uid]
						}
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
}

export {
	mount
}
