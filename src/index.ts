// Load the app modules.
import validate from '.../src/validate'

// Expose the schemas.
export { default as booleanSchema } from '.../src/schema/boolean'
export { default as dateSchema } from '.../src/schema/date'
export { default as filterExpressionItemSchema } from '.../src/schema/filter_expression_item'
export { default as bigIntegerKeySchema } from '.../src/schema/key/big_integer'
export { default as integerKeySchema } from '.../src/schema/key/integer'
export { default as nonNegativeBigIntegerNumberSchema } from '.../src/schema/number/non_negative_big_integer'
export { default as nonNegativeIntegerNumberSchema } from '.../src/schema/number/non_negative_integer'
export { default as labelStringValueObjectSchema } from '.../src/schema/object/label_string_value'
export { default as anyStringSchema } from '.../src/schema/string/any'
export { default as descriptionStringSchema } from '.../src/schema/string/description'
export { default as emailStringSchema } from '.../src/schema/string/email'
export { default as hashStringSchema } from '.../src/schema/string/hash'
export { default as httpUriStringSchema } from '.../src/schema/string/http_uri'
export { default as ipAddressStringSchema } from '.../src/schema/string/ip_address'
export { default as labelStringSchema } from '.../src/schema/string/label'
export { default as tokenStringSchema } from '.../src/schema/string/token'
export { default as webTokenStringSchema } from '.../src/schema/string/web_token'

// Expose the error class.
export {
	IDetailItem as IValidationErrorDetailItem,
	default as ValidationError,
} from '.../src/error'

// Expose the validate function.
export default validate
