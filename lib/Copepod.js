import {
	utils
}
	from '@pelagiccreatures/sargasso'

let unique = 0

/*
	<input name="itsalive">

	let myObj = {itsalive:'initial value'}
	let live = new Copepod(myObj,document.querySelector('[name="itsalive"]'))

	live.subscribe('uuid',(val) => {
		console.log('changed to ',val)
	})

	live.itsalive = 100 // will set input to 100 and notify any subscribers
*/

const buildProxy = (thisContext) => {
	return {
		set (target, property, value) {
			Reflect.set(target, property, value)
			thisContext.notify()
			if (thisContext.watch) {
				thisContext.watch.value = thisContext.value[thisContext.inputProp].toString()
			}
			return true
		},
		deleteProperty (target, property) {
			Reflect.deleteProperty(target, property)
			thisContext.notify()
			return true
		}
	}
}

class Copepod {
	constructor (obj, watchInputForChange) {
		this.uid = ++unique
		this.subscribers = {}
		this.value = obj

		if (watchInputForChange) {
			this.watch = watchInputForChange
			this.inputProp = this.watch.getAttribute('name')
			if (!obj[this.inputProp]) {
				obj[this.inputProp] = ''
			}
			if (this.watch.value && this.watch.value !== obj[this.inputProp]) {
				obj[this.inputProp] = this.watch.value
			}
			utils.elementTools.on(this.constructor.name + '-' + this.uid, this.watch, 'keyup change click', '', (e) => {
				if (this.watch.value !== this.value[this.inputProp]) {
					this.value[this.inputProp] = this.watch.value
				}
			}, true)
		}

		this.value = new Proxy(obj, buildProxy(this))
	}

	destroy () {
		if (this.watch) {
			utils.elementTools.off(this.constructor.name + '-' + this.uid, this.watch, 'keyup change click')
		}
	}

	subscribe (id, fn) {
		this.subscribers[id] = fn
		fn(this.value)
	}

	unSubscribe (id) {
		if (this.subscribers[id]) {
			delete this.subscribers[id]
		}
	}

	notify () {
		Object.keys(this.subscribers).forEach((k) => {
			this.subscribers[k](this.value)
		})
	}
}

export {
	Copepod
}
