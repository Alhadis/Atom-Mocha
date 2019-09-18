"use strict";

const Atom     = require("atom");
global.Mocha   = require("mocha");

const Chinotto = require("chinotto");
global.Chai    = Chinotto.chai;
global.expect  = Chai.expect;
Chinotto.register();


// Patch classes to generate more useful output when stringified
if("[object Object]" === Atom.TextEditor.prototype.toString())
	Atom.TextEditor.prototype.toString = function(){
		return `<TextEditor id:${this.id}>`;
	};


/** Assert that subject is a TextEditor */
Chinotto.addProperty("editor", function(){
	const subject = Chai.util.flag(this, "object");
	this.assert(
		atom.workspace.isTextEditor(subject),
		'expected "#{this}" to be a TextEditor',
		`expected ${subject} not to be a TextEditor`
	);
});


/** Assert that subject is a TextBuffer */
Chinotto.addProperty("buffer", function(){
	const subject = Chai.util.flag(this, "object");
	this.assert(
		subject instanceof Atom.TextBuffer,
		'expected "#{this}" to be a TextBuffer',
		`expected ${subject} not to be a TextBuffer`
	);
});


/** Assert that an HTML element or TextEditor has user focus. */
Chai.Assertion.overwriteProperty("focus", function(oldFn){
	return function(){
		let subject = Chai.util.flag(this, "object");
		if(subject.jquery)
			subject = subject[0];
		if(atom.workspace.isTextEditor(subject))
			return this.assert(
				subject === atom.workspace.getActiveTextEditor(),
				"expected editor to have focus",
				"expected editor not to have focus"
			);
		else return oldFn.call(this);
	};
});


/** Attach one or more HTML elements to the spec-runner window */
global.attachToDOM = function(...elements){
	if(isHeadless()){
		const {body} = document;
		for(const el of elements)
			if(!body.contains(el))
				body.appendChild(el);
	}
	else{
		const mocha = document.querySelector("#mocha");
		const body  = mocha.parentElement;
		for(const el of elements)
			if(el !== mocha && !body.contains(el))
				body.insertBefore(el, mocha);
	}
};


/** Remove previously-added HTML elements */
global.resetDOM = function(){
	if(isHeadless()){
		while(document.body.firstChild)
			document.body.removeChild(document.body.firstChild);
	}
	else{
		const mocha = document.querySelector("#mocha");
		for(const el of Array.from(document.body.children))
			if(el !== mocha) document.body.removeChild(el);
	}
};


/**
 * @global - Predicate to skip POSIX-only tests.
 * This avoids marking skipped tests as "pending" if run on Windows.
 *
 * @example
 * unlessOnWindows.describe("Symlinks", …);
 * unlessOnWindows.it("tests hard-links", …);
 * unlessOnWindows(posixOnlyFunc => …);
 *
 * @property {Function} describe
 * @property {Function} specify
 * @property {Function} it
 * @type {Function}
 */
global.unlessOnWindows = (mochFn => {
	const noope = () => {};
	const isWin = "win32" === process.platform;
	const output = cb => (cb && !isWin) ? cb() : noope();
	for(const name of mochFn){
		const value = isWin ? noope : (...args) => global[name](...args);
		Object.defineProperty(output, name, {value});
	}
	return output;
})(["describe", "it", "specify"]);


// Globalise `when()` helper for BDD testing
if("bdd" === AtomMocha.options.ui)
	AtomMocha.options.autoIt
		? require("mocha-when/register")
		: global.when = global.when || function when(text, ...args){
			return describe("When " + text, ...args);
		};

/**
 * Determine whether specs are being run headlessly.
 * @return {Boolean}
 * @internal
 */
function isHeadless(){
	return global.atom.getLoadSettings().headless;
}
