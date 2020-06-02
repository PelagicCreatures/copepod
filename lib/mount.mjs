import cookie from 'cookie'
import io from 'socket.io'
import {
	CopepodServer
}
	from './CopepodServer.mjs'

let userid = 0
/*
		listen for connectons on namespace and authenticate access

		Once authenticated, instantiate requested subclass of CopepodServer to handle
		'change' messages from client
		*/
const mount = (http, options = {}) => {
	const namespace = io(http, {
		wsEngine: 'ws'
	}).of(options.namespace || '/copepod')
	const subscribers = {}
	const data = {}

	// mount listener for namespace
	namespace.on('connection', (socket) => {
		console.log('io connect')

		// authenticate user
		socket.on('authenticate', (authCallback) => {
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

			const user = {
				id: 'fake-user-' + (++userid)
			}

			// subscribe socket to Copepod service
			socket.on('subscribe', (persistOptions) => {
				const id = persistOptions.id // Copepod object id

				console.log('subscribe event, Copepod id', user, id)

				socket.join(id)

				// instantiate if needed and start listening
				if (!subscribers[id]) {
					console.log('subscribe event create Copepod Service, Copepod', id, persistOptions.table, persistOptions.row)

					const Constructor = options.class || CopepodServer
					subscribers[id] = new Constructor(id, data, {
						namespace: namespace,
						socket: socket,
						db: options.db,
						table: persistOptions.table,
						row: persistOptions.row
					})
					subscribers[id].listen(socket, user)
				} else {
					subscribers[id].listen(socket)
				}

				subscribers[id].syncAll()

				// Disconect socket and cleanup Copepod if no more connected clients
				socket.on('unsubscribe', () => {
					console.log('user unsubscribe event', user, id)
					if (subscribers[id]) {
						subscribers[id].stopListening(socket)
						if (subscribers[id].sockets.length === 0) {
							subscribers[id].destroy()
							delete subscribers[id]
						}
					}
				})

				// Disconect socket and cleanup Copepod if no more connected clients
				socket.on('disconnecting', () => {
					console.log('user disconnecting event', user, id)
					if (subscribers[id]) {
						subscribers[id].stopListening(socket)
						if (subscribers[id].sockets.length === 0) {
							subscribers[id].destroy()
							delete subscribers[id]
						}
					}
				})
			})

			authCallback({
				user: user
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
