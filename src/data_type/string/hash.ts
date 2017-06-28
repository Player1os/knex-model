// Load npm modules.
import * as Joi from 'joi'

export default {
	validationSchema: Joi.string().hex().length(64),
}
