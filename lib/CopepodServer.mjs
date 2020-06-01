import {
	Copepod
}
	from './Copepod.mjs'

class CopepodServer extends Copepod {
	constructor (uid, obj = {}, options) {
		super(uid, obj, options)
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
		socket.on('change', this.handler)
		this.sockets.push(socket)
	}

	stopListening (socket) {
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
			console.log('CopepodServer sync: ', this.uid, property)
			this.options.namespace.to(this.uid).emit('change', {
				property: property,
				value: this.get(property)
			})
		}
	}
}

export {
	CopepodServer
}
