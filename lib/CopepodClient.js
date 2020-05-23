import {
	utils
}
	from '@pelagiccreatures/sargasso'

import {
	Copepod
}
	from './Copepod.js'

/*
	Normalize value from an input.
	returns an array of values for groups and <select multiple>
*/
const getRealVal = (element) => {
	let value = ''

	// collection of checkboxes or other inputs results in array of values
	if (element.getAttribute('data-group')) {
		const group = element.closest('.input-group').querySelectorAll(element.getAttribute('data-group'))
		const values = []
		for (let i = 0; i < group.length; i++) {
			if (getRealVal(group[i])) {
				values.push(getRealVal(group[i]))
			}
			if (element.hasAttribute('multiple')) {
				value = values
			} else {
				value = values.length ? values[0] : ''
			}
		}
	} else {
		if (element.getAttribute('type') === 'checkbox' || element.getAttribute('type') === 'radio') {
			if (element.checked) {
				const v = element.getAttribute('value')
				if (v) {
					value = v
				} else {
					value = !!element.checked
				}
			}
		} else if (element.tagName === 'SELECT') {
			const selected = element.querySelectorAll('option:checked')
			const values = Array.from(selected).map(el => el.value)
			if (element.hasAttribute('multiple')) {
				value = Array.from(values)
			} else {
				value = values[0]
			}
		} else {
			value = element.value
		}
	}

	return value
}

// add input sync and socket.io-client sync to copepod

class CopepodClient extends Copepod {
	constructor (uid, obj, options) {
		super(uid, obj, options)

		this.inputs = [] // all inputs to watch for value changes

		this.authoritativeInputs = {} // inputs to keep in sync w/ properties

		// establish client connection using socket.io-client
		if (options.namespace) {
			let url = options.url || ''
			if (options.namespace) {
				url += options.namespace
			}

			this.socket = io(url)

			this.socket.on('authenticated', (user) => {
				this.socket.on('change', (e) => {
					console.log('change from server: ', e)
					this.set(e.property, e.value)
				})
				this.socket.emit('subscribe', this.uid)
			})

			this.socket.on('error', (err) => {
				console.log('got error:', err)
			})

			this.socket.on('autherror', (err) => {
				console.log('got autherror:', err)
			})

			this.socket.emit('authenticate')
		}
	}

	destroy () {
		this.inputs.forEach((input) => {
			this.detatchInput(input)
		})

		super.destroy()
	}

	// watch all inputs in the form for changes
	attachForm (form) {
		const inputs = Array.from(form.querySelectorAll('input, select, textarea, button'))
		inputs.forEach((e) => {
			this.attachInput(e)
		})

		this.sync() // update the inputs from the current data values
	}

	attachInput (input) {
		let theInput = input
		let inputProp = input.getAttribute('name')

		// if the input is part of an input group (radio, checkbox, select "multiple")
		// find the authoritative input to sync
		let group = null
		if (input.closest('.input-group')) {
			group = input.closest('.input-group').querySelector('[data-group]')
			if (group) {
				theInput = group
				inputProp = group.getAttribute('name')
			}
		}

		if (!this.authoritativeInputs[inputProp]) {
			this.authoritativeInputs[inputProp] = theInput
		}

		// watch input for change and sync
		if (this.inputs.indexOf(input) === -1) {
			this.inputs.push(input)

			// sync property to authoritative input
			const handler = (e) => {
				const value = getRealVal(theInput)

				if (value !== this.data[inputProp]) {
					this.set(inputProp, value)
				}
			}

			const id = this.constructor.name + '-' + this.uid
			utils.elementTools.on(id, input, 'keyup change click blur', null, handler)
		}
	}

	detatchInput (input) {
		this.inputs.splice(this.inputs.indexOf(input), 1)

		const id = this.constructor.name + '-' + this.uid
		utils.elementTools.off(id, input, 'keyup change click blur', null)
	}

	// propagate change to server
	notify (property) {
		super.notify(property)

		// sync inputs (input <- this.data[property])
		Object.keys(this.authoritativeInputs).forEach((k) => {
			this.authoritativeInputs[k].value = this.get(k)
		})

		if (this.socket) {
			this.socket.emit('change', {
				property: property,
				value: this.data[property]
			})
		}
	}
}

export {
	CopepodClient
}
