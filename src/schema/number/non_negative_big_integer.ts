// Load npm modules.
import * as Joi from 'joi'

// Expose the validation schema.
export default Joi.string().regex(/^(0|[1-9][0-9]*)$/, 'NonNegativeBigIntegerNumber')
