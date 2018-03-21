Change Log
==========

This project honours [Semantic Versioning](http://semver.org/).


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
[Unpublished]: ../../compare/v2.0.5...HEAD
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
