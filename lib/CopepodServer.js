// build Proxy to handle set and delete on an object's properties
const buildProxy = (self) => {
	return {
		set (target, property, value) {
			Reflect.set(target, property, value)
			self.notify(property)
			return true
		},
		deleteProperty (target, property) {
			Reflect.deleteProperty(target, property)
			self.notify(property)
			return true
		}
	}
}

class Copepod {
	constructor (uid, obj, options = {}) {
		this.uid = uid

		this.subscribers = {} // watchers to notify on value change

		this.data = new Proxy(obj, buildProxy(this))

		this.socket = null

		this.options = options
	}

	destroy () {

	}

	set (property, value) {
		if (this.get(property) !== value) {
			this.data[property] = value
		}
	}

	get (property) {
		return this.data[property]
	}

	delete (property) {
		delete this.data[property]
	}

	subscribe (id, fn) {
		this.subscribers[id] = fn
		Object.keys(this.data).forEach((k) => {
			fn(k, this.get(k))
		})
	}

	unSubscribe (id) {
		if (this.subscribers[id]) {
			delete this.subscribers[id]
		}
	}

	sync () {
		Object.keys(this.data).forEach((k) => {
			this.notify(k)
		})
	}

	// tell subscribers
	notify (property) {
		Object.keys(this.subscribers).forEach((k) => {
			this.subscribers[k](property, this.get(property))
		})
	}
}

class CopepodServer extends Copepod {
	// propagate change to client
	notify (property) {
		super.notify()
		if (this.options.namespace) {
			console.log('notify: ', this.uid, property)
			this.options.namespace.to(this.uid).emit('change', {
				property: property,
				value: this.get(property)
			})
		}
	}
}

module.exports = CopepodServer
