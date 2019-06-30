"use strict";

if(!AtomMocha.headless && !AtomMocha.isCI)
	console.log(atom, AtomMocha);

const errors = new Map();

module.exports = {
	reporter: "atom",
	require: "chai/should",
	recursive: true,
	
	beforeStart(){
		const {fail} = Mocha.Runner.prototype;
		Mocha.Runner.prototype.fail = function(test, error){
			errors.set(test, error);
			return fail.call(this, test, error);
		};
	},
	
	// Deduce "successfully failed" tests from the total number of failures
	beforeFinish(failures){
		const collect = (from, into) => {
			for(const test of from.tests){
				into.push(test);
				into[test.title] = test;
			}
			for(const suite of from.suites)
				into[suite.title] = collect(suite, []);
			return into;
		};
		const results = collect(AtomMocha.runner.suite, []);
		let test, error;
		
		test = results["This package"]["it should fail"];
		test.state.should.equal("failed");
		expect(error = errors.get(test)).to.be.an.instanceOf(Chai.AssertionError);
		expect(error).to.have.property("message").that.equals("expected { Object (alpha, beta, ...) } to equal { Object (Alpha, beta, ...) }");
		expect(error).to.have.property("showDiff").that.equals(true);
		--failures;
		
		test = results["Second suite at top-level"]["it breaks something"];
		test.state.should.equal("failed");
		expect(error = errors.get(test)).to.be.an.instanceOf(ReferenceError);
		expect(error).to.have.property("message").that.equals("something is not defined");
		--failures;
		
		test = results["Aborted tests"][0].ctx.test;
		expect(test).to.be.an.instanceOf(Mocha.Hook);
		expect(error = errors.get(test)).to.be.an.instanceOf(Error);
		expect(error).to.have.property("message").that.equals("Nah, not really");
		expect(results["Aborted tests"]).to.satisfy($ => $.every(test => null == test.state));
		--failures;
		
		const mochaEl = document.querySelector("#mocha");
		if(mochaEl && mochaEl.reporter){
			const {reporter} = mochaEl;
			const {failures, pending} = reporter.statBar;
			reporter.failures.should.equal(3);
			failures.textContent.should.equal("3 failing");
			--reporter.failures; failures.textContent.should.equal("2 failing");
			--reporter.failures; failures.textContent.should.equal("1 failing");
			--reporter.failures; failures.textContent.should.equal("0 failing");
			failures.should.have.class("zero").and.not.be.drawn;
			
			pending.textContent.should.equal("1 pending");
			--reporter.pending; pending.textContent.should.equal("0 pending");
			pending.should.have.class("zero").and.not.be.drawn;
		}
		
		return failures;
	}
};
