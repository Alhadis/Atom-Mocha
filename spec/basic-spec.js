"use strict";

require("chai").should();


describe("This package", function(){
	
	it("rubs the lotion on its skin, or else", function(){
		2..should.equal(2); // In this universe, it'd damn well better
	});
	
	it("gets the hose again", function(){
		this.should.be.extensible.and.ok; // Eventually
	});
	
	it("should fail", function(){
		NaN.should.equal(NaN); // NaH
	});
	
	describe("Suite nesting", function(){
		
		it("does something useful eventually", function(done){
			setTimeout(_ => done(), 3500);
		});
		
		it("still wakes up unemployed", function(){
			(!this).should.not.be.true;
		});
	});
});


describe("Second suite at top-level", function(){
	
	it("shows another block", function(){
		expect(Date).to.be.a(Function);
	});
});
