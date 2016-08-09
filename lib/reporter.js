"use strict";

const utils   = require("./utils.js");
const {clean} = require("mocha/lib/utils.js");
const {addTo, nearest, New} = utils;

const cssPath = require.resolve("../test-runner.css");
const el      = Symbol("Atom-Mocha-Elements");


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
		const events = {
			start:      this.onStart,
			suite:      this.onSuite,
			pass:       this.onPass,
			fail:       this.onFail,
			end:        this.onEnd,
			pending:    this.onPending,
			"test end": this.onTestEnd
		};
		for(const event in events)
			runner.on(event, events[event].bind(this));
		
		/** Construct something to actually show stuff with */
		this.element = New("div", {id: "mocha"});
		this.report  = New("div", {id: "mocha-report"});
		this.element.appendChild(this.report);
		this.element.addEventListener("click", function(e){
			let title, stop, el;
			if(title = nearest(e.target, ".test-title")){
				el = title.nextSibling;
				if(el) el.hidden = !el.hidden;
			}
			
			else if(title = nearest(e.target, ".suite-title")){
				el = title.nextSibling;
				el.hidden = !el.hidden;
				el.parentNode.classList.toggle("collapsed", el.hidden);
			}
			
			if(el){
				e.preventDefault();
				e.stopPropagation();
				return false;
			}
		});
		
		/** Generate stat-bar */
		this.statBar = New("footer", {id: "mocha-stats"});
		this.element.appendChild(addTo(this.statBar)(
			this.statBar.passes   = New("div", {textContent: "0", id: "mocha-passes"}),
			this.statBar.duration = this.createDuration(...[,,{tagName: "div", id:"mocha-duration"}]),
			this.statBar.pending  = New("div", {textContent: "0", id: "mocha-pending"}),
			this.statBar.failures = New("div", {textContent: "0", id: "mocha-failures"})
		)[0]);
		
		document.title = "Mocha";
		document.body.style.tabSize = atom.config.get("editor.tabLength");
		document.body.appendChild(this.element);
		document.head.appendChild(New("link", {
			rel: "stylesheet",
			type: "text/css",
			href: "file://" + cssPath
		}));
	}
	
	
	get passes(){ return +this.statBar.passes.dataset.value || 0 }
	set passes(input){
		input            = Math.max(0, +input || 0);
		const el         = this.statBar.passes;
		el.textContent   = `${input} passing`;
		el.dataset.value = input;
		el.classList.toggle("zero", input === 0);
	}
	
	get pending(){ return +this.statBar.pending.dataset.value || 0 }
	set pending(input){
		input            = Math.max(0, +input || 0);
		const el         = this.statBar.pending;
		el.textContent   = `${input} pending`;
		el.dataset.value = input;
		el.classList.toggle("zero", input === 0);
	}
	
	get failures(){ return +this.statBar.failures.dataset.value || 0 }
	set failures(input){
		input            = Math.max(0, +input || 0);
		const el         = this.statBar.failures;
		el.textContent   = `${input} failing`;
		el.dataset.value = input;
		el.classList.toggle("zero", input === 0);
	}
	
	get duration(){ return this.statBar.duration || 0 }
	set duration(input){
		const el = this.statBar.duration;
		el.value = input;
	}
	
	
	onStart(){
		this.passes     = 0;
		this.failures   = 0;
		this.total      = 0;
		this.pending    = 0;
		this.started    = performance.now();
	}
	
	
	onSuite(suite){
		
		/** We haven't created elements for this Mocha suite yet */
		if(!suite[el] && !suite.root)
			this.addSuite(suite);
	}
	
	
	onTestEnd(){
		++this.total;
		this.duration = performance.now() - this.started;
	}
	
	
	onPass(test){
		++this.passes;
		this.addResult(test);
	}
	
	
	onFail(test, reason){
		++this.failures;
		this.addResult(test, reason);
	}
	
	
	onPending(test){
		++this.pending;
		this.addResult(test);
	}
	
	
	onEnd(){
		this.finished = performance.now();
		this.duration = this.finished - this.started;
	}
	
	
	
	/**
	 * Add an HTML container for a suite of tests.
	 *
	 * @param {Suite} suite
	 */
	addSuite(suite){
		const container = New("article", {className: "suite"});
		const title     = New("h1", {className: "suite-title", textContent: suite.title});
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
		const speed = this.rankSpeed(test);
		const state = error ? "fail" : (test.pending ? "pending" : "pass");
		
		const container = New("div", {className: `test ${state} ${speed}`});
		const title     = New("div", {className: "test-title"});
		
		addTo(title)(
			New("h2", {textContent: (this.autoIt? "It ":"") + test.title}),
			test.pending? null : this.createDuration(test.duration, true)
		);
		
		container.appendChild(title);
		test.pending || container.appendChild(this.createCodeBlock(test.body));
		test.parent[el].results.appendChild(container);
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
	 * Generate an HTML node for displaying a duration.
	 *
	 * @param {Number} input - Time expressed in milliseconds
	 * @param {Boolean} noUnits - Always display time in milliseconds
	 * @param {Object} attr - Additional HTML attributes to add to container
	 * @return {HTMLElement} el
	 */
	createDuration(input = 0, noUnits = false, attr = {}){
		const attrib  = Object.assign({}, attr, {className: "duration"});
		const tagName = attr.tagName || "span";
		delete attrib.tagName;
		
		const span = New(tagName, attrib);
		const data = New("data", {className: "amount"});
		const unit = New("span", {className: "unit"});
		
		Object.defineProperty(span, "value", {
			get(){ return +data.value || 0; },
			
			set(input){
				input = Math.max(0, +input || 0);
				data.value = input;
				
				/** Display a reader-friendly version of the duration */
				if(noUnits || input < 1000){
					input = parseFloat(input.toFixed(2));
					span.title = `${input} millisecond${input==1 ? "":"s"}`;
					data.textContent = input;
					unit.textContent = "ms";
				}
				
				else if(input >= 60000){
					input = parseFloat((input / 60000).toFixed(2));
					span.title = `${input} minute${input==1 ? "":"s"}`;
					data.textContent = input;
					unit.textContent = "m";
				}
				
				else{
					input = parseFloat((input / 1000).toFixed(2));
					span.title = `${input} second${input==1 ? "":"s"}`;
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


/** Sloppy alternative to "array.includes(string);" */
function boolBlob(list){
	let b = {};
	for(let i of list)
		b[i] = true;
	return b;
};
