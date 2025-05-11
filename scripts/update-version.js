#!/usr/bin/env node

/**
 * Script to update version numbers across the project
 * Usage: node scripts/update-version.js [version] [options]
 * Options:
 *   --dry-run   Show what changes would be made without applying them
 *   --verbose   Show detailed logging information
 *
 * If no version is provided, it will use the version from package.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
	dryRun: args.includes('--dry-run'),
	verbose: args.includes('--verbose'),
};

// Get the version (first non-flag argument)
let newVersion = args.find((arg) => !arg.startsWith('--'));

// Log helper function
const log = (message, verbose = false) => {
	if (!verbose || options.verbose) {
		console.log(message);
	}
};

// File paths that may contain version information
const versionFiles = [
	{
		path: path.join(rootDir, 'package.json'),
		pattern: /"version": "([^"]*)"/,
		replacement: (match, currentVersion) =>
			match.replace(currentVersion, newVersion),
	},
	{
		path: path.join(rootDir, 'src', 'utils', 'constants.util.ts'),
		pattern: /export const VERSION = ['"]([^'"]*)['"]/,
		replacement: (match, currentVersion) =>
			match.replace(currentVersion, newVersion),
	},
	// Also update the compiled JavaScript files if they exist
	{
		path: path.join(rootDir, 'dist', 'utils', 'constants.util.js'),
		pattern: /exports.VERSION = ['"]([^'"]*)['"]/,
		replacement: (match, currentVersion) =>
			match.replace(currentVersion, newVersion),
		optional: true, // Mark this file as optional
	},
	// Additional files can be added here with their patterns and replacement logic
];

/**
 * Read the version from package.json
 * @returns {string} The version from package.json
 */
function getPackageVersion() {
	try {
		const packageJsonPath = path.join(rootDir, 'package.json');
		log(`Reading version from ${packageJsonPath}`, true);

		const packageJson = JSON.parse(
			fs.readFileSync(packageJsonPath, 'utf8'),
		);

		if (!packageJson.version) {
			throw new Error('No version field found in package.json');
		}

		return packageJson.version;
	} catch (error) {
		console.error(`Error reading package.json: ${error.message}`);
		process.exit(1);
	}
}

/**
 * Validate the semantic version format
 * @param {string} version - The version to validate
 * @returns {boolean} True if valid, throws error if invalid
 */
function validateVersion(version) {
	// More comprehensive semver regex
	const semverRegex =
		/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

	if (!semverRegex.test(version)) {
		throw new Error(
			`Invalid version format: ${version}\nPlease use semantic versioning format (e.g., 1.2.3, 1.2.3-beta.1, etc.)`,
		);
	}

	return true;
}

/**
 * Update version in a specific file
 * @param {Object} fileConfig - Configuration for the file to update
 */
function updateFileVersion(fileConfig) {
	const {
		path: filePath,
		pattern,
		replacement,
		optional = false,
	} = fileConfig;

	try {
		log(`Checking ${filePath}...`, true);

		if (!fs.existsSync(filePath)) {
			if (optional) {
				log(`Optional file not found (skipping): ${filePath}`, true);
				return;
			}
			console.warn(`Warning: File not found: ${filePath}`);
			return;
		}

		// Read file content
		const fileContent = fs.readFileSync(filePath, 'utf8');
		const match = fileContent.match(pattern);

		if (!match) {
			console.warn(`Warning: Version pattern not found in ${filePath}`);
			return;
		}

		const currentVersion = match[1];
		if (currentVersion === newVersion) {
			log(
				`Version in ${path.basename(filePath)} is already ${newVersion}`,
				true,
			);
			return;
		}

		// Create new content with the updated version
		const updatedContent = fileContent.replace(pattern, replacement);

		// Write the changes or log them in dry run mode
		if (options.dryRun) {
			log(
				`Would update version in ${filePath} from ${currentVersion} to ${newVersion}`,
			);
		} else {
			// Create a backup of the original file
			fs.writeFileSync(`${filePath}.bak`, fileContent);
			log(`Backup created: ${filePath}.bak`, true);

			// Write the updated content
			fs.writeFileSync(filePath, updatedContent);
			log(
				`Updated version in ${path.basename(filePath)} from ${currentVersion} to ${newVersion}`,
			);
		}
	} catch (error) {
		if (optional) {
			log(`Error with optional file ${filePath}: ${error.message}`, true);
			return;
		}
		console.error(`Error updating ${filePath}: ${error.message}`);
		process.exit(1);
	}
}

// Main execution
try {
	// If no version specified, get from package.json
	if (!newVersion) {
		newVersion = getPackageVersion();
		log(
			`No version specified, using version from package.json: ${newVersion}`,
		);
	}

	// Validate the version format
	validateVersion(newVersion);

	// Update all configured files
	for (const fileConfig of versionFiles) {
		updateFileVersion(fileConfig);
	}

	if (options.dryRun) {
		log(`\nDry run completed. No files were modified.`);
	} else {
		log(`\nVersion successfully updated to ${newVersion}`);
	}
} catch (error) {
	console.error(`\nVersion update failed: ${error.message}`);
	process.exit(1);
}
