// Load local modules.
import stringSchema from '.../src/schema/string'

// Load npm modules.
import * as Joi from 'joi'

/**
 * A validation schema for description string values.
 */
export default stringSchema.max(4096) as Joi.StringSchema
