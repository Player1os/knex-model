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
