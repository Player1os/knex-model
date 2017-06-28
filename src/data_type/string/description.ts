// Load app modules.
import anyStringDataType from '.../src/lib/data_type/string/any'

export default {
	validationSchema: anyStringDataType.validationSchema.max(512),
}
