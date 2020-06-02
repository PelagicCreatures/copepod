import {
	Copepod
}
	from './Copepod.mjs'

class CopepodServer extends Copepod {
	constructor (id, obj = {}, options) {
		super(id, obj, options)
		this.sockets = []

		this.handler = (msg, fn) => {
			console.log('CopepodServer got change from client: ', msg)
			this.set(msg.property, msg.value)
			if (fn) {
				fn({
					status: 'ok'
				})
			}
		}
	}

	// listen for remote 'change' events
	listen (socket) {
		console.log('CopepodServer listen')
		socket.on('change', this.handler)
		this.sockets.push(socket)
	}

	stopListening (socket) {
		console.log('CopepodServer stopListening')
		socket.off('change', this.handler)
		this.sockets.splice(this.sockets.indexOf(socket), 1)
	}

	destroy () {
		this.sockets.forEach((socket) => {
			socket.off('change', this.handler)
		})
		super.destroy()
	}

	// propagate change to client
	sync (property) {
		super.sync(property)
		if (this.options.namespace) {
			console.log('CopepodServer sync: ', this.id, property)
			this.options.namespace.to(this.id).emit('change', {
				property: property,
				value: this.get(property)
			})
		}
	}
}

export {
	CopepodServer
}
