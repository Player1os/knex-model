// Load npm modules.
import * as Joi from 'joi'

/**
 * A type alias for tuples of the key name and an is required flag.
 */
export type TKeyTuple = [string, boolean]

/**
 * Generates an object containing validation schemas for each of the submitted keys.
 * @param keys An array of tuples describing expected object keys and whether each of them is required or optional.
 */
export default (keyTuples: TKeyTuple[]) => {
	return keyTuples.reduce((accumulator, [key, isRequired]) => {
		return {
			...accumulator,
			[key]: isRequired
				? Joi.any().required()
				: Joi.any().optional(),
		}
	}, {} as Joi.SchemaMap)
}
