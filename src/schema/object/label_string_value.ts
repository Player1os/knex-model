// Load app modules.
import labelStringSchema from '.../src/schema/string/label'

// Load npm modules.
import * as Joi from 'joi'

// Expose the validation schema.
export default Joi.object().pattern(/^.+$/, labelStringSchema)
