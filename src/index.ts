// Load npm modules.
import * as Joi from 'joi'

// Define and expose the query validation schema generator.
export const queryValidationSchemaGenerator = (queryItemFieldValidationSchemas: {
	[fieldName: string]: Joi.BooleanSchema | Joi.NumberSchema | Joi.StringSchema | Joi.ObjectSchema | Joi.DateSchema,
}) => {
	// Define the validation schema for a single query item.
	let queryItemValidationSchema = Joi.object(lodash.reduce(queryItemFieldValidationSchemas, (map, fieldValidationSchema, fieldName) => {
		// Allow value or array of values in a positive and negated version of the field.
		map[fieldName] = map[`!${fieldName}`] = Joi.alternatives([
			fieldValidationSchema,
			Joi.array().items(fieldValidationSchema),
		])

		// Return the augumented map.
		return map
	}, {}))

	// Define an exclusive relationships between each field key and its negation.
	Object.keys(queryItemFieldValidationSchemas).forEach((fieldName) => {
		queryItemValidationSchema.xor(fieldName, `!${fieldName}`)
	})

	// Setup the keys to be optional.
	queryItemValidationSchema = queryItemValidationSchema.options({
		presence: 'optional',
	})

	// Outputs the schema for the query during model extension.
	// - all specified keys must correspond to (fields + primary key field).
	// - all present (fields + primary key field) must conform to the given rules.
	return Joi.alternatives([
		queryItemValidationSchema,
		Joi.array().items(queryItemValidationSchema),
	]).required().options({
		abortEarly: false,
		convert: false,
	})
}

// Export the model classes, interfaces and types.
export {
	ICreateOptions,
	IFindOptions,
	ICountOptions,
	IUpdateOptions,
	IDestroyOptions,
} from '.../src/model'
export {
	IKeyEntity,
	IKeyQueryItem,
	KeyModel,
	TKey,
	TKeyArray,
} from '.../src/model/key'
export { StandardModel } from '.../src/model/standard'

// Expose the error classes.
export { default as EntityExistsError } from '.../src/error/entity_exists'
export { default as EntityNotFoundError } from '.../src/error/entity_not_found'
export { default as MultipleEntitiesFoundError } from '.../src/error/multiple_entities_found'
