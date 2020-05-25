const express = require('express')
const app = express()
const http = require('http').createServer(app)
const path = require('path')

app.use(express.static(path.join(__dirname, 'dist')))

app.get('/', (req, res) => {
	res.sendFile(__dirname + '/index.html')
})

const {
	Sequelize, Model, DataTypes
} = require('sequelize')
const sequelize = new Sequelize('sqlite::memory:')
class TestTable extends Model {}
TestTable.init({
	input1: DataTypes.STRING,
	input2: DataTypes.STRING,
	select: DataTypes.STRING,
	selectmultiple: DataTypes.JSON,
	boolean: DataTypes.BOOLEAN,
	checkboxgroup: DataTypes.JSON,
	radiogroup: DataTypes.JSON
}, {
	sequelize, modelName: 'TestTable'
})


let main = async function () {
	let CopepodServer

	try {
		let mod = await
		import ('./lib/CopepodServer.mjs')

		class CopepodSequelize extends mod.CopepodServer {
			constructor(uid, data = {}, options = {}) {
				super(uid, data, options)
				this.table = sequelize.models[options.table]
				this.row = options.row
				this.instance = undefined

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

				this.on('write', (property) => {
					this.persist(property, (err, instance) => {
						// TODO error
						this.instance = instance
						console.log('write', err, instance)
					})
				})

				this.emit('read')
			}

			getInstance(allocate, cb) {
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
				}
				else {
					this.table.findByPk(this.row).then((instance) => {
						cb(null, instance)
					}).catch(function (err) {
						cb(err)
					})
				}
			}

			persist(property, cb) {
				this.getInstance(true, (err, instance) => {
					instance[property] = JSON.stringify(this.get(property))
					instance.save().then(() => {
						cb(err, instance)
					}).catch(function (err) {
						cb(err)
					})
				})
			}

			sync(property) {
				super.sync(property)
				this.emit('write', property)
			}
		}

		mod.mount(http, {
			class: CopepodSequelize
		})
	}
	catch (e) {
		console.log('main error ', e)
	}
}

http.listen(3000, () => {
	console.log('listening on *:3000')
})

// give us time to get into inspector
let wait = 0
setTimeout(() => {
	sequelize.sync().then(() => {
		main()
	})
}, wait)
