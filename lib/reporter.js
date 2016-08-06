"use strict";

const fs   = require("fs");
const path = require("path");


/**
 * Class that currently modifies and hacks the existing HTML reporter.
 *
 * To be replaced with a proper custom reporter later.
 */
class Reporter{
	
	kludgeEmAll(args, runner){
		const feedback = document.createElement("div");
		feedback.id    = "mocha";
		document.body.appendChild(feedback);
		
		window.atom = args.buildAtomEnvironment({
			applicationDelegate: args.buildDefaultApplicationDelegate(),
			window,
			document,
			configDirPath: process.env.ATOM_HOME,
			enablePersistence: false
		});
		
		this.patchCodeBlocks(runner._reporter, atom);
		document.title = "Terminal Emulator Emulator";
		
		/** Running in an Atom window */
		if(!args.headless){
			
			/** Attach our own styling */
			const stylePath   = path.resolve(__dirname, "..", "test-runner.css");
			const styleSource = fs.readFileSync(stylePath).toString();
			
			atom.styles.addStyleSheet(styleSource, {
				sourcePath: stylePath,
				priority:   3
			});
			
			/** Add something retarded to make inspecting the workspace layer easier */
			Object.defineProperty(window, "hide", {
				get: function(){  feedback.classList.add("hide"); },
				set: function(i){ feedback.classList.toggle("hide", i); }
			});
		}
	}
	
	
	/**
	 * Prettify code chunks embedded in test results.
	 *
	 * @param {Reporter} input - Mocha reporter object
	 * @param {Object} atom - Reference to the Atom environment object
	 */
	patchCodeBlocks(input, atom){
		
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


module.exports = new Reporter;
