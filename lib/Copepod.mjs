import EventEmitter from 'events'
import {
	isEqual
}
	from './dependancies.mjs'

/*
	Registry of Copepod instances by unique id.
	*/
const registeredCopepods = {}
const getCopepod = (id) => {
	return registeredCopepods[id]
}

let guid = 1 // internal unique id

/*
	build Proxy to observe changes to object properties
	*/

var objectConstructor = ({}).constructor

const buildProxy = (self) => {
	return {
		set (target, property, value) {
			let source = self.getSource()
			if (value !== null && value !== undefined && value.constructor === objectConstructor && value._is_copepod_payload) {
				source = value.source
				value = value.value
			}
			Reflect.set(target, property, value)
			self.sync(property, source)
			return true
		}
	}
}

/*
	@class Copepod

	Base class for data binding. Implements Proxy and Reflect on an object so that
	changes can be observed and manages subscribing and notifying observers.

	*/
class Copepod extends EventEmitter {
	/*
		@param { String } id - unique id of
		@param { Object } data - optional externally defined javascript object to observe
		@param { Object } options - optional, used by subclasses
		*/
	constructor (id, data = {}, options = {}) {
		super()

		this.id = id

		this.uniqueId = guid++

		this.bound = {} // watchers to sync on value change

		this.data = new Proxy(data, buildProxy(this))

		this.options = options

		registeredCopepods[this.id] = this
	}

	/*
		@function destroy - remove all bindings
		*/
	destroy () {
		delete this.data
		delete registeredCopepods[this.id]
		Object.keys(this.bound).forEach((prop) => {
			Object.keys(this.bound[prop]).forEach((k) => {
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
		@source { String } - source of change
		*/
	set (property, value, source) {
		if (!isEqual(this.get(property), value)) {
			this.data[property] = {
				_is_copepod_payload: true,
				source: source || this.getSource(),
				value: value
			}
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

	getSource () {
		return this.constructor.name + ':' + this.id
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
		if (!this.bound[property]) {
			this.bound[property] = {}
		}
		this.bound[property][id] = fn
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
		if (this.bound[property][id]) {
			delete this.bound[property][id]
		}
	}

	/*
		function sync - notify observers of property value change
		@param { String } property - property that changed
		*/
	sync (property, source) {
		Object.keys(this.bound['*'] || {}).forEach((k) => {
			this.bound['*'][k](property, this.get(property))
		})
		Object.keys(this.bound[property] || {}).forEach((k) => {
			this.bound[property][k](this.get(property))
		})
	}
}

export {
	Copepod, getCopepod
}
