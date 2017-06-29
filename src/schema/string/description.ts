// Load app modules.
import anyStringSchema from '.../src/schema/string/any'

// Load npm modules.
import * as Joi from 'joi'

// Expose the validation schema.
export default anyStringSchema.max(512) as Joi.StringSchema
