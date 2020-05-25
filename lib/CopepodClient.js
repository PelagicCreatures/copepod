import {
	utils
}
	from '@pelagiccreatures/sargasso'

import {
	Copepod
}
	from './Copepod.mjs'

/*
	get and set input value for regular inputs and groups

	Uses input grouping scheme from @pelagiccreatures/molamola
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
				value = element.getAttribute('value')
			}
		} else if (element.tagName === 'SELECT') {
			const selected = element.querySelectorAll('option:checked')
			const values = Array.from(selected).map(el => el.value)
			if (element.hasAttribute('multiple')) {
				value = Array.from(values)
			} else {
				value = values[0]
			}
		} else if (element.tagName === 'OPTION') {
			value = element.selected ? element.getAttribute('value') : undefined
		} else {
			value = element.value
		}
	}

	return value
}

const setRealVal = (element, value) => {
	if (element.getAttribute('name') === 'select-multiple') {
		console.log(element, value)
	}
	if (element.getAttribute('data-group')) {
		if (!value) {
			value = []
		}
		const group = element.closest('.input-group').querySelectorAll(element.getAttribute('data-group'))
		for (let i = 0; i < group.length; i++) {
			const e = group[i]
			if (e.getAttribute('type') === 'radio') {
				if (value == e.value) {
					e.checked = true
				}
			} else {
				let index = -1
				for (let j = 0; j < value.length; j++) {
					if (value[j] == e.value) {
						index = j
						break
					}
				}
				if (index !== -1) {
					if (e.getAttribute('type') === 'checkbox') {
						e.checked = true
					} else if (e.tagName === 'OPTION') {
						e.selected = true
					}
				} else {
					if (e.getAttribute('type') === 'checkbox') {
						e.checked = false
					} else if (e.tagName === 'OPTION') {
						e.selected = false
					}
				}
			}
		}
	} else {
		if (element.getAttribute('type') === 'checkbox') {
			element.checked = value == element.value
		} else {
			element.value = value
		}
	}
}

// add input sync and socket.io-client sync to copepod

class CopepodClient extends Copepod {
	constructor (uid, obj = {}, options) {
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

				this.socket.emit('subscribe', {
					uid: this.uid,
					table: options.table,
					row: options.row
				})
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
	bindForm (form) {
		const inputs = Array.from(form.querySelectorAll('input, select, textarea, button'))
		inputs.forEach((e) => {
			this.bindInput(e)
		})

		this.syncAll() // update the inputs from the current data values
	}

	bindInput (input) {
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

				if (JSON.stringify(this.get(inputProp)) !== JSON.stringify(value)) {
					this.set(inputProp, value)
				}
			}

			const id = this.constructor.name + '-' + this.uid
			utils.elementTools.on(id, input, 'keyup change click blur', null, handler)
		}
	}

	unbindInput (input) {
		this.inputs.splice(this.inputs.indexOf(input), 1)

		const id = this.constructor.name + '-' + this.uid
		utils.elementTools.off(id, input, 'keyup change click blur', null)
	}

	// propagate change to server
	sync (property) {
		super.sync(property)

		if (this.authoritativeInputs[property]) {
			setRealVal(this.authoritativeInputs[property], this.get(property))
		}

		// sync with server side if defined
		if (this.socket) {
			this.socket.emit('change', {
				property: property,
				value: this.get(property)
			})
		}
	}
}

export {
	CopepodClient
}
