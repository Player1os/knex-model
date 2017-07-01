// Load npm modules.
import * as Joi from 'joi'
import * as lodash from 'lodash'

/**
 * An interface describing a single parsed validation error.
 */
export interface IErrorItem {
	value: any,
	type: string,
	message: string,
}

/**
 * Parses the validation error into an object of error item arrays.
 * @param joiValidationError A validation error thrown by a joi assertion.
 */
export default (joiValidationError: Joi.ValidationError): {
	[key: string]: IErrorItem[],
} => {
	const value = joiValidationError._object

	return joiValidationError.details.reduce((map, joiValidationErrorItem) => {
		const path = (value instanceof Object) && (joiValidationErrorItem.path in value)
			? joiValidationErrorItem.path
			: ''

		const errorItem: IErrorItem = {
			value: path
				? lodash.get(value, path)
				: value,
			type: joiValidationErrorItem.type,
			message: joiValidationErrorItem.message,
		}

		if (!(path in map)) {
			map[path] = []
		}
		map[path].push(errorItem)

		return map
	}, {})
}
