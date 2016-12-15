'use strict';

var fs = require('fs'),
  path = require('path'),
  File = require('vinyl'),
  vfs = require('vinyl-fs'),
  _ = require('lodash'),
  concat = require('concat-stream'),
  formatMarkdown = require('./lib/format_markdown'),
  formatParameters = require('./lib/format_parameters');

var u = require('unist-builder'),
  visit = require('unist-util-visit'),
  mdastToString = require('mdast-util-to-string'),
  morph = require('morph');

/** Refines text so it makes a good ID.
 * Strip out non-safe characters, replace spaces with hyphens,
 * truncate to 64 characters, and make lowercase.
 * (lifted from assets/anchor.js)
 */
function makeId(text) {
  // Example string:                    // '⚡⚡⚡ Unicode icons are cool--but they definitely don't belong in a URL fragment.'
  return text.replace(/[^\w\s-]/gi, '') // ' Unicode icons are cool--but they definitely dont belong in a URL fragment'
             .replace(/\s+/g, '-')      // '-Unicode-icons-are-cool--but-they-definitely-dont-belong-in-a-URL-fragment'
             .replace(/-{2,}/g, '-')    // '-Unicode-icons-are-cool-but-they-definitely-dont-belong-in-a-URL-fragment'
             .substring(0, 64)          // '-Unicode-icons-are-cool-but-they-definitely-dont-belong-in-a-URL'
             .replace(/^-+|-+$/gm, '')  // 'Unicode-icons-are-cool-but-they-definitely-dont-belong-in-a-URL'
             .toLowerCase();            // 'unicode-icons-are-cool-but-they-definitely-dont-belong-in-a-url'
}

function setHTMLAttribute(node, key, val) {
  if (!node.data) node.data = {}
  if (!node.data.htmlAttributes) node.data.htmlAttributes = {};
  node.data.htmlAttributes[key] = val;
}

module.exports = function (comments, options, callback) {

  var highlight = require('./lib/highlight')(options.hljs || {});

  comments.forEach(function (comment) {
    if (comment.kind === 'note') {
      comment.namespace = makeId(comment.namespace || comment.name);

      var headings = [], linkMap = {},
          nested = [ { depth: 0, id: comment.namespace } ],
          minDepth = 6,
          toc, entry, name, path, id;
      comment.description.children.forEach(function (child) {
        if (child.type === 'heading') {
          if (child.depth < minDepth) minDepth = child.depth;
          while (nested[0].depth >= child.depth) nested.shift();
          name = morph.toHuman(mdastToString(child).toLowerCase());
          id = makeId(name);
          nested.unshift( { depth: child.depth, id: id } );
          path = nested.map(function (e) { return e.id }).reverse().join('#');
          setHTMLAttribute(child, 'id', path)
          entry = u('heading',
            { position: child.position, depth: child.depth,
              namespace: path },
            [ u('paragraph', [ u('text', name) ]) ] );
          headings.push(entry);
          linkMap['#' + id] = '#' + path
        }
      })
      // save the top-level headings for the table of contents
      toc = [];
      headings.forEach(function (h) { if (h.depth === minDepth) toc.push(h); });
      if (toc.length) comment.toc = toc;
      // remap links that refer to headings
      visit(comment.description, 'link', function (node) {
        var link = linkMap[node.url];
        if (link) {
          node.url = link;
        }
      });
    }
  })

  var namespaces = comments.map(function (comment) {
    return comment.namespace;
  });

  var imports = {
    signature: function (section) {
      var returns = '';
      var prefix = '';
      if (section.kind === 'class') {
        prefix = 'new ';
      }
      if (section.returns) {
        returns = ': ' +
          formatMarkdown.type(section.returns[0].type, namespaces);
      }
      return prefix + section.name +
        formatParameters(section) + returns;
    },
    md: function (ast, inline) {
      if (inline && ast && ast.children.length && ast.children[0].type === 'paragraph') {
        return formatMarkdown({
          type: 'root',
          children: ast.children[0].children
        }, namespaces);
      }
      return formatMarkdown(ast, namespaces);
    },
    formatType: function (section) {
      return formatMarkdown.type(section.type, namespaces);
    },
    autolink: function (text) {
      return formatMarkdown.link(namespaces, text);
    },
    highlight: function (str) {
      return highlight(str);
    }
  };

  var pageTemplate = _.template(fs.readFileSync(path.join(__dirname, 'index._'), 'utf8'), {
    imports: Object.assign({
      renderSection: _.template(fs.readFileSync(path.join(__dirname, 'section._'), 'utf8'), {
        imports: imports
      }),
      renderNote: _.template(fs.readFileSync(path.join(__dirname, 'note._'), 'utf8'), {
        imports: imports
      }),
      highlight: function (str) {
        return highlight(str);
      }
    }, imports)
  });

  // push assets into the pipeline as well.
  vfs.src([__dirname + '/assets/**'], { base: __dirname })
    .pipe(concat(function (files) {
      callback(null, files.concat(new File({
        path: 'index.html',
        contents: new Buffer(pageTemplate({
          docs: comments,
          options: options
        }), 'utf8')
      })));
    }));
};
