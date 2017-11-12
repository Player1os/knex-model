// Load local modules.
import labelStringValidationSchema from '.../src/validation_schema/string/label'

// Load npm modules.
import * as Joi from 'joi'

/**
 * A validation schema for label string value object values.
 */
export default Joi.object().pattern(/^.+$/, labelStringValidationSchema)
