// Load npm modules.
import * as cpr from 'cpr'
import * as recursiveReaddirSync from 'recursive-readdir-sync'
import * as rimraf from 'rimraf'
import * as webpack from 'webpack'

// Load node modules.
import * as fs from 'fs'
import * as path from 'path'

// Load the package file.
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8'))

// Declare a plugin for processing the outputed type declaration files.
class TypescriptDeclarationFilePlugin {
	apply(compiler: webpack.Compiler) {
		// Schedule to execute after the compilation is done.
		compiler.plugin('done', () => {
			// Store the path to the type declaration files.
			const originalTypeDeclarationsPath = path.join(__dirname, 'types', 'src')
			const newTypeDeclarationsPath = path.join(__dirname, 'types')

			// Copy all type declaration files to the new location.
			cpr(originalTypeDeclarationsPath, newTypeDeclarationsPath, {
				overwrite: true,
			}, (err) => {
				if (err) {
					// Rethrow the error.
					throw err
				}

				// Remove the original directory of the type declarations.
				rimraf.sync(originalTypeDeclarationsPath)

				// Find all the type declaration files.
				{
					(recursiveReaddirSync as (directoryPath: string) => string[])(newTypeDeclarationsPath)
						.forEach((filePath) => {
							// Determine the current module's depth relative to the src directory.
							const depth = filePath.split(newTypeDeclarationsPath + path.sep)[1].split(path.sep).length - 1

							// Replace the aliased paths with relative paths within the current module.
							const depthSubPath = '../'.repeat(depth)
							const alteredContents = fs.readFileSync(filePath, 'utf-8').replace(/#\/src\//g, `./${depthSubPath}`)
							fs.writeFileSync(filePath, alteredContents, 'utf-8')
						})
				}
			})
		})
	}
}

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
		path: __dirname,
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
					declarationDir: 'types',
				},
			},
		],
	},
	plugins: [
		new TypescriptDeclarationFilePlugin(),
	],
	resolve: {
		// Specify that the '#' character in imports should be resolved to the project's root path.
		alias: {
			'...': __dirname,
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
