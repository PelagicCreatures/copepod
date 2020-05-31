import {
	CopepodServer
}
	from './CopepodServer.mjs'

class CopepodSequelize extends CopepodServer {
	constructor (uid, data = {}, options = {}) {
		super(uid, data, options)
		this.table = options.db.models[options.table] // options.db is expected to be a Sequelize object
		this.row = options.row
		this.instance = undefined

		// watch the db for changes to the current row
		options.db.addHook('afterUpdate', (instance, options) => {
			if (instance.constructor.name === this.options.table && instance.id === this.row) {
				if (!this.instance) {
					this.syncAll()
				} else {
					const changed = instance.changed()
					this.instance = null // force refresh
					changed.forEach((k) => {
						this.sync(k)
					})
				}
			}
		})

		// read from db
		this.on('read', () => {
			this.getInstance(false, (err, instance) => {
				// TODO error
				if (instance) {
					this.instance = instance
					Object.keys(instance.dataValues).forEach((prop) => {
						this.data[prop] = instance.dataValues[prop]
					})
					console.log('read', err, instance)
					this.syncAll()
				}
			})
		})

		// write to db
		this.on('write', (property) => {
			this.persist(property, (err, instance) => {
				// TODO error
				this.instance = instance
				console.log('write', err, instance)
			})
		})

		// do initial read
		this.emit('read')
	}

	getInstance (allocate, cb) {
		if (this.instance) {
			return cb(null, this.instance)
		}

		if (!allocate && !this.row) {
			return cb()
		}

		if (!this.row) {
			this.table.create({}).then((instance) => {
				cb(null, instance)
			}).catch(function (err) {
				cb(err)
			})
		} else {
			this.table.findByPk(this.row).then((instance) => {
				cb(null, instance)
			}).catch(function (err) {
				cb(err)
			})
		}
	}

	persist (property, cb) {
		this.getInstance(true, (err, instance) => {
			instance[property] = JSON.stringify(this.get(property))
			instance.save().then(() => {
				cb(err, instance)
			}).catch(function (err) {
				cb(err)
			})
		})
	}

	sync (property) {
		super.sync(property)
		this.emit('write', property)
	}
}

export {
	CopepodSequelize
}
