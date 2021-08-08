Change Log
==========

This project honours [Semantic Versioning](http://semver.org/).


[Unpublished]
------------------------------------------------------------------------
* **Added:** `beforeTest`, `afterTest`, `onPass` and `onFail` hooks
* **Added:** Ability to record screen-captures of failed tests
* **Fixed:** Errors ignored when thrown from [`beforeStart` hook][3]

[3]: https://mochajs.org/#hooks


[v2.2.2]
------------------------------------------------------------------------
**August 3rd, 2021**  
* **Added:** Support for the `FORCE_COLOR` environment variable
* **Changed:** Non-Atom related Chai extensions moved to a [new repo][2]
* Upgraded to [Mocha v9.0.3][]

[2]: https://github.com/Alhadis/Chinotto
[Mocha v9.0.3]: https://github.com/mochajs/mocha/releases/tag/v9.0.3


[v2.2.1]
------------------------------------------------------------------------
**July 24th, 2019**  
* **Added:** `afterStart` callback that's executed after [`mocha.run()`]
* **Fixed:** Inability to scroll default reporter with `minimal` enabled
* **Fixed:** Tests not shown when filtering by failed results
* Upgraded to [Mocha v6.2.0][]

[`mocha.run()`]: https://mochajs.org/api/mocha#run
[Mocha v6.2.0]: https://github.com/mochajs/mocha/releases/tag/v6.2.0


[v2.2.0]
------------------------------------------------------------------------
**July 1st, 2019**  
* **Added:** [`.buffer`](docs/extensions.md#buffer) assertion
* **Added:** [`.editor`](docs/extensions.md#editor) assertion
* **Added:** Statbar counters filtering results when clicked
* **Added:** Default reporter can now be aborted by pressing `CTRL + C`
* **Added:** Feedback for errors caught whilst executing `before*` hooks
* **Added:** Support for Mocha's [`--recursive`][] option
* **Added:** Support for Chai's [`.any`][] flag in `.classes` assertions
* **Changed:** [`autoIt`][] setting enabled by default for all reporters
* **Changed:** Default [`specPattern`][] now recognises TypeScript files
* **Changed:** [`TextEditor`][] objects now stringify to `<TextEditor…>`
* **Changed:** `.focus` assertion now works for [`TextEditor`][] objects
* **Changed:** `link()` removed from [`./lib/utils`][] and made internal
* **Fixed:** [`autoScroll`][] preventing user from scrolling manually
* **Fixed:** Code-blocks missing if `beforeStart` was defined in config
* **Fixed:** `document.title` property throwing error when reconfigured
* **Fixed:** Process hanging if `beforeFinish` handler throws an error
* **Fixed:** HTML not escaped in error titles

[`./lib/utils`]: ./lib/utils.js
[`autoIt`]:      ./docs/options.md#autoit
[`autoScroll`]:  ./docs/options.md#autoscroll
[`specPattern`]: ./docs/options.md#specpattern
[`TextEditor`]:  https://atom.io/docs/api/v1.38.2/TextEditor
[`--recursive`]: https://mochajs.org/#-recursive
[`.any`]:        https://www.chaijs.com/api/bdd/#method_any


[v2.1.2]
------------------------------------------------------------------------
**June 1st, 2019**  
* **Added:** Access to `atom` and `AtomMocha` globals in `.mocharc.js`
* **Added:** `AtomMocha.isCI` property for identifying CI environments
* **Fixed:** Async functions not reformatted in code-blocks


[v2.1.1]
------------------------------------------------------------------------
**April 8th, 2019**  
* **Added:** Support for `.jsonc` as a `.mocharc.*` extension
* Upgraded to [Mocha v6.1.0][]

[Mocha v6.1.0]: https://github.com/mochajs/mocha/releases/tag/v6.1.0


[v2.1.0]
------------------------------------------------------------------------
**March 1st, 2019**  
* **Added:** Support for `.mocharc.*` files introduced in [Mocha v6.0][]
* **Fixed:** Inability to globalise Chai methods using `chai/register-*`
* **Fixed:** Hotlinked stacks now use [Atom's core URI handlers][1] for
  jumping to offending lines of code during failed tests. This enabled
  removal of a lot of ugly kruft written prior to the URI handler feature

[Mocha v6.0]: https://github.com/mochajs/mocha/releases/tag/v6.0.0
[1]: https://github.com/BinaryMuse/atom-mocha-test-runner/pull/12


[v2.0.7]
------------------------------------------------------------------------
**October 31st, 2018**  
* **Fixed:** Interactive reporter freezing instead of displaying output


[v2.0.6]
------------------------------------------------------------------------
**August 15th, 2018**  
* **Changed:** `attachToDOM` and `resetDOM` now work in headless tests


[v2.0.5]
------------------------------------------------------------------------
**March 22nd, 2018**  
* **Fixed:** Breakage when running on Atom v1.25+


[v2.0.4]
------------------------------------------------------------------------
**February 11th, 2018**  
* **Added:** Global reference to `mocha` and runner instances [[`#4`][]]


[v2.0.3]
------------------------------------------------------------------------
**December 15th, 2017**  
* **Fixed:** Entry-point file (`index.js`) missing from packaged tarball


[v2.0.2]
------------------------------------------------------------------------
**September 1st, 2017**  
* **Fixed:** Misleading summary when aborting tests with `bail` disabled
* **Fixed:** Spec-runner breakage in recent Atom versions


[v2.0.1]
------------------------------------------------------------------------
**January 19th, 2017**  
* **Fixed:** Breakage when installing through APM


[v2.0.0]
------------------------------------------------------------------------
**January 19th, 2017**  
* **Added:** Option to customise which lines are hidden in stack-traces
* **Added:** Post-install hook to add `atomTestRunner` to `package.json`
* **Changed:** Installation process; update `package.json` if upgrading
* **Changed:** Pattern to match spec-files; now includes `-test` suffix
* **Fixed:** Total lack of Windows support
* **Removed:** Executable file for test-runner


[v1.1.1]
------------------------------------------------------------------------
**December 27th, 2016**  
* **Added:** [`when()`](docs/extensions.md#autoit) helper for BDD specs
* **Changed:** [`slide`](docs/options.md#slide) now enabled by default
* **Fixed:** Plural missing in summary if bailing on `11` or `111` tests


[v1.1.0]
------------------------------------------------------------------------
**December 22nd, 2016**  
* **Added:** Ability to open resources by clicking paths in stack-traces
* **Added:** Chai extension to test element's visibility in the DOM tree
* **Fixed:** ANSI escape codes included when redirecting headless output
* **Fixed:** Summary element duplicated when bailing with multiple files
* **Fixed:** Keyboard shortcuts for copying selected text not working
* **Fixed:** Modal dialogues appearing over feedback layer


[v1.0.2]
------------------------------------------------------------------------
**December 18th, 2016**  
* **Added:** Feature to gracefully skip POSIX-dependent tests on Windows
* **Added:** Auto-scroll and opacity options for default reporter
* **Added:** Feedback line to indicate when tests have finished
* **Fixed:** Flash of unstyled content when launching spec-runner
* **Fixed:** Oddly-worded hook errors when using `autoIt`


[v1.0.1]
------------------------------------------------------------------------
**September 23rd, 2016**  
* **Fixed:** Toggling result titles too quickly triggered text selection
* **Fixed:** Whitespace missing in preformatted code-blocks



[v1.0.0]
------------------------------------------------------------------------
**September 5th, 2016**  
Initial release.


[Referenced links]:_____________________________________________________
[Unpublished]: ../../compare/v2.2.2...HEAD
[v2.2.2]: https://github.com/Alhadis/Atom-Mocha/releases/tag/v2.2.2
[v2.2.1]: https://github.com/Alhadis/Atom-Mocha/releases/tag/v2.2.1
[v2.2.0]: https://github.com/Alhadis/Atom-Mocha/releases/tag/v2.2.0
[v2.1.2]: https://github.com/Alhadis/Atom-Mocha/releases/tag/v2.1.2
[v2.1.1]: https://github.com/Alhadis/Atom-Mocha/releases/tag/v2.1.1
[v2.1.0]: https://github.com/Alhadis/Atom-Mocha/releases/tag/v2.1.0
[v2.0.7]: https://github.com/Alhadis/Atom-Mocha/releases/tag/v2.0.7
[v2.0.6]: https://github.com/Alhadis/Atom-Mocha/releases/tag/v2.0.6
[v2.0.5]: https://github.com/Alhadis/Atom-Mocha/releases/tag/v2.0.5
[v2.0.4]: https://github.com/Alhadis/Atom-Mocha/releases/tag/v2.0.4
[v2.0.3]: https://github.com/Alhadis/Atom-Mocha/releases/tag/v2.0.3
[v2.0.2]: https://github.com/Alhadis/Atom-Mocha/releases/tag/v2.0.2
[v2.0.1]: https://github.com/Alhadis/Atom-Mocha/releases/tag/v2.0.1
[v2.0.0]: https://github.com/Alhadis/Atom-Mocha/releases/tag/v2.0.0
[v1.1.1]: https://github.com/Alhadis/Atom-Mocha/releases/tag/v1.1.1
[v1.1.0]: https://github.com/Alhadis/Atom-Mocha/releases/tag/v1.1.0
[v1.0.2]: https://github.com/Alhadis/Atom-Mocha/releases/tag/v1.0.2
[v1.0.1]: https://github.com/Alhadis/Atom-Mocha/releases/tag/v1.0.1
[v1.0.0]: https://github.com/Alhadis/Atom-Mocha/releases/tag/v1.0.0
[`#4`]: https://github.com/Alhadis/Atom-Mocha/pull/4
