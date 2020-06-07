import {
	Sargasso, utils, services
}
	from '@pelagiccreatures/sargasso'

import {
	getCopepod
}
	from './Copepod.mjs'

/*
	templated copepod data binding observer for html elements
	*/
class CopepodElement extends Sargasso {
	constructor (element, options = {}) {
		options.watchDOM = true
		super(element, options)
	}

	DOMChanged () {
		if (!this.template && this.element.innerHTML) {
			services.theDOMWatcher.unSubscribe(this)
			this.template = this.element.innerHTML
			this.element.innerHTML = ''
			this.render()
		}
	}

	start () {
		super.start()

		this.copepod = getCopepod(this.element.getAttribute('data-copepod-id'))

		this.copepod.bind(this.uid, (prop, val) => {
			this.render()
		})
	}

	sleep () {
		this.copepod.unbind(this.uid)
		delete (this.copepod)
		super.sleep()
	}

	render () {
		if (this.template) {
			this.element.innerHTML = this.template.replace(/\${(.*?)}/g, (match, prop) => {
				return this.copepod.get(prop)
			})
		}
	}
}

utils.registerSargassoClass('CopepodElement', CopepodElement)

export {
	CopepodElement
}
