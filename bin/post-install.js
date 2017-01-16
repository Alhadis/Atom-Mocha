#!/usr/bin/env node
"use strict";

const file  = "package.json";
const key   = "atomTestRunner";
const value = "atom-mocha";

const fs    = require("fs");
const path  = require("path");

process.chdir(path.join(process.cwd(), "..", ".."));

if(!fs.existsSync(file))
	die("Not found");


read(file)
	.catch(error => die("Not readable", error))
	.then(data => {
		
		// No update required
		if(value === JSON.parse(data)[key])
			return false;
		
		// Field already defined in data
		const pattern = new RegExp(`("${key}"\\s*:\\s*)(?:null|"(?:[^\\\\"]|\\.)*")`);
		if(pattern.test(data)) return [
			data.replace(pattern, `$1"${value}"`),
			`Updated "${key}" field in ${file}.`
		];
		
		// Insert new field in a relevant-looking spot, retaining formatting style if possible
		for(const beforeKey of ["dependencies|devDependencies", "description", "version", '[^"]+']){
			const pattern = new RegExp(`([\\n{,])([ \\t]*)"(${beforeKey})"([ \\t]*)(:[ \\t]*)?`);
			const match = data.match(pattern);
			if(match){
				let [line, start, indent, matchedKey, beforeColon, beforeValue] = match;
				const insert = `${start + indent}"${key}"`
					+ beforeColon + (beforeValue || ": ")
					+ `"${value}"`
					+ ("," !== start ? "," : "");
				const {index} = match;
				const before = data.substring(0, index);
				const after  = data.substring(index);
				return [before + insert + after];
			}
		}
		
		// If preservation of style isn't possible, just shove the field wherever.
		const object = JSON.parse(data);
		object[key] = value;
		return [JSON.stringify(object)];
	})
	.catch(error => die(`Could not parse ${file}`, error))
	.then(result => {
		if(false === result) return;
		const [data, message = `Added "${key}" field to ${file}.`] = result;
		
		// Make sure invalid data doesn't get written.
		if(value !== JSON.parse(data)[key])
			die("Could not update " + file);
		
		write(file, data);
		process.stdout.write(`\x1B[38;5;2m${message}\x1B[0m\n\n`);
	})
	.catch(error => die("Not writable", error));



/**
 * Print an error message to the standard error stream, then quit.
 *
 * @param {String} [reason=""] - Brief description of the error.
 * @param {Error} [error=null] - Possible error object preceding output
 * @param {Number} [exitCode=1] - Error code to exit with.
 * @private
 */
function die(reason = "", error = null, exitCode = 0){
	reason = (reason || "").trim();
	
	// ANSI escape sequences (disabled if output is redirected)
	const [reset, bold, underline, noBold, noUnderline, red] = process.stderr.isTTY
		? [0, 1, 4, 22, 24, [31,9,38]].map(s => `\x1B[${ Array.isArray(s) ? s.join(";") : s}m`)
		: Array.of("", 40);
	
	if(error){
		const {inspect} = require("util");
		process.stderr.write(red + inspect(error) + reset + "\n\n");
	}
	
	// Underline all occurrences of target-file's name
	const target = underline + file + noUnderline;
	
	// "Not found" -> "package.json not found"
	if(reason && !reason.match(file))
		reason = (file + " ")
			+ reason[0].toLowerCase()
			+ reason.substr(1);
	
	// Pedantic polishes
	reason = reason
		.replace(/(?:\r\n|\s)+/g,  " ")
		.replace(/^\s+|[.!]*\s*$/g, "")
		.replace(/^(?!\.$)/, ": ")
		.replace(file, target);
	
	const output = `${red}Unable to finish installing Atom-Mocha${reason}${reset}
	
	The following field must be added to your project's ${target} file:
	
		"${key}": "${value}"
	
	See ${underline}README.md${reset} for setup instructions.
	
	`.replace(/^\t/gm, "");
	process.stderr.write(output);
	process.exit(exitCode);
}


/**
 * Promise-aware version of `fs.readFile`.
 *
 * @param {String} filePath - File to read
 * @param {Object} [options] - Options passed to `fs.readFile`
 * @return {Promise} Resolves with stringified data.
 * @see {@link https://nodejs.org/api/fs.html#fs_fs_readfile_file_options_callback|`fs.readFile`}
 */
function read(filePath, options){
	return new Promise((resolve, reject) => {
		fs.readFile(filePath, options, (error, data) => {
			error
				? reject(error)
				: resolve(data.toString());
		});
	});
}


/**
 * Promise-aware version of `fs.writeFile`.
 *
 * @param {String} filePath - File to write to
 * @param {String} fileData - Data to be written
 * @param {Object} [options] - Options passed to `fs.writeFile`
 * @return {Promise} Resolves with input parameter for easier chaining
 * @see {@link https://nodejs.org/api/fs.html#fs_fs_writefile_file_data_options_callback|`fs.writeFile`}
 */
function write(filePath, fileData, options){
	return new Promise((resolve, reject) => {
		fs.writeFile(filePath, fileData, options, error => {
			error
				? reject(error)
				: resolve(fileData);
		});
	});
}



// Idiotic debugging function. Ignore.
function showInjection(...args){
	const [before, injected, after] = args.map(s => s.replace(/\n/g, "¬\n"));
	const BG = "\x1B[48;5;"
	process.stdout.write(`${BG}9m` + before + "\x1B[0m");
	process.stdout.write(injected);
	process.stdout.write(`${BG}10m` + after + "\x1B[0m");
	process.exit();	
}
