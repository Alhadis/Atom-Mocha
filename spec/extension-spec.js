"use strict";

const {AssertionError} = Chai;
const {TextEditor} = require("atom");
const {addTo, New} = require("../lib/utils.js");


describe("Extensions", () => {
	describe("Workspace-related", () => {
		it("displays the IDs of stringified editors", () => {
			const editor = new TextEditor();
			expect(editor + "").to.equal(`<TextEditor id:${editor.id}>`);
		});
		
		describe(".editor", () => {
			it("identifies TextEditor objects",  () => expect(new TextEditor()).to.be.an.editor);
			it("identifies objects that aren't", () => expect({}).not.to.be.an.editor);
			it("generates meaningful errors",    () => {
				const fn1 = () => expect({}).to.be.an.editor;
				const fn2 = () => expect(new TextEditor()).not.to.be.an.editor;
				expect(fn1).to.throw(AssertionError, 'expected "{}" to be a TextEditor');
				expect(fn2).to.throw(AssertionError, /\bexpected <TextEditor id:\d+> not to be a TextEditor$/m);
			});
			it("chains correctly", () => {
				expect(new TextEditor()).to.be.an.editor.and.instanceOf(TextEditor);
				expect({}).not.to.be.an.editor.and.not.to.be.a("string");
			});
		});
		
		describe(".buffer", () => {
			it("identifies TextBuffer objects",  () => expect(new TextEditor().buffer).to.be.a.buffer);
			it("identifies objects that aren't", () => expect({}).not.to.be.a.buffer);
			it("generates meaningful errors",    () => {
				const fn1 = () => expect({}).to.be.a.buffer;
				const fn2 = () => expect(new TextEditor().buffer).not.to.be.a.buffer;
				expect(fn1).to.throw(AssertionError, 'expected "{}" to be a TextBuffer');
				expect(fn2).to.throw(AssertionError, /\bexpected <TextBuffer [^\s>]+> not to be a TextBuffer$/m);
			});
			it("chains correctly", () => {
				const {buffer} = new TextEditor();
				expect(buffer).to.be.a.buffer.and.instanceOf(buffer.constructor);
				expect({}).not.to.be.a.buffer.and.not.to.be.a("string");
			});
		});
	});
	
	describe("Filesystem-related", () => {
		describe(".existOnDisk", () => {
			it("identifies files that exist", () => expect(__filename).to.existOnDisk);
			it("identifies those that don't", () => expect(__filename + ".nah").not.to.existOnDisk);
			it("generates meaningful errors", () => {
				const fn1 = () => expect(__filename + ".nah").to.existOnDisk;
				const fn2 = () => expect(__filename).not.to.existOnDisk;
				expect(fn1).to.throw(AssertionError, `expected "${__filename}.nah" to exist in filesystem`);
				expect(fn2).to.throw(AssertionError, `expected "${__filename}" not to exist in filesystem`);
			});
			it("chains correctly", () => {
				expect(__filename).to.existOnDisk.and.equal(__filename);
				expect(__filename + ".nah").not.to.existOnDisk.and.equal(__filename);
			});
		});
		
		describe(".equalPath", () => {
			it("identifies matching paths",    () => expect("/foo/bar//baz/asdf/quux/..").to.equalPath("/foo/bar/baz/asdf"));
			it("identifies mismatching paths", () => expect("/foo/bar").not.to.equalPath("/foo/baz"));
			it("generates meaningful errors",  () => {
				const fn1 = () => expect("/foo/bar").to.equalPath("/foo/baz");
				const fn2 = () => expect("/foo/bar").not.to.equalPath("/foo//bar");
				expect(fn1).to.throw(AssertionError, 'expected path "/foo/bar" to equal "/foo/baz"');
				expect(fn2).to.throw(AssertionError, 'expected path "/foo/bar" not to equal "/foo//bar"');
			});
			it("chains correctly", () => {
				expect("/foo/bar").to.equalPath("/foo//bar").and.to.equal("/foo/bar");
				expect("/bar/foo").not.to.equalPath("/foo/bar").and.not.to.equal("/foo/bar");
			});
		});
	});

	describe("DOM-specific", () => {
		afterEach(() => global.resetDOM());
		
		describe(".class", () => {
			let head, body, oldClasses = [];
			beforeEach(() => {
				({head, body} = document);
				oldClasses = [head.className, body.className];
				head.className = "";
				body.className = "";
			});
			afterEach(() => {
				head.className = oldClasses[0];
				body.className = oldClasses[1];
			});
			
			it("identifies single names", () => {
				body.classList.add("foo");
				expect(body).to.have.class("foo");
				expect(body).to.have.classes("foo");
				body.classList.add("bar");
				expect(body).to.have.class("bar");
				expect(body).to.have.classes("bar");
			});
			it("identifies multiple names", () => {
				body.classList.add("bar", "foo");
				expect(body).to.have.class("foo", "bar");
				expect(body).to.have.classes("foo", "bar");
			});
			it("identifies missing classes", () => {
				expect(body).not.to.have.class("baaaz");
				expect(body).not.to.have.classes("qux");
				expect(body).not.to.have.class("qux", "baaaz");
				expect(body).not.to.have.classes("qux", "baz");
			});
			it("generates meaningful errors", () => {
				const fn1 = () => expect(body).to.have.class("bar");
				const fn2 = () => expect(body).not.to.have.class("foo");
				body.classList.add("foo");
				expect(fn1).to.throw(AssertionError, 'expected classList "foo" to include "bar"');
				expect(fn2).to.throw(AssertionError, 'expected classList "foo" not to include "foo"');
				body.className = "";
				expect(fn1).to.throw(AssertionError, 'expected empty classList to include "bar"');
			});
			it("chains correctly", () => {
				body.classList.add("foo");
				expect(body).to.have.class("foo").and.to.be.an.instanceOf(HTMLBodyElement);
				expect(body).not.to.have.class("bar").and.not.to.be.a("string");
				body.classList.add("bar");
				expect(body).to.have.classes("bar", "foo").and.be.instanceOf(HTMLBodyElement);
				expect(body).not.to.have.classes("qux", "baz").and.not.to.be.a("string");
			});
			it("tests every argument by default", () => {
				body.className = "foo bar";
				expect(body).to.have.classes("foo", "bar");
				body.classList.remove("bar");
				expect(body).not.to.have.classes("foo", "bar");
				body.classList.add("qux");
				expect(body).to.have.classes("foo", "qux");
				const fn1 = () => expect(body).to.have.classes("foo", "bar");
				const fn3 = () => expect(body).not.to.have.any.of.classes("foo", "bar");
				const fn2 = () => expect(body).not.to.have.classes("foo", "qux");
				expect(fn1).to.throw(AssertionError, 'expected classList "foo qux" to include "bar"');
				expect(fn3).to.throw(AssertionError, 'expected classList "foo qux" not to include "foo"');
				expect(fn2).to.throw(AssertionError, 'expected classList "foo qux" not to include "foo" and "qux"');
				body.className = "qul";
				expect(fn1).to.throw(AssertionError, 'expected classList "qul" to include "foo" and "bar"');
				body.className = "foo qux";
				expect(fn2).to.throw(AssertionError, 'expected classList "foo qux" not to include "foo" and "qux"');
			});
			it("tests only one argument if `.any` is set", () => {
				body.className = "foo bar";
				expect(body).to.have.any.of.classes("foo", "baz");
				expect(body).not.to.have.any.of.classes("quz", "qux");
				const fn1 = () => expect(body).to.have.any.of.classes("quz", "qux");
				const fn2 = () => expect(body).not.to.have.any.of.classes("foo", "baz");
				expect(fn1).to.throw(AssertionError, 'expected classList "foo bar" to include "quz" or "qux"');
				expect(fn2).to.throw(AssertionError, 'expected classList "foo bar" not to include "foo"');
			});
			it("tests the classes of multiple elements", () => {
				head.className = "foo bar qux";
				body.className = "foo baz qux";
				expect([head, body]).to.have.class("foo");
				expect([head, body]).to.have.class("qux", "foo");
				expect([head, body]).to.have.classes("foo");
				expect([head, body]).to.have.classes("qux", "foo");
				expect([head, body]).not.to.have.class("qul");
				expect([head, body]).not.to.have.class("quuux", "qul");
				expect([head, body]).not.to.have.classes("qul");
				expect([head, body]).not.to.have.classes("quuux", "qul");
				let fn1 = () => expect([head, body]).to.have.class("bar");
				let fn2 = () => expect([head, body]).to.have.class("baz");
				expect(fn1).to.throw(AssertionError, 'expected classList "foo baz qux" to include "bar"');
				expect(fn2).to.throw(AssertionError, 'expected classList "foo bar qux" to include "baz"');
				fn1 = () => expect([head, body]).not.to.have.class("baz");
				fn2 = () => expect([head, body]).not.to.have.class("bar");
				expect(fn1).to.throw(AssertionError, 'expected classList "foo baz qux" not to include "baz"');
				expect(fn2).to.throw(AssertionError, 'expected classList "foo bar qux" not to include "bar"');
			});
		});
		
		describe(".focus", () => {
			let active, inactive;
			describe("HTMLElement objects", () => {
				beforeEach(() => {
					inactive = New("input", {dataset: {active: false}});
					active   = New("input", {dataset: {active: true}});
					attachToDOM(inactive, active);
					active.focus();
				});
				it("identifies elements with focus",      () => expect(active).to.have.focus);
				it("identifies elements without focus",   () => expect(inactive).not.to.have.focus);
				it("generates meaningful error messages", () => {
					const fn1 = () => expect(inactive).to.have.focus;
					const fn2 = () => expect(active).not.to.have.focus;
					expect(fn1).to.throw(AssertionError, "expected element to have focus");
					expect(fn2).to.throw(AssertionError, "expected element not to have focus");
				});
				it("chains correctly", () => {
					expect(active).to.have.focus.and.be.an.instanceOf(HTMLInputElement);
					expect(inactive).not.to.have.focus.and.not.to.be.a("boolean");
				});
				it("tests true for children of focussed elements", () => {
					const parent = New("div", {tabIndex: 0});
					addTo(document.body)(parent)(active);
					active.focus();
					expect(active).to.have.focus.and.to.equal(document.activeElement);
					expect(parent).not.to.have.focus.and.not.equal(document.activeElement);
					parent.focus();
					expect(active).to.have.focus.and.not.equal(document.activeElement);
					expect(parent).to.have.focus.and.equal(document.activeElement);
				});
				it("uses the first entry of jQuery instances", () =>
					expect({jquery: true, 0: active}).to.have.focus);
			});
			
			describe("Non-HTML components", () => {
				let ed1, ed2, pane;
				before(async () => {
					ed1  = await atom.workspace.open(__filename);
					ed2  = await atom.workspace.open(__filename + ".nah");
					pane = atom.workspace.getActivePane();
					
					// Sanity checks
					expect(pane).to.be.an("object");
					expect(ed1).to.be.instanceOf(TextEditor).and.not.instanceOf(HTMLElement);
					expect(ed2).to.be.instanceOf(TextEditor).and.not.instanceOf(HTMLElement);
				});
				
				it("identifies TextEditors with focus", () => {
					expect(ed1).not.to.have.focus;
					expect(ed2).to.have.focus;
					pane.setActiveItem(ed1);
					expect(ed2).not.to.have.focus;
					expect(ed1).to.have.focus.and.be.an.instanceOf(TextEditor).and.not.an.instanceOf(HTMLElement);
					pane.setActiveItem(ed2);
					expect(ed1).not.to.have.focus;
					expect(ed2).to.have.focus;
				});
				
				it("identifies `.element` properties with focus", () => {
					const body = {element: document.body};
					const view = {element: addTo(document.body)(New("div", {tabIndex: 0}))[1]};
					view.element.focus();
					expect(body).not.to.have.focus.and.equal(document.activeElement);
					expect(view).to.have.focus.and.not.equal(document.activeElement);
					view.element.blur();
					expect(body).to.have.focus.and.not.equal(document.activeElement);
					expect(view).to.have.focus.and.not.equal(document.activeElement);
				});
			});
		});

		describe(".drawn", () => {
			it("tests false if detached", () => {
				const el = New("div", {textContent: "Foo"});
				expect(el).not.to.be.drawn;
			});
			it("tests true if attached",  () => {
				const el = New("div", {textContent: "Foo"});
				addTo(document.body)(el);
				expect(el).to.be.drawn;
			});
			it("tests true if invisible", () => {
				const el = New("div", {textContent: "Foo", style: {visibility: "hidden"}});
				addTo(document.body)(el);
				expect(el).to.be.drawn;
			});
			it("tests true if 100% transparent", () => {
				const el = New("div", {textContent: "Foo", style: {opacity: 0}});
				addTo(document.body)(el);
				expect(el).to.be.drawn;
			});
			it("tests false if hidden", () => {
				const el = New("div", {textContent: "Foo", style: {display: "none"}});
				addTo(document.body)(el);
				expect(el).not.to.be.drawn;
			});
			it("tests false if its dimensions are zero", () => {
				const el = New("div", {style: {width: 0, height: 0}});
				addTo(document.body)(el);
				expect(el).not.to.be.drawn;
			});
			it("tests true for elements outside the viewport", () => {
				const style = {position: "absolute", left: "-9999px", top: "-9999px"};
				const el = New("div", {textContent: "Foo", style});
				addTo(document.body)(el);
				expect(el).to.be.drawn;
				el.style.display = "none";
				expect(el).not.to.be.drawn;
			});
			it("uses the first entry if given a jQuery result", () => {
				const el = New("div", {textContent: "Foo"});
				addTo(document.body)(el);
				expect({jquery: true, 0: el}).to.be.drawn;
				document.body.removeChild(el);
				expect({jquery: true, 0: el}).not.to.be.drawn;
			});
		});
		
		describe("resetDOM()", () => {
			it("gets globalised", () => {
				expect(global).to.respondTo("resetDOM");
			});
			it("removes elements added to <body>", () => {
				const min = +!global.AtomMocha.headless;
				addTo(document.body)(New("div"));
				expect(document.body.childElementCount).to.be.above(min);
				global.resetDOM();
				expect(document.body.childElementCount).to.equal(min);
			});
		});
	});
	
	describe("Utility functions", () => {
		describe("open()", function(){
			this.slow(500);
			const {open} = AtomMocha.utils;
			
			beforeEach(() => {
				for(const editor of [...atom.textEditors.editors])
					editor.destroy();
			});
			
			it("opens a single editor", async () => {
				const editor = await open("basic-spec.js");
				expect(editor).to.be.an.editor;
				expect(editor.getPath()).to.existOnDisk;
			});
			
			it("opens multiple editors", async () => {
				const editors = await open("basic-spec.js", "extension-spec.js");
				expect(editors).to.be.an("array").with.lengthOf(2);
				expect(editors[0]).to.be.an.editor;
				expect(editors[1]).to.be.an.editor;
				expect(editors[0].getPath()).to.existOnDisk;
				expect(editors[1].getPath()).to.existOnDisk;
			});
			
			it("normalises separators in relative paths", async () => {
				let paths = [
					"filetypes/coffee-spec.coffee",
					"filetypes/typescript-spec.ts",
					"filetypes/react/jsx-spec.jsx",
					"filetypes/react/tsx-spec.tsx",
				];
				let editors = await open(...paths);
				expect(editors).to.be.an("array").with.lengthOf(4);
				for(const editor of editors){
					editor.should.be.an.editor;
					editor.getPath().should.existOnDisk;
				}
				paths = paths.map(p => p.replace(/\//g, "\\"));
				editors = await open(...paths);
				expect(editors).to.be.an("array").with.lengthOf(4);
				for(const editor of editors){
					editor.should.be.an.editor;
					editor.getPath().should.existOnDisk;
				}
			});
			
			it("normalises separators in absolute paths", async () => {
				const editors = await open(
					__filename.replace(/\\/g, "/"),
					__filename.replace(/\//g, "\\")
				);
				expect(editors).to.be.an("array").with.lengthOf(2);
				expect(editors[0]).to.be.an.editor;
				expect(editors[1]).to.be.an.editor;
				const A = editors[0].getPath();
				const B = editors[1].getPath();
				expect(A).to.existOnDisk;
				expect(B).to.existOnDisk;
				expect(A).to.equal(B);
			});
			
			it("opens editors for non-existent files", async () => {
				const editors = await open("foo.js", "bar.js");
				expect(editors).to.be.an("array").with.lengthOf(2);
				expect(editors[0]).to.be.an.editor;
				expect(editors[1]).to.be.an.editor;
				expect(editors[0].getPath()).not.to.existOnDisk;
				expect(editors[1].getPath()).not.to.existOnDisk;
			});
			
			it("returns an empty editor if no paths are specified", async () => {
				const editor = await open();
				expect(editor).to.be.an.editor;
				expect(editor.getPath()).to.be.undefined;
			});
		});
	});
});
