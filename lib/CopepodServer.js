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

		const theObj = obj || {}
		this.obj = new Proxy(theObj, buildProxy(this))

		this.options = options
	}

	destroy () {
		this.subscribers = {}
		this.obj = null
		this.options = null
	}

	set (property, value) {
		if (this.obj[property] !== value) {
			console.log('set: ', property, value)
			this.obj[property] = value
		}
	}

	delete (property) {
		delete this.obj[property]
	}

	subscribe (id, fn) {
		this.subscribers[id] = fn
		Object.keys(this.obj).forEach((k) => {
			fn(k, this.obj[k])
		})
	}

	unSubscribe (id) {
		if (this.subscribers[id]) {
			delete this.subscribers[id]
		}
	}

	notify (property) {
		// tell subscribers
		Object.keys(this.subscribers).forEach((k) => {
			this.subscribers[k](property, this.obj[property])
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
				value: this.obj[property]
			})
		}
	}
}

module.exports = CopepodServer
