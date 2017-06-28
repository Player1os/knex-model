// Load app modules.
import labelStringDataType from '.../src/lib/data_type/string/label'

// Load npm modules.
import * as Joi from 'joi'

export default {
	validationSchema: Joi.object().pattern(/^.+$/, labelStringDataType.validationSchema),
}
