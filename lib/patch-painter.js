"use strict";

const diff = require("diff");

// Token types
const SPECIAL           = -1;
const NORMAL            = 0;
const REMOVAL           = 1;
const ADDITION          = 2;
const CHAR_REMOVAL      = 3;
const CHAR_ADDITION     = 4;

// Output formats
const TTY               = "tty";
const HTML              = "html";

// SGR escape sequences for coloured terminal output
const SGR_ADDED_CHAR    = "\x1B[48;5;28;38;5;82m";
const SGR_ADDED_LINE    = "\x1B[38;5;2m";
const SGR_REMOVED_CHAR  = "\x1B[48;5;88;38;5;196m";
const SGR_REMOVED_LINE  = "\x1B[38;5;1m";
const SGR_NORMAL        = "\x1B[38;5;8m";
const SGR_RESET         = "\x1B[0m";


class PatchPainter{
	
	
	/**
	 * Generate coloured diff-output for terminal delivery.
	 *
	 * @param {String} diff
	 * @param {Boolean} silent - Don't output anything
	 * @return {String}
	 */
	tty(diff, silent = false){
		const output = this.flatten(this.format(diff, TTY)).join("");
		silent || console.log(output);
		return output;
	}
	
	
	/**
	 * Generate an HTML representation of a formatted diff.
	 *
	 * @param {String} diff
	 * @return {String}
	 */
	html(diff){
		return this.flatten(this.format(diff, HTML)).join("");
	}
	
	
	/**
	 * Add formatting to a plain-text diff.
	 *
	 * This is primarily a "low-level" function: its result is returned
	 * as a nested array, corresponding to the diff's "file -> chunk -> diff"
	 * structure. Authors who desire output as a plain string are encouraged
	 * to use PatchPainter's `tty()` or `html()` methods instead.
	 *
	 * @param {String} input - Plain-text diff
	 * @param {String} format - Intended output format, defaults to terminal
	 * @return {Array}
	 */
	format(input, format = TTY){
		const fileDiffs = input
			.split(/^diff /g)
			.map(f => f.replace(/(?:^|\ndiff )[^\x00]+?\n(?=@@ )/g, "").split(/^(?=@@ )/gm).filter(i => i && i.length))
			.filter(i => i && i.length && (i.length !== 1 || i[0] !== ""))
		
		return fileDiffs.map(file => {
			return file.map(chunk => {
				let lines = [];
				
				// Here's the ugly part
				chunk = chunk
					.replace(
						/((?:(?:^|\n)-.*\n)+)((?:(?:^|\n)\+.*\n)+)/gm,
						
						(match, removals, additions, offset) => {
							const strip = /^[-+ ]/gm;
							removals    = removals.replace(strip, "").replace(/^\n/, "");
							additions   = additions.replace(strip, "");
							
							// Only highlight characters if line-counts match
							if(removals.match(/\n/g).length === additions.match(/\n/g).length){
								const index = offset + match.length;
								const token = this.sideBySide(removals, additions, format);
								lines.push({ index, token });
								return match.replace(/^[-+]/gm, "*");
							}
							
							// Otherwise, leave it for the blocks below to handle
							return match;
						})
					
					// Removals
					.replace(/^-.*$/gm, (match, offset) => {
						const index = offset + match.length;
						const token = this.removal(match, format);
						lines.push({ index, token });
						return match.replace(/^-/gm, "*");
					})
					
					// Additions/Insertions
					.replace(/^\+.*$/gm, (match, offset) => {
						const index = offset + match.length;
						const token = this.addition(match, format);
						lines.push({ index, token });
						return match.replace(/^\+/gm, "*");
					})
					
					// Diff-chunk dividers
					.replace(/^@@ .+?@@.*$/gm, (match, offset) => {
						const index = offset + match.length;
						const token = this.divider(match, format);
						lines.push({ index, token })
						return match.replace(/^@@ /, "** ");
					})
					
					// Normal/context lines
					.replace(/^\x20.*$/gm, (match, offset) => {
						const index = offset + match.length;
						const token = this.context(match, format);
						lines.push({ index, token });
						return match.replace(/^\x20/gm, "*");
					});
				
				
				// And here's the part that's just plain dumb
				lines = lines.sort((a, b) => {
					const A = a.index;
					const B = b.index;
					if(A < B) return -1
					if(A > B) return 1;
					return 0;
				}).map(l => l.token)
				
				return lines;
			});
			
		});
	}
	
	
	
	/**
	 * Flatten a nested array into a single-level list of values.
	 *
	 * @param {Array} input
	 * @return {Array}
	 */
	flatten(input){
		const flattened = [];
		for(let i of input){
			if(Array.isArray(i))
				flattened.push(...this.flatten(i));
			else
				flattened.push(i);
		}
		return flattened;
	}
	
	
	
	/**
	 * Highlight changes between contiguous change-sets.
	 *
	 * @private
	 * @param {Array} removals
	 * @param {Array} additions
	 * @param {String} format
	 * @return {String}
	 */
	sideBySide(removals, additions, format = TTY){
		let output  = "";
		const changes = diff.diffWordsWithSpace(removals, additions);
		const putHTML = (added) => {
			let lines = "";
			
			for(let c of changes){
				if(added){
					if(c.added)         lines += "<mark>" + c.value + "</mark>";
					else if(!c.removed) lines += c.value;
				}
				
				else{
					if(c.removed)       lines += "<mark>" + c.value + "</mark>";
					else if(!c.added)   lines += c.value;
				}
			}
			const tag   = added ? "ins" : "del";
			const open  = "<"  + tag + ">";
			const close = "</" + tag + ">";
			output += (open + lines + close);
		};
		
		
		// Display removed lines first
		if(HTML === format)
			putHTML();
		
		else{
			for(let c of changes){
				if(c.removed)       output += SGR_REMOVED_CHAR + c.value + SGR_RESET;
				else if(!c.added)   output += SGR_REMOVED_LINE + c.value + SGR_RESET;
			}
			
			// Always make sure there's a newline in-between
			if(!/\n(?:\x1B\[[\d;]+m)?$/.test(output))
				output += "\n";
		}

		
		
		// Then, show the insertions
		if(HTML === format){
			putHTML(true);
			return output;
		}
		
		else{
			for(let c of changes){
				if(c.added)         output += SGR_ADDED_CHAR + c.value + SGR_RESET;
				else if(!c.removed) output += SGR_ADDED_LINE + c.value + SGR_RESET;
			}
			return output
				.replace(/\x1B\[38;5;1m\n(?!\x1B)/gm, "$&-")
				.replace(/\x1B\[38;5;2m\n(?!\x1B)/gm, "$&+")
				.replace(/^((?:\x1B\[0m)?\x1B\[(?:38;5;1|48;5;88;38;5;196)m)/gm, SGR_RESET + SGR_REMOVED_LINE + "-$1")
				.replace(/^((?:\x1B\[0m)?\x1B\[(?:38;5;2|48;5;28;38;5;82)m)/gm,  SGR_RESET + SGR_ADDED_LINE   + "+$1")
		}
	}
	
	
	/**
	 * Highlight a deletion in a diff.
	 *
	 * @private
	 * @param {String} line
	 * @param {String} format
	 * @return {String}
	 */
	removal(line, format = TTY){
		if(HTML === format){
			line = line.replace(/^-/, "");
			return `<del>${line}</del>\n`;
		}
		
		line += "\n";
		return SGR_REMOVED_LINE + line + SGR_RESET;
	}
	
	
	/**
	 * Highlight an insertion in a diff.
	 *
	 * @private
	 * @param {String} line
	 * @param {String} format
	 * @return {String}
	 */
	addition(line, format = TTY){
		if(HTML === format){
			line = line.replace(/^\+/, "");
			return `<ins>${line}</ins>\n`;
		}
		
		line += "\n";
		return SGR_ADDED_LINE + line + SGR_RESET;
	}
	
	
	/**
	 * Highlight regular/surrounding text in a diff.
	 *
	 * @private
	 * @param {String} line
	 * @param {String} format
	 * @return {String}
	 */
	context(line, format = TTY){
		if(HTML === format){
			line = line.replace(/^\x20/, "");
			return `<span>${line}</span>\n`
		}
		
		line += "\n";
		return SGR_NORMAL + line + SGR_RESET;
	}
	
	
	/**
	 * Output space where a "@@ … @@" line would be.
	 *
	 * @private
	 * @param {String} line
	 * @param {String} format
	 * @return {String}
	 */
	divider(line, format = TTY){
		return "";
	}
	
	
	
	/**
	 * Replace SGR escape sequences with their corresponding constant names.
	 *
	 * Intended to be used when debugging TTY-formatted output.
	 *
	 * @private
	 * @param {String} input
	 * @return {String}
	 */
	debugSGR(input){
		return input
			.replace(new RegExp(SGR_ADDED_CHAR.replace(/\[/g, "\\["), "gm"), "{ADDED_CHAR}")
			.replace(new RegExp(SGR_ADDED_LINE.replace(/\[/g, "\\["), "gm"), "{ADDED_LINE}")
			.replace(new RegExp(SGR_REMOVED_CHAR.replace(/\[/g, "\\["), "gm"), "{REMOVED_CHAR}")
			.replace(new RegExp(SGR_REMOVED_LINE.replace(/\[/g, "\\["), "gm"), "{REMOVED_LINE}")
			.replace(new RegExp(SGR_NORMAL.replace(/\[/g, "\\["), "gm"), "{NORMAL}")
			.replace(new RegExp(SGR_RESET.replace(/\[/g, "\\["), "gm"), "{RESET}")
	}
}

// Expose access to format constants
PatchPainter.TTY  = TTY;
PatchPainter.HTML = HTML;

module.exports = new PatchPainter();
