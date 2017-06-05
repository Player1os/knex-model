// Load node modules.
import * as fs from 'fs'
import * as path from 'path'

// Load the package file.
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8'))

// Expose the configuration object.
export default {
	entry: [
		// Include the project starting point into the bundle.
		path.join(__dirname, 'src', 'index.ts'),
	],
	output: {
		// Make sure that the bundle is built as a library that exports objects.
		library: 'library',
		libraryTarget: 'commonjs2',
		// Define the directory for the compilation output.
		path: path.join(__dirname, 'build', 'lib'),
		// Define the name for the compilation output.
		filename: 'index.js',
	},
	// Specify the target to be the node runtime.
	target: 'node',
	// Specify that all standard dependencies should be considered exterals to be dynamically included.
	externals: Object.keys(packageJson.dependencies || {})
		.reduce((externals, dependencyName) => {
			externals[dependencyName] = `commonjs ${dependencyName}`
			return externals
		}, {}),
	// Specify the global declarations of the node runtime.
	node: {
		__filename: true,
		__dirname: true,
	},
	module: {
		loaders: [
			// Specify a loader for all typescript source files that first compiles typescript into es2017 standards javascript
			// using the typescript compiler and then compiles that to javascript supported by the current node runtime
			// using the babel compiler.
			{
				test: /\.ts$/,
				exclude: /node_modules/,
				loader: 'awesome-typescript-loader',
				options: {
					declaration: true,
					declarationDir: 'build/types',
				},
			},
		],
	},
	resolve: {
		// Specify that the '#' character in imports should be resolved to the project's root path.
		alias: {
			'#': __dirname,
		},
		// Specify that the typescript and javascript extensions can be ommitted from module names.
		extensions: [
			'.ts',
			'.js',
		],
	},
	// Specify that a sourcemap should be created for the outputted bundle.
	devtool: 'source-map',
}
