"use strict";

const utils   = require("./utils.js");
const Atom    = require("atom");
global.Mocha  = require("mocha");
global.Chai   = require("chai");
global.expect = Chai.expect;


/** Check if an element contains one or more CSS classes */
addToChai(["class", "classes"], function(...expected){
	const any     = Chai.util.flag(this, "any");
	let subjects  = Chai.util.flag(this, "object");
	subjects      = "length" in subjects ? Array.from(subjects) : [subjects];
	expected      = utils.flattenList(expected);
	
	for(const {classList, className} of subjects){
		let matched = expected.filter(name =>  classList.contains(name));
		let missing = expected.filter(name => !classList.contains(name));
		const value = any ? matched.length : !missing.length;
		const names = classList.length ? `classList "${className}"` : "empty classList";
		missing     = utils.formatList(expected.filter(n => missing.includes(n)), any ? "or" : "and");
		matched     = utils.formatList(expected.filter(n => matched.includes(n)), any ? "or" : "and");
		
		this.assert(
			value,
			`expected ${names} to include ${missing}`,
			`expected ${names} not to include ${matched}`,
			expected.join(" "),
			className
		);
	}
});


// Patch classes to generate more useful output when stringified
if("[object Object]" === Atom.TextEditor.prototype.toString())
	Atom.TextEditor.prototype.toString = function(){
		return `<TextEditor id:${this.id}>`;
	};


/** Assert that subject is a TextEditor */
Chai.Assertion.addProperty("editor", function(){
	const subject = Chai.util.flag(this, "object");
	this.assert(
		atom.workspace.isTextEditor(subject),
		'expected "#{this}" to be a TextEditor',
		`expected ${subject} not to be a TextEditor`
	);
});


/** Assert that subject is a TextBuffer */
Chai.Assertion.addProperty("buffer", function(){
	const subject = Chai.util.flag(this, "object");
	this.assert(
		subject instanceof Atom.TextBuffer,
		'expected "#{this}" to be a TextBuffer',
		`expected ${subject} not to be a TextBuffer`
	);
});


/** Assert that two filesystem paths are the same */
Chai.Assertion.addMethod("equalPath", function(path){
	const normalise = require("path").normalize;
	const subject   = Chai.util.flag(this, "object");
	
	this.assert(
		normalise(subject) === normalise(path),
		"expected path #{act} to equal #{exp}",
		"expected path #{act} not to equal #{exp}",
		path,
		subject,
		false
	);
});


/** Assert that a file exists in the filesystem */
Chai.Assertion.addProperty("existOnDisk", function(){
	const path = Chai.util.flag(this, "object");
	let exists = false;
	
	try{
		require("fs").statSync(path);
		exists = true;
	}
	catch(e){}
	
	this.assert(
		exists,
		`expected "${path}" to exist in filesystem`,
		`expected "${path}" not to exist in filesystem`
	);
});


/** Assert that an HTML element has user focus */
Chai.Assertion.addProperty("focus", function(){
	const ae = document.activeElement;
	
	let subject = Chai.util.flag(this, "object");
	if(subject.jquery)
		subject = subject[0];
	
	if(atom.workspace.isTextEditor(subject))
		this.assert(
			subject === atom.workspace.getActiveTextEditor(),
			"expected editor to have focus",
			"expected editor not to have focus"
		);
	
	else if(subject instanceof HTMLElement)
		this.assert(
			ae === subject || ae.contains(subject),
			"expected element to have focus",
			"expected element not to have focus"
		);
	
	else if(subject.element instanceof HTMLElement)
		this.assert(
			ae === subject.element || ae.contains(subject.element),
			"expected #{this} to have focus",
			"expected #{this} not to have focus"
		);
	
	else this.fail("#{this} is not an HTMLElement or TextEditor");
});


/** Assert that an HTML element is rendered in the DOM tree */
Chai.Assertion.addProperty("drawn", function(){
	let subject = Chai.util.flag(this, "object");
	if(subject.jquery)
		subject = subject[0];
	
	const bounds = subject.getBoundingClientRect();
	const {top, right, bottom, left} = bounds;
	
	this.assert(
		!(0 === top && 0 === right && 0 === bottom && 0 === left),
		"expected element to be drawn",
		"expected element not to be drawn"
	);
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


/**
 * Call `describe()` with "When " prepended to its description.
 *
 * Complements the `autoIt` setting and helps specs read more naturally.
 * Only globalised if `when` doesn't exist in global scope.
 *
 * @example when("it loads the page", () => it("does this", fn)));
 * @param {String} text
 * @param {...*} args
 * @type {Function}
 */
function when(text, ...args){
	return describe("When " + text, ...args);
}

if(null == global.when)
	global.when = when;


/** Thin wrapper around Chai.Assertion.addMethod to permit plugin aliases */
function addToChai(names, fn){
	for(const name of names)
		Chai.Assertion.addMethod(name, fn);
}


/**
 * Determine whether specs are being run headlessly.
 *
 * @return {Boolean}
 * @internal
 */
function isHeadless(){
	return global.atom.getLoadSettings().headless;
}
