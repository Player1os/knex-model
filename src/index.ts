// Load app modules.
import EntityExistsError from '#/src/error/entity_exists'
import EntityNotFoundError from '#/src/error/entity_not_found'
import MultipleEntitiesFoundError from '#/src/error/multiple_entities_found'

// Load scoped modules.
import {
	KnexWrapper,
} from '@player1os/knex-wrapper'

// Load npm modules.
import * as Joi from 'joi'
import * as Knex from 'knex'
import * as lodash from 'lodash'

// TODO: Elaborate on the type of the inputs.
// TODO: Enable the use of a raw where caluse.
// TODO: Add pagination.
// TODO: Add relations.
// TODO: Add column aliasing.
// TODO: Add projection to find methods.

// Expose the imported error classes.
export { EntityExistsError }
export { EntityNotFoundError }
export { MultipleEntitiesFoundError }

// Expose the interface that defines the input values.
export interface IValues {
	[key: string]: boolean | number | string | object | Date,
}

// Expose the interface that defines the input query.
export interface IQueryItem {
	[key: string]: null | boolean | number | string | Date | number[] | string[] | Date[],
}
export type IQuery = IQueryItem | IQueryItem[]

// Expose the base model class.
export abstract class Model {
	protected createValuesValidationSchema: Joi.ObjectSchema
	protected updateValuesValidationSchema: Joi.ObjectSchema
	protected queryValidationSchema: Joi.Schema

	// A constructor that confirms that the required properties are present.
	constructor(
		protected knexWrapper: KnexWrapper,
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
	protected fieldNames(isKeyIncluded?: boolean) {
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
	} = {}) {
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
		// Attempt to create the document.
		const documents = await this.create([values], options)

		// TODO: Add a length check for the array.

		// Return the first created document.
		return documents[0]
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
					newKnexQuery = newKnexQuery.whereNot(key.substr(1), value)
				} else {
					newKnexQuery = newKnexQuery.where(key, value)
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
		// Attempt to find the document.
		const documents = await this.find(query, options)

		// Check if at least one document was found.
		if (documents.length === 0) {
			throw new EntityNotFoundError()
		}

		// Check if more than one value was altered.
		if (documents.length > 1) {
			throw new MultipleEntitiesFoundError()
		}

		// Return the first retrieved document.
		return documents[0]
	}

	// Find a single entity of the model matching the key.
	protected findByKey(key: number | string, options: {
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
	async count(query: IQuery, options: {
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
	} = {}) {
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
		// Exectute the update method with the submitted arguments.
		const documents = await this.update(query, values, options)

		// Check if at least one value was altered.
		if (documents.length === 0) {
			throw new EntityNotFoundError()
		}

		// Check if more than one value was altered.
		if (documents.length > 1) {
			throw new MultipleEntitiesFoundError()
		}

		// Return the altered document.
		return documents[0]
	}

	// Update a single entity of the model matching the key with the supplied values.
	protected updateByKey(key: number | string, values: IValues, options: {
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
	} = {}) {
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
		// Exectute the update method with the submitted arguments.
		const documents = await this.destroy(query, options)

		// Check if at least one value was deleted.
		if (documents.length === 0) {
			throw new EntityNotFoundError()
		}

		// Check if more than one value was deleted.
		if (documents.length > 1) {
			throw new MultipleEntitiesFoundError()
		}

		// Return the deleted document.
		return documents[0]
	}

	// Destroy a single entity of the model matching the key.
	protected destroyByKey(key: number | string, options: {
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
		const documents = await this.updateByKey(document.key, lodash.pick(document, this.fieldNames()) as {}, options)

		// Return the first retrieved document.
		return documents[0]
	}

	// Destroy the entity indicated by the primary key that's part of the given document.
	protected async delete(document: {
		key: number | string,
	}, options: {
		isValidationDisabled?: boolean,
		transaction?: Knex.Transaction,
	} = {}) {
		// Destroy the entity with the given document key.
		const documents = await this.destroyByKey(document.key, options)

		// Return the first retrieved document.
		return documents[0]
	}
}

/*
// Expose attribute base model.
export default Model.extend({
	// Create new models by extending the current one.
	extend(model) {
		// Call parent method.
		super.extend(model);

		// Add derived attribute model.
		model.attributeModel = Model.extend({
			table: `${model.table}_attribute`,
			fields: {
				name: {
					isRequired: true,
					schema: Joi.string().max(256),
				},
				color: {
					schema: Joi.string().length(6),
				},
			},
		});
		model.attributeValueTable = {
			name: `${model.table}_attribute_value`,
			parentKeyField: `${model.table}_key`,
			attributeKeyField: `${model.table}_attribute_key`,
		};

		// Add attribute value validator.
		model.attributeValueValidator = new Validator(Joi.string().max(512));

		// Extend the query validator.
		model.queryValidator.schema = model.queryValidator.schema.keys({
			attributes: Joi.object(),
		});

		// Pass on model to caller.
		return model;
	},
	// Check if the attributes string values contained within an object.
	validateAttributes(attributes) {
		Object.keys(attributes).forEach((attributeName) => {
			this.attributeValueValidator.validate(attributes[attributeName]);
		});
	},
	retrieveAttributes(attributes, transaction) {
		// Objectify attribute names.
		let objectifiedAttributes = Object.keys(attributes).map((attribute) => {
			return {
				name: attribute,
			};
		});

		// Find existing attributes.
		return Promise.all(attributes.map((attribute) => {
			return this.attributeModel.count({
				name: attribute.name,
			});
		}))
			.then((attributeCounts) => {
				// Merge counts into objectified attributes.
				objectifiedAttributes = dataType.array.shallowLeftMerge(
					attributes,
					attributeCounts.map((attributeCount) => {
						return {
							isCreated: attributeCount > 0,
						};
					}));

				// Create attributes that were not found.
				return Promise.all(objectifiedAttributes.map((attribute) => {
					return attribute.isCreated
						? this.attributeModel.findOne({
							name: attribute.name,
						})
						: this.attributeModel.create({
							name: attribute.name,
						}, {
							transaction,
						});
				}));
			});
	},
	attributeValueFieldNames() {
		return [
			'value',
			this.attributeValueTable.parentKeyField,
			this.attributeValueTable.attributeKeyField,
		];
	},
	createAttributeValues(entityPrimaryKey, attributeDocuments, attributeValues, transaction) {
		// Insert attribute values.
		return knex.instance(this.attributeValueTable.name)
			.transacting(transaction)
			.insert(attributeDocuments
				.filter((attributeDocument) => {
					return attributeValues[attributeDocument.name];
				})
				.map((attributeDocument) => {
					return {
						value: attributeValues[attributeDocument.name],
						[this.attributeValueTable.parentKeyField]: entityPrimaryKey,
						[this.attributeValueTable.attributeKeyField]: attributeDocument[this.primaryKeyField.name],
					};
				}))
			.returning(this.attributeValueFieldNames());
	},
	destroyAttributeValues(entityPrimaryKey, attributeDocuments, transaction) {
		// Delete attribute values.
		return knex.instance(this.attributeValueTable.name)
			.transacting(transaction)
			.delete()
			.where({
				[this.attributeValueTable.parentKeyField]: entityPrimaryKey,
			})
			.whereIn(
				this.attributeValueTable.attributeKeyfield,
				attributeDocuments.map((attributeDocument) => {
					return attributeDocument[this.attributeModel.primaryKeyField.name];
				}),
			)
			.returning(this.attributeValueFieldNames());
	},
	// Add all associated attributes to the given document array.
	appendAttributeValues(documents) {
		// Add the attributes property to each document.
		documents.forEach((document) => {
			document.attributes = {};
		});

		// Create a map to find the element corresponding to a given document key.
		const documentKeyMap = documents.reduce((map, document, index) => {
			map[document[this.primaryKeyField.name]] = index;
			return map;
		}, {});

		// Use a single query to retrieve the attribute values of all documents.
		return knex.instance(this.attributeValueTable.name)
			.select([
				`${this.attributeValueTable.name}.${this.attributeValueTable.parentKeyField} AS entity_key`,
				`${this.attributeModel.table}.name AS name`,
				`${this.attributeValueTable.name}.value AS value`,
			])
			.join(
				this.attributeModel.table,
				`${this.attributeValueTable.name}.${this.attributeValueTable.attributeKeyField}`,
				`${this.attributeModel.table}.${this.attributeModel.primaryKeyField.name}`,
			)
			.whereIn(
				`${this.attributeValueTable.name}.${this.attributeValueTable.parentKeyField}`,
				documents.map((document) => {
					return document[this.primaryKeyField.name];
				}),
			)
			.then((results) => {
				// Fill the attributes object of each of the documents from the result.
				results.forEach((result) => {
					documents[documentKeyMap[result.entity_key]].attributes[result.name] = result.value;
				});

				// Pass the modified documents.
				return documents;
			});
	},
	// Create a single entity of the model.
	create(values, options = {}) {
		// Define storage variables.
		let createdDocument = null;

		// Initialize a transaction.
		return knex.instance.transaction((trx) => {
			// Determine the transaction to be used.
			const transaction = options.transaction || trx;

			// Validate attributes.
			this.validateAttributes(values.attributes);

			// Create the base document.
			return super.create(dataType.object.shallowFilter(values, this.fieldNames()), Object.assign({
				transaction: trx,
			}, options))
				.then((document) => {
					// Store the newly created document.
					createdDocument = document;

					// Retrieve the associated attribute documents.
					return this.retrieveAttributes(values.attributes, transaction);
				})
				.then((attributeDocuments) => {
					// Add new values for the retrieved attributes.
					return this.createAttributeValues(createdDocument[this.primaryKeyField.name],
						attributeDocuments, values.attributes, transaction);
				})
				.then(() => {
					// Append the associated attribute values to the updated documents.
					return this.appendAttributeValues([createdDocument]);
				})
				.then((documents) => {
					// Retrieve the single created document.
					return documents[0];
				});
		});
	},
	buildKnexQuery(query) {
		// Start with the base
		return Object.keys(query.attributes).reduce((knexQuery, attributeName) => {
			// Append a conjuctive subquery for each attribute name, value pair.
			return knexQuery.whereIn(
				this.primaryKeyField.name,
				knex.instance(this.attributeValueTable.name)
					.select(`${this.attributeValueTable.name}.${this.attributeValueTable.parentKeyField}`)
					.join(
						this.attributeModel.table,
						`${this.attributeValueTable.name}.${this.attributeValueTable.attributeKeyField}`,
						`${this.attributeModel.table}.${this.attributeModel.primaryKeyField.name}`,
					)
					.where({
						[`${this.attributeModel.table}.name`]: attributeName,
						[`${this.attributeValueTable.name}.value`]: query.attributes[attributeName],
					}),
			);
		}, super.buildKnexQuery(dataType.object.shallowFilter(query, this.fieldNames(true))));
	},
	// Find all entities of the model matching the query.
	find(query = {}, options = {}) {
		return Promise.resolve()
			.then(() => {
				// Fill in attributes if required.
				if (!query.attributes) {
					query.attributes = {};
				}

				// Validate attributes.
				this.validateAttributes(query.attributes);

				// Select values from the underlying data object.
				return super.find(query, options);
			})
			.then((foundDocuments) => {
				// Append the associated attribute values to the found documents.
				return this.appendAttributeValues(foundDocuments);
			});
	},
	// Update all entities of the model matching the query with the supplied values.
	update(query = {}, values = {}, options = {}) {
		// Define storage variables.
		let updatedDocuments = [];
		let attributeDocuments = [];

		// Initialize a transaction.
		return knex.instance.transaction((trx) => {
			// Determine the transaction to be used.
			const transaction = options.transaction || trx;

			// Fill in attributes to the query if required.
			if (!query.attributes) {
				query.attributes = {};
			}

			// Validate attributes.
			this.validateAttributes(query.attributes);

			// Fill in attributes to the values if required.
			if (!values.attributes) {
				values.attributes = {};
			}

			// Update values in the underlying data object.
			return super.update(query, values, Object.assign({
				transaction: trx,
			}, options))
				.then((documents) => {
					// Store the updated documents.
					updatedDocuments = documents;

					// Retrieve the associated attribute documents.
					return this.retrieveAttributes(values.attributes, transaction);
				})
				.then((documents) => {
					// Store the retrieved attribute documents.
					attributeDocuments = documents;

					// Remove the original values of the retrieved attributes.
					return Promise.all(updatedDocuments.map((updatedDocument) => {
						return this.destroyAttributeValues(updatedDocument[this.primaryKeyField.name],
							attributeDocuments, transaction);
					}));
				})
				.then(() => {
					// Add new values for the retrieved attributes.
					return Promise.all(updatedDocuments.map((updatedDocument) => {
						return this.createAttributeValues(updatedDocument[this.primaryKeyField.name],
							attributeDocuments, values.attributes, transaction);
					}));
				})
				.then(() => {
					// Append the associated attribute values to the updated documents.
					return this.appendAttributeValues(updatedDocuments);
				});
		});
	},
});
*/
