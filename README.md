# documentation-theme-nxus-app

[![Circle CI](https://circleci.com/gh/documentationjs/documentation-theme-default.svg?style=svg)](https://circleci.com/gh/documentationjs/documentation-theme-default)

![](screenshot.png)

This is a lightly modified version of the
[default theme](https://github.com/documentationjs/documentation-theme-default)
for [documentationjs](https://github.com/documentationjs) intended for
use in documenting nxus applications. The differences involve mainly the
table of contents display and the handling of links within the
documentation.

Like the default theme,
it consists of Handlebars templates and a few assets: a [highlight.js](https://highlightjs.org/)
theme and [basscss](http://www.basscss.com/) as a basic CSS framework.

The contents are the following:

* `index.hbs`, the main template that defines the document structure
* `section.hbs`, a partial used to render each chunk of documentation
* `assets/*`, any assets, including CSS & JS

# Helpers

* `{{format_params}}`: format function parameters, including the types
  included within.
* `{{permalink}}`: in the context of a documentation chunk,
  return the chunk's permalink
* `{{autolink TEXT}}`: given a chunk of text that may be a reference to a
  method, property, or other namespaced item, link the text to the item
* `{{md TEXT}}`: render Markdown-formatted text, parsing additional
  JSDoc inline tag syntax and linking links when necessary
* `{{format_type}}`: format a type definition, like `{string}` within a
  param definition.
