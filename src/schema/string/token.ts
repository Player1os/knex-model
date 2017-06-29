// Load npm modules.
import * as Joi from 'joi'

// Expose the validation schema.
export default Joi.string().regex(/^[a-z0-9_\-]+$/, 'token').max(256)
