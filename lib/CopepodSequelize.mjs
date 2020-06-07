import Debug from 'debug'

import {
	CopepodServer
}
	from './CopepodServer.mjs'

import {
	isEqual
}
	from './dependancies.mjs'

const debug = Debug('copepod')

class CopepodSequelize extends CopepodServer {
	constructor (id, data = {}, options = {}) {
		super(id, data, options)
		this.table = options.db.models[options.table] // options.db is expected to be a Sequelize object
		this.row = options.row
		this.instance = undefined

		// watch the db for changes to the current row
		options.db.addHook('afterUpdate', this.uniqueId, (instance, options) => {
			if (instance.constructor.name === this.options.table && instance.id === this.row) {
				debug('CopepodSequelize got afterUpdate event', instance.constructor.name, instance.id)

				if (!this.instance) {
					this.instance = instance
					this.syncAll()
				} else {
					this.instance = instance
					const changed = instance.changed()
					changed.forEach((prop) => {
						let val = instance[prop]
						const type = this.table.tableAttributes[prop].type.constructor.key
						if (val && type === JSON) {
							val = JSON.parse(val)
						}
						this.set(prop, val)
					})
				}
			}
		})

		// read from db
		this.on('read', () => {
			debug('CopepodSequelize got read event')

			this.getInstance(false, (err, instance) => {
				if (err) {
					// TODO deal with err
				}
				if (instance) {
					Object.keys(instance.dataValues).forEach((prop) => {
						let val = instance.dataValues[prop]
						const type = this.table.tableAttributes[prop].type.constructor.key

						if (val && type === JSON) {
							val = JSON.parse(val)
						}
						this.set(prop, val)
					})
				}
			})

			debug('CopepodSequelize constructor')
		})

		// write to db
		this.on('write', (property) => {
			debug('CopepodSequelize got write event', property)

			this.persist(property, (err, instance) => {
				if (err) {
					// TODO deal with err
				}
				this.instance = instance
			})
		})

		// do initial read
		this.emit('read')
	}

	destroy () {
		debug('CopepodSequelize destroy')

		this.options.db.removeHook('afterUpdate', this.uniqueId)
		super.destroy()
	}

	getInstance (allocate, cb) {
		debug('CopepodSequelize getInstance')

		if (this.instance) {
			return cb(null, this.instance)
		}

		if (!allocate && !this.row) {
			return cb()
		}

		if (!this.row) {
			this.table.create({}).then((instance) => {
				this.instance = instance
				cb(null, instance)
			}).catch(function (err) {
				cb(err)
			})
		} else {
			this.table.findByPk(this.row).then((instance) => {
				this.instance = instance
				cb(null, instance)
			}).catch(function (err) {
				cb(err)
			})
		}
	}

	persist (property, cb) {
		debug('CopepodSequelize persist')

		this.getInstance(true, (err, instance) => {
			let val = this.get(property)
			if (isEqual(instance[property], val)) {
				return cb(null, instance)
			}

			const type = this.table.tableAttributes[property].type.constructor.key
			if (val && type === JSON) {
				val = JSON.stringify(val)
			}
			instance[property] = val
			instance.save().then(() => {
				cb(err, instance)
			}).catch(function (err) {
				cb(err)
			})
		})
	}

	sync (property, source) {
		debug('CopepodSequelize sync')

		super.sync(property, source)
		if (source !== this.getSource()) {
			this.emit('write', property)
		}
	}
}

export {
	CopepodSequelize
}
