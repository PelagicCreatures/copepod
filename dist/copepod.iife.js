this.PelagicCreatures = this.PelagicCreatures || {};
this.PelagicCreatures.Copepod = (function (exports, sargasso) {
	'use strict';

	// build Proxy to handle set and delete on an object's properties
	const buildProxy = (self) => {
		return {
			set (target, property, value) {
				Reflect.set(target, property, value);
				self.notify(property);
				return true
			},
			deleteProperty (target, property) {
				Reflect.deleteProperty(target, property);
				self.notify(property);
				return true
			}
		}
	};

	class Copepod {
		constructor (uid, obj, options = {}) {
			this.uid = uid;

			this.subscribers = {}; // watchers to notify on value change

			this.obj = new Proxy(obj, buildProxy(this));

			this.socket = null;

			this.options = options;
		}

		destroy () {

		}

		set (property, value) {
			if (this.obj[property] !== value) {
				this.obj[property] = value;
			}
		}

		delete (property) {
			delete this.obj[property];
		}

		subscribe (id, fn) {
			this.subscribers[id] = fn;
			Object.keys(this.obj).forEach((k) => {
				fn(k, this.obj[k]);
			});
		}

		unSubscribe (id) {
			if (this.subscribers[id]) {
				delete this.subscribers[id];
			}
		}

		notify (property) {
			// tell subscribers
			Object.keys(this.subscribers).forEach((k) => {
				this.subscribers[k](property, this.obj[property]);
			});
		}
	}

	class CopepodClient extends Copepod {
		constructor (uid, obj, options) {
			super(uid, obj, options);

			this.inputs = {}; // inputs to watch for value changes

			// establish client connection using socket.io
			if (options.namespace) {
				let url = options.url || '';
				if (options.namespace) {
					url += options.namespace;
				}
				this.socket = io(url);
				this.socket.on('authenticated', (user) => {
					this.socket.on('change', (e) => {
						console.log('change from server: ', e);
						this.set(e.property, e.value);
					});
					this.socket.emit('subscribe', this.uid);
				});
				this.socket.on('error', (err) => {
					console.log('got error:', err);
				});
				this.socket.on('autherror', (err) => {
					console.log('got autherror:', err);
				});

				this.socket.emit('authenticate');
			}
		}

		destroy () {
			// cleanup event handlers
			Object.keys(this.inputs).forEach((k) => {
				sargasso.utils.elementTools.off(this.constructor.name + '-' + this.uid, this.inputs[k], 'keyup change click');
			});

			super.destroy();
		}

		attachInput (input) {
			const inputProp = input.getAttribute('name');
			if (!this.inputs[inputProp]) {
				this.inputs[inputProp] = input;

				// if input has a value, initialize this.obj[property] to input value
				if (input.value && input.value !== this.obj[inputProp]) {
					this.obj[inputProp] = input.value;
				} else {
					this.obj[inputProp] = '';
				}

				// keep property in sync with input
				const id = this.constructor.name + '-' + this.uid;
				const handler = (e) => {
					if (e.target.value !== this.obj[inputProp]) {
						this.obj[inputProp] = e.target.value;
					}
				};
				sargasso.utils.elementTools.on(id, input, 'keyup change click', null, handler);
			}
		}

		detatchInput (input) {
			const inputProp = input.getAttribute('name');
			if (this.inputs[inputProp]) {
				const id = this.constructor.name + '-' + this.uid;
				sargasso.utils.elementTools.off(id, input, 'keyup change click', null);
				delete this.inputs[inputProp];
			}
		}

		// propagate change to server
		notify (property) {
			super.notify(property);

			// sync inputs (input <- this.obj[property])
			Object.keys(this.inputs).forEach((k) => {
				this.inputs[k].value = this.obj[k].toString();
			});

			if (this.socket) {
				this.socket.emit('change', {
					property: property,
					value: this.obj[property]
				});
			}
		}
	}

	/**
		@PelagicCreatures/Copepod

		Sargasso class that impelments lazy loaded images using background-image which always
		fits image within its container's dimensions

		@author Michael Rhodes
		@license MIT
		Made in Barbados 🇧🇧 Copyright © 2020 Michael Rhodes

	**/

	exports.CopepodClient = CopepodClient;

	return exports;

}({}, PelagicCreatures.Sargasso));
//# sourceMappingURL=copepod.iife.js.map
