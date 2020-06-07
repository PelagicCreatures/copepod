import Debug from 'debug'
import io from 'socket.io'
import {
	CopepodServer
}
	from './CopepodServer.mjs'

const debug = Debug('copepod')

/*
	listen for connectons on namespace and authenticate access

	Once authenticated, instantiate requested subclass of CopepodServer to handle
	'change' messages from client

	handler for user authentication
	let authUserHandler = async(socket) => {
		return a user based on access token or something
		throw error if access is not allowed
	})

	Handler for user subscription requests
	let authAccessHandler = async(user, copepodId, persistOptions) => {
		return true
		throw error if access is not allowed
	}
	*/
const mount = (http, options = {}, authUserHandler, authAccessHandler) => {
	const namespace = io(http, {
		wsEngine: 'ws'
	}).of(options.namespace || '/copepod')
	const subscribers = {}
	const data = {}

	// mount listener for namespace
	namespace.on('connection', (socket) => {
		debug('io connect')

		// authentication event handler
		socket.on('authenticate', (authClientCallback) => {
			// let authUserHandler try to authenticate user
			authUserHandler(socket, (err, user) => {
				if (err) {
					return authClientCallback({
						status: err.statusCode,
						error: err.message
					})
				}

				// setup subscribe event handler to to validate room subscription
				socket.on('subscribe', (subscribeOptions, subscribeClientCallback) => {
					const id = subscribeOptions.id // Copepod object id

					debug('subscribe event, Copepod id', user, id)

					authAccessHandler(user, id, subscribeOptions, (err) => {
						if (err) {
							return subscribeClientCallback({
								status: err.statusCode,
								error: err.message
							})
						}

						socket.join(id)

						// instantiate if needed and start listening
						if (!subscribers[id]) {
							debug('subscribe event create Copepod Service, Copepod', id, subscribeOptions.table, subscribeOptions.row)

							const Constructor = options.class || CopepodServer
							subscribers[id] = new Constructor(id, data, {
								namespace: namespace,
								socket: socket,
								db: options.db,
								table: subscribeOptions.table,
								row: subscribeOptions.row
							})
						}

						subscribers[id].listen(socket, user)

						// Disconect socket and cleanup Copepod if no more connected clients
						const disconnectHandler = () => {
							debug('user disconnecting event', user, id)
							if (subscribers[id]) {
								subscribers[id].stopListening(socket)
								if (subscribers[id].sockets.length === 0) {
									subscribers[id].destroy()
									delete subscribers[id]
								}
							}
						}

						socket.on('unsubscribe', disconnectHandler)
						socket.on('disconnecting', disconnectHandler)

						subscribeClientCallback({
							status: 'ok'
						})
					})
				})

				authClientCallback({
					status: 'ok',
					user: user
				})
			})
		})

		socket.on('disconnect', () => {
			debug('io disconnect')
		})
	})
}

export {
	mount
}
