// Load npm modules.
import * as Joi from 'joi'

export default {
	// TODO: Verify if this matches the legacy reg exp.
	validationSchema: Joi.string().uri({ scheme: /https?/ }).max(4096),
}
