this.PelagicCreatures = this.PelagicCreatures || {};
this.PelagicCreatures.Copepod = (function (exports, sargasso) {
  'use strict';

  'use strict';

  var domain;

  // This constructor is used to store event handlers. Instantiating this is
  // faster than explicitly calling `Object.create(null)` to get a "clean" empty
  // object (tested with v8 v4.9).
  function EventHandlers() {}
  EventHandlers.prototype = Object.create(null);

  function EventEmitter() {
    EventEmitter.init.call(this);
  }

  // nodejs oddity
  // require('events') === require('events').EventEmitter
  EventEmitter.EventEmitter = EventEmitter;

  EventEmitter.usingDomains = false;

  EventEmitter.prototype.domain = undefined;
  EventEmitter.prototype._events = undefined;
  EventEmitter.prototype._maxListeners = undefined;

  // By default EventEmitters will print a warning if more than 10 listeners are
  // added to it. This is a useful default which helps finding memory leaks.
  EventEmitter.defaultMaxListeners = 10;

  EventEmitter.init = function() {
    this.domain = null;
    if (EventEmitter.usingDomains) {
      // if there is an active domain, then attach to it.
      if (domain.active && !(this instanceof domain.Domain)) {
        this.domain = domain.active;
      }
    }

    if (!this._events || this._events === Object.getPrototypeOf(this)._events) {
      this._events = new EventHandlers();
      this._eventsCount = 0;
    }

    this._maxListeners = this._maxListeners || undefined;
  };

  // Obviously not all Emitters should be limited to 10. This function allows
  // that to be increased. Set to zero for unlimited.
  EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
    if (typeof n !== 'number' || n < 0 || isNaN(n))
      throw new TypeError('"n" argument must be a positive number');
    this._maxListeners = n;
    return this;
  };

  function $getMaxListeners(that) {
    if (that._maxListeners === undefined)
      return EventEmitter.defaultMaxListeners;
    return that._maxListeners;
  }

  EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
    return $getMaxListeners(this);
  };

  // These standalone emit* functions are used to optimize calling of event
  // handlers for fast cases because emit() itself often has a variable number of
  // arguments and can be deoptimized because of that. These functions always have
  // the same number of arguments and thus do not get deoptimized, so the code
  // inside them can execute faster.
  function emitNone(handler, isFn, self) {
    if (isFn)
      handler.call(self);
    else {
      var len = handler.length;
      var listeners = arrayClone(handler, len);
      for (var i = 0; i < len; ++i)
        listeners[i].call(self);
    }
  }
  function emitOne(handler, isFn, self, arg1) {
    if (isFn)
      handler.call(self, arg1);
    else {
      var len = handler.length;
      var listeners = arrayClone(handler, len);
      for (var i = 0; i < len; ++i)
        listeners[i].call(self, arg1);
    }
  }
  function emitTwo(handler, isFn, self, arg1, arg2) {
    if (isFn)
      handler.call(self, arg1, arg2);
    else {
      var len = handler.length;
      var listeners = arrayClone(handler, len);
      for (var i = 0; i < len; ++i)
        listeners[i].call(self, arg1, arg2);
    }
  }
  function emitThree(handler, isFn, self, arg1, arg2, arg3) {
    if (isFn)
      handler.call(self, arg1, arg2, arg3);
    else {
      var len = handler.length;
      var listeners = arrayClone(handler, len);
      for (var i = 0; i < len; ++i)
        listeners[i].call(self, arg1, arg2, arg3);
    }
  }

  function emitMany(handler, isFn, self, args) {
    if (isFn)
      handler.apply(self, args);
    else {
      var len = handler.length;
      var listeners = arrayClone(handler, len);
      for (var i = 0; i < len; ++i)
        listeners[i].apply(self, args);
    }
  }

  EventEmitter.prototype.emit = function emit(type) {
    var er, handler, len, args, i, events, domain;
    var needDomainExit = false;
    var doError = (type === 'error');

    events = this._events;
    if (events)
      doError = (doError && events.error == null);
    else if (!doError)
      return false;

    domain = this.domain;

    // If there is no 'error' event listener then throw.
    if (doError) {
      er = arguments[1];
      if (domain) {
        if (!er)
          er = new Error('Uncaught, unspecified "error" event');
        er.domainEmitter = this;
        er.domain = domain;
        er.domainThrown = false;
        domain.emit('error', er);
      } else if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        // At least give some kind of context to the user
        var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
        err.context = er;
        throw err;
      }
      return false;
    }

    handler = events[type];

    if (!handler)
      return false;

    var isFn = typeof handler === 'function';
    len = arguments.length;
    switch (len) {
      // fast cases
      case 1:
        emitNone(handler, isFn, this);
        break;
      case 2:
        emitOne(handler, isFn, this, arguments[1]);
        break;
      case 3:
        emitTwo(handler, isFn, this, arguments[1], arguments[2]);
        break;
      case 4:
        emitThree(handler, isFn, this, arguments[1], arguments[2], arguments[3]);
        break;
      // slower
      default:
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        emitMany(handler, isFn, this, args);
    }

    if (needDomainExit)
      domain.exit();

    return true;
  };

  function _addListener(target, type, listener, prepend) {
    var m;
    var events;
    var existing;

    if (typeof listener !== 'function')
      throw new TypeError('"listener" argument must be a function');

    events = target._events;
    if (!events) {
      events = target._events = new EventHandlers();
      target._eventsCount = 0;
    } else {
      // To avoid recursion in the case that type === "newListener"! Before
      // adding it to the listeners, first emit "newListener".
      if (events.newListener) {
        target.emit('newListener', type,
                    listener.listener ? listener.listener : listener);

        // Re-assign `events` because a newListener handler could have caused the
        // this._events to be assigned to a new object
        events = target._events;
      }
      existing = events[type];
    }

    if (!existing) {
      // Optimize the case of one listener. Don't need the extra array object.
      existing = events[type] = listener;
      ++target._eventsCount;
    } else {
      if (typeof existing === 'function') {
        // Adding the second element, need to change to array.
        existing = events[type] = prepend ? [listener, existing] :
                                            [existing, listener];
      } else {
        // If we've already got an array, just append.
        if (prepend) {
          existing.unshift(listener);
        } else {
          existing.push(listener);
        }
      }

      // Check for listener leak
      if (!existing.warned) {
        m = $getMaxListeners(target);
        if (m && m > 0 && existing.length > m) {
          existing.warned = true;
          var w = new Error('Possible EventEmitter memory leak detected. ' +
                              existing.length + ' ' + type + ' listeners added. ' +
                              'Use emitter.setMaxListeners() to increase limit');
          w.name = 'MaxListenersExceededWarning';
          w.emitter = target;
          w.type = type;
          w.count = existing.length;
          emitWarning(w);
        }
      }
    }

    return target;
  }
  function emitWarning(e) {
    typeof console.warn === 'function' ? console.warn(e) : console.log(e);
  }
  EventEmitter.prototype.addListener = function addListener(type, listener) {
    return _addListener(this, type, listener, false);
  };

  EventEmitter.prototype.on = EventEmitter.prototype.addListener;

  EventEmitter.prototype.prependListener =
      function prependListener(type, listener) {
        return _addListener(this, type, listener, true);
      };

  function _onceWrap(target, type, listener) {
    var fired = false;
    function g() {
      target.removeListener(type, g);
      if (!fired) {
        fired = true;
        listener.apply(target, arguments);
      }
    }
    g.listener = listener;
    return g;
  }

  EventEmitter.prototype.once = function once(type, listener) {
    if (typeof listener !== 'function')
      throw new TypeError('"listener" argument must be a function');
    this.on(type, _onceWrap(this, type, listener));
    return this;
  };

  EventEmitter.prototype.prependOnceListener =
      function prependOnceListener(type, listener) {
        if (typeof listener !== 'function')
          throw new TypeError('"listener" argument must be a function');
        this.prependListener(type, _onceWrap(this, type, listener));
        return this;
      };

  // emits a 'removeListener' event iff the listener was removed
  EventEmitter.prototype.removeListener =
      function removeListener(type, listener) {
        var list, events, position, i, originalListener;

        if (typeof listener !== 'function')
          throw new TypeError('"listener" argument must be a function');

        events = this._events;
        if (!events)
          return this;

        list = events[type];
        if (!list)
          return this;

        if (list === listener || (list.listener && list.listener === listener)) {
          if (--this._eventsCount === 0)
            this._events = new EventHandlers();
          else {
            delete events[type];
            if (events.removeListener)
              this.emit('removeListener', type, list.listener || listener);
          }
        } else if (typeof list !== 'function') {
          position = -1;

          for (i = list.length; i-- > 0;) {
            if (list[i] === listener ||
                (list[i].listener && list[i].listener === listener)) {
              originalListener = list[i].listener;
              position = i;
              break;
            }
          }

          if (position < 0)
            return this;

          if (list.length === 1) {
            list[0] = undefined;
            if (--this._eventsCount === 0) {
              this._events = new EventHandlers();
              return this;
            } else {
              delete events[type];
            }
          } else {
            spliceOne(list, position);
          }

          if (events.removeListener)
            this.emit('removeListener', type, originalListener || listener);
        }

        return this;
      };

  EventEmitter.prototype.removeAllListeners =
      function removeAllListeners(type) {
        var listeners, events;

        events = this._events;
        if (!events)
          return this;

        // not listening for removeListener, no need to emit
        if (!events.removeListener) {
          if (arguments.length === 0) {
            this._events = new EventHandlers();
            this._eventsCount = 0;
          } else if (events[type]) {
            if (--this._eventsCount === 0)
              this._events = new EventHandlers();
            else
              delete events[type];
          }
          return this;
        }

        // emit removeListener for all listeners on all events
        if (arguments.length === 0) {
          var keys = Object.keys(events);
          for (var i = 0, key; i < keys.length; ++i) {
            key = keys[i];
            if (key === 'removeListener') continue;
            this.removeAllListeners(key);
          }
          this.removeAllListeners('removeListener');
          this._events = new EventHandlers();
          this._eventsCount = 0;
          return this;
        }

        listeners = events[type];

        if (typeof listeners === 'function') {
          this.removeListener(type, listeners);
        } else if (listeners) {
          // LIFO order
          do {
            this.removeListener(type, listeners[listeners.length - 1]);
          } while (listeners[0]);
        }

        return this;
      };

  EventEmitter.prototype.listeners = function listeners(type) {
    var evlistener;
    var ret;
    var events = this._events;

    if (!events)
      ret = [];
    else {
      evlistener = events[type];
      if (!evlistener)
        ret = [];
      else if (typeof evlistener === 'function')
        ret = [evlistener.listener || evlistener];
      else
        ret = unwrapListeners(evlistener);
    }

    return ret;
  };

  EventEmitter.listenerCount = function(emitter, type) {
    if (typeof emitter.listenerCount === 'function') {
      return emitter.listenerCount(type);
    } else {
      return listenerCount.call(emitter, type);
    }
  };

  EventEmitter.prototype.listenerCount = listenerCount;
  function listenerCount(type) {
    var events = this._events;

    if (events) {
      var evlistener = events[type];

      if (typeof evlistener === 'function') {
        return 1;
      } else if (evlistener) {
        return evlistener.length;
      }
    }

    return 0;
  }

  EventEmitter.prototype.eventNames = function eventNames() {
    return this._eventsCount > 0 ? Reflect.ownKeys(this._events) : [];
  };

  // About 1.5x faster than the two-arg version of Array#splice().
  function spliceOne(list, index) {
    for (var i = index, k = i + 1, n = list.length; k < n; i += 1, k += 1)
      list[i] = list[k];
    list.pop();
  }

  function arrayClone(arr, i) {
    var copy = new Array(i);
    while (i--)
      copy[i] = arr[i];
    return copy;
  }

  function unwrapListeners(arr) {
    var ret = new Array(arr.length);
    for (var i = 0; i < ret.length; ++i) {
      ret[i] = arr[i].listener || arr[i];
    }
    return ret;
  }

  const registeredCopepods = {};
  const getCopepod = (id) => {
  	return registeredCopepods[id]
  };

  /*
  	build Proxy to observe set and delete on object properties
  	*/
  const buildProxy = (self) => {
  	return {
  		set (target, property, value) {
  			Reflect.set(target, property, value);
  			self.sync(property);
  			return true
  		},
  		deleteProperty (target, property) {
  			Reflect.deleteProperty(target, property);
  			self.sync(property);
  			return true
  		}
  	}
  };

  /*
  	@class Copepod

  	Base class for data binding. Implements Proxy and Reflect on an object so that
  	changes can be observed.

  	*/
  class Copepod extends EventEmitter {
  	/*
  		@param { String } uid - unique id of
  		@param { Object } data - optional javascript object to observe
  		@param { Object } options - optional, used by subclasses
  		*/
  	constructor (uid, data = {}, options = {}) {
  		super();

  		this.uid = uid;

  		this.bindings = {}; // watchers to sync on value change

  		this.data = new Proxy(data, buildProxy(this));

  		this.socket = null;

  		this.options = options;

  		registeredCopepods[this.uid] = this;
  	}

  	/*
  		@function destroy - remove all bindings
  		*/
  	destroy () {
  		delete (this.data);
  		delete registeredCopepods[this.uid];
  		Object.keys(this.bindings).forEach((prop) => {
  			Object.keys(this.bindings[prop]).forEach((k) => {
  				this.unbind(prop, k);
  			});
  		});
  	}

  	/*
  		@function getBoundData - return object being observed
  		*/
  	getBoundData () {
  		return this.data
  	}

  	/*
  		@function set - set observed object property
  		@param { String } property - observed object property to set
  		@param value - string, array, object or whatever to assign to property
  		*/
  	set (property, value) {
  		if (JSON.stringify(this.get(property)) !== JSON.stringify(value)) {
  			this.data[property] = value;
  		}
  	}

  	/*
  		@function get - get observed object property
  		@param { String } property - observed object property to get
  		*/
  	get (property) {
  		return this.data[property]
  	}

  	/*
  		@function delete - delete observed object property
  		@param { String } property - observed object property to delete
  		*/
  	delete (property) {
  		delete this.data[property];
  	}

  	/*
  		@function syncAll - sync all observed object properties
  		*/
  	syncAll () {
  		Object.keys(this.data || {}).forEach((k) => {
  			this.sync(k);
  		});
  	}

  	/*
  		@function bind - attach a function to observe property changes
  		@param { String } id - unique id of observer function
  		@param { Function } fn - handler called when property changes
  		@param { String } property - optional name of property to observe

  		Handler function prototype:

  		If property is not supplied, callback receives property and value
  		(property, value) => {}

  		Otherwise just the value is supplied
  		(value) => {}
  		*/
  	bind (id, fn, property = '*') {
  		if (!this.bindings[property]) {
  			this.bindings[property] = {};
  		}
  		this.bindings[property][id] = fn;
  		Object.keys(this.data).forEach((k) => {
  			fn(k, this.get(k));
  		});
  	}

  	/*
  		@function unbind - unattach observer
  		@param { String } id - unique id of observer function
  		@param { String } property - optional name of property being observed
  		*/
  	unbind (id, property = '*') {
  		if (this.bindings[property][id]) {
  			delete this.bindings[property][id];
  		}
  	}

  	/*
  		function sync - notify observers of property value change
  		@param { String } property - property that changed
  		*/
  	sync (property) {
  		Object.keys(this.bindings['*'] || {}).forEach((k) => {
  			this.bindings['*'][k](property, this.get(property));
  		});
  		Object.keys(this.bindings[property] || {}).forEach((k) => {
  			this.bindings[property][k](this.get(property));
  		});
  	}
  }

  /*
  	get and set input value for regular inputs and groups

  	Uses input grouping scheme from @pelagiccreatures/molamola
  */

  class CopepodElement extends sargasso.Sargasso {
  	constructor (element, options = {}) {
  		options.watchDOM = true;
  		super(element, options);
  	}

  	DOMChanged () {
  		if (!this.template && this.element.innerHTML) {
  			sargasso.services.theDOMWatcher.unSubscribe(this);
  			this.template = this.element.innerHTML;
  			this.element.innerHTML = '';
  			this.render();
  		}
  	}

  	start () {
  		super.start();

  		this.copepod = getCopepod(this.element.getAttribute('data-copepod-id'));

  		this.copepod.bind(this.uid, (prop, val) => {
  			this.render();
  		});
  	}

  	sleep () {
  		this.copepod.unbind(this.uid);
  		delete (this.copepod);
  		super.sleep();
  	}

  	render () {
  		this.element.innerHTML = this.template.replace(/\${(.*?)}/g, (match, prop) => {
  			return this.copepod.get(prop)
  		});
  	}
  }

  sargasso.utils.registerSargassoClass('CopepodElement', CopepodElement);

  const getRealVal = (element) => {
  	let value = '';

  	// collection of checkboxes or other inputs results in array of values
  	if (element.getAttribute('data-group')) {
  		const group = element.closest('.input-group').querySelectorAll(element.getAttribute('data-group'));
  		const values = [];
  		for (let i = 0; i < group.length; i++) {
  			if (getRealVal(group[i])) {
  				values.push(getRealVal(group[i]));
  			}
  			if (element.hasAttribute('multiple')) {
  				value = values;
  			} else {
  				value = values.length ? values[0] : '';
  			}
  		}
  	} else {
  		if (element.getAttribute('type') === 'checkbox' || element.getAttribute('type') === 'radio') {
  			if (element.checked) {
  				value = element.getAttribute('value');
  			}
  		} else if (element.tagName === 'SELECT') {
  			const selected = element.querySelectorAll('option:checked');
  			const values = Array.from(selected).map(el => el.value);
  			if (element.hasAttribute('multiple')) {
  				value = Array.from(values);
  			} else {
  				value = values[0];
  			}
  		} else if (element.tagName === 'OPTION') {
  			value = element.selected ? element.getAttribute('value') : undefined;
  		} else {
  			value = element.value;
  		}
  	}

  	return value
  };

  const setRealVal = (element, value) => {
  	if (element.getAttribute('name') === 'select-multiple') {
  		console.log(element, value);
  	}
  	if (element.getAttribute('data-group')) {
  		if (!value) {
  			value = [];
  		}
  		const group = element.closest('.input-group').querySelectorAll(element.getAttribute('data-group'));
  		for (let i = 0; i < group.length; i++) {
  			const e = group[i];
  			if (e.getAttribute('type') === 'radio') {
  				if (value == e.value) {
  					e.checked = true;
  				}
  			} else {
  				let index = -1;
  				for (let j = 0; j < value.length; j++) {
  					if (value[j] == e.value) {
  						index = j;
  						break
  					}
  				}
  				if (index !== -1) {
  					if (e.getAttribute('type') === 'checkbox') {
  						e.checked = true;
  					} else if (e.tagName === 'OPTION') {
  						e.selected = true;
  					}
  				} else {
  					if (e.getAttribute('type') === 'checkbox') {
  						e.checked = false;
  					} else if (e.tagName === 'OPTION') {
  						e.selected = false;
  					}
  				}
  			}
  		}
  	} else {
  		if (element.getAttribute('type') === 'checkbox') {
  			element.checked = value == element.value;
  		} else {
  			element.value = value;
  		}
  	}
  };

  // add input sync and socket.io-client sync to copepod

  class CopepodClient extends Copepod {
  	constructor (uid, obj = {}, options) {
  		super(uid, obj, options);

  		this.inputs = []; // all inputs to watch for value changes

  		this.authoritativeInputs = {}; // inputs to keep in sync w/ properties

  		// establish client connection using socket.io-client
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

  				this.socket.emit('subscribe', {
  					uid: this.uid,
  					table: options.table,
  					row: options.row
  				});
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
  		this.inputs.forEach((input) => {
  			this.detatchInput(input);
  		});

  		super.destroy();
  	}

  	// watch all inputs in the form for changes
  	bindForm (form) {
  		const inputs = Array.from(form.querySelectorAll('input, select, textarea, button'));
  		inputs.forEach((e) => {
  			this.bindInput(e);
  		});

  		this.syncAll(); // update the inputs from the current data values
  	}

  	bindInput (input) {
  		let theInput = input;
  		let inputProp = input.getAttribute('name');

  		// if the input is part of an input group (radio, checkbox, select "multiple")
  		// find the authoritative input to sync
  		let group = null;
  		if (input.closest('.input-group')) {
  			group = input.closest('.input-group').querySelector('[data-group]');
  			if (group) {
  				theInput = group;
  				inputProp = group.getAttribute('name');
  			}
  		}

  		if (!this.authoritativeInputs[inputProp]) {
  			this.authoritativeInputs[inputProp] = theInput;
  		}

  		// watch input for change and sync
  		if (this.inputs.indexOf(input) === -1) {
  			this.inputs.push(input);

  			// sync property to authoritative input
  			const handler = (e) => {
  				const value = getRealVal(theInput);

  				if (JSON.stringify(this.get(inputProp)) !== JSON.stringify(value)) {
  					this.set(inputProp, value);
  				}
  			};

  			const id = this.constructor.name + '-' + this.uid;
  			sargasso.utils.elementTools.on(id, input, 'keyup change click blur', null, handler);
  		}
  	}

  	unbindInput (input) {
  		this.inputs.splice(this.inputs.indexOf(input), 1);

  		const id = this.constructor.name + '-' + this.uid;
  		sargasso.utils.elementTools.off(id, input, 'keyup change click blur', null);
  	}

  	// propagate change to server
  	sync (property) {
  		super.sync(property);

  		if (this.authoritativeInputs[property]) {
  			setRealVal(this.authoritativeInputs[property], this.get(property));
  		}

  		// sync with server side if defined
  		if (this.socket) {
  			this.socket.emit('change', {
  				property: property,
  				value: this.get(property)
  			}, (result) => {
  				console.log('socket status:', result);
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
