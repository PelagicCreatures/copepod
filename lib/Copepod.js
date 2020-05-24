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

		this.bindings = {} // watchers to sync on value change

		this.data = new Proxy(data, buildProxy(this))

		this.socket = null

		this.options = options
	}

	destroy () {
		Object.keys(this.bindings).forEach((k) => {
			this.unbind(k)
		})
	}

	getBoundData () {
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

	bind (id, fn) {
		this.bindings[id] = fn
		Object.keys(this.data).forEach((k) => {
			fn(k, this.get(k))
		})
	}

	unbind (id) {
		if (this.bindings[id]) {
			delete this.bindings[id]
		}
	}

	syncAll () {
		Object.keys(this.data).forEach((k) => {
			this.sync(k)
		})
	}

	// tell subscribers
	sync (property) {
		Object.keys(this.bindings).forEach((k) => {
			this.bindings[k](property, this.get(property))
		})
	}
}

export {
	Copepod
}
