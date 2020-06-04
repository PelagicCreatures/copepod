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
			this.set(msg.property, msg.value, msg.source)
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

		Object.keys(this.data || {}).forEach((property) => {
			socket.emit('change', {
				source: this.getSource(),
				property: property,
				value: this.get(property)
			})
		})
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
	sync (property, source) {
		if (!source) {
			source = this.getSource()
		}
		super.sync(property, source)
		if (this.options.namespace) {
			console.log('CopepodServer sync: ', this.id, property)
			this.options.namespace.to(this.id).emit('change', {
				source: source,
				property: property,
				value: this.get(property)
			})
		}
	}
}

export {
	CopepodServer
}
