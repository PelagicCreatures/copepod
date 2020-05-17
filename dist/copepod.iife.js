this.PelagicCreatures = this.PelagicCreatures || {};
this.PelagicCreatures.Copepod = (function (exports, sargasso) {
	'use strict';

	let unique = 0;

	/*
		<input name="itsalive">

		let myObj = {itsalive:'initial value'}
		let live = new Copepod(myObj,document.querySelector('[name="itsalive"]'))

		live.subscribe('uuid',(val) => {
			console.log('changed to ',val)
		})

		live.itsalive = 100 // will set input to 100 and notify any subscribers
	*/

	const buildProxy = (thisContext) => {
		return {
			set (target, property, value) {
				Reflect.set(target, property, value);
				thisContext.notify();
				if (thisContext.watching) {
					Object.keys(thisContext.watching).forEach((k) => {
						thisContext.watching[k].value = thisContext.value[k].toString();
					});
				}
				return true
			},
			deleteProperty (target, property) {
				Reflect.deleteProperty(target, property);
				thisContext.notify();
				return true
			}
		}
	};

	class Copepod {
		constructor (obj, watchInputForChange) {
			this.uid = ++unique;
			this.watching = {};
			this.subscribers = {};
			this.value = obj;

			this.value = new Proxy(obj, buildProxy(this));
		}

		destroy () {
			Object.keys(this.watching).forEach((k) => {
				sargasso.utils.elementTools.off(this.constructor.name + '-' + this.uid, this.watching[k], 'keyup change click');
			});
		}

		watch (input) {
			if (input) {
				const inputProp = input.getAttribute('name');
				this.watching[inputProp] = input;

				if (input.value && input.value !== this.value[inputProp]) {
					this.value[inputProp] = input.value;
				}

				if (!this.value[inputProp]) {
					this.value[inputProp] = '';
				}

				sargasso.utils.elementTools.on(this.constructor.name + '-' + this.uid, input, 'keyup change click', '', (e) => {
					if (e.target.value !== this.value[inputProp]) {
						this.value[inputProp] = e.target.value;
					}
				}, true);
			}
		}

		subscribe (id, fn) {
			this.subscribers[id] = fn;
			fn(this.value);
		}

		unSubscribe (id) {
			if (this.subscribers[id]) {
				delete this.subscribers[id];
			}
		}

		notify () {
			Object.keys(this.subscribers).forEach((k) => {
				this.subscribers[k](this.value);
			});
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

	exports.Copepod = Copepod;

	return exports;

}({}, PelagicCreatures.Sargasso));
//# sourceMappingURL=copepod.iife.js.map
