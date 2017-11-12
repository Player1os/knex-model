// Load local modules.
import labelStringSchema from '.../src/schema/string/label'

// Load npm modules.
import * as Joi from 'joi'

/**
 * A validation schema for label string value object values.
 */
export default Joi.object().pattern(/^.+$/, labelStringSchema)
