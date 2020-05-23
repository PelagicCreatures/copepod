// build Proxy to handle set and delete on an object's properties
const buildProxy = (self) => {
	return {
		set (target, property, value) {
			Reflect.set(target, property, value)
			self.sync(property)
			return true
		},
		deleteProperty (target, property) {
			Reflect.deleteProperty(target, property)
			self.sync(property)
			return true
		}
	}
}

class Copepod {
	constructor (uid, data = {}, options = {}) {
		this.uid = uid

		this.subscribers = {} // watchers to sync on value change

		this.data = new Proxy(data, buildProxy(this))

		this.socket = null

		this.options = options
	}

	destroy () {

	}

	getData () {
		return this.data
	}

	set (property, value) {
		if (JSON.stringify(this.get(property)) !== JSON.stringify(value)) {
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

	syncAll () {
		Object.keys(this.data).forEach((k) => {
			this.sync(k)
		})
	}

	// tell subscribers
	sync (property) {
		Object.keys(this.subscribers).forEach((k) => {
			this.subscribers[k](property, this.get(property))
		})
	}
}

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

module.exports = CopepodServer
