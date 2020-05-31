import EventEmitter from 'events'

const registeredCopepods = {}
const getCopepod = (id) => {
	return registeredCopepods[id]
}

/*
	build Proxy to observe set and delete on object properties
	*/
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

/*
	@class Copepod

	Base class for data binding. Implements Proxy and Reflect on an object so that
	changes can be observed.

	*/
class Copepod extends EventEmitter {
	/*
		@param { String } uid - unique id of
		@param { Object } data - optional javascript object to observe
		@param { Object } options - optional, used by subclasses
		*/
	constructor (uid, data = {}, options = {}) {
		super()

		this.uid = uid

		this.bindings = {} // watchers to sync on value change

		this.data = new Proxy(data, buildProxy(this))

		this.socket = null

		this.options = options

		registeredCopepods[this.uid] = this
	}

	/*
		@function destroy - remove all bindings
		*/
	destroy () {
		delete (this.data)
		delete registeredCopepods[this.uid]
		Object.keys(this.bindings).forEach((prop) => {
			Object.keys(this.bindings[prop]).forEach((k) => {
				this.unbind(prop, k)
			})
		})
	}

	/*
		@function getBoundData - return object being observed
		*/
	getBoundData () {
		return this.data
	}

	/*
		@function set - set observed object property
		@param { String } property - observed object property to set
		@param value - string, array, object or whatever to assign to property
		*/
	set (property, value) {
		if (JSON.stringify(this.get(property)) !== JSON.stringify(value)) {
			this.data[property] = value
		}
	}

	/*
		@function get - get observed object property
		@param { String } property - observed object property to get
		*/
	get (property) {
		return this.data[property]
	}

	/*
		@function delete - delete observed object property
		@param { String } property - observed object property to delete
		*/
	delete (property) {
		delete this.data[property]
	}

	/*
		@function syncAll - sync all observed object properties
		*/
	syncAll () {
		Object.keys(this.data || {}).forEach((k) => {
			this.sync(k)
		})
	}

	/*
		@function bind - attach a function to observe property changes
		@param { String } id - unique id of observer function
		@param { Function } fn - handler called when property changes
		@param { String } property - optional name of property to observe

		Handler function prototype:

		If property is not supplied, callback receives property and value
		(property, value) => {}

		Otherwise just the value is supplied
		(value) => {}
		*/
	bind (id, fn, property = '*') {
		if (!this.bindings[property]) {
			this.bindings[property] = {}
		}
		this.bindings[property][id] = fn
		Object.keys(this.data).forEach((k) => {
			fn(k, this.get(k))
		})
	}

	/*
		@function unbind - unattach observer
		@param { String } id - unique id of observer function
		@param { String } property - optional name of property being observed
		*/
	unbind (id, property = '*') {
		if (this.bindings[property][id]) {
			delete this.bindings[property][id]
		}
	}

	/*
		function sync - notify observers of property value change
		@param { String } property - property that changed
		*/
	sync (property) {
		Object.keys(this.bindings['*'] || {}).forEach((k) => {
			this.bindings['*'][k](property, this.get(property))
		})
		Object.keys(this.bindings[property] || {}).forEach((k) => {
			this.bindings[property][k](this.get(property))
		})
	}
}

export {
	Copepod, getCopepod
}
