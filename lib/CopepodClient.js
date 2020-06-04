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

// TODO on server disconnect/reconnect (connectivity issue) reauthorize
// add input sync and socket.io-client sync to copepod

class CopepodClient extends Copepod {
	constructor (id, obj = {}, options) {
		super(id, obj, options)

		this.inputs = [] // all inputs to watch for value changes

		this.authoritativeInputs = {} // inputs to keep in sync w/ properties

		this.socket = null

		this.pauseSocket = false // flag to prevent re-propagation to server

		// establish client connection using socket.io-client
		if (options.namespace) {
			let url = options.url || ''
			if (options.namespace) {
				url += options.namespace
			}

			this.socket = io(url)

			this.socket.on('error', (err) => {
				console.log('got error:', err)
			})

			this.socket.on('autherror', (err) => {
				console.log('got autherror:', err)
			})

			this.socket.emit('authenticate', (user) => {
				// listen for change events from server side
				this.socket.on('change', (e) => {
					console.log('CopepodClient got change from server: ', e)
					this.set(e.property, e.value, e.source)
				})

				// subscribe to change for copepod id
				// socke.io 'room' corresponds to id of Copepod object
				this.socket.emit('subscribe', {
					id: this.id,
					table: options.table,
					row: options.row
				})

				this.socket.on('disconnect', (reason) => {
					console.log('got disconnect', reason)
				})

				this.socket.on('reconnect', (attemptNumber) => {
					console.log('got reconnect', attemptNumber)
					this.socket.emit('authenticate', (user) => {
						console.log('got reconnected', user)
						this.socket.emit('subscribe', {
							id: this.id,
							table: options.table,
							row: options.row
						})
					})
				})
			})
		}
	}

	destroy () {
		if (this.socket) {
			this.socket.disconnect(true)
		}
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
				this.set(inputProp, value)
			}

			const id = this.constructor.name + '-' + this.id
			utils.elementTools.on(id, input, 'keyup change click blur', null, handler)
		}
	}

	unbindInput (input) {
		this.inputs.splice(this.inputs.indexOf(input), 1)

		const id = this.constructor.name + '-' + this.id
		utils.elementTools.off(id, input, 'keyup change click blur', null)
	}

	getSource () {
		return super.getSource() + ':' + this.socket.id
	}

	// propagate change to server
	sync (property, source) {
		super.sync(property, source)
		if (this.authoritativeInputs[property]) {
			setRealVal(this.authoritativeInputs[property], this.get(property))
		}

		if (this.socket) {
			if (source === this.getSource()) {
				this.socket.emit('change', {
					source: this.socket.id,
					property: property,
					value: this.get(property)
				})
			} else {
				console.log('CopepodClient no re-propagation')
			}
		}
	}
}

export {
	CopepodClient
}
