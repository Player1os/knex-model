// Load scoped modules.
import { integerKey as integerKeyDataType } from '@player1os/data-type-utility'

// Load npm modules.
import * as Joi from 'joi'

/**
 * A validation schema for integer primary key values.
 */
export default Joi.number().integer().positive().max(integerKeyDataType.maxValue)
