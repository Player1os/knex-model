// Load npm modules.
import * as Joi from 'joi'

// Expose the validation schema.
// TODO: Add a maximum limit
export default Joi.string().regex(/^[1-9][0-9]*$/, 'BigIntegerKey')
