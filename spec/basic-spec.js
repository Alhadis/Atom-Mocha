"use strict";


describe("This package", function(){
	
	it("rubs the lotion on its skin, or else", function(){
		2..should.equal(2); // In this universe, it'd damn well better
	});
	
	it("gets the hose again", function(){
		this.should.be.extensible.and.ok; // Eventually
	});
	
	it("should not fail", function(){
		NaN.should.not.equal(NaN); // NaH
	});
	
	it("might be written later"); // Nah
	
	it("should fail", function(){
		const A = {
			alpha: "A",
			bravo: "B",
			delta: "D",
			epsilon: "E"
		};
		
		const B = {
			Alpha: "A",
			bravo: "B",
			delta: "d",
			epsilon: "E"
		};
		
		A.should.equal(B);
	});
	
	describe("Suite nesting", function(){
		
		it("does something useful eventually", function(done){
			setTimeout(_ => done(), 40);
		});
		
		it("still wakes up unemployed", function(){
			(!this).should.not.be.true;
		});
	});
});


describe("Second suite at top-level", function(){
	
	it("shows another block", function(){
		Chai.expect(Date).to.be.an.instanceOf(Function);
	});
	
	
	it("breaks something", function(){
		something();
	});
	
	unlessOnWindows.it("enjoys real symbolic links", () => {
		"Any Unix-like system".should.be.ok;
	});
});


describe("Chai extensions", () => {
	
	afterEach(() => resetDOM());
	
	it("tests the existOnDisk property", () => {
		expect(__filename).to.existOnDisk;
	});
	
	it("asserts pathname equality", () => {
		expect("/foo/bar//baz/asdf/quux/..").to.equalPath("/foo/bar/baz/asdf");
	});
	
	it("tests user focus", () => {
		const el = document.createElement("input");
		el.autofocus = true;
		attachToDOM(el);
		expect(el).to.have.focus
		expect(document.createElement("div")).not.to.have.focus
	});
	
	it("resets the DOM", () => {
		expect(document.body.childElementCount).to.equal(1);
	});
});
