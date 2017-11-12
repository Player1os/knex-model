// Load npm modules.
import * as Joi from 'joi'

/**
 * A validation schema for non negative big integer number values.
 */
export default Joi.string().regex(/^(0|[1-9][0-9]*)$/, 'NonNegativeBigIntegerNumber') // TODO: Add a maximum number.
