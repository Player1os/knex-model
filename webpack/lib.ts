// Load app modules.
import common from './common'

// Load node modules.
import * as path from 'path'

// Set root path.
const rootPath = path.resolve(__dirname, '..')

// Expose the configuration object.
export default Object.assign({
	entry: [
		// Include the project starting point into the bundle.
		path.join(rootPath, 'src', 'index.ts'),
	],
	output: {
		// Define the directory for the compilation output.
		path: path.join(rootPath, 'build', 'lib'),
		// Define the name for the compilation output.
		filename: 'index.js',
	},
}, common)
