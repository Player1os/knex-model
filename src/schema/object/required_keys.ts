// Load npm modules.
import * as Joi from 'joi'

/**
 * Generates an object containing validation schemas for each of the submitted keys to be required.
 * @param keys An array of string object keys.
 */
export default (keys: string[]) => {
	return keys.reduce((accumulator, requiredKey) => {
		accumulator[requiredKey] = Joi.any().required()
		return accumulator
	}, {})
}
