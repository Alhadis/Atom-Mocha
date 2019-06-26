"use strict";

const {AssertionError} = Chai;

describe("Utility functions", () => {
	describe("defineAssertions()", () => {
		const {defineAssertions} = AtomMocha.utils;
		
		describe("Methods", () => {
			before(() => defineAssertions({
				["colour, coloured"](subject, expected){
					const actual = subject.colour;
					this.assert(
						actual === expected,
						"expected #{this} to be coloured #{exp}",
						"expected #{this} not to be coloured #{exp}",
						expected,
						actual
					);
				}}));
			
			it("defines basic assertions", () => {
				const obj = {colour: 0xFF0000};
				obj.should.have.colour(0xFF0000);
				obj.should.not.have.colour(0x00F);
			});
			
			it("defines assertions with aliases", () => {
				const obj = {colour: 0xFF0000};
				expect(obj).to.be.coloured(0xFF0000);
				expect(obj).not.to.be.coloured(0x00F);
			});
			
			it("chains them correctly", () => {
				expect({colour: "red"}).to.have.colour("red").and.not.colour("green");
			});
			
			it("allows multiple arguments be passed", () => {
				defineAssertions({
					size(subject, width, height){
						const exp = `${width} × ${height}`;
						const act = `${subject.width} × ${subject.height}`;
						return [
							act === exp,
							"expected #{this} to have size #{exp} but got #{act}",
							"expected #{this} not to have size #{act} but got #{exp}",
							exp,
							act,
						];
					},
				});
				const obj = {width: 1024, height: 768};
				expect(obj).to.have.size(1024, 768);
				expect(obj).not.to.have.size(1024, 100);
				expect(obj).not.to.have.size(768, 1024);
				const fn1 = () => expect(obj).to.have.size(1024, 100);
				const fn2 = () => expect(obj).not.to.have.size(1024, 768);
				const pre = "expected { width: 1024, height: 768 }";
				expect(fn1).to.throw(AssertionError, `${pre} to have size '1024 × 100' but got '1024 × 768'`);
				expect(fn2).to.throw(AssertionError, `${pre} not to have size '1024 × 768' but got '1024 × 768'`);
			});
		});
		
		describe("Properties", () => {
			before(() => defineAssertions({
				freezing(subject){
					this.assert(
						subject.temperature <= 0,
						"expected #{this} to be freezing",
						"expected #{this} not to be freezing",
					);
				},
				boiling(subject){
					this.assert(
						subject.temperature >= 100, // Celsius rules, get over it
						"expected #{this} to be as hot as #{exp}°C but got #{act}°C",
						"expected #{this} to be cooler than #{exp}°C but got #{act}°C",
						100,
						subject.temperature,
					);
				},
			}));
			
			it("defines a property if handler lacks parameter arguments", () => {
				expect({temperature: -30}).to.be.freezing     .and.not.boiling.and.to.be.an("array");
				expect({temperature:  40}).not.to.be.freezing .and.not.boiling.and.to.be.an("array");
				expect({temperature: 120}).to.be.boiling      .and.not.freezing.and.to.be.an("array");
				expect({temperature:  80}).not.to.be.boiling  .and.not.freezing.and.to.be.an("array");
				const fn1 = () => expect({temperature:  50}).to.be.freezing;
				const fn2 = () => expect({temperature:  -3}).not.to.be.freezing;
				const fn3 = () => expect({temperature:  80}).to.be.boiling;
				const fn4 = () => expect({temperature: 120}).not.to.be.boiling;
				expect(fn1).to.throw(AssertionError, "expected { temperature: 50 } to be freezing");
				expect(fn2).to.throw(AssertionError, "expected { temperature: -3 } not to be freezing");
				expect(fn3).to.throw(AssertionError, "expected { temperature: 80 } to be as hot as 100°C but got 80°C");
				expect(fn4).to.throw(AssertionError, "expected { temperature: 120 } to be cooler than 100°C but got 120°C");
			});
			
			it("does not allow them to be called as functions", () => {
				const fn = () => expect({temperature: -10}).to.be.freezing();
				expect(fn).to.throw(TypeError, / is not a function$/);
			});
			
			it("does not call them when chained", () => {
				expect({temperature: -30, colour: "blue"}) .to.be.freezing.and.have.colour("blue");
				expect({temperature: +30, colour: "red"})  .not.to.be.freezing.and.have.colour("green");
			});
		});
		
		describe("Shorthand definitions", () => {
			before(() => defineAssertions({
				width(subject, expected){
					return [
						subject.width === expected,
						"to have width #{exp}",
					];
				},
				height(subject, expected){
					return [
						subject.height === expected,
						`Custom pass message (${expected}, ${subject.height})`,
						`Custom fail message (${expected}, ${subject.height})`,
					];
				},
			}));
			
			when("the handler function returns an array", () => {
				it("uses them as arguments for .assert()", () => {
					expect({height: 2.5}).to.have.height(2.5);
					expect({height: 500}).not.to.have.height(250);
					const fn1 = () => expect({height: 35}).to.have.height(59);
					const fn2 = () => expect({height: 78}).not.to.have.height(78);
					expect(fn1).to.throw(AssertionError, "Custom pass message (59, 35)");
					expect(fn2).to.throw(AssertionError, "Custom fail message (78, 78)");
				});
				it("expands shorthand to fill missing parameters", () => {
					expect({width: 30}).to.have.width(30);
					expect({width: 30}).not.to.have.width(20);
					const fn1 = () => expect({width: 30}).to.have.width(80);
					const fn2 = () => expect({width: 25}).not.to.have.width(25);
					expect(fn1).to.throw(AssertionError, "expected { width: 30 } to have width 80");
					expect(fn2).to.throw(AssertionError, "expected { width: 25 } not to have width 25");
				});
			});
		});
	});
	
	
	describe("defineAssertion()", () => {
		const {defineAssertion} = AtomMocha.utils;
		
		it("defines an assertion using separate parameters", () => {
			defineAssertion("flavour", function(subject, expected){
				this.assert(
					subject.flavour === expected,
					"expected #{this} to taste like #{exp}",
					"expected #{this} not to taste like #{exp}",
					expected,
					subject.flavour
				);
			});
			expect({flavour: "chocolate"}).to.have.flavour("chocolate");
			expect({flavour: "strawberry"}).not.to.have.flavour("chocolate");
			const fn1 = () => expect({flavour: "vanilla"}).to.have.flavour("coffee");
			const fn2 = () => expect({flavour: "vanilla"}).not.to.have.flavour("vanilla");
			expect(fn1).to.throw(AssertionError, "expected { flavour: 'vanilla' } to taste like 'coffee'");
			expect(fn2).to.throw(AssertionError, "expected { flavour: 'vanilla' } not to taste like 'vanilla'");
		});
		
		it("accepts an array of name variations", () => {
			defineAssertion(["cost", "price"], function(subject, expected){
				this.assert(
					subject.cost === expected,
					"expected #{this} to cost $#{exp} instead of $#{act}",
					"expected #{this} not to cost $#{exp} instead of $#{act}",
					expected,
					subject.cost
				);
			});
			expect({cost: 50}).to.have.price(50).and.not.cost(60);
			expect({cost: 35}).not.to.have.price(78).and.not.cost(90);
			const fn1 = () => expect({cost: 45}).to.have.cost(78);
			const fn2 = () => expect({cost: 55}).not.to.have.cost(55);
			expect(fn1).to.throw(AssertionError, "expected { cost: 45 } to cost $78 instead of $45");
			expect(fn2).to.throw(AssertionError, "expected { cost: 55 } not to cost $55 instead of $55");
		});
	});
});
