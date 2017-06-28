// Load npm modules.
import * as Joi from 'joi'

export default {
	// TODO: Add a maximum limit
	validationSchema: Joi.string().regex(/^[1-9][0-9]*$/, 'BigIntegerKey'),
}
