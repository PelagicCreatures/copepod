import {
	Copepod
}
	from './Copepod.mjs'

import cookie from 'cookie'
import io from 'socket.io'

class CopepodServer extends Copepod {
	// propagate change to client
	sync (property) {
		super.sync(property)
		if (this.options.namespace) {
			console.log('CopepodServer sync: ', this.uid, property)
			this.options.namespace.to(this.uid).emit('change', {
				property: property,
				value: this.get(property)
			})
		}
	}
}

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

				if (!subscribers[uid]) {
					const Constructor = options.class || CopepodServer
					subscribers[uid] = new Constructor(uid, data, {
						namespace: namespace,
						table: persistOptions.table,
						row: persistOptions.row
					})
					subscribers[uid].syncAll()
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
}

export {
	CopepodServer, mount
}
