// Load npm modules.
import * as Joi from 'joi'
import * as lodash from 'lodash'

// Define and expose the validation schema generator.
export default (filterExpressionItemSchemas: {
	[fieldName: string]: Joi.BooleanSchema | Joi.NumberSchema | Joi.StringSchema | Joi.ObjectSchema | Joi.DateSchema,
}) => {
	// Define the validation schema for a single query item.
	let filterExpressionItemSchema = Joi.object(lodash.reduce(filterExpressionItemSchemas, (map, fieldValidationSchema, fieldName) => {
		// Allow value or array of values in a positive and negated version of the field.
		map[fieldName] = map[`!${fieldName}`] = Joi.alternatives([
			fieldValidationSchema,
			Joi.array().items(fieldValidationSchema),
		])

		// Return the augumented map.
		return map
	}, {}))

	// Define an exclusive relationships between each field key and its negation.
	Object.keys(filterExpressionItemSchemas).forEach((fieldName) => {
		filterExpressionItemSchema.xor(fieldName, `!${fieldName}`)
	})

	// Setup the keys to be optional.
	filterExpressionItemSchema = filterExpressionItemSchema.options({
		presence: 'optional',
	})

	// Outputs the schema for the query during model extension.
	// - all specified keys must correspond to (fields + primary key field).
	// - all present (fields + primary key field) must conform to the given rules.
	return Joi.alternatives([
		filterExpressionItemSchema,
		Joi.array().items(filterExpressionItemSchema),
	]).required().options({
		abortEarly: false,
		convert: false,
	})
}
