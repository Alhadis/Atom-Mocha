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
		this.autoIt     = options.autoIt && config.ui === "bdd";
		
		/** Register Mocha handlers */
		const events = "start suite pass fail end pending";
		for(let event of events.split(" "))
			runner.on(event, (...x) => this[event](...x));
		runner.on("test end", (...x) => this.testEnd(...x));
		
		/** Construct something to actually show stuff with */
		this.element = New("div", {id: "mocha"});
		this.stats   = this.createStats();
		this.report  = New("div", {id: "mocha-report"});
		this.element.appendChild(this.stats.element);
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
		this.stats.passes   = 0;
		this.stats.failures = 0;
		this.stats.total    = 0;
		this.stats.pending  = 0;
		this.stats.started  = performance.now();
	}
	
	
	suite(suite){
		
		/** We haven't created elements for this Mocha suite yet */
		if(!suite[el] && !suite.root)
			this.addSuite(suite);
	}
	
	
	testEnd(){
		++this.total;
		this.stats.duration = performance.now() - this.stats.started;
	}
	
	
	pass(test){
		++this.stats.passes;
		this.addResult(test);
	}
	
	
	fail(test, reason){
		++this.stats.failures;
		this.addResult(test, reason);
	}
	
	
	pending(){
		++this.pending;
	}
	
	
	end(){
		this.finished = performance.now();
	}
	
	
	
	/**
	 * Add an HTML container for a suite of tests.
	 *
	 * @param {Suite} suite
	 */
	addSuite(suite){
		const container = New("article", {className: "suite"});
		const title     = New("h1", {textContent: suite.title});
		const results   = New("div", {className: "results"});
		
		container.appendChild(title);
		container.appendChild(results);
		suite[el] = {container, title, results};
		
		const parent = suite.parent[el];
		parent
			? parent.results.appendChild(container)
			: this.report.appendChild(container);
	}
	
	
	/**
	 * Display the result of a finished test in the spec-runner.
	 *
	 * @param {Runnable} test
	 * @param {Error} error
	 */
	addResult(test, error){
		const title  = (this.autoIt ? "It " : "") + test.title;
		const speed  = this.rankSpeed(test);
		const state  = error ? "fail" : "pass";
		const result = New("div", {className: `test ${state} ${speed}`});
		const label  = New("h2", {textContent: title});
		const source = this.createCodeBlock(test.body);
		result.addEventListener("click", e => source.hidden = !source.hidden);
		
		result.appendChild(label);
		result.appendChild(source);
		result.insertBefore(this.createDuration(test.duration, true), source);
		test.parent[el].results.appendChild(result);
	}
	
	
	/**
	 * Generate a chunk of (possibly) highlighted JavaScript source.
	 *
	 * @param {String} src
	 * @return {HTMLPreElement} pre
	 */
	createCodeBlock(src){
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
	 * Generate an HTML element to store and display spec-runner statistics.
	 *
	 * @return {HTMLElement} element
	 */
	createStats(){
		const element  = New("dl", {id: "mocha-stats"});
		const passes   = New("dd", {textContent: "0", className: "passes"});
		const failures = New("dd", {textContent: "0", className: "failures"});
		const duration = this.createDuration(0, "s");
		
		element.appendChild(passes);
		element.appendChild(failures);
		element.appendChild(duration);
		
		element.insertBefore(New("dt", {textContent: "passes"}),   passes);
		element.insertBefore(New("dt", {textContent: "failures"}), failures);
		element.insertBefore(New("dt", {textContent: "duration"}), duration);
		
		return Object.defineProperties({element}, {
			passes:   {get: $=> +passes.textContent,   set: n => passes.value   = passes.textContent = n},
			failures: {get: $=> +failures.textContent, set: n => failures.value = failures.textContent = n},
			duration: {get: $=> +duration.value,       set: n => duration.value = n}
		});
	}


	/**
	 * Generate an HTML node for displaying a duration.
	 *
	 * @param {Number} input - Time expressed in milliseconds
	 * @param {Boolean} noUnits - Always display time in milliseconds
	 * @return {HTMLElement} span
	 */
	createDuration(input = 0, noUnits = false){
		const span = New("span", {className: "duration"});
		const data = New("data", {className: "amount"});
		const unit = New("span", {className: "unit"});
		
		Object.defineProperty(span, "value", {
			get(){ return +data.value || 0; },
			
			set(input){
				input = Math.max(0, +input || 0);
				data.value = input;
				
				/** Display a reader-friendly version of the duration */
				if(noUnits || input < 1000){
					span.title = `${input} milliseconds`;
					data.textContent = input;
					unit.textContent = "ms";
				}
				
				else if(input >= 60000){
					input = parseFloat((input / 60000).toFixed(2));
					span.title = `${input} minutes`;
					data.textContent = input;
					unit.textContent = "m";
				}
				
				else{
					input = parseFloat((input / 1000).toFixed(2));
					span.title = `${input} seconds`;
					data.textContent = input;
					unit.textContent = "s";
				}
			}
		});
		
		span.value = input;
		span.appendChild(data);
		span.appendChild(unit);
		return span;
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
