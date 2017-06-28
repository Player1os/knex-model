// Load npm modules.
import * as Joi from 'joi'

export default {
	// TODO: Verify if this matches the legacy reg exp.
	validationSchema: Joi.number().integer().positive().allow(0),
}
