// Load the app modules.
import validate from '.../src/validate'

// Expose the validation schemas.
export { default as bigIntegerKeySchema } from '.../src/schema/key/big_integer'
export { default as integerKeySchema } from '.../src/schema/key/integer'
export { default as nonNegativeBigIntegerNumberSchema } from '.../src/schema/number/non_negative_big_integer'
export { default as nonNegativeIntegerNumberSchema } from '.../src/schema/number/non_negative_integer'
export { default as utcTimestampNumberSchema } from '.../src/schema/number/utc_timestamp'
export {
	default as keysObjectSchema,
	TKeyTuple as TKeysObjectKeyTuple,
} from '.../src/schema/object/keys'
export { default as labelStringValueObjectSchema } from '.../src/schema/object/label_string_value'
export { default as descriptionStringSchema } from '.../src/schema/string/description'
export { default as emailAddressStringSchema } from '.../src/schema/string/email_address'
export { default as hashStringSchema } from '.../src/schema/string/hash'
export { default as httpUriStringSchema } from '.../src/schema/string/http_uri'
export { default as stringSchema } from '.../src/schema/string'
export { default as ipAddressStringSchema } from '.../src/schema/string/ip_address'
export { default as labelStringSchema } from '.../src/schema/string/label'
export { default as tokenStringSchema } from '.../src/schema/string/token'
export { default as utcDateTimeStringSchema } from '.../src/schema/string/utc_datetime'
export { default as booleanSchema } from '.../src/schema/boolean'
export { default as dateSchema } from '.../src/schema/date'
export {
	default as filterExpressionSchema,
	ISchemaMap as IFilterExpressionSchemaMap,
} from '.../src/schema/filter_expression'
export { default as parsedValidationErrorsSchema } from '.../src/schema/parsed_validation_errors'

// Expose the parse validation error function.
export { JoiValidationError } from '.../src/error'

// Expose the validate function.
export default validate
