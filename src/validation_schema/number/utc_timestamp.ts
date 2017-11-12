// Load npm modules.
import * as Joi from 'joi'

/**
 * A validation schema for utc timestamp number values.
 */
export default Joi.number().positive().allow(0) // TODO: Add a maximum number.
