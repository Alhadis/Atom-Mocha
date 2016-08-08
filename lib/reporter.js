"use strict";

const {clean} = require("mocha/lib/utils.js");
const cssPath = require.resolve("../test-runner.css");
const el = Symbol("Atom-Mocha-Elements");


/**
 * TTY emulator to show spec results in interactive mode.
 */
class Reporter{
	
	constructor(runner, config){
		const options   = config.reporterOptions;
		this.runner     = runner;
		this.formatCode = options.formatCode;
		
		/** Register Mocha handlers */
		const events = "start suite pass fail end pending";
		for(let event of events.split(" "))
			runner.on(event, (...x) => this[event](...x));
		runner.on("test end", (...x) => this.testEnd(...x));
		
		/** Construct something to actually show stuff with */
		this.element = New("div", {id: "mocha"});
		this.stats   = New("ul",  {id: "mocha-stats"});
		this.report  = New("ul",  {id: "mocha-report"});
		this.element.appendChild(this.stats);
		this.element.appendChild(this.report);
		
		document.title = "Mocha";
		document.body.style.tabSize = atom.config.get("editor.tabLength");
		document.body.appendChild(this.element);
		document.head.appendChild(New("link", {
			rel: "stylesheet",
			type: "text/css",
			href: "file://" + cssPath
		}));
	}
	
	
	start(){
		this.passes   = 0;
		this.failures = 0;
		this.total    = 0;
		this.pending  = 0;
		this.started  = performance.now();
	}
	
	
	suite(suite){
		
		/** We haven't created elements for this Mocha suite yet */
		if(!suite[el] && !suite.root){
			console.log(suite);
			const container = New("li", {className: "suite"});
			const title     = New("h1", {textContent: suite.title})
			const tests     = New("ul");
			
			container.appendChild(title);
			container.appendChild(tests);
			suite[el] = {container, title, tests};
			
			const parent = suite.parent[el];
			parent
				? parent.tests.appendChild(container)
				: this.report.appendChild(container);
		}
	}
	
	
	testEnd(){
		++this.total;
	}
	
	
	pass(test){
		++this.passes;
		this.addResult(test);
	}
	
	
	fail(test, reason){
		++this.failures;
		this.addResult(test, reason);
	}
	
	
	pending(){
		++this.pending;
	}
	
	
	end(){
		console.log("Done!");
	}
	
	
	
	/**
	 * Display the result of a finished test in the spec-runner.
	 *
	 * @param {Runnable} test
	 * @param {Error} error
	 */
	addResult(test, error){
		const speed  = this.rankSpeed(test);
		const state  = error ? "fail" : "pass";
		const label  = New("h2", {textContent: test.title});
		const result = New("li", {className: `test ${state} ${speed}`});
		const source = this.addCodeBlock(test.body);
		result.addEventListener("click", e => source.hidden = !source.hidden);
		
		result.appendChild(label);
		result.appendChild(source);
		label.appendChild(New("span", {
			className: "duration",
			textContent: test.duration + "ms"
		}));
		test.parent[el].tests.appendChild(result);
	}
	
	
	/**
	 * Generate a chunk of (possibly) highlighted JavaScript source.
	 *
	 * @param {String} src
	 * @return {HTMLPreElement} pre
	 */
	addCodeBlock(src){
		const pre  = New("pre", {className: "code-block", hidden: true});
		const code = New("code", {textContent: src});
		
		if(this.formatCode){
			code.textContent = "";
			src = clean(src).replace(/^(\x20{2})+/gm, s => "\t".repeat(s.length / 2));
			for(let node of this.highlight(src))
				code.appendChild(node);
		}
		
		pre.appendChild(code);
		return pre;
	}


	/**
	 * Gauge the speed of a finished test.
	 *
	 * @param {Runnable} test
	 * @return {String} speed - "fast", "medium" or "slow"
	 */
	rankSpeed(test){
		const thresh = test.slow();
		if(test.duration > thresh)      return "slow";
		if(test.duration > thresh / 2)  return "medium";
		return "fast";
	}
	
	
	/**
	 * Highlight code chunks embedded in test results.
	 *
	 * @param  {Reporter} input - Mocha reporter object
	 * @param  {Object} atom - Reference to the Atom environment object
	 * @return {Array} nodes - An array of DOM nodes
	 */
	highlight(input, atom){
		const nodes = [];
		const js = Reporter.grammars["source.js"];
		
		for(let line of js.tokenizeLines(input)){
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
				
				nodes.push(tag);
			}
			nodes.push(document.createTextNode("\n"));
		}
		return nodes;
	}
	
	
	/**
	 * Load JavaScript grammar to provide syntax highlighting.
	 *
	 * @return {Promise}
	 */
	static loadHighlighter(){
		this.grammars = {};
		return atom.packages.activatePackage("language-javascript").then(p => {
			p.grammars.forEach(g => this.grammars[g.scopeName] = g);
			
			/** Make sure we don't screw with specs */
			atom.packages.deactivatePackage("language-javascript");
		});
	}
}


module.exports = Reporter;


/**
 * Wrapper for creating a new DOM element, optionally assigning it a hash of properties upon construction.
 *
 * @param {String} nodeType - Element type to create.
 * @param {Object} obj - An optional hash of properties to assign the newly-created object.
 * @return {Element}
 */
function New(nodeType, obj){
	function absorb(a, b){
		for(const i in b)
			if(Object(a[i]) === a[i] && Object(b[i]) === b[i])
				absorb(a[i], b[i]);
			else a[i] = b[i];
	};
	const node = document.createElement(nodeType);
	if(obj) absorb(node, obj);
	return node;
}


/** Sloppy alternative to "array.includes(string);" */
function boolBlob(list){
	let b = {};
	for(let i of list)
		b[i] = true;
	return b;
};
