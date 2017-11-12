// Load npm modules.
import * as Joi from 'joi'
import * as lodash from 'lodash'

/**
 * An interface for filter expression schema map.
 */
export interface ISchemaMap {
	[fieldName: string]: Joi.BooleanSchema | Joi.NumberSchema | Joi.StringSchema | Joi.ObjectSchema | Joi.DateSchema | Joi.FunctionSchema,
}

/**
 * Generates a validation schema for a filter expression based on the supplied validation schema map.
 * @param filterExpressionItemSchemaMap An object containing a key => value mapping for each field's validation schema.
 */
export default (filterExpressionItemSchemaMap: ISchemaMap) => {
	// Define the validation schema for a single query item.
	let filterExpressionItemSchema = Joi.object(
		lodash.reduce(filterExpressionItemSchemaMap, (map, fieldSchema, fieldName: string) => {
			// Allow value or array of values in a positive and negated version of the field.
			map[fieldName] = map[`!${fieldName}`] = Joi.alternatives([
				fieldSchema,
				Joi.array().items(fieldSchema),
			])

			// Return the augumented map.
			return map
		}, {} as { [key: string]: Joi.AlternativesSchema }))

	// Define an exclusive relationships between each field key and its negation.
	Object.keys(filterExpressionItemSchemaMap).forEach((fieldName) => {
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
