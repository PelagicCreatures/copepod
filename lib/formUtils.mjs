/*
	get and set input value for regular inputs and groups

	Uses input grouping scheme from @pelagiccreatures/molamola
*/

const getRealVal = (element) => {
	let value = ''

	// collection of checkboxes or other inputs results in array of values
	if (element.getAttribute('data-group')) {
		const group = element.closest('.input-group').querySelectorAll(element.getAttribute('data-group'))
		const values = []
		for (let i = 0; i < group.length; i++) {
			if (getRealVal(group[i])) {
				values.push(getRealVal(group[i]))
			}
			if (element.hasAttribute('multiple')) {
				value = values
			} else {
				value = values.length ? values[0] : ''
			}
		}
	} else {
		if (element.getAttribute('type') === 'checkbox' || element.getAttribute('type') === 'radio') {
			if (element.checked) {
				value = element.getAttribute('value')
			}
		} else if (element.tagName === 'SELECT') {
			const selected = element.querySelectorAll('option:checked')
			const values = Array.from(selected).map(el => el.value)
			if (element.hasAttribute('multiple')) {
				value = Array.from(values)
			} else {
				value = values[0]
			}
		} else if (element.tagName === 'OPTION') {
			value = element.selected ? element.getAttribute('value') : undefined
		} else {
			value = element.value
		}
	}

	return value
}

const setRealVal = (element, value) => {
	if (element.getAttribute('data-group')) {
		if (!value) {
			value = []
		}
		const group = element.closest('.input-group').querySelectorAll(element.getAttribute('data-group'))
		for (let i = 0; i < group.length; i++) {
			const e = group[i]
			if (e.getAttribute('type') === 'radio') {
				if (value == e.value) {
					e.checked = true
				}
			} else {
				let index = -1
				for (let j = 0; j < value.length; j++) {
					if (value[j] == e.value) {
						index = j
						break
					}
				}
				if (index !== -1) {
					if (e.getAttribute('type') === 'checkbox') {
						e.checked = true
					} else if (e.tagName === 'OPTION') {
						e.selected = true
					}
				} else {
					if (e.getAttribute('type') === 'checkbox') {
						e.checked = false
					} else if (e.tagName === 'OPTION') {
						e.selected = false
					}
				}
			}
		}
	} else {
		if (element.getAttribute('type') === 'checkbox') {
			element.checked = value == element.value
		} else {
			element.value = value
		}
	}
}

export {
	getRealVal, setRealVal
}
