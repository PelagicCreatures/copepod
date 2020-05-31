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

		let server = await
		import ('./lib/mount.mjs')
		let persist = await
		import ('./lib/CopepodSequelize.mjs')

		// mount a socket.io namespace for Sequelize tables
		// will instantiate CopepodSequelize objects for connections
		server.mount(http, {
			namespace: '/copepod',
			class: persist.CopepodSequelize,
			db: sequelize
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
		TestTable.create({
			input1: 'allocated'
		})

		main()
	})
}, wait)
