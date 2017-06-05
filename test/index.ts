// Load npm modules.
import * as Mocha from 'mocha'
import * as recursiveReaddirSync from 'recursive-readdir-sync'

// Declare the initialization function.
const execute = async () => {
	// Instantiate a Mocha instance.
	const mocha = new Mocha()

	// Define the reg exp for identifying test files.
	const testFilePathRegExp = /^(.*)\.test\.ts$/

	// Add each .test.ts file to the mocha instance.
	{
		(recursiveReaddirSync as (directoryPath: string) => string[])(__dirname)
			.filter((filePath) => {
				return testFilePathRegExp.test(filePath)
			})
			.forEach((fileName) => {
				mocha.addFile(fileName)
			})
	}

	// Run the mocha tests.
	const mochaFailures = await (new Promise((resolve) => {
		mocha.run((failures) => {
			resolve(failures)
		})
	}) as PromiseLike<number>)

	// Setup an event handler to exit with non-zero status if there were failures.
	process.on('exit', () => {
		process.exit(mochaFailures)
	})
}

// Invoke the initialization function.
execute()
	.catch((err) => {
		// Crash and report the error on failure.
		process.nextTick(() => {
			throw err
		})
	})
