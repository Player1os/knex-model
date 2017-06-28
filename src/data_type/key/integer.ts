// Load npm modules.
import * as Joi from 'joi'

// tslint:disable-next-line:no-bitwise
const maxValue = (1 << 30) * 2 - 1

export default {
	maxValue,
	validationSchema: Joi.number().integer().positive().max(maxValue),
}
