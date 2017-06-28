// Load npm modules.
import * as Joi from 'joi'
import * as lodash from 'lodash'

export default {
	validationSchema: Joi.date(),
	createOffset(value: Date, years = 0, months = 0, days = 0) {
		return new Date(
			value.getUTCFullYear() + years,
			value.getUTCMonth() + months,
			value.getUTCDate() + days,
		)
	},
	normalizeToDate(value: Date = new Date()) {
		return new Date(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())
	},
	fullUTCDateTime(value: Date = new Date()) {
		return [
			[
				lodash.padStart(value.getUTCFullYear().toString(), 4, '0'),
				lodash.padStart((value.getUTCMonth() + 1).toString(), 2, '0'),
				lodash.padStart(value.getUTCDate().toString(), 2, '0'),
			].join('/'), [
				lodash.padStart(value.getUTCHours().toString(), 2, '0'),
				lodash.padStart(value.getUTCMinutes().toString(), 2, '0'),
				lodash.padStart(value.getUTCSeconds().toString(), 2, '0'),
			].join(':'),
			lodash.padStart(value.getUTCMilliseconds().toString(), 3, '0'),
		].join('_')
	},
	timestamp(value: Date = new Date()) {
		return value.getTime() / 1000
	},
}
