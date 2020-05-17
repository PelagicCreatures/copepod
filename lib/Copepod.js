import {
	utils
}
	from '@pelagiccreatures/sargasso'

let unique = 0

// build Proxy to handle set and delete on an object's properties
const buildProxy = (thisContext) => {
	return {
		set (target, property, value) {
			Reflect.set(target, property, value)
			thisContext.notify(property)
			return true
		},
		deleteProperty (target, property) {
			Reflect.deleteProperty(target, property)
			thisContext.notify(property)
			return true
		}
	}
}

class Copepod {
	constructor (obj) {
		this.uid = ++unique

		this.inputs = {} // inputs to watch for value changes
		this.subscribers = {} // watchers to notify on value change

		this.obj = new Proxy(obj, buildProxy(this))
	}

	destroy () {
		// cleanup event handlers
		Object.keys(this.inputs).forEach((k) => {
			utils.elementTools.off(this.constructor.name + '-' + this.uid, this.inputs[k], 'keyup change click')
		})
	}

	set (property, value) {
		this.obj[property] = value
	}

	delete (property) {
		delete this.obj[property]
	}

	attachInput (input) {
		const inputProp = input.getAttribute('name')
		this.inputs[inputProp] = input

		// if input has a value, initialize this.obj[property] to input value
		if (input.value && input.value !== this.obj[inputProp]) {
			this.obj[inputProp] = input.value
		} else {
			this.obj[inputProp] = ''
		}

		// keep property in sync with input
		utils.elementTools.on(this.constructor.name + '-' + this.uid, input, 'keyup change click', '', (e) => {
			if (e.target.value !== this.obj[inputProp]) {
				this.obj[inputProp] = e.target.value
			}
		}, true)
	}

	detatchInput (input) {
		const inputProp = input.getAttribute('name')
		utils.elementTools.off(this.constructor.name + '-' + this.uid, input, 'keyup change click', '')
		delete this.inputs[inputProp]
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
		// sync inputs (input <- this.obj[property])
		Object.keys(this.inputs).forEach((k) => {
			this.inputs[k].value = this.obj[k].toString()
		})

		// tell subscribers
		Object.keys(this.subscribers).forEach((k) => {
			this.subscribers[k](property, this.obj[property])
		})
	}
}

export {
	Copepod
}
