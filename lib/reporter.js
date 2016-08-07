"use strict";


/**
 * Class that currently modifies and hacks the existing HTML reporter.
 *
 * To be replaced with a proper custom reporter later.
 */
class Reporter{
	
	/**
	 * Prettify code chunks embedded in test results.
	 *
	 * @param {Reporter} input - Mocha reporter object
	 * @param {Object} atom - Reference to the Atom environment object
	 */
	static patchCodeBlocks(input, atom){
		
		/** Fix tab-width */
		const tabSize = atom.config.get("editor.tabLength", {scope: ["source.js"]});
		atom.document.documentElement.style.tabSize = tabSize;
		
		/** Load JavaScript grammar to provide syntax highlighting */
		let grammars;
		atom.packages.activatePackage("language-javascript").then(p => {
			grammars = {};
			p.grammars.forEach(g => grammars[g.scopeName] = g);
			atom.packages.deactivatePackage("language-javascript");
		});
		
		/** Gorilla-patch reporter's method for setting up code-blocks */
		const prevToggle = input.prototype.addCodeToggle;
		input.prototype.addCodeToggle = function(){
			const result = prevToggle.apply(this, arguments);
			const boolBlob = list => {
				let b = {};
				for(let i of list)
					b[i] = true;
				return b;
			};
			
			for(let chunk of Array.from(arguments[0].querySelectorAll("pre > code"))){
				
				/** Tabs > Spaces */
				chunk.textContent = chunk.textContent.replace(
					/^(\x20{2})+/gm,
					s => "\t".repeat(s.length / 2)
				);
				
				/** Add some basic syntax highlighting */
				if(grammars){
					chunk.parentElement.classList.add("code-block");
					const source = chunk.textContent;
					chunk.textContent = "";
					
					for(let line of grammars["source.js"].tokenizeLines(source)){
						for(let token of line){
							const tag       = document.createElement("span");
							tag.textContent = token.value;
							
							const scopes    = token.scopes.join(".").split(/\./g);
							const s         = boolBlob(scopes);
							tag.dataset.scopes = Array.from(new Set(scopes).values()).join(" ");
							
							/** Don't use scopes as classes; they'll be targeted by themes */
							if(s.punctuation) tag.className = s.string ? "js-quote" : "js-punct";
							else if(s.meta && s.brace || s.delimiter) tag.className = "js-punct";
							else if(s.keyword  || s.entity && s.name) tag.className = "js-key";
							else if(s.function || s.storage)          tag.className = "js-key";
							else if(s.constant || s.string)           tag.className = "js-value";
							else if(s.property || s.variable)         tag.className = "js-ident";
							else tag.className = "js";
							
							chunk.appendChild(tag);
						}
						chunk.appendChild(document.createTextNode("\n"));
					}
				}
			}
			return result;
		};
	}
}


module.exports = Reporter;
