const express = require('express')
const app = express()
const http = require('http').createServer(app)
const path = require('path')
const cookie = require('cookie')

app.use(express.static(path.join(__dirname, 'dist')))

app.get('/', (req, res) => {
	res.sendFile(__dirname + '/index.html')
})

const {
	Sequelize, Model, DataTypes
} = require('sequelize')

const sequelize = new Sequelize('sqlite::memory:', {
	//storage: 'working/database.sqlite'
})
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
	sequelize, modelName: 'TestTable', timestamps: false
})

let authUserHandler = (socket, cb) => {
	const cookies = cookie.parse(socket.request.headers.cookie || '')

	if (!cookies['access-token']) {
		let err = new Error('bad request, missing token.')
		err.statusCode = 400;
		return cb(err)
	}

	if (cookies['access-token'] !== 'mytoken') {
		let err = new Error('unauthorized')
		err.statusCode = 401;
		return cb(err)
	}

	const user = {
		id: 'fake-user-' + cookies['user']
	}

	cb(null, user);
}

let authAccessHandler = (user, id, persistOptions, cb) => {
	cb()
}

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
		}, authUserHandler, authAccessHandler)
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
			input1: '1',
			radiogroup: '6'
		})

		/*
		setInterval(() => {
			TestTable.findByPk(1).then((instance) => {
				instance.input1 = (parseInt(instance.input1) + 1) + ''
				instance.save()
			})
		}, 6000)
		*/

		main()
	})
}, wait)
