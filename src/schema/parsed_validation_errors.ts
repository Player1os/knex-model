// Load npm modules.
import * as Joi from 'joi'
import * as lodash from 'lodash'

/**
 * Generates a validation schema to verify the contents of a parsed validation error.
 * @param fieldErrorTypesMap An object containing a key => value mapping for each field's expected error types.
 */
export default (fieldErrorTypesMap: {
	[field: string]: string[],
}) => {
	return Joi.object(lodash.reduce(fieldErrorTypesMap, (accumulator, fieldErrorTypes, fieldName: string) => {
		return {
			...accumulator,
			[fieldName]: Joi.array().ordered(...fieldErrorTypes.map((fieldErrorType) => {
				return Joi.object({
					value: Joi.any(),
					type: Joi.string().valid(fieldErrorType),
					message: Joi.string(),
				}).required()
			})).length(fieldErrorTypes.length),
		}
	}, {}))
}
