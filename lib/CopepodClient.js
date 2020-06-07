import {
	utils
}
	from '@pelagiccreatures/sargasso'

import {
	Copepod
}
	from './Copepod.mjs'

import {
	CopepodElement
}
	from './CopepodElement.mjs'

import {
	getRealVal, setRealVal
}
	from './formUtils.mjs'

import {
	debounce
}
	from './dependancies.mjs'

// input element and socket.io-client sync behavior for Copepod data binding

class CopepodClient extends Copepod {
	constructor (id, obj = {}, options) {
		super(id, obj, options)

		this.watchedInputs = [] // all inputs to watch for value changes

		this.boundInputs = {} // inputs to keep in sync w/ properties

		this.socket = null

		this.pauseSocket = false // flag to prevent re-propagation to server
	}

	// establish and authenticated client connection using socket.io-client
	start () {
		if (this.options.namespace) {
			let url = this.options.url || ''
			if (this.options.namespace) {
				url += this.options.namespace
			}

			this.socket = io(url)

			this.socket.on('error', (err) => {
				this.emit('error', {
					message: 'socket error',
					error: err
				})
			})

			// authenticated with server
			const authenticateHandler = (result) => {
				if (result.status !== 'ok') {
					this.emit('error', {
						message: 'copepod authentication failed',
						error: result
					})
					return
				}

				this.emit('status', 'authenticated')

				const user = result.user

				const changeHandler = (event) => {
					this.set(event.property, event.value, event.source)
				}

				this.socket.on('disconnect', (reason) => {
					this.emit('status', 'disconnect: ' + reason)
				})

				// listen for change events from server side
				this.socket.on('change', changeHandler)

				// subscribe to change for copepod id
				// socket.io 'room' corresponds to id of Copepod object
				const options = {
					id: this.id,
					table: this.options.table,
					row: this.options.row
				}

				// subscribed to a Copepod ID, listen for changes and monitor connection
				const subscribeHandler = (result) => {
					if (result.status !== 'ok') {
						this.emit('error', {
							message: 'copepod authentication failed',
							error: result
						})
					}

					this.emit('status', 'subscribed')
				}

				this.socket.emit('subscribe', options, subscribeHandler)
			}

			this.socket.on('reconnect', (attemptNumber) => {
				this.emit('status', 'reconnect attempt: ' + attemptNumber)
				this.socket.emit('authenticate', authenticateHandler)
			})

			this.socket.emit('authenticate', authenticateHandler)
		}
	}

	destroy () {
		if (this.socket) {
			this.socket.disconnect(true)
		}

		this.watchedInputs.forEach((input) => {
			this.unbindInput(input)
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

		if (!this.boundInputs[inputProp]) {
			this.boundInputs[inputProp] = theInput
		}

		// watch input for change and sync
		if (this.watchedInputs.indexOf(input) === -1) {
			this.watchedInputs.push(input)

			// sync property to authoritative input
			const handler = debounce((e) => {
				const value = getRealVal(theInput)
				this.set(inputProp, value)
			}, 500)

			const id = this.constructor.name + '-' + this.id
			utils.elementTools.on(id, input, 'keyup change click blur', null, handler)
		}
	}

	unbindInput (input) {
		this.watchedInputs.splice(this.watchedInputs.indexOf(input), 1)

		const id = this.constructor.name + '-' + this.id
		utils.elementTools.off(id, input, 'keyup change click blur', null)
	}

	getSource () {
		return super.getSource() + ':' + this.socket.id
	}

	// propagate change to server
	sync (property, source) {
		super.sync(property, source)

		if (this.boundInputs[property]) {
			setRealVal(this.boundInputs[property], this.get(property))
		}

		if (this.socket) {
			if (source === this.getSource()) {
				this.socket.emit('change', {
					source: this.socket.id,
					property: property,
					value: this.get(property)
				})
			}
		}
	}
}

export {
	CopepodClient
}
