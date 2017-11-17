// Load scoped modules.
import { tokenString as tokenStringDataType } from '@player1os/data-type-utility'

// Load npm modules.
import * as Joi from 'joi'

/**
 * A validation schema for token string values.
 */
export default Joi.string().regex(new RegExp(`^${tokenStringDataType.validCharacterRegExpString}+$`), 'TokenString').max(256)
