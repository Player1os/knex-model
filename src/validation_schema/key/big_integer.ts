// Load npm modules.
import * as Joi from 'joi'

/**
 * A validation schema for big integer primary key values.
 */
export default Joi.string().regex(/^[1-9][0-9]*$/, 'BigIntegerKey') // TODO: Add a maximum limit
