// Load local modules.
import stringValidationSchema from '.../src/validation_schema/string'

// Load npm modules.
import * as Joi from 'joi'

/**
 * A validation schema for description string values.
 */
export default stringValidationSchema.max(4096) as Joi.StringSchema
