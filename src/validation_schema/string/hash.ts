// Load npm modules.
import * as Joi from 'joi'

/**
 * A validation schema for hash string values.
 */
export default Joi.string().hex().length(64)
