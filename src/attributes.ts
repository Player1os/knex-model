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
