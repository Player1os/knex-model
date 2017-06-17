// Load app modules.
import EntityExistsError from '.../src/error/entity_exists'
import EntityNotFoundError from '.../src/error/entity_not_found'
import MultipleEntitiesFoundError from '.../src/error/multiple_entities_found'

// Load scoped modules.
import { KnexWrapper } from '@player1os/knex-wrapper'

// Load npm modules.
import * as Joi from 'joi'
import * as Knex from 'knex'
import * as lodash from 'lodash'

// TODO: Revise validation.
// TODO: Revise types.
// TODO: Add update values type.
// TODO: Disallow the use of null.
// TODO: Elaborate on the type of the inputs.
// TODO: Enable the use of a raw where caluse.
// TODO: Add pagination.
// TODO: Add relations.
// TODO: Add column aliasing.
// TODO: Add projection to all methods.

// Expose the imported error classes.
export { EntityExistsError }
export { EntityNotFoundError }
export { MultipleEntitiesFoundError }

// Expose the type that defines the outputs.
export type IDocument = {
	[key: string]: null | boolean | number | string | object | Date,
}

// Expose the type that defines the input values.
export type IValues = {
	[key: string]: boolean | number | string | object | Date,
}

// Expose the type that defines the input query.
export type IQueryItem = {
	[key: string]: null | boolean | number | string | Date | number[] | string[] | Date[],
}
export type IQuery = IQueryItem | IQueryItem[]

// Expose the base model class.
export abstract class Model {
	createValuesValidationSchema: Joi.ObjectSchema
	updateValuesValidationSchema: Joi.ObjectSchema
	queryValidationSchema: Joi.Schema

	// A constructor that confirms that the required properties are present.
	constructor(
		public knexWrapper: KnexWrapper,
		public table: string,
		public fields: {
			key: Joi.NumberSchema | Joi.StringSchema,
			[key: string]: Joi.BooleanSchema | Joi.NumberSchema | Joi.StringSchema | Joi.ObjectSchema | Joi.DateSchema,
		},
	) {
		// Verify whether a table name is set.
		if (!this.table) {
			throw new Error('No table name was set in the model.')
		}

		// Verify whether a fields object is set and contains the key field.
		if (!this.fields || !this.fields.key) {
			throw new Error('No fields object containing a key field was set in the model.')
		}

		// Define validator from the schema for the create values.
		// - all required fields must be present.
		// - all specified keys must correspond to fields.
		// - all present fields must conform to the given rules.
		this.createValuesValidationSchema = Joi.object(lodash.pickBy(this.fields, (_value, key) => {
			return key !== 'key'
		}) as Joi.SchemaMap).options({
			abortEarly: false,
			convert: false,
			presence: 'required',
		})

		// Define validator from the schema for the update values.
		// - all specified keys must correspond to fields.
		// - all present fields must conform to the given rules.
		this.updateValuesValidationSchema = Joi.object(lodash.pickBy(this.fields, (_value, key) => {
			return key !== 'key'
		}) as Joi.SchemaMap).options({
			abortEarly: false,
			convert: false,
			presence: 'optional',
		})

		// Define the validation schema for a single query item.
		let queryItemValidationSchema = Joi.object(lodash.reduce(this.fields, (map, fieldValidationSchema, fieldName) => {
			// Allow value or array of values in a positive and negated version of the field.
			map[fieldName] = map[`!${fieldName}`] = Joi.alternatives([
				fieldValidationSchema,
				Joi.array().items(fieldValidationSchema),
			])

			// Return the augumented map.
			return map
		}, {}))

		// Define an exclusive relationships between each field key and its negation.
		Object.keys(this.fields).forEach((fieldName) => {
			queryItemValidationSchema.xor(fieldName, `!${fieldName}`)
		})

		// Setup the keys to be optional.
		queryItemValidationSchema = queryItemValidationSchema.options({
			presence: 'optional',
		})

		// Outputs the schema for the query during model extension.
		// - all specified keys must correspond to (fields + primary key field).
		// - all present (fields + primary key field) must conform to the given rules.
		this.queryValidationSchema = Joi.alternatives([
			queryItemValidationSchema,
			Joi.array().items(queryItemValidationSchema),
		]).required().options({
			abortEarly: false,
			convert: false,
		})
	}

	// All fields present in the underlying data object, a parameter specifies whether this includes the primary key.
	fieldNames(isKeyIncluded?: boolean) {
		const baseFieldNames = Object.keys(this.fields)
		return isKeyIncluded
			? baseFieldNames
			: baseFieldNames.filter((baseFieldName) => {
				return baseFieldName !== 'key'
			})
	}

	// Create entities of the model using the provided values.
	protected async create(values: IValues[], options: {
		isValidationDisabled?: boolean,
		transaction?: Knex.Transaction,
	} = {}): Promise<IDocument[]> {
		try {
			// Optionally validate the create values.
			if (!options.isValidationDisabled) {
				values.forEach((valuesEntry) => {
					const { error } = this.createValuesValidationSchema.validate(valuesEntry)
					if (error) {
						throw error
					}
				})
			}

			// Prepare an insertion query builder.
			let knexQuery = this.knexWrapper.instance(this.table)
				.insert(values)
				.returning(this.fieldNames(true))

			// Optionally use the supplied transaction.
			if (options.transaction) {
				knexQuery = knexQuery.transacting(options.transaction)
			}

			// Execute the prepared query builder.
			const documents = await knexQuery

			// Return the created documents.
			return documents
		} catch (err) {
			// Attempt to better identify the error.
			switch (err.code) {
				case '23505':
					// Encapsulate in an entity exists error and throw it.
					throw new EntityExistsError(err)
				default:
					// Rethrow the error.
					throw err
			}
		}
	}

	// Create a single entity of the model.
	protected async createOne(values: IValues, options: {
		isValidationDisabled?: boolean,
		transaction?: Knex.Transaction,
	} = {}) {
		// Enclose in a transaction to ensure changes are reverted if an error is thrown from within and return its result.
		return this.knexWrapper.transaction(async (transaction) => {
			// Attempt to create the document.
			const documents = await this.create([values], Object.assign({}, options, {
				transaction,
			}))

			// Check if at least one document was created.
			if (documents.length === 0) {
				throw new EntityNotFoundError()
			}

			// Check if more than one value was created.
			if (documents.length > 1) {
				throw new MultipleEntitiesFoundError()
			}

			// Return the first created document.
			return documents[0]
		}, options.transaction)
	}

	// Prepare a manipulator for a single knex query item.
	protected prepareQueryItemParamters(knexQuery: Knex.QueryBuilder, queryItem: IQueryItem) {
		let newKnexQuery = knexQuery

		lodash.forEach(queryItem, (value, key) => {
			// Determine whether multiple values are to be checked.
			if (lodash.isArray(value)) {
				// Check if the passed array is empty.
				if (value.length === 0) {
					throw new Error('An empty array has been passed.')
				}

				// Determine whether the query requires a negation.
				if (key.charAt(0) === '!') {
					newKnexQuery = newKnexQuery.whereNotIn(key.substr(1), value)
				} else {
					newKnexQuery = newKnexQuery.whereIn(key, value)
				}
			} else {
				// Check if the passed value is undefined.
				if (value === undefined) {
					throw new Error('An undefined value has been passed.')
				}

				// Determine whether the query requires a negation.
				if (key.charAt(0) === '!') {
					newKnexQuery = newKnexQuery.whereNot(key.substr(1), value as any)
				} else {
					newKnexQuery = newKnexQuery.where(key, value as any)
				}
			}
		})

		return newKnexQuery
	}

	// Prepare a pluggable knex query based on the query parameters.
	protected prepareQueryParameters(query: IQuery) {
		// Define the initial query builder upon the model's table.
		let knexQuery = this.knexWrapper.instance(this.table)

		// Add filters using the submitted query.
		if (lodash.isArray(query)) {
			query.forEach((queryItem) => {
				knexQuery = knexQuery.orWhere((whereQuery) => {
					this.prepareQueryItemParamters(whereQuery, queryItem)
				})
			})
		} else {
			knexQuery = this.prepareQueryItemParamters(knexQuery, query)
		}

		// Return the prepared query builder.
		return knexQuery
	}

	// Find all entities of the model matching the query.
	protected async find(query: IQuery, options: {
		isValidationDisabled?: boolean,
		orderBy?: [{
			column: string,
			direction: string,
		}],
		limit?: number,
		offset?: number,
		transaction?: Knex.Transaction,
	} = {}): Promise<IDocument[]> {
		// Optionally validate the query values.
		if (!options.isValidationDisabled) {
			const { error } = this.queryValidationSchema.validate(query)
			if (error) {
				throw error
			}
		}

		// Prepare a selection query builder.
		let knexQuery = this.prepareQueryParameters(query)
			.select(this.fieldNames(true))

		// Add the optional order by clause.
		if (options.orderBy) {
			options.orderBy.forEach((orderByClause) => {
				knexQuery = knexQuery.orderBy(orderByClause.column, orderByClause.direction)
			})
		}

		// Add the optional limit clause.
		if (options.limit) {
			knexQuery = knexQuery.limit(options.limit)
		}

		// Add the optional offset clause.
		if (options.offset) {
			knexQuery = knexQuery.offset(options.offset)
		}

		// Optionally use the supplied transaction.
		if (options.transaction) {
			knexQuery = knexQuery.transacting(options.transaction)
		}

		// Execute the prepared query builder.
		const documents = await knexQuery

		// Return the found documents.
		return documents
	}

	// Find a single entity of the model matching the query.
	protected async findOne(query: IQuery, options: {
		isValidationDisabled?: boolean,
		orderBy?: [{
			column: string,
			direction: string,
		}],
		limit?: number,
		offset?: number,
		transaction?: Knex.Transaction,
	} = {}) {
		// Enclose in a transaction to ensure changes are reverted if an error is thrown from within and return its result.
		return this.knexWrapper.transaction(async (transaction) => {
			// Attempt to find the document.
			const documents = await this.find(query, Object.assign({}, options, {
				transaction,
			}))

			// Check if at least one document was found.
			if (documents.length === 0) {
				throw new EntityNotFoundError()
			}

			// Check if more than one value was found.
			if (documents.length > 1) {
				throw new MultipleEntitiesFoundError()
			}

			// Return the first found document.
			return documents[0]
		}, options.transaction)
	}

	// Find a single entity of the model matching the key.
	protected async findByKey(key: number | string, options: {
		isValidationDisabled?: boolean,
		orderBy?: [{
			column: string,
			direction: string,
		}],
		limit?: number,
		offset?: number,
		transaction?: Knex.Transaction,
	} = {}) {
		// Call the find one method with only the key in the query.
		return this.findOne({ key }, options)
	}

	// Find the count of all entities of the model matching the query.
	protected async count(query: IQuery, options: {
		isValidationDisabled?: boolean,
		transaction?: Knex.Transaction,
	} = {}) {
		// Optionally validate the query values.
		if (!options.isValidationDisabled) {
			const { error } = this.queryValidationSchema.validate(query)
			if (error) {
				throw error
			}
		}

		// Prepare a selection query builder.
		let knexQuery = this.prepareQueryParameters(query)
			.count()

		// Optionally use the supplied transaction.
		if (options.transaction) {
			knexQuery = knexQuery.transacting(options.transaction)
		}

		// Execute the prepared query builder.
		const result = await knexQuery

		// Parse the result of the count query.
		return parseInt(result[0].count, 10)
	}

	// Update all entities of the model matching the query with the supplied values.
	protected async update(query: IQuery, values: IValues, options: {
		isQueryValidationDisabled?: boolean,
		isValuesValidationDisabled?: boolean,
		transaction?: Knex.Transaction,
	} = {}): Promise<IDocument[]> {
		// Optionally validate the query values.
		if (!options.isQueryValidationDisabled) {
			const { error } = this.queryValidationSchema.validate(query)
			if (error) {
				throw error
			}
		}

		// Optionally validate the update values.
		if (!options.isValuesValidationDisabled) {
			const { error } = this.updateValuesValidationSchema.validate(values)
			if (error) {
				throw error
			}
		}

		// Prepare an update query builder.
		let knexQuery = this.prepareQueryParameters(query)
			.update(values)
			.returning(this.fieldNames(true))

		// Optionally use the supplied transaction.
		if (options.transaction) {
			knexQuery = knexQuery.transacting(options.transaction)
		}

		// Return the prepared query builder.
		const documents = await knexQuery

		// Return the updated documents.
		return documents
	}

	// Update a single entity of the model matching the query with the supplied values.
	protected async updateOne(query: IQuery, values: IValues, options: {
		isQueryValidationDisabled?: boolean,
		isValuesValidationDisabled?: boolean,
		transaction?: Knex.Transaction,
	} = {}) {
		// Enclose in a transaction to ensure changes are reverted if an error is thrown from within and return its result.
		return this.knexWrapper.transaction(async (transaction) => {
			// Execute the update method with the submitted arguments.
			const documents = await this.update(query, values, Object.assign({}, options, {
				transaction,
			}))

			// Check if at least one value was updated.
			if (documents.length === 0) {
				throw new EntityNotFoundError()
			}

			// Check if more than one value was updated.
			if (documents.length > 1) {
				throw new MultipleEntitiesFoundError()
			}

			// Return the updated document.
			return documents[0]
		}, options.transaction)
	}

	// Update a single entity of the model matching the key with the supplied values.
	protected async updateByKey(key: number | string, values: IValues, options: {
		isQueryValidationDisabled?: boolean,
		isValuesValidationDisabled?: boolean,
		transaction?: Knex.Transaction,
	} = {}) {
		// Call the update one method with only the key in the query.
		return this.updateOne({ key }, values, options)
	}

	// Destroy all entities of the model matching the query.
	protected async destroy(query: IQuery, options: {
		isValidationDisabled?: boolean,
		transaction?: Knex.Transaction,
	} = {}): Promise<IDocument[]> {
		// Optionally validate the query values.
		if (!options.isValidationDisabled) {
			const { error } = this.queryValidationSchema.validate(query)
			if (error) {
				throw error
			}
		}

		// Prepare a deletion query builder.
		let knexQuery = this.prepareQueryParameters(query)
			.delete()
			.returning(this.fieldNames(true))

		// Optionally use the supplied transaction.
		if (options.transaction) {
			knexQuery = knexQuery.transacting(options.transaction)
		}

		// Return the prepared query builder.
		const documents = await knexQuery

		// Return the destroyed documents.
		return documents
	}

	// Destroy a single entity of the model matching the query.
	protected async destroyOne(query: IQuery, options: {
		isValidationDisabled?: boolean,
		transaction?: Knex.Transaction,
	} = {}) {
		// Enclose in a transaction to ensure changes are reverted if an error is thrown from within and return its result.
		return this.knexWrapper.transaction(async (transaction) => {
			// Execute the destroy method with the submitted arguments.
			const documents = await this.destroy(query, Object.assign({}, options, {
				transaction,
			}))

			// Check if at least one value was deleted.
			if (documents.length === 0) {
				throw new EntityNotFoundError()
			}

			// Check if more than one value was deleted.
			if (documents.length > 1) {
				throw new MultipleEntitiesFoundError()
			}

			// Return the destroyed document.
			return documents[0]
		}, options.transaction)
	}

	// Destroy a single entity of the model matching the key.
	protected async destroyByKey(key: number | string, options: {
		isValidationDisabled?: boolean,
		transaction?: Knex.Transaction,
	} = {}) {
		// Call the destroy one method with only the key in the query.
		return this.destroyOne({ key }, options)
	}

	// Update the entity indicated by the primary key that's part of the given document.
	protected async save(document: {
		key: number | string,
	}, options: {
		isQueryValidationDisabled?: boolean,
		isValuesValidationDisabled?: boolean,
		transaction?: Knex.Transaction,
	} = {}) {
		// Update the entity with the given document key using the given document values.
		return this.updateByKey(document.key, lodash.pick(document, this.fieldNames()) as {}, options)
	}

	// Destroy the entity indicated by the primary key that's part of the given document.
	protected async delete(document: {
		key: number | string,
	}, options: {
		isValidationDisabled?: boolean,
		transaction?: Knex.Transaction,
	} = {}) {
		// Destroy the entity with the given document key.
		return this.destroyByKey(document.key, options)
	}
}
