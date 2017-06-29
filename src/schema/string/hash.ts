// Load npm modules.
import * as Joi from 'joi'

// Expose the validation schema.
export default Joi.string().hex().length(64)
