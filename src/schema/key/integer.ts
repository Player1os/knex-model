// Load npm modules.
import * as Joi from 'joi'

// Define the max value.
const maxValue = (1 << 30) * 2 - 1 // tslint:disable-line:no-bitwise

// Expose the validation schema.
export default Joi.number().integer().positive().max(maxValue)
