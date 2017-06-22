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

// TODO: Enable the use of a raw where caluse.
// TODO: Add pagination.
// TODO: Add relations.
// TODO: Add column aliasing.
// TODO: Add projection to all methods.

// Declare and expose the interfaces for options.
export interface IOptions {
	transaction?: Knex.Transaction,
}
export interface ICreateOptions extends IOptions {
	isCreateValuesValidationDisabled?: boolean,
}
export interface IFindOptions extends IOptions {
	isQueryValidationDisabled?: boolean,
	orderBy?: [{
		column: string,
		direction: string,
	}],
	limit?: number,
	offset?: number,
}
export interface ICountOptions extends IOptions {
	isQueryValidationDisabled?: boolean,
}
export interface IUpdateOptions extends IOptions {
	isQueryValidationDisabled?: boolean,
	isUpdateValuesValidationDisabled?: boolean,
}
export interface IDestroyOptions extends IOptions {
	isQueryValidationDisabled?: boolean,
}

// Expose the base model class.
export abstract class Model<IEntity extends object, ICreateValues extends object, IUpdateValues extends object, IQueryItem extends object> {
	protected readonly _queryValidationSchema: Joi.Schema

	/**
	 * A constructor that confirms that the required properties are present.
	 * @param knexWrapper The object containing the knex instance.
	 * @param table The name of the underlying table.
	 * @param fields The names and validation schemas of the table's fields.
	 */
	constructor(
		protected readonly _knexWrapper: KnexWrapper,
		public readonly table: string,
		public readonly fields: {
			[fieldName: string]: Joi.BooleanSchema | Joi.NumberSchema | Joi.StringSchema | Joi.ObjectSchema | Joi.DateSchema,
		},
		protected readonly _createValuesValidationSchema: Joi.ObjectSchema,
		protected readonly _updateValuesValidationSchema: Joi.ObjectSchema,
	) {
		// Verify whether a table name is set.
		if (!this.table) {
			throw new Error('No table name was set in the model.')
		}

		// Verify whether a fields object is set.
		if (!this.fields) {
			throw new Error('No fields object was set in the model.')
		}

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
		this._queryValidationSchema = Joi.alternatives([
			queryItemValidationSchema,
			Joi.array().items(queryItemValidationSchema),
		]).required().options({
			abortEarly: false,
			convert: false,
		})
	}

	/**
	 * All fields present in the underlying data object.
	 */
	fieldNames() {
		return Object.keys(this.fields)
	}

	/**
	 * Create entities of the model using the provided values.
	 * @param values
	 * @param options
	 */
	protected async _create(values: ICreateValues[], options: ICreateOptions = {}) {
		try {
			// Optionally validate the create values.
			if (!options.isCreateValuesValidationDisabled) {
				values.forEach((valuesEntry) => {
					const { error } = this._createValuesValidationSchema.validate(valuesEntry)
					if (error) {
						throw error
					}
				})
			}

			// Prepare an insertion query builder.
			let knexQuery = this._knexWrapper.instance(this.table)
				.insert(values)
				.returning(this.fieldNames())

			// Optionally use the supplied transaction.
			if (options.transaction) {
				knexQuery = knexQuery.transacting(options.transaction)
			}

			// Execute the prepared query builder.
			const documents = await knexQuery as IEntity[]

			// Return the created documents.
			return documents
		} catch (err) {
			// Attempt to better identify the error.
			switch (err.code) {
				case '23505':
					// Encapsulate in an entity exists error and throw it.
					throw new EntityExistsError(err)
				// TODO: Catch error for other issues.
				// 22P02 => invalid input syntax for integer
				default:
					// Rethrow the error.
					throw err
			}
		}
	}

	/**
	 * Create a single entity of the model.
	 * @param values
	 * @param options
	 */
	protected async _createOne(values: ICreateValues, options: ICreateOptions = {}) {
		// Enclose in a transaction to ensure changes are reverted if an error is thrown from within and return its result.
		return this._knexWrapper.transaction(async (transaction) => {
			// Attempt to create the document.
			const documents = await this._create([values], Object.assign({}, options, {
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

	/**
	 * Find all entities of the model matching the query.
	 * @param query
	 * @param options
	 */
	protected async _find(query: IQueryItem | IQueryItem[], options: IFindOptions = {}) {
		// Optionally validate the query values.
		if (!options.isQueryValidationDisabled) {
			const { error } = this._queryValidationSchema.validate(query)
			if (error) {
				throw error
			}
		}

		// Prepare a selection query builder.
		let knexQuery = this._prepareQueryParameters(query)
			.select(this.fieldNames())

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
		const documents = await knexQuery as IEntity[]

		// Return the found documents.
		return documents
	}

	/**
	 * Find a single entity of the model matching the query.
	 * @param query
	 * @param options
	 */
	protected async _findOne(query: IQueryItem | IQueryItem[], options: IFindOptions = {}) {
		// Enclose in a transaction to ensure changes are reverted if an error is thrown from within and return its result.
		return this._knexWrapper.transaction(async (transaction) => {
			// Attempt to find the document.
			const documents = await this._find(query, Object.assign({}, options, {
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

	/**
	 * Find the count of all entities of the model matching the query.
	 * @param query
	 * @param options
	 */
	protected async _count(query: IQueryItem | IQueryItem[], options: ICountOptions = {}) {
		// Optionally validate the query values.
		if (!options.isQueryValidationDisabled) {
			const { error } = this._queryValidationSchema.validate(query)
			if (error) {
				throw error
			}
		}

		// Prepare a selection query builder.
		let knexQuery = this._prepareQueryParameters(query)
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

	/**
	 * Update all entities of the model matching the query with the supplied values.
	 * @param query
	 * @param values
	 * @param options
	 */
	protected async _update(query: IQueryItem | IQueryItem[], values: IUpdateValues, options: IUpdateOptions = {}) {
		// Optionally validate the query values.
		if (!options.isQueryValidationDisabled) {
			const { error } = this._queryValidationSchema.validate(query)
			if (error) {
				throw error
			}
		}

		// Optionally validate the update values.
		if (!options.isUpdateValuesValidationDisabled) {
			const { error } = this._updateValuesValidationSchema.validate(values)
			if (error) {
				throw error
			}
		}

		// Prepare an update query builder.
		let knexQuery = this._prepareQueryParameters(query)
			.update(values)
			.returning(this.fieldNames())

		// Optionally use the supplied transaction.
		if (options.transaction) {
			knexQuery = knexQuery.transacting(options.transaction)
		}

		// Return the prepared query builder.
		const documents = await knexQuery as IEntity[]

		// Return the updated documents.
		return documents
	}

	/**
	 * Update a single entity of the model matching the query with the supplied values.
	 * @param query
	 * @param values
	 * @param options
	 */
	protected async _updateOne(query: IQueryItem | IQueryItem[], values: IUpdateValues, options: IUpdateOptions = {}) {
		// Enclose in a transaction to ensure changes are reverted if an error is thrown from within and return its result.
		return this._knexWrapper.transaction(async (transaction) => {
			// Execute the update method with the submitted arguments.
			const documents = await this._update(query, values, Object.assign({}, options, {
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

	/**
	 * Destroy all entities of the model matching the query.
	 * @param query
	 * @param options
	 */
	protected async _destroy(query: IQueryItem | IQueryItem[], options: IDestroyOptions = {}) {
		// Optionally validate the query values.
		if (!options.isQueryValidationDisabled) {
			const { error } = this._queryValidationSchema.validate(query)
			if (error) {
				throw error
			}
		}

		// Prepare a deletion query builder.
		let knexQuery = this._prepareQueryParameters(query)
			.delete()
			.returning(this.fieldNames())

		// Optionally use the supplied transaction.
		if (options.transaction) {
			knexQuery = knexQuery.transacting(options.transaction)
		}

		// Return the prepared query builder.
		const documents = await knexQuery as IEntity[]

		// Return the destroyed documents.
		return documents
	}

	/**
	 * Destroy a single entity of the model matching the query.
	 * @param query
	 * @param options
	 */
	protected async _destroyOne(query: IQueryItem | IQueryItem[], options: IDestroyOptions = {}) {
		// Enclose in a transaction to ensure changes are reverted if an error is thrown from within and return its result.
		return this._knexWrapper.transaction(async (transaction) => {
			// Execute the destroy method with the submitted arguments.
			const documents = await this._destroy(query, Object.assign({}, options, {
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

	/**
	 * Prepare a manipulator for a single knex query item.
	 * @param knexQuery
	 * @param queryItem
	 */
	protected _prepareQueryItemParamters(knexQuery: Knex.QueryBuilder, queryItem: IQueryItem) {
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
					newKnexQuery = newKnexQuery.whereNotIn(key.substr(1), value as any)
				} else {
					newKnexQuery = newKnexQuery.whereIn(key, value as any)
				}
			} else {
				// Check if the passed value is undefined.
				if (value === undefined) {
					throw new Error('An undefined value has been passed.')
				}

				// Determine whether the query requires a negation.
				if (key.charAt(0) === '!') {
					newKnexQuery = newKnexQuery.whereNot(key.substr(1), value)
				} else {
					newKnexQuery = newKnexQuery.where(key, value)
				}
			}
		})

		return newKnexQuery
	}

	/**
	 * Prepare a pluggable knex query based on the query parameters.
	 * @param query
	 */
	protected _prepareQueryParameters(query: IQueryItem | IQueryItem[]) {
		// Define the initial query builder upon the model's table.
		let knexQuery = this._knexWrapper.instance(this.table)

		// Add filters using the submitted query.
		if (lodash.isArray(query)) {
			query.forEach((queryItem) => {
				knexQuery = knexQuery.orWhere((whereQuery) => {
					this._prepareQueryItemParamters(whereQuery, queryItem)
				})
			})
		} else {
			knexQuery = this._prepareQueryItemParamters(knexQuery, query)
		}

		// Return the prepared query builder.
		return knexQuery
	}
}
