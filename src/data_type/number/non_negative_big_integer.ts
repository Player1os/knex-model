// Load npm modules.
import * as Joi from 'joi'

export default {
	validationSchema: Joi.string().regex(/^(0|[1-9][0-9]*)$/, 'NonNegativeBigIntegerNumber'),
}
