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
		global.foo = "Foo";
	});
	
	it("might be written later"); // Nah
	
	it("should fail", function(){
		const A = {
			alpha: "A",
			beta:  "B",
			gamma: "E",
			delta: "D",
		};
		
		const B = {
			Alpha: "A",
			beta:  "B",
			gamma: "E",
			delta: "d",
		};
		
		A.should.equal(B);
	});
	
	describe("Suite nesting", function(){
		
		it("does something useful eventually", function(done){
			setTimeout(() => done(), 40);
		});
		
		it("cleans anonymous async functions", async function(){
			if(true){
				true.should.be.true;
			}
		});
		
		it("cleans anonymous generators", function * (){
			if(true){
				true.should.be.true;
			}
		});
		
		it("cleans named async functions", async function foo() {
			if(true){
				true.should.be.true;
			}
		});
		
		it("cleans named generators", function * foo (){
			if(true){
				true.should.be.true;
			}
		});
		
		it("cleans async arrow functions", async () => {
			if(true){
				true.should.be.true;
			}
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
	
	it("loads locally-required files", () => {
		expect(global.someGlobalThing).to.equal("fooXYZ");
	});
	
	unlessOnWindows.it("enjoys real symbolic links", () => {
		"Any Unix-like system".should.be.ok;
	});
});


describe("Aborted tests", () => {
	before(() => {throw new Error("Nah, not really")});
	
	it("won't reach this", () => true.should.not.be.false);
	it.skip("won't reach this either", () => true.should.be.true);
});


describe("Screenshots", function(){
	this.timeout(5000);
	const junkFiles = new Set();
	const {existsSync, unlinkSync} = require("fs");
	const {join, resolve} = require("path");
	const {tmpdir} = require("os");
	let ui;
	
	before("Testing JPEG snapshots (100% quality)", async () => {
		attachToDOM(ui = atom.workspace.getElement());
		const saveTo  = join(tmpdir(), process.pid + ".jpeg.best-quality");
		const results = await AtomMocha.snapshot(saveTo, "jPg", 100);
		results.should.eql({img: saveTo + ".jpg", dom: saveTo + ".html"});
		expect(results.img).to.existOnDisk;
		expect(results.dom).to.existOnDisk;
	});
	
	before("Testing JPEG snapshots (0% quality)", async () => {
		let saveTo    = join(".atom-mocha", process.pid + ".jpeg.worst-quality");
		const results = await AtomMocha.snapshot(saveTo, "jpeg", 0);
		saveTo        = join(resolve(__dirname, ".."), saveTo);
		Object.values(results).forEach(junk => junkFiles.add(junk));
		results.should.eql({img: saveTo + ".jpg", dom: saveTo + ".html"});
		expect(results.img).to.existOnDisk;
		expect(results.dom).to.existOnDisk;
	});
	
	after("Removing unwanted artefact", () => {
		for(const junk of junkFiles){
			existsSync(junk) && unlinkSync(junk);
			junkFiles.delete(junk);
		}
	});
	
	it("demystifies unreproducible CI failures", () => true); // Hopefully
});
