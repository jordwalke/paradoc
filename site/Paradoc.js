/*!
 * Flatdoc - (c) 2013, 2014 Rico Sta. Cruz
 * http://ricostacruz.com/flatdoc
 * @license MIT
 */

// Keep this in sync with $header-height in style.
var headerHeight = 52;

/**
 * Pass the window.location.href
 */
var urlBasename = function (s) {
  return s.split("/").pop().split("#")[0].split("?")[0];
};
var urlDir = function (s) {
  var lst =  s.split("/");
  var withoutLast = lst.pop();
};
var indexify = function(path) {
  var splits = path.split('/');
  if(splits.length > 0) {
    var last = splits[splits.length - 1];
    if (path.lastIndexOf(".js") !== path.length - 3) {
      return path + '/index.js';
    } else {
      return path;
    }
  }
};


var kebabToWords = function(s) {
  var ss = s.replace(
    /-./g,
    function(x) {
      return ' ' + x.toUpperCase()[1];
    }
  );
  return ss.length > 0 ? s[0].toUpperCase() + ss.substr(1) : ss;
};

/**
 * Must supply href as written in dom node, not a.href which is fully resolved.
 * TODOSecurityAudit:
 */
var isHrefAttributeLocal = function (relativeToPageUrl, href) {
  return href.indexOf('file://') !== 0 &&
    href.indexOf('https://') !== 0 &&
    href.indexOf('http://') !== 0;
};

var urlExtensionlessBasename = function (s) {
  return s.split("/").pop().split("#")[0].split("?")[0].replace(".html", "");
};

var removeSiblingsBefore = function(n, node) {
  while(n > 0 && node.previousElementSibling) {
    n--;
    node.previousElementSibling.parentNode.removeChild(node.previousElementSibling);
  }
};

var urlForPageKey = function (s) {
  return s + ".html";
};

var slugPrefix = function (hash) {
  if (hash === "" || hash[0] !== "#") {
    return "";
  } else {
    hash = hash.substr(1);
    return (hash.split("-").length ? hash.split("-")[0] : "").toLowerCase();
  }
};

function dictToSearchParams(dict) {
  var segs = [];
  for (var p in dict) {
    segs.push(encodeURIComponent(p) + "=" + encodeURIComponent(dict[p]));
  }
  return "?" + segs.join("&");
}

var Bookmark = {};
var mapKeys = function (dict, onPage) {
  var result = {};
  for (var pageKey in dict) {
    result[pageKey] = onPage(dict[pageKey], pageKey);
  }
  return result;
};
var forEachKey = function (dict, onPage) {
  var _throwAway = mapKeys(dict, (pageData, pageKey) => (onPage(pageData, pageKey), pageData));
};
/**
 * n squared but so what.
 */
var nextKeyWithNonEmptyArrayOrNullIfNone = function (curKey, resultsByPageKey) {
  var nextPageKey = nextKeyOrNull(curKey, resultsByPageKey);
  if (nextPageKey === null) {
    return null;
  } else if (resultsByPageKey[nextPageKey].length === 0) {
    return nextKeyWithNonEmptyArrayOrNullIfNone(nextPageKey, resultsByPageKey);
  } else {
    return nextPageKey;
  }
};

/**
 * n squared but so what.
 */
var prevKeyWithNonEmptyArrayOrNullIfNone = function (curKey) {
  var prevPageKey = prevKeyOrNull(curKey, resultsByPageKey);
  if (prevPageKey === null) {
    return null;
  } else if (resultsByPageKey[prevPageKey].length === 0) {
    return prevKeyWithNonEmptyArrayOrNullIfNone(prevPageKey);
  } else {
    return prevPageKey;
  }
};

var numKeysWhere = function (dict, f) {
  var num = 0;
  for (var k in dict) {
    if (f(k, dict)) {
      num++;
    }
  }
  return num;
};
var numKeys = function (dict) {
  return numKeysWhere(dict, function() {return true;});
};
/**
 * Returns nextKey or null if there is no next key after this one.  Returns
 * the first key if in the dictionary if `key` provided was null.  Undefined
 * behavior if the key was not null but not in the dict.
 */
var nextKeyOrNull = function (key, dict) {
  var seen = key === null;
  for (var k in dict) {
    if (seen) {
      return k;
    } else if (k === key) {
      seen = true;
    }
  }
  return null;
};
/**
 * Returns previousKey or null if there is no previous key after this one.
 * Returns the last key if in the dictionary if `key` provided was null.
 * Undefined behavior if the key was not null but not in the dict.
 */
var prevKeyOrNull = function (key, dict) {
  var prev = null;
  for (var k in dict) {
    if (k === key) {
      return prev;
    }
    prev = k;
  }
  return prev;
};

var keyIndexOrNegativeOne = function (key, dict) {
  var i = 0;
  for (var k in dict) {
    if (k === key) {
      return i;
    }
    i++;
  }
  return -1;
};

var keepOnlyKeys = function (dict, f) {
  var result = {};
  for (var pageKey in dict) {
    if (f(dict[pageKey], pageKey)) {
      result[pageKey] = dict[pageKey];
    }
  }
  return result;
};

/**
 * Inserts/moves a key/val after `afterKey`.
 * Errors if `afterKey` is not present.
 * Does nothing if `beforeKey` is the first key and `afterKey` is the last.
 *
 * The "currently viewed" page is the first in the list regardless of if it is
 * supplied to initial page config items.  Then explicitly specified pages
 * passed to initial config options tend to be the next in the key order.
 * Then later discovered pages (via `nextPage` are added to the end of the
 * dictionary).
 * We will try to build off of the "first" key assuming that's the most
 * important one to have first. So we pin the first key in place and try to
 * build off of that if possible (in a circular manner if necessary).
 */
var ensureKeyValOrderCircular = function (dict, preKey, postKey) {
  if(!(postKey in dict) || !(preKey in dict)) {
    throw new Error(
      'Key ' +
      postKey +
      ' and ' +
      preKey +
      ' are not both in pages. This is a problem with Bookmark implementation.'
    );
  }
  var result = {};
  var first = null;
  var last = null;
  for (var k in dict) {
    if(first === null) {
      first = k;
    } else {
      last = k;
    }
  }
  if(first === postKey && last === preKey) {
    return dict;
  }
  var inserted = false;
  for (var k in dict) {
    if(k === postKey && postKey !== first) {
      result[preKey] = dict[preKey];
      result[postKey] = dict[postKey];
    } else if(k === preKey) {
      result[k] = dict[k];
      result[postKey] = dict[postKey];
    } else {
      result[k] = dict[k];
    }
  }
  return result;
};


var moveKeyToFront = function(dict, key) {
  var result = {};
  if(key in dict) {
    result[key] = dict[key];
  }
  for(var k in dict) {
    result[k] = dict[k];
  }
  return result;
};

var indexOfKey = function(dict, key) {
  var i = -1;
  for(var k in dict) {
    i++;
    if(k === key) {
      return i;
    }
  }
  return -1;
};

var resultsByPageKeyLen = function (resultsByPageKey) {
  var totalLen = 0;
  for (var pageKey in resultsByPageKey) {
    totalLen += resultsByPageKey[pageKey].length;
  }
  return totalLen;
};

/**
 * Extracts the ? query param string from a url. It will always be after the
 * hash tag.
 */
var splitHrefHashAndQueryString = function(s) {
  var querySearchLoc = href.indexOf("?");
  var queryParamString = null;
  if (querySearchLoc !== -1) {
    queryParamString = s.substr(querySearchLoc + 1);
    s = s.substr(0, querySearchLoc);
  }
  var hashSearchLoc = href.indexOf("#");
}

var areEqualPathArrs = function(a1, a2) {
  if(a1.length !== a2.length) {
    return false;
  }
  for(var i = 0; i < a1.length; i++) {
    if(a1[i] !== a2[i]) {
      return false;
    }
  }
  return true;
};


/**
 * 
 * Urls like blah.html#foo/bar#another-hash
 * Are interpreted as being another way to reference the page
 * foo/bar.html#another-hash (Currently everything relative from the
 * timeTemplate). This function analyzes any link that is not yet in the
 * standard form `siblingPage.html#hash?queryParams` and returns the abstract
 * data about that link (which sibling page it refers to, which hash/query
 * params etc) so that the abstract link information can be reasoned about
 * and/or transformed into a "single page bundle" form
 * rootPage.html#sibingPage#hash?queryParams if necessary.
 *
 * It also normalizes links that might not have been converted properly when
 * ported to `.html` files (from `.md` files).
 * You may have forgotten to change a link from `siblingDoc.md` to
 * `siblingDoc.html`. This function also fixes that.
 *
 * - relativeToPageUrl: Some hrefs will be totally expanded and in terms of the
 *   page that was *originally* rendered at the time the markup was generated
 *   (this is the Save As case in Chrome).  This function will make sure to
 *   normalize hrefs if they are in terms of the originally expanded href the
 *   page was rendered at when saved. Docs must all reside in the same
 *   directory, and only docs (and docs assets) may reside in the same
 *   directory.
 *
 * Returns one of two types of links:
 * 
 * External: A link to an external page (not within the documentation).
 *
 *     {
 *       type: 'external',
 *       href: full href
 *     }
 *
 * Internal: A link to a page within the documentation.
 *
 *     {
 *       type: 'internal',
 *       asAnEmbeddedSubpageOfEntrypointPageKey: urlBasenameRootLowerCase,
 *       pageKey: urlBasenameRootLowerCase,
 *       pageExtension: hrefExtension,
 *       hashContents: hash.substr(1),
 *       queryParams: queryParams,
 *     }
 *
 * For local URLs, will expect hashes to appear *before* the query params
 * (which is not standard but looks better for this use case).
 * 
 * Normalizes links across the various doc workflows:
 *
 * - When using Chrome "Save As": Links to internal doc pages will become
 *   hardcoded to the absolute file path on disk, *including* links to hashes
 *   within *the same page*!
 *   - #foo becomes file://Path/To/yourPage.html#foo
 *   - ./siblingPage.html becomes file://Path/To/siblingPage.html
 *
 * These urls are expanded into the "written" attribute itself, not even after
 * accessing the fully resolved href.
 *
 * When running in pre-rendered, and or compressed mode, *not* from "Save As",
 * you will still have an originallyRenderedAtUrl, but the hrefAsWritten will
 * not be expanded out to it.
 *
 * If there is an `originallyRenderedAtUrl` and we see a url that has the same
 * dir as the `originallyRenderedAtUrl` then it's a Chrome "Save As" link local
 * to the docs.
 * If there is an `originallyRenderedAtUrl` and we see a url that does *not*
 * have the same dir as `originallyRenderedAtUrl`, but has the same dir as
 * `currentPageUrl`, it's a link local to the docs (but not Chrome Save As).
 * 
 */
var getLink = function (originallyRenderedPageKey, originallyRenderedAtUrl, currentPageUrl, fullyResolvedLinkHref) {

  var currentPageOrigin = currentPageUrl.origin;
  var currentPagePathArr = currentPageUrl.pathname.split('/');
  var currentPageDirPathArr = currentPagePathArr.slice(0, currentPagePathArr.length - 1);

  var fullyResolvedLinkUrl = new URL(fullyResolvedLinkHref);
  var fullyResolvedLinkOrigin = fullyResolvedLinkUrl.origin;
  var fullyResolvedLinkPathArr = fullyResolvedLinkUrl.pathname.split('/');
  var fullyResolvedLinkDirPathArr = fullyResolvedLinkPathArr.slice(0, fullyResolvedLinkPathArr.length - 1);

  var currentPageHasSameOrigin = currentPageOrigin === fullyResolvedLinkOrigin;
  var currentPageHasSameDir = areEqualPathArrs(currentPageDirPathArr, fullyResolvedLinkDirPathArr);
  var isLocalLink = false;
  if(currentPageHasSameOrigin && currentPageHasSameDir) {
    isLocalLink = true;
  } else if(originallyRenderedAtUrl){
    var originallyRenderedAtOrigin = originallyRenderedAtUrl.origin;
    var originallyRenderedAtPathArr = originallyRenderedAtUrl.pathname.split('/');
    var originallyRenderedAtDirPathArr = originallyRenderedAtPathArr.slice(0, originallyRenderedAtPathArr.length - 1);
    
    var originallyRenderedAtHasSameOrigin = originallyRenderedAtOrigin === fullyResolvedLinkOrigin;
    var originallyRenderedAtHasSameDir = areEqualPathArrs(originallyRenderedAtDirPathArr, fullyResolvedLinkDirPathArr);
    if(originallyRenderedAtHasSameOrigin && originallyRenderedAtHasSameDir) {
      isLocalLink = true;
    }
  }
  if(!isLocalLink) {
    return {
      type: 'external',
      href: fullyResolvedLinkHref
    };
  }
  var hashAndQueryString = fullyResolvedLinkUrl.hash;  // Includes hash sign
  var hashStr =
    hashAndQueryString === '' || hashAndQueryString[0] !== '#' ? '' :
    hashAndQueryString.indexOf("?") !== -1 ? hashAndQueryString.substr(1, hashAndQueryString.indexOf("?") - 1) :
    hashAndQueryString.substr(1);
  var queryStr =
    hashAndQueryString.indexOf("?") == -1 ? '' :
    hashAndQueryString.substr(hashAndQueryString.indexOf("?") + 1);
  var queryParams = null;
  if (queryStr !== '') {
    var queryParams = {};
    var params = queryStr.split("&");
    for (var i = 0; i < params.length; i++) {
      var param = params[i].split("=");
      queryParams[decodeURIComponent(param[0])] = decodeURIComponent(param[1] || "");
    }
  }

  var asEmbeddedSubpageOf;
  if (!!originallyRenderedPageKey) {
    asEmbeddedSubpageOf = originallyRenderedPageKey;
  } else {
    var hrefBasename = urlBasename(fullyResolvedLinkHref);
    var hrefBasenameExtensionIndex = hrefBasename.lastIndexOf('.');
    var hrefExtension = hrefBasenameExtensionIndex !== -1 ? 
      hrefBasename.substr(hrefBasenameExtensionIndex + 1) :
      null;
    var hrefExtensionlessBasename = hrefBasenameExtensionIndex !== -1 ? 
      hrefBasename.substr(0, hrefBasenameExtensionIndex) :
      hrefBasename;
    // This is just the file portion.
    var urlBasenameRootLowerCase = hrefExtensionlessBasename.toLowerCase();
    urlBasenameRootLowerCase = urlBasenameRootLowerCase.replace(".paradoc-rendered", "");
    urlBasenameRootLowerCase = urlBasenameRootLowerCase.replace(".paradoc-inlined", "");
    asEmbeddedSubpageOf = urlBasenameRootLowerCase;
  }

  // If there's no hash string or there is a hash string but it doesn't have
  // another hash inside of it (then it's not an embedded single doc page
  // link). It's either a link inside the current page (regular hash), or not
  // even a hash link at all.
  if (hashStr === '' || hashStr.indexOf("#") === -1) {
    return {
      type: 'internal',
      // TODO: This should be null in this case.
      asAnEmbeddedSubpageOfEntrypointPageKey: asEmbeddedSubpageOf,
      pageKey: asEmbeddedSubpageOf,
      pageExtension: hrefExtension,
      hashContents: hashStr,
      queryParams: queryParams,
    };
  } else {
    // It's an embedded hash link for single doc mode.
    var effectivePageKey =
      (hashStr.indexOf("#") === -1 ? hashStr : hashStr.substr(0, hashStr.indexOf("#")))
      .replace(".html", "")
      .replace(".htm", "")
      .toLowerCase();
    return {
      type: 'internal',
      asAnEmbeddedSubpageOfEntrypointPageKey: asEmbeddedSubpageOf,
      pageKey: effectivePageKey,
      pageExtension: hrefExtension,
      hashContents: hashStr.substr(hashStr.lastIndexOf("#") + 1),
      queryParams: queryParams,
    };
  }
};


var isNodeSearchHit = function (node) {
  return (
    node.tagName === "TR" ||
    node.tagName === "tr" ||
    node.tagName === "H0" ||
    node.tagName === "h0" ||
    node.tagName === "H1" ||
    node.tagName === "h1" ||
    node.tagName === "H2" ||
    node.tagName === "h2" ||
    node.tagName === "H3" ||
    node.tagName === "h3" ||
    node.tagName === "H4" ||
    node.tagName === "h4" ||
    node.tagName === "H5" ||
    node.tagName === "h5" ||
    node.tagName === "H6" ||
    node.tagName === "h6" ||
    node.tagName === "codetabbutton" ||
    node.tagName === "CODETABBUTTON" ||
    node.tagName === "P" ||
    node.tagName === "p" ||
    node.tagName === "LI" ||
    node.tagName === "li" ||
    node.tagName === "UL" ||
    node.tagName === "ul" ||
    node.tagName === "CODE" ||
    node.tagName === "code" ||
    node.tagName === "PRE" ||
    node.tagName === "pre" ||
    node.nodeType === Node.TEXT_NODE
  );
};

var SUPPORTS_SEARCH_TABBING = false;
// Number of headers in search results per page.
var NUM_HEADERS = 1;

/**
 * We can't have the ids of elements be the exact same as the hashes in the URL
 * because that will cause the browser to scroll. But we want to have full
 * control over scroll for things like better back button support and deep
 * linking / custom animation.
 * So the element to scroll to would have id="--bookmark-linkified--foo", but
 * the anchor links that jump to it would have href="#foo".
 *
 * This allows deep linking to page#section-header?text=this%20text Which will
 * animate a scroll to a specific text portion of that section with an
 * animation.  If we don't have full control over the animation, then our own
 * animation might fight the browser's.
 */
var BOOKMARK_LINK_ID_PREFIX = "--bookmark-linkified--";

/**
 * Prepends the linkified prefix.
 */

function pageifiedIdForHash(slug, pageKey) {
  return pageKey + "#" + slug;
}

function fullyQualifiedHeaderId(slug, pageKey) {
  return BOOKMARK_LINK_ID_PREFIX + pageifiedIdForHash(slug, pageKey);
}

/**
 * Strips the linkified prefix and page prefix.
 */
function hashForFullFullyQualifiedHeaderId(s) {
  var withoutLinkifiedPrefix =
    s.indexOf(BOOKMARK_LINK_ID_PREFIX) === 0 ? s.substring(BOOKMARK_LINK_ID_PREFIX.length) : s;
  var splitOnHash = withoutLinkifiedPrefix.split("#");
  if (splitOnHash.length > 1) {
    return splitOnHash[splitOnHash.length - 1];
  } else {
    return withoutLinkifiedPrefix;
  }
}

var queryContentsViaIframe = function (url, onDoneCell, onFailCell) {
  var timeout = window.setTimeout(function () {
    onFailCell.contents &&
      onFailCell.contents(
        "Timed out loading " +
          url +
          ". Maybe it doesn't exist? Alternatively, perhaps you were paused " +
          "in the debugger so it timed out?"
      );
  }, 900);
  var listenerID = window.addEventListener("message", function (e) {
    if (e.data.messageType === "docPageContent" && e.data.iframeName === url) {
      window.removeEventListener("message", listenerID);
      if (onDoneCell.contents) {
        window.clearTimeout(timeout);
        var start = Date.now();
        onDoneCell.contents(e.data.content);
        var end = Date.now();
        // console.log(end-start,'spent loading ' + url);
      }
    }
  });
  var iframe = document.createElement("iframe");
  iframe.name = url;
  // Themes may opt to handle offline/pre rendering, and this is convenient
  // to mark these iframes as not-essential once rendered so they may be
  // removed from the DOM after rendering, and won't take up space in the
  // bundle.
  // TODO: Consider this for merging many html pages into one book https://github.com/fidian/metalsmith-bookify-html
  iframe.className = "removeFromRenderedPage";
  iframe.src = url + "?bookmarkContentQuery=true";
  iframe.style = "display:none !important";
  iframe.type = "text/plain";
  iframe.onerror = function (e) {
    if (onFailCell.contents) {
      onFailCell.contents(e);
    }
  };
  // iframe.onload = function(e) {
  // };
  document.body.appendChild(iframe);
};

function scrollIntoViewAndHighlightNode(node) {
  var highlightNode = function (node) {
    $(".bookmark-in-doc-highlight").each(function () {
      var $el = $(this);
      $el.removeClass("bookmark-in-doc-highlight");
    });
    $(node).addClass("bookmark-in-doc-highlight");
  };
  if (!node) {
    return;
  }
  customScrollIntoView({
    smooth: true,
    container: "page",
    element: node,
    mode: "top",
    topMargin: headerHeight,
    bottomMargin: 0,
  });
  highlightNode(node);
}

function scrollIntoViewAndHighlightNodeById(id) {
  if (id != "") {
    var header = document.getElementById(id);
    scrollIntoViewAndHighlightNode(header);
  }
}

// https://stackoverflow.com/a/8342709
var customScrollIntoView = function (props) {
  var smooth = props.smooth || false;
  var container = props.container;
  var containerElement = props.container === "page" ? document.documentElement : props.container;
  var scrollerElement = props.container === "page" ? window : containerElement;
  var element = props.element;
  // closest-if-needed | top | bottom
  var mode = props.mode || "closest-if-needed";
  var topMargin = props.topMargin || 0;
  var bottomMargin = props.bottomMargin || 0;
  var containerRect = containerElement.getBoundingClientRect();
  var elementRect = element.getBoundingClientRect();
  var containerOffset = $(containerElement).offset();
  var elementOffset = $(element).offset();
  // TODO: For "whole document" scrolling,
  // use Math.max(window.pageYOffset, document.documentElement.scrollTop, document.body.scrollTop)
  // When loading the page from entrypoint mode, the document.documentElement scrollTop is zero!!
  // But not when loading form an index.dev.html. Something about the way loading from entrypoint
  // rewrites the entire document with document.write screws up the scroll measurement.
  if (mode !== "top" && mode !== "closest-if-needed" && mode !== "bottom") {
    console.error("Invalid mode to scrollIntoView", mode);
  }
  var containerScrollTop =
    container === "page"
      ? Math.max(window.pageYOffset, document.documentElement.scrollTop, document.body.scrollTop)
      : containerElement.scrollTop;
  var elementOffsetInContainer =
    elementOffset.top -
    containerOffset.top +
    // Relative to the document element does not need to account for document scrollTop
    (container === "page" ? 0 : containerScrollTop);
  if (
    mode === "bottom" ||
    (mode === "closest-if-needed" &&
      elementOffsetInContainer + elementRect.height >
        containerScrollTop + containerRect.height - bottomMargin)
  ) {
    var newTop =
      elementOffsetInContainer - containerRect.height + elementRect.height + bottomMargin;
    scrollerElement.scrollTo({ left: 0, top: newTop, behavior: smooth ? "smooth" : "auto" });
  } else if (
    mode === "top" ||
    (mode === "closest-if-needed" && elementOffsetInContainer < containerScrollTop)
  ) {
    var newTop = elementOffsetInContainer - topMargin;
    scrollerElement.scrollTo({ left: 0, top: newTop, behavior: smooth ? "smooth" : "auto" });
  }
};

var defaultSidenavifyConfig = {
  h1: true,
  h2: true,
  h3: true,
  h4: false,
  h5: false,
  h6: false,
};

var defaultSlugContributions = {
  h1: true,
  h2: true,
  h3: true,
  h4: true,
  h5: true,
  h6: true,
};

// Thank you David Walsh:
// https://davidwalsh.name/query-string-javascript
function queryParam(name) {
  var res = new RegExp(
    "[\\?&]" + name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]") + "=([^&#]*)"
  ).exec(location.search);
  return res === null ? "" : decodeURIComponent(res[1].replace(/\+/g, " "));
}

function parseYamlHeader(markdown, locationPathname) {
  markdown = markdown.trim();
  var yamlBoundaries = allMatchingIndicesWillMutateYourRegex(/\-\-\-\n/g, markdown);
  if (yamlBoundaries.length > 1 && yamlBoundaries[0].atIndex === 0) {
    var firstBoundary = yamlBoundaries[0];
    var secondBoundary = yamlBoundaries[1];
    var yamlContent = markdown.substring(firstBoundary.atIndex + firstBoundary.matchingString.length, secondBoundary.atIndex - 1);
    var lines = yamlContent.split("\n");
    var props = {};
    for (var i = 0; i < lines.length; i++) {
      if(lines[i].trim() === '') {
        continue;
      }
      var colonIndex = lines[i].indexOf(":");
      if (colonIndex === -1) {
        return { markdown: markdown, headerProps: {} };
      } else {
        var field = lines[i].substr(0, colonIndex);
        // Todo: escape strings
        var content = lines[i].substr(colonIndex + 1).trim();
        if (content[0] === '"' && content[content.length - 1] === '"') {
          var strContent = content.substr(1, content.length - 2);
          content = content.replace(new RegExp('\\\\"', "g"), '"');
        }
        props[field] = content;
      }
    }
    if (!props.id) {
      var filename = locationPathname.substring(locationPathname.lastIndexOf("/") + 1);
      props.id =
        filename.indexOf(".") !== -1
          ? filename.substring(0, filename.lastIndexOf("."))
          : filename;
    }
    return {
      markdown: markdown.substr(secondBoundary.atIndex + secondBoundary.matchingString.length),
      headerProps: props
    };
  } else {
    return { markdown: markdown, headerProps: {} };
  }
}

/**
 * Regexes are stateful in JS. Named appropriately.
 */
function allMatchingIndicesWillMutateYourRegex(regex, haystack) {
  var match;
  var matches = [];
  while (match = regex.exec(haystack)) {
    matches.push({matchingString: match[0], atIndex: match.index});
  }
  return matches;
};

/**
 * Strips out a special case of markdown "comments" which is supported in all
 * markdown parsers, will not be rendered in Github previews, but can be used
 * to convey yaml header information.
 *
 * Include this in your doc to have Bookmark interpret the yaml headers without
 * it appearing in the Github preview. This allows using one source of truth
 * markdown file for Github READMEs as well as using to generate your site
 * (when you don't want metadata showing up in your Github previews).
 *
 *     [//]: # (---)
 *     [//]: # (something: hey)
 *     [//]: # (title: me)
 *     [//]: # (description: "Hi there here is an escaped quote \" inside of quotes")
 *     [//]: # (---)
 */
function normalizeYamlMarkdownComments(markdown) {
  markdown = markdown.trim();
  var silentYamlBoundaries = allMatchingIndicesWillMutateYourRegex(
    new RegExp(escapeRegExpSearchString("[//]: # (") + "---" + escapeRegExpSearchString(")\n"), "g"),
    markdown
  );
  // Since white space trimmed, should be at index zero if first thing after script include
  if (silentYamlBoundaries.length > 1 && silentYamlBoundaries[0].atIndex === 0) {
    var firstBoundary = silentYamlBoundaries[0];
    var secondBoundary = silentYamlBoundaries[1];
    var yamlContent = markdown.substring(firstBoundary.atIndex + firstBoundary.matchingString.length, secondBoundary.atIndex - 1);
    var yamlContentWithoutComment =
      yamlContent.replaceAll(
        new RegExp(escapeRegExpSearchString("[//]: # (") + "(.*)" + escapeRegExpSearchString(")"), "g"),
        function(_s, content) { return content }
      );
    return "---\n" + yamlContentWithoutComment + "\n---\n" + markdown.substr(secondBoundary.atIndex + secondBoundary.matchingString.length);
  } else {
    return markdown;
  }
}

/**
 * The user can put this in their html file to:
 * 1. Get vim syntax highlighting to work.
 * 2. Get github to treat their html/htm file as a markdown file for rendering.
 * 3. Load the script tag only when rendered with ReFresh.
 *
 * [ vim:syntax=Markdown ]: # (<script src="flatdoc.js"></script>)
 *
 * Only downside is that it leaves a dangling ) in the text returned to
 * us which we can easily normalize.
 */
function normalizeMarkdownResponse(markdown) {
  if (markdown[0] === ")" && markdown[1] === "\n") {
    markdown = markdown.substring(2);
  }
  return markdown;
}

/**
 * [^] means don't match "no" characters - which is all characters including
 * newlines. The ? makes it not greddy.
 */
var docusaurusTabsRegionRegex = new RegExp(
  "^" +
    escapeRegExpSearchString("<!--DOCUSAURUS_CODE_TABS-->") +
    "$([^]*?)" +
    escapeRegExpSearchString("<!--END_DOCUSAURUS_CODE_TABS-->"),
  "gm"
);
var nonDocusaurusTabsRegionRegex = new RegExp(
  "^" +
    escapeRegExpSearchString("<!--CODE_TABS-->") +
    "$([^]*?)" +
    escapeRegExpSearchString("<!--END_CODE_TABS-->"),
  "gm"
);
var anyHtmlCommentRegex = new RegExp(
  "(^(" +
    escapeRegExpSearchString("<!--") +
    "([^]*?)" +
    escapeRegExpSearchString("-->") +
    ")[\n\r])?^```(.+)[\n\r]([^]*?)[\n\r]```",
  "gm"
);
function normalizeDocusaurusCodeTabs(markdown) {
  // Used to look it up later in the DOM and move things around to a more
  // convenient structure targetable by css.
  var onReplace = function (matchedStr, matchedCommentContents) {
    var tabs = [];
    var maxLengthOfCode = 0;
    var getMaxLengthOfCode = function (matchedStr, _, _, commentContent, syntax, codeContents) {
      var split = codeContents.split("\n");
      maxLengthOfCode =
        codeContents && split.length > maxLengthOfCode ? split.length : maxLengthOfCode;
      return matchedStr;
    };
    var onIndividualReplace = function (_, _, _, commentContent, syntax, codeContents) {
      var className = tabs.length === 0 ? "active" : "";
      var split = codeContents.split("\n");
      var splitLen = split.length;
      // For some reason - 1 is needed when adding empty strings, instead of
      // non-empty spacers.
      while (splitLen - 1 < maxLengthOfCode) {
        split.push(" ");
        splitLen++;
      }
      tabs.push({
        syntax: syntax,
        codeContents: split.join("\n"),
        tabMarkup:
          "<codetabbutton class='" +
          className +
          "'" +
          " data-index=" +
          (tabs.length + 1) +
          ">" +
          escapeHtml(commentContent || syntax) +
          "</codetabbutton>",
      });
      return "\n```" + syntax + "\n" + split.join("\n") + "\n```";
    };
    tabs = [];
    maxLengthOfCode = 0;
    matchedCommentContents.replace(anyHtmlCommentRegex, getMaxLengthOfCode);
    var ret = matchedCommentContents.replace(anyHtmlCommentRegex, onIndividualReplace);
    return (
      "<codetabscontainer data-num-codes=" +
      tabs.length +
      " class='bookmark-codetabs-active1 bookmark-codetabs-length" +
      tabs.length +
      "'>" +
      tabs
        .map(function (t) {
          return t.tabMarkup;
        })
        .join("") +
      "</codetabscontainer>" +
      ret
    );
  };
  return markdown.replace(docusaurusTabsRegionRegex, onReplace)
        .replace(nonDocusaurusTabsRegionRegex, onReplace);
  return ret;
}

var emptyHTML = "";

/**
 * Scrolling into view:
 * https://www.bram.us/2020/03/01/prevent-content-from-being-hidden-underneath-a-fixed-header-by-using-scroll-margin-top/
 */

function escapePlatformStringLoop(html, lastIndex, index, s, len) {
  var html__0 = html;
  var lastIndex__0 = lastIndex;
  var index__0 = index;
  for (;;) {
    if (index__0 === len) {
      var match = 0 === lastIndex__0 ? 1 : 0;
      if (0 === match) {
        var match__0 = lastIndex__0 !== index__0 ? 1 : 0;
        return 0 === match__0 ? html__0 : html__0 + s.substring(lastIndex__0, len);
      }
      return s;
    }
    var code = s.charCodeAt(index__0);
    if (40 <= code) {
      var switcher = (code + -60) | 0;
      if (!(2 < switcher >>> 0)) {
        switch (switcher) {
          case 0:
            var html__1 = html__0 + s.substring(lastIndex__0, index__0);
            var lastIndex__1 = (index__0 + 1) | 0;
            var html__2 = html__1 + "&lt;";
            var index__2 = (index__0 + 1) | 0;
            var html__0 = html__2;
            var lastIndex__0 = lastIndex__1;
            var index__0 = index__2;
            continue;
          case 1:
            break;
          default:
            var html__3 = html__0 + s.substring(lastIndex__0, index__0);
            var lastIndex__2 = (index__0 + 1) | 0;
            var html__4 = html__3 + "&gt;";
            var index__3 = (index__0 + 1) | 0;
            var html__0 = html__4;
            var lastIndex__0 = lastIndex__2;
            var index__0 = index__3;
            continue;
        }
      }
    } else if (34 <= code) {
      var switcher__0 = (code + -34) | 0;
      switch (switcher__0) {
        case 0:
          var su = s.substring(lastIndex__0, index__0);
          var html__5 = html__0 + su;
          var lastIndex__3 = (index__0 + 1) | 0;
          var html__6 = html__5 + "&quot;";
          var index__4 = (index__0 + 1) | 0;
          var html__0 = html__6;
          var lastIndex__0 = lastIndex__3;
          var index__0 = index__4;
          continue;
        case 4:
          var su__0 = s.substring(lastIndex__0, index__0);
          var html__7 = html__0 + su__0;
          var lastIndex__4 = (index__0 + 1) | 0;
          var html__8 = html__7 + "&amp;";
          var index__5 = (index__0 + 1) | 0;
          var html__0 = html__8;
          var lastIndex__0 = lastIndex__4;
          var index__0 = index__5;
          continue;
        case 5:
          var su__1 = s.substring(lastIndex__0, index__0);
          var html__9 = html__0 + su__1;
          var lastIndex__5 = (index__0 + 1) | 0;
          var html__10 = html__9 + "&#x27;";
          var index__6 = (index__0 + 1) | 0;
          var html__0 = html__10;
          var lastIndex__0 = lastIndex__5;
          var index__0 = index__6;
          continue;
      }
    }
    var index__1 = (index__0 + 1) | 0;
    var index__0 = index__1;
    continue;
  }
}

function escapeHtml(s) {
  return escapePlatformStringLoop(emptyHTML, 0, 0, s, s.length);
}

var updateContextFromTreeNode = function (context, treeNode) {
  if (treeNode.level === 0) {
    return { ...context, h0: treeNode, h1: null, h2: null, h3: null, h4: null, h5: null, h6: null };
  }
  if (treeNode.level === 1) {
    return { ...context, h1: treeNode, h2: null, h3: null, h4: null, h5: null, h6: null };
  }
  if (treeNode.level === 2) {
    return { ...context, h2: treeNode, h3: null, h4: null, h5: null, h6: null };
  }
  if (treeNode.level === 3) {
    return { ...context, h3: treeNode, h4: null, h5: null, h6: null };
  }
  if (treeNode.level === 4) {
    return { ...context, h4: treeNode, h5: null, h6: null };
  }
  if (treeNode.level === 5) {
    return { ...context, h5: treeNode, h6: null };
  }
  if (treeNode.level === 6) {
    return { ...context, h6: treeNode };
  }
  // LEAF_LEVEL
  return context;
};

/**
 * Turn a search string into a regex portion.
 * https://stackoverflow.com/a/1144788
 */
function escapeRegExpSearchString(string) {
  return string.replace(/[.*+\-?^${}()|[\]\\]/g, "\\$&");
}

function replaceAllStringsCaseInsensitive(str, find, replace) {
  return str.replace(new RegExp(escapeRegExp(find), "gi"), replace);
}

function escapeRegExpSplitString(string) {
  return string.replace(/[.*+\-?^${}()|[\]\\]/g, "\\$&");
}

function splitStringCaseInsensitiveImpl(regexes, str, find) {
  return str.split(regexes.caseInsensitive.anywhere);
}
function splitStringCaseInsensitive(str, find) {
  return str.split(new RegExp("(" + escapeRegExpSplitString(find) + ")", "gi"));
}

/**
 * Only trust for markdown that came from trusted source (your own page).
 * I do not know exactly what portions are unsafe - perhaps none.
 */
var trustedTraverseAndHighlightImpl = function traverseAndHighlightImpl(regex, text, node) {
  var tagName = node.nodeType === Node.TEXT_NODE ? "p" : node.tagName.toLowerCase();
  var className = node.nodeType === Node.TEXT_NODE ? "" : node.getAttributeNode("class");
  var childNodes = node.nodeType === Node.TEXT_NODE ? [node] : node.childNodes;
  var childNode = childNodes.length > 0 ? childNodes[0] : null;
  var i = 0;
  var newInnerHtml = "";
  while (childNode && i < 2000) {
    if (childNode.nodeType === Node.TEXT_NODE) {
      if (regex) {
        var splitOnMatch = splitStringCaseInsensitiveImpl(regex, childNode.textContent, text);
        splitOnMatch.forEach(function (seg) {
          if (seg !== "") {
            if (seg.toLowerCase() === text.toLowerCase()) {
              newInnerHtml += "<search-highlight>" + escapeHtml(seg) + "</search-highlight>";
            } else {
              newInnerHtml += escapeHtml(seg);
            }
          }
        });
      } else {
        newInnerHtml += escapeHtml(childNode.textContent);
      }
    } else {
      newInnerHtml += trustedTraverseAndHighlightImpl(regex, text, childNode);
    }
    i++;
    childNode = childNodes[i];
  }
  var openTag = "";
  var closeTag = "";
  classAttr = className
    ? ' class="' + escapeHtml(className.value.replace("bookmark-in-doc-highlight", "")) + '"'
    : "";
  switch (tagName) {
    case "a":
      var href = node.getAttributeNode("href");
      openTag = href ? '<a onclick="false" tabindex=-1 ' + classAttr + ">" : "<a>";
      closeTag = "</a>";
      break;
    case "code":
      var className = node.getAttributeNode("class");
      openTag = className
        ? '<code class="' + escapeHtml(className.value) + '"' + classAttr + ">"
        : "<code>";
      closeTag = "</code>";
      break;
    default:
      openTag = "<" + tagName + classAttr + ">";
      closeTag = "</" + tagName + ">";
  }
  return openTag + newInnerHtml + closeTag;
};

var trustedTraverseAndHighlight = function (searchRegex, text, node) {
  return trustedTraverseAndHighlightImpl(searchRegex, text, node);
};

/**
 * Leaf nodes will be considered level 999 (something absurdly high).
 */
var LEAF_LEVEL = 999;
var PAGE_LEVEL = -1;
var getDomNodeStructureLevel = function getStructureLevel(node) {
  if (node.tagName === "h0" || node.tagName === "H0") {
    return 0;
  }
  if (node.tagName === "h1" || node.tagName === "H1") {
    return 1;
  }
  if (node.tagName === "h2" || node.tagName === "H2") {
    return 2;
  }
  if (node.tagName === "h3" || node.tagName === "H3") {
    return 3;
  }
  if (node.tagName === "h4" || node.tagName === "H4") {
    return 4;
  }
  if (node.tagName === "h5" || node.tagName === "H5") {
    return 5;
  }
  if (node.tagName === "h6" || node.tagName === "H6") {
    return 6;
  }
  return LEAF_LEVEL;
};
var deepensContext = function (treeNode) {
  return treeNode.level >= 0 && treeNode.level < 7;
};

/**
 * Searches up in the context for the correct place for this level to be
 * inserted.
 */
function recontext(context, nextTreeNode) {
  // Root document level is level zero.
  while (context.length > 1 && context[context.length - 1].level >= nextTreeNode.level) {
    context.pop();
  }
}

function lazyHierarchicalIndexForSearch(pageState) {
  for (var pageKey in pageState) {
    if (!pageState[pageKey].hierarchicalIndex) {
      var containerNode = pageState[pageKey].contentContainerNode;
      pageState[pageKey].hierarchicalIndex = hierarchicalIndexFromHierarchicalDoc(
        pageState[pageKey].hierarchicalDoc
      );
    }
  }
}

function forEachHierarchyOne(f, context, treeNode) {
  var newContext = updateContextFromTreeNode(context, treeNode);
  f(treeNode, newContext);
  forEachHierarchyImpl(f, newContext, treeNode.subtreeNodes);
}
function forEachHierarchyImpl(f, context, treeNodes) {
  return treeNodes.forEach(forEachHierarchyOne.bind(null, f, context));
}
function forEachHierarchy(f, treeNodes) {
  var context = startContext;
  return treeNodes.forEach(forEachHierarchyOne.bind(null, f, context));
}

function mapHierarchyOne(f, context, treeNode) {
  var newContext = updateContextFromTreeNode(context, treeNode);
  return f(
    {
      levelContent: treeNode.levelContent,
      level: treeNode.level,
      slug: treeNode.slug,
      subtreeNodes: mapHierarchyImpl(f, newContext, treeNode.subtreeNodes),
    },
    newContext
  );
}
function mapHierarchyImpl(f, context, treeNodes) {
  return treeNodes.map(mapHierarchyOne.bind(null, f, context));
}
function mapHierarchy(f, treeNodes) {
  var context = startContext;
  return treeNodes.map(mapHierarchyOne.bind(null, f, context));
}

/**
 * Returns a hierarchy tree where level contents are the individual items that
 * may be searchable. The original structured hierarchy tree has the
 * levelContent of each subtreeNode being the root node of every element that
 * appears directly under that heading. The hierarchicalIndex expands a single
 * tree node (such as one for a ul element) into several tree nodes (one for
 * each li in the ul for example). So it's a pretty simple mapping of the tree,
 * where each levelContent is expanded out into an array of content.  Retains
 * the original context because when filtering the index at a later point, the
 * context would be in terms of filtered nodes, when you often also want the
 * original context as well.
 */
function hierarchicalIndexFromHierarchicalDoc(treeNodes) {
  function expandTreeNodeContentToSearchables(domNode, inclusiveContext) {
    if (isNodeSearchHit(domNode)) {
      // Filter out empty searchables.
      if (domNode.textContent.trim() !== "") {
        return [
          {
            indexable: domNode,
            lazyCharacterCounts: null,
            originalInclusiveContext: inclusiveContext,
          },
        ];
      } else {
        return [];
      }
    } else {
      var more = [];
      var childDomNode = domNode.firstChild;
      while (childDomNode) {
        more = more.concat(expandTreeNodeContentToSearchables(childDomNode, inclusiveContext));
        childDomNode = childDomNode.nextSibling;
      }
      return more;
    }
  }
  function mapper(treeNode, inclusiveContext) {
    if (treeNode.level !== LEAF_LEVEL) {
      return {
        ...treeNode,
        levelContent: [
          {
            indexable: treeNode.levelContent,
            lazyCharacterCounts: null,
            originalInclusiveContext: inclusiveContext,
          },
        ],
      };
    } else {
      var domNode = treeNode.levelContent;
      return {
        ...treeNode,
        levelContent: expandTreeNodeContentToSearchables(domNode, inclusiveContext),
      };
    }
  }
  return mapHierarchy(mapper, treeNodes);
}

/**
 * Forms a hierarchy of content from structure forming nodes (such as headers)
 * from what would otherwise be a flat document.
 * The subtreeNodes are not dom Subtree nodes but the hierarchy subtree (level
 * heading content etc).
 *
 * The subtreeNodes are either the list of Dom nodes immediately under that
 * level, else another "tree" node. (Type check it at runtime by looking for
 * .tagName property).
 *
 *  page:
 *
 *  H1Text
 *  text
 *  H2Text
 *  textB
 *  textC
 *
 *  Would be of the shape:
 *  {
 *    level: 0,                                                                // page
 *    levelContent: null,
 *    subtreeNodes: [
 *      {
 *        level: 1,
 *        levelContent: <h1>H1Text</h1>,                                       // h1 dom node
 *        subtreeNodes: [
 *          {level: LEAF_LEVEL, levelContent: <p>text</p>},                    // p DOM node
 *          {
 *            level: 2,
 *            levelContent: <h2>H2Text</h2>,
 *            subtreeNodes: [
 *              {level: LEAF_LEVEL, levelContent: <p>textB</p>},
 *              {level: LEAF_LEVEL, levelContent: <p>textC</p>}
 *            ]
 *          }
 *        ]
 *
 *      }
 *
 *    ]
 *  }
 */
function hierarchize(containerNode) {
  // Mutable reference.
  var dummyNode = {
    // Such as the h2 node that forms the new level etc.
    levelContent: null,
    level: PAGE_LEVEL,
    subtreeNodes: [],
    // Lazily or deferred
    slug: null,
  };
  var context = [dummyNode];
  function hierarchicalIndexChildrenImpl(domNode) {
    var childDomNode = domNode.firstChild;
    while (childDomNode) {
      hierarchicalIndexImpl(childDomNode);
      childDomNode = childDomNode.nextSibling;
    }
  }
  function hierarchicalIndexImpl(domNode) {
    var domNodeLevel = getDomNodeStructureLevel(domNode);
    var treeNode = {
      levelContent: domNode,
      level: domNodeLevel,
      subtreeNodes: [],
      // Lazily or deferred
      slug: null,
    };
    recontext(context, treeNode);
    context[context.length - 1].subtreeNodes.push(treeNode);
    if (deepensContext(treeNode)) {
      context.push(treeNode);
    }
  }
  hierarchicalIndexChildrenImpl(containerNode);
  return dummyNode.subtreeNodes;
}

/**
 * Renders text filtered hierarchical index. The caps on rendered list size
 * happens at the renddering stage so that you can refer to "the n'th item" in
 * a permalink even if you change the configuration for capping the rendered
 * list size (for perf).
 */
var hierarchicalRenderFilteredSearchables = function (
  query,
  filteredHierarchicalIndexByPage,
  renderTopRow
) {
  var txt = query.trim();
  var searchRegex = regexesFor(query);
  new RegExp("(" + escapeRegExpSplitString(txt) + ")", "gi");
  // On the first keystroke, it will return far too many results, almost all of
  // them useless since it matches anything with that character. In that case, limit to
  // 20 results. Then on the next keystroke allow more.
  var maxResultsLen = txt.length < 3 ? 15 :
    txt.length === 3 ? 20 : 999;
  return mapKeys(filteredHierarchicalIndexByPage, (filteredHierarchicalIndex, pageKey) => {
    var results = [];
    forEachHierarchy(function (treeNode, inclusiveContext) {
      var filteredSearchables = treeNode.levelContent;
      for (var i = 0; filteredSearchables !== null && i < filteredSearchables.length; i++) {
        if (results.length < maxResultsLen) {
          var searchable = filteredSearchables[i];
          results.push({
            searchable: searchable,
            highlightedInnerText: trustedTraverseAndHighlight(
              searchRegex,
              txt,
              searchable.indexable
            ),
            topRowMarkup: renderTopRow(
              treeNode.level,
              searchable.originalInclusiveContext,
              searchable.indexable
            ),
          });
        }
      }
    }, filteredHierarchicalIndex);
    return results;
  });
};

/**
 * We need to use textContent to return the content of nodes that are not
 * visible/hidden (also avoiding reflows)
 * From Mozilla docs:
 * https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent#differences_from_innertext
 * Don't get confused by the differences between Node.textContent and
 * HTMLElement.innerText. Although the names seem similar, there are important
 * differences:
 *  - textContent gets the content of all elements, including <script> and
 *  <style> elements. In contrast, innerText only shows “human-readable”
 *  elements.
 *  - textContent returns every element in the node. In contrast, innerText is
 *  aware of styling and won’t return the text of “hidden” elements.
 *  - Moreover, since innerText takes CSS styles into account, reading the
 *  value of innerText triggers a reflow to ensure up-to-date computed styles.
 *  (Reflows can be computationally expensive, and thus should be avoided when
 *  possible.)
 *  - Unlike textContent, altering innerText in Internet Explorer (version 11
 *  and below) removes child nodes from the element and permanently destroys
 *  all descendant text nodes. It is impossible to insert the nodes again into
 *  any other element or into the same element after doing so.
 *  https://stackoverflow.com/a/35213639
 */
var getDomThingInnerText = function (domThing) {
  return domThing.nodeType === Node.TEXT_NODE ? domThing.textContent : domThing.textContent;
};

var filterHierarchicalSearchables = function (query, pageState) {
  var txt = query.trim();
  var searchRegex = regexesFor(txt);
  new RegExp("(" + escapeRegExpSplitString(txt) + ")", "gi");
  // On the first keystroke, it will return far too many results, almost all of
  // them useless since it matches anything with that character. In that case, limit to
  // 20 results. Then on the next keystroke allow more.
  var maxResultsLen = txt.length === 1 ? 20 : 999;
  return mapKeys(pageState, (pageData, pageKey) => {
    return mapHierarchy(function (treeNode, inclusiveContext) {
      // TODO: this is unfortunate. We should be able to *also* filter the
      // header content, while preserving the original context so we can use
      // the original unfiltered context to render top row, but also determine
      // which headers themselves match the filtering so they can be rendered
      // as individual results themselves.
      // if(treeNode.level !== LEAF_LEVEL) {
      //   return treeNode;
      // }
      var levelContent = treeNode.levelContent;
      var searchables = levelContent;
      var smartCaseWordBoundaryResults = [];
      var smartCaseAnywhereNotWordBoundaryResults = [];
      var caseInsensitiveWordBoundaryResults = [];
      var caseInsensitiveAnywhereNotWordBoundaryResults = [];
      searchables.forEach(function (searchable) {
        var indexable = searchable.indexable;
        var nodeText = getDomThingInnerText(indexable);
        var test = findBestMatch(nodeText, searchRegex);
        var resultsToPush =
          test === -1
            ? null
            : test & (SMARTCASE | WORDBOUNDARY)
            ? smartCaseWordBoundaryResults
            : test & SMARTCASE
            ? smartCaseAnywhereNotWordBoundaryResults
            : test & WORDBOUNDARY
            ? caseInsensitiveAnywhereNotWordBoundaryResults
            : caseInsensitiveAnywhereNotWordBoundaryResults;
        if (resultsToPush !== null) {
          resultsToPush.push(searchable);
        }
      });

      var noResults =
        !smartCaseWordBoundaryResults.length &&
        !smartCaseAnywhereNotWordBoundaryResults.length &&
        !caseInsensitiveWordBoundaryResults.length &&
        !caseInsensitiveAnywhereNotWordBoundaryResults.length;

      return {
        ...treeNode,
        levelContent: noResults
          ? []
          : smartCaseWordBoundaryResults
              .concat(smartCaseAnywhereNotWordBoundaryResults)
              .concat(smartCaseAnywhereNotWordBoundaryResults)
              .concat(caseInsensitiveWordBoundaryResults)
              .concat(caseInsensitiveAnywhereNotWordBoundaryResults),
      };
    }, pageData.hierarchicalIndex);
  });
};

/**
 * For a context, finds the deepest header, and uses that slug if it exists.
 */
var bestSlugForContext = function (context) {
  if (context.h6 && context.h6.slug) {
    return context.h6.slug;
  } else if (context.h5 && context.h5.slug) {
    return context.h5.slug;
  } else if (context.h4 && context.h4.slug) {
    return context.h4.slug;
  } else if (context.h3 && context.h3.slug) {
    return context.h3.slug;
  } else if (context.h2 && context.h2.slug) {
    return context.h2.slug;
  } else if (context.h1 && context.h1.slug) {
    return context.h1.slug;
  } else {
    return null;
  }
};

var SMARTCASE = 0b10;
var WORDBOUNDARY = 0b01;

var regexesFor = function (str) {
  var hasUpper = str.toLowerCase() !== str;
  return {
    // TODO: Add checks that remove symbols like hyphen, dot, parens
    smartCase: {
      // Priority 1
      wordBoundary: !hasUpper
        ? null
        : new RegExp("\\b(" + escapeRegExpSplitString(str) + ")", "g" + (hasUpper ? "" : "i")),
      // Priority 2
      anywhere: !hasUpper
        ? null
        : new RegExp("(" + escapeRegExpSplitString(str) + ")", "g" + (hasUpper ? "" : "i")),
    },
    caseInsensitive: {
      // Priority 3
      wordBoundary: new RegExp("\\b(" + escapeRegExpSplitString(str) + ")", "gi"),
      // Priority 4
      anywhere: new RegExp("(" + escapeRegExpSplitString(str) + ")", "gi"),
    },
  };
};

var findBestMatch = function (stringToTest, regexes) {
  if (regexes.smartCase.wordBoundary && regexes.smartCase.wordBoundary.test(stringToTest)) {
    return SMARTCASE | WORDBOUNDARY;
  } else if (regexes.smartCase.anywhere && regexes.smartCase.anywhere.test(stringToTest)) {
    return SMARTCASE;
  } else if (regexes.caseInsensitive.wordBoundary.test(stringToTest)) {
    return WORDBOUNDARY;
  } else if (regexes.caseInsensitive.anywhere.test(stringToTest)) {
    return 0;
  } else {
    return -1;
  }
};

/* Matches found in the header itself will be considered in that context */
var startContext = {
  h0: null,
  h1: null,
  h2: null,
  h3: null,
  h4: null,
  h5: null,
  h6: null,
};

/**
 * If the encoding has an underscore anywhere it means the numbers were
 * doubled. If it has no underscore, the numbers might have been doubled - but
 * there might just not have been any odd number of character counts.
 */
var computeCharacterCounts = function (s) {
  var sNoWhite = s.replace(/\s/g, "");
  var baseRangeStart = "a".charCodeAt(0); // 97, a
  var baseRangeEnd = "z".charCodeAt(0); // 122, z
  // Squash all other characters into two slots.
  var baseRangeLowerThanStart = baseRangeEnd + 1;
  var baseRangeHigherThanEnd = baseRangeEnd + 2;
  var counts = [];
  for (var j = baseRangeStart; j <= baseRangeHigherThanEnd; j++) {
    counts[j - baseRangeStart] = 0;
  }
  var lower = sNoWhite.toLowerCase();
  for (var i = 0; i < lower.length; i++) {
    var charCode = lower.charCodeAt(i);
    var effectiveCharCode;
    if (charCode < baseRangeStart) {
      effectiveCharCode = baseRangeEnd + 1;
    } else if (charCode > baseRangeEnd) {
      effectiveCharCode = baseRangeEnd + 2;
    } else {
      effectiveCharCode = charCode;
    }
    counts[effectiveCharCode - baseRangeStart] = counts[effectiveCharCode - baseRangeStart] + 1;
  }
  return counts;
};

function computeCharacterCountDistance(a, b) {
  var dist = 0;
  for (var i = 0; i < a.length; i++) {
    dist += Math.abs(a[i] - b[i]);
  }
  return dist;
}

/**
 * Weighted character counts mapped to numeric representation in the range of
 * of a-ZA-Z0-9$_ (64 points).
 */
var ENCODED_HASH_BASE = 64;
var numberToEncodedLarge = function (n) {
  var remainder = n % ENCODED_HASH_BASE;
  var flooredDivision = Math.floor(n / ENCODED_HASH_BASE);
  return (
    (flooredDivision >= ENCODED_HASH_BASE
      ? numberToEncodedLarge(flooredDivision)
      : numberToEncodedImpl(flooredDivision)) + numberToEncodedImpl(remainder)
  );
};
var numberToEncodedImpl = function (n) {
  return n >= ENCODED_HASH_BASE
    ? numberToEncodedLarge(n)
    : n < 10
    ? String.fromCharCode(48 /*"0"*/ + n)
    : n < 36
    ? String.fromCharCode(97 /*a*/ + n - 10)
    : n < 62
    ? String.fromCharCode(65 /*A*/ + n - 36)
    : n === 62
    ? "$"
    : "_";
};
/**
 * Special encoding of a number in url friendly base64 where the numer of
 * leading dashes tell you how many following characters to interpret.
 * One leading dash means two, two leading dashes means three and so on.
 */
var numberToEncoded = function (n) {
  var encoded = numberToEncodedImpl(n);
  var len = encoded.length;
  var prefix = "";
  for (var i = 1; i < len; i++) {
    prefix = prefix + "-";
  }
  return prefix + encoded;
};

/**
 * We can change the hash encoding by changing the name of the query param from
 * txt= to something like s=
 */
/**
 * Encodes character counts into the range
 */
var characterCountsToEncoded = function (arr) {
  var str = "";
  return arr
    .map(function (itm) {
      return numberToEncoded(itm);
    })
    .join("");
};

var encodedCountToNumber = function (s) {
  var base = 1;
  var sum = 0;
  for (var i = s.length - 1; i >= 0; i--) {
    var digitCharCode = s[i].charCodeAt(0);
    var digitEquivalent =
      digitCharCode >= 48 && digitCharCode < 58
        ? digitCharCode - 48
        : digitCharCode >= 97 && digitCharCode < 97 + 26
        ? 10 + digitCharCode - 97
        : digitCharCode >= 65 && digitCharCode < 65 + 26
        ? 10 + 26 + digitCharCode - 65
        : s === "$"
        ? 62
        : 63;
    sum += digitEquivalent * base;
    base = base * ENCODED_HASH_BASE;
  }
  return sum;
};

var encodedToCharacterCountsImpl = function (s, numCharsToParse) {
  if (s.length === 0) {
    return [];
  } else if (s[0] === "-") {
    return encodedToCharacterCountsImpl(s.substr(1), numCharsToParse + 1);
  } else {
    return [encodedCountToNumber(s.substr(0, numCharsToParse))].concat(
      encodedToCharacterCountsImpl(s.substr(numCharsToParse), 1)
    );
  }
};
var encodedToCharacterCounts = function (s) {
  return encodedToCharacterCountsImpl(s, 1);
};
var encodedToNumbers = function (s) {
  var encoded = numberToEncoded(s);
};

var testEncodingOfString = function (s) {
  var characterCounts = computeCharacterCounts(s);
  var encodedString = characterCountsToEncoded(characterCounts);
  var reCharacterCounts = encodedToCharacterCounts(encodedString);

  if (JSON.stringify(reCharacterCounts) !== JSON.stringify(characterCounts)) {
    console.error(
      "Re Encoded not same as encoded \n" +
        JSON.stringify(reCharacterCounts) +
        " \n" +
        JSON.stringify(characterCounts)
    );
  } else {
    console.log(
      "Re Encoded " +
        encodedString +
        " IS same when reencoding \n" +
        JSON.stringify(reCharacterCounts)
    );
  }
};

// testEncodingOfString("testing testing another thing testing");
// testEncodingOfString("aaaaaaaaaaaaa aaaaaaaaaaaaaaaaaaaaaa aaaaaaaaaaaaaazzzzzzaaaaaaaaaaaaaaaatesting testing another thing testing");

/**
 * Problem:
 * You don't want 1.23 to become 123 because then 12.3 becomes 123 as well, and
 * therefore the slug will have a "deduping" 2 appended resulting in nonsense
 * version numbers in header text such as 1232.
 * This doesn't solve that but we can easily replace dots with spaces then
 * slugify. However, this will break github markdown slugs so the solution is
 * to support alternative slugs in links in the markdown
 * [here](./DOC.html#github-lame-slug?bookmark-better-slug=awesome-slug).
 */
var contextToSlug = function (context, slugContributions) {
  var slug = "";
  // h0 shouldn't contribute to the slug. The page URL (or embedded single page
  // #pageKey) accomplishes that.
  // if(context.h0 && slugContributions.h0) {
  //   slug +=  Flatdoc.slugify(context.h0.levelContent.textContent);
  // }
  if (context.h1 && slugContributions.h1) {
    slug += " " + Flatdoc.slugify(context.h1.levelContent.textContent);
  }
  if (context.h2 && slugContributions.h2) {
    slug += " " + Flatdoc.slugify(context.h2.levelContent.textContent);
  }
  if (context.h3 && slugContributions.h3) {
    slug += " " + Flatdoc.slugify(context.h3.levelContent.textContent);
  }
  if (context.h4 && slugContributions.h4) {
    slug += " " + Flatdoc.slugify(context.h4.levelContent.textContent);
  }
  if (context.h5 && slugContributions.h5) {
    slug += " " + Flatdoc.slugify(context.h5.levelContent.textContent);
  }
  if (context.h6 && slugContributions.h6) {
    slug += " " + Flatdoc.slugify(context.h6.levelContent.textContent);
  }
  return Flatdoc.slugify(slug.length > 0 ? slug.substring(1) : "");
};

/**
 * H0s never partake in slugs.
 */
function annotateSlugsOnTreeNodes(hierarchicalDoc, slugContributions) {
  var seenSlugs = {};
  // Requesting side-nav requires linkifying
  var headers = "h1 h2 h3 h4 h5 h6 H1 H2 H3 H4 H5 H6";
  var appendSlug = function (treeNode, inclusiveContext) {
    var levelContent = treeNode.levelContent;
    var level = treeNode.level;
    var subtreeNodes = treeNode.subtreeNodes;
    if (headers.indexOf(levelContent.tagName) !== -1) {
      var slugCandidate = contextToSlug(inclusiveContext, slugContributions);
      var slug = seenSlugs[slugCandidate]
        ? slugCandidate + "--" + (seenSlugs[slugCandidate] + 1)
        : slugCandidate;
      seenSlugs[slugCandidate] = seenSlugs[slugCandidate] ? seenSlugs[slugCandidate] + 1 : 1;
      treeNode.slug = slug;
    }
  };
  forEachHierarchy(appendSlug, hierarchicalDoc);
}

/**
 * 1. Fixes links that pointed to /page.md or /page to point to page.html when
 * not in single docs mode.  This makes it easier to port files over to
 * Bookmark by just renaming them to .html and adding the script header.
 * However, you should fix up these links too so that your markdown rendered
 * docs render correctly on github.
 * 2. Changes links from something/ to something.html.
 * TODO: Should probably not do any anchor link rewriting to links to
 * documents. (if you have an image.png anchor link and a page key named
 * image).
 *
 * When rendering in development mode, we need to turn links like:
 * foo.html into ./foo.html
 */
function fixAllAnchorLinksUnderRoot(runner, rootNode) {
  $(rootNode).find('a').each(function() {
    var node = this;
    fixupHrefOnAnchor(runner, node);
  });
}

var fixupHrefOnAnchor = function(runner, node) {
  var hrefAsWritten = node.getAttribute('href');
  var fullHref = node.href;
  var linkInfo = getLink(runner.discoveredToBePrerenderedPageKey, runner.discoveredToBePrerenderedAtUrl, window.location, fullHref);
  if (linkInfo.type !== 'external' && node.href) {
    var pageKey = linkInfo.pageKey;
    if(runner.pageState[pageKey]) {
      var hash = linkInfo.hashContents;
      var queryParams = linkInfo.queryParams;
      var queryParamsString = queryParams ? dictToSearchParams(queryParams) : "";
      var slugAndQueryParams = hash + queryParamsString;
      var fullyResolvedNodeHrefBefore = node.href;
      // TODO: Don't think I need to escape this if setting the attribute
      // and not injecting into html (double escaped).
      node.href = runner.constructEscapedBaseUrlFromRoot(pageKey, slugAndQueryParams);
      // if(fullyResolvedNodeHrefBefore !== node.href) {
        // console.log("FIXED UP ANCHOR:", fullyResolvedNodeHrefBefore, node.href);
      // }
    }
  }
};

var substituteSiteTemplateContentsWithHeaderPropsOnFetch = function (
  siteTemplate,
  normalizedPageKeyForBasename,
  headerProps
) {
  siteTemplate = siteTemplate.replace(
    new RegExp(
      "(" +
        escapeRegExpSearchString("<template>") +
        "|" +
        escapeRegExpSearchString("</template>") +
        "|" +
        escapeRegExpSearchString("<plaintext>") +
        ")",
      "g"
    ),
    function (_) {
      return "";
    }
  );
  siteTemplate = siteTemplate.replace(
    new RegExp("\\$\\{Bookmark\\.Header\\.([^:\\}\\|]*)(\\|[^}]*)?}", "g"),
    function (matchString, field, defaultVal) {
      if (field !== "siteTemplate" && field in headerProps) {
        return escapeHtml(headerProps[field]);
      } else if(defaultVal && defaultVal[0] === '|') {
        return escapeHtml(defaultVal.substr(1));
      }
    }
  );
  var effectiveId = headerProps.id || normalizedPageKeyForBasename;
  siteTemplate = siteTemplate.replace(
    new RegExp("\\$\\{Bookmark\\.Active\\.([^\\}]*)}", "g"),
    function (matchString, field) {
      return effectiveId.toLowerCase() === field.toLowerCase() ? "active" : "inactive";
    }
  );
  return siteTemplate;
};

/**
 * Bookmark is just a paired down version of Flatdoc with some additional
 * features, and many features removed.
 *
 * This version of flatdoc can run in three modes:
 *
 * Main entrypoint script include (when included from an index.html or
 * foo.html).
 *
 *     <script start src="pathto/Paradoc.js"></script>
 *
 * Included in a name.md.html markdown document or name.styl.html Stylus
 * document at the start of file
 *
 *     <script src="pathto/Paradoc.js"></script>
 *     # Rest of markdown here
 *     - regular markdown
 *     - regular markdown
 *
 * or:
 *
 *     <script src="pathto/Paradoc.js"></script>
 *     Rest of .styl document here:
 *
 * As a node script which will bundle your page into a single file assuming you've run npm install.
 */

/**
 * Since we use one simple script for everything, we need to detect how it's
 * being used. If not a node script, it could be included form the main html
 * page, or from a docs/stylus page. The main script tag in the main page will
 * be run at a point where there's no body in the document. For doc pages
 * (markdown/stylus) it will have a script tag at the top which implicitly
 * defines a body.
 */
function isRunningScriptFromExecutedSiteTemplate() {
  return document.currentScript.hasAttribute("fromSiteTemplate");
}

/**
 * Assuming you are a doc or a style file (in an html extension), is this
 * trying to be loaded as an async doc/style content fetch from another HTML
 * page, or is this file attempting to be loaded as the main entrypoint (wihout
 * going through an index.html or something?) All requests for doc content go
 * through the Bookmark loader, and will ensure there is a query param
 * indicating this.
 */
function detectMode() {
  if (typeof process !== "undefined") {
    return "bookmarkNodeMode";
  }
  if (isRunningScriptFromExecutedSiteTemplate()) {
    return "runningScriptFromExecutedSiteTemplate";
  } else {
    var isHostPageQueryingContent = queryParam("bookmarkContentQuery");
    if (isHostPageQueryingContent) {
      // Querying the content from some other page (including executed site template)
      return "bookmarkContentQuery";
    } else {
      // The user double clicked on an .html markdown file that has the
      // Paradoc.js bootstrap <script> tag in it.
      return "bookmarkEntrypoint";
    }
  }
}

var MODE = detectMode();

/**
 * Here's the order of events that occur when using the local file system at least:
 * 1. body DOMContentLoaded
 * 2. body onload event
 * 3. settimeout 0 handler.
 */
if (MODE === "bookmarkNodeMode") {
  if (process.argv && process.argv.length > 2) {
    var relFilePath = process.argv[2];
    var path = require("path");
    var absFilePath = path.resolve(process.cwd(), relFilePath);
    var fs = require("fs");
    var path = require("path");
    var Inliner = require("inliner");
    if(!fs.existsSync(absFilePath)) {
      console.error('File ' + absFilePath + ' does not exist');
      process.exit(1);
    }

    var siteDir = __dirname;

    var pathToChrome =
      process.platform === "win32"
        ? path.join(
            require("process").env["LOCALAPPDATA"],
            "Google",
            "Chrome",
            "Application",
            "chrome.exe"
          )
        : "/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome";

    var cmd =
      pathToChrome +
      " " +
      absFilePath +
      " --headless --dump-dom --virtual-time-budget=400";
    var rendered = require("child_process").execSync(cmd).toString();

    var renderedHtmlPath = absFilePath.replace('.html', '') + ".paradoc-rendered.html";
    var indexHtmlPath = absFilePath.replace('.html', '') + ".paradoc-inlined.html";
    fs.writeFileSync(renderedHtmlPath, rendered);

    console.log("INLINING PAGE: ", indexHtmlPath);

    var options = {
      /* Make sure you have this set to true to avoid flickering jumps */
      images: true,
      compressCSS: false,
      compressJS: false,
      // If true, will mess with hljs.
      collapseWhitespace: false,
      nosvg: true, // by default, DO compress SVG with SVGO
      skipAbsoluteUrls: false,
      preserveComments: true,
      iesafe: false,
    };

    new Inliner(renderedHtmlPath, options, function (error, html) {
      // compressed and inlined HTML page
      // console.log(html);
      if (error) {
        console.error(e);
        process.exit(1);
      }
      fs.writeFileSync(indexHtmlPath, html);
      process.exit(0);
    });
  } else {
    console.error('Make sure you supply a path to the file you want to use as the entrypoint of the bundle. You have omitted it.');
  }
} else if (MODE === "bookmarkContentQuery") {

/**
 * How Github decides to render previews as markdown:
 * https://github.com/github/markup/issues/1069#issuecomment-306084234
 *
 * This comment says you can force your file to be rendered as markdown in
 * github a couple of ways: A vim region, or a gitattributes but gitattributes
 * isn't working.
 * Abusing the Vim mode:
 * <!-- vim: syntax=Markdown -->
 * Abusing the Emacs mode:
 * <!--*- mode: markdown -*-->
 * (note that emacs mode is determined by the `-*- mode: markdown; -*-` It just fits nicely
 * with the html comment *)
 * https://github.com/github/markup/issues/1069#issuecomment-460056003
 *
 * Supposedly, Chrome is supposed to detect html files on local disk by
 * sniffing some tags.  but it doesn't appear to work.
 * Chromium mime type sniffing:
 *  https://source.chromium.org/chromium/chromium/src/+/master:net/base/mime_sniffer.cc;drc=faa13f8c8516dd027f5fc5a6ba984099ff330d05;l=781?originalUrl=https:%2F%2Fcs.chromium.org%2Fchromium%2Fsrc%2Fnet%2Fbase%2Fmime_sniffer.cc
 *  https://source.chromium.org/chromium/chromium/src/+/master:net/base/mime_sniffer.cc;l=795?originalUrl=https:%2F%2Fcs.chromium.org%2Fchromium%2Fsrc%2Fnet%2Fbase%2Fmime_sniffer.cc
 *  SniffForHTML:
 *  https://source.chromium.org/chromium/chromium/src/+/master:net/base/mime_sniffer.cc;drc=c12f7a008d7096c48d0c4db36c6d6edbc71700fb;l=381?originalUrl=https:%2F%2Fcs.chromium.org%2Fchromium%2Fsrc%2Fnet%2Fbase%2Fmime_sniffer.cc
 *
 * A trick to create markdown comments that don't render in Github:
 * http://alvinalexander.com/technology/markdown-comments-syntax-not-in-generated-output/
 * (Suggestion, use the # form and make sure there's a line before it)
 * https://stackoverflow.com/questions/4823468/comments-in-markdown
 *
 * <!--*- mode: markdown -*-->
 * This doesn't work because it needs spaces around the [] for ft detection to
 * kick in on Github:
 * [vim: syntax=Markdown]: # (<script src="./flatdoc.js"></script>)
 * This works!
 * [ vim:syntax=Markdown ]: # (<script src="./flatdoc.js"></script>)
 * But this does!
 * [-*-mode:markdown-*-]: # (<script src="./flatdoc.js"> </script>)
 *
 * Another supposed way to write comments in markdown is:
 * [this is a comment]::
 * So this works for injecting the script tag and getting Github to render it
 * as a markdown file:
 * [<script src="./flatdoc.js"> </script>]:-*-mode:markdown-*-:
 * However with that last approach, there's much more to clean up in the output
 * on Flatdoc's side.
 *
 * This approach is the cleanest and only has us searching for / cleaning up a
 * single `)` closing paren before Flatdoc renders the markup.
 *
 *     [ vim:syntax=Markdown ]: # (<script src="flatdoc.js"></script>)
 *
 */
  // We are being asked about the document content from some host page (like an index.html that
  // manually calls out to docs).
  document.write('<plaintext style="display:none">');
  document.addEventListener("DOMContentLoaded", function () {
    var plaintexts = document.querySelectorAll("plaintext");
    if (plaintexts.length === 1) {
      window.parent.postMessage(
        {
          messageType: "docPageContent",
          iframeName: window.name,
          // innerHtml escapes markup in plaintext in Safari, but not Chrome.
          // innerText behaves correctly for both.
          // TODO: investigate using textContent (which is usually more
          // performant) but in cases where perf doesn't matter like this it
          // may allow returning more interesting data from documents.
          content: plaintexts[0].innerText,
        },
        "*"
      );
    } else {
      window.parent.postMessage(
        {
          messageType: "docPageError",
          iframeName: window.name,
          error:
            "There isn't exactly one plaintext tag inside of " +
            window.name +
            ". Something went wrong and we didn't inject the plaintext tag.",
        },
        "*"
      );
    }
  });
} else if (MODE === "bookmarkEntrypoint") {
  // This is the a workflow where the md html page itself wants to be loadable without
  // needing to be included via some index.html. In this mode it can specify a page template
  // in its markdown header.

  // Remove the typical leading content before the script: This just helps
  // minimize the flash of that text. To completely eliminate it during
  // development mode, you can put this at the top of your md.
  // [ vim: set filetype=Markdown: ]: # (<style type="text/css">body {display: none} </style>)
  // while(document.body.hasChildNodes) {
  while (document.body && document.body.childNodes[0].nodeType === document.TEXT_NODE) {
    document.body.removeChild(document.body.childNodes[0]);
  }
  // Try to hide the plain text that comes before the important script include.
  // Minimize flash.
  document.write('<plaintext style="display:none">');
  // I find page reloads much less reliable if you document.close()
  // document.close();
  // However, I think this caused html contents inside of the markdown to be executed as html?
  window.onbeforeunload = function () {};
  document.addEventListener("DOMContentLoaded", function () {
    var plaintexts = document.querySelectorAll("plaintext");
    if (plaintexts.length === 1) {
      // innerHtml escapes markup in plaintext in Safari, but not Chrome.
      // innerText behaves correctly for both.
      // Parse out the yaml header just so we can get the siteTemplate, then
      // forward along the original markdown. Might as well leave the yaml
      // lines normalized.
      var markdown = normalizeMarkdownResponse(plaintexts[0].innerText);
      var markdownNormalizedYaml = normalizeYamlMarkdownComments(markdown);
      // In this entrypoint mode, we still parse the header even though it will be done again.
      // The reason is so that we can extract out the site template.
      var markdownAndHeader = parseYamlHeader(markdownNormalizedYaml, window.location.pathname);
      if (typeof window.BookmarkTemplate === "undefined") {
        window.BookmarkTemplate = {};
      }

      window.BookmarkTemplate.prefetchedCurrentPageBasename = urlBasename(window.location.href);

      var normalizedPageKeyForBasename = urlExtensionlessBasename(
        BookmarkTemplate.prefetchedCurrentPageBasename
      ).toLowerCase();
      window.BookmarkTemplate.prefetchedCurrentPageMarkdownAndHeader = markdownNormalizedYaml;
      // Set the variables for templates to read from.
      // https://www.geeksforgeeks.org/how-to-replace-the-entire-html-node-using-javascript/
      var siteTemplate = markdownAndHeader.headerProps.siteTemplate || 'siteTemplate.html';
      console.log("Using default site template - assumed to be at ./siteTemplate.html. You can customize this in your markdown 'yaml' header siteTemplate: field.");
      var templateFetchStart = Date.now();
      /**
       * The iframe's onDone will fire before the document's readystatechange 'complete' event.
       */
      var onDone = function (siteTemplate) {
        var templateFetchEnd = Date.now();
        console.log("fetching SITE TEMPLATE took", templateFetchEnd - templateFetchStart);
        var yetAnotherHtml = document.open("text/html", "replace");
        // If you want to listen for another readystatechange 'complete'
        // after images have loaded you have to create yetAnotherHtml This
        // isn't really needed since we don't listen to this.  Make sure to
        // hide the content while it is loading, since .write replaces.
        // `handleReady` will reveal it after images load.
        siteTemplate = substituteSiteTemplateContentsWithHeaderPropsOnFetch(
          siteTemplate,
          normalizedPageKeyForBasename,
          markdownAndHeader.headerProps
        );
        // The site template should also have
        //  <script>document.body.style="display:none" </script>
        //  So that when pre-rendered it is also correctly hidden
        yetAnotherHtml.write(siteTemplate);
        yetAnotherHtml.close();
      };
      var onDoneCell = { contents: onDone };
      var onFailCell = {
        contents: (err) => {
          console.error(err);
        },
      };
      queryContentsViaIframe(siteTemplate, onDoneCell, onFailCell);
    } else {
      console.error(
        "There isn't exactly one plaintext tag inside of " +
          window.name +
          ". Something went wrong and we didn't inject the plaintext tag."
      );
    }
  });
} else {
  // Must be 'runningScriptFromExecutedSiteTemplate' mode. At least populate this empty
  // dictionary so that when
  // BookmarkTemplate.prefetchedCurrentPageMarkdownAndHeader is accessed in
  // the rehydration workflow it doesn't fail (it will bail out) when it
  // realizes the page is already rendered though.
  if (typeof window.BookmarkTemplate === "undefined") {
    window.BookmarkTemplate = {};
  }

  (function () {
    var exports = this;

    var marked;

    /**
     * Basic Flatdoc module.
     *
     * The main entry point is Flatdoc.run(), which invokes the [Runner].
     *
     *     Flatdoc.run({
     *       fetcher: Flatdoc.github('rstacruz/backbone-patterns');
     *     });
     *
     * These fetcher functions are available:
     *
     *     Flatdoc.github('owner/repo')
     *     Flatdoc.github('owner/repo', 'API.md')
     *     Flatdoc.github('owner/repo', 'API.md', 'branch')
     *     Flatdoc.bitbucket('owner/repo')
     *     Flatdoc.bitbucket('owner/repo', 'API.md')
     *     Flatdoc.bitbucket('owner/repo', 'API.md', 'branch')
     *     Flatdoc.file('http://path/to/url')
     *     Flatdoc.file([ 'http://path/to/url', ... ])
     */

    var Flatdoc = (exports.Flatdoc = {});
    exports.Bookmark = exports.Flatdoc;

    /**
     * Creates a runner.
     * See [Flatdoc].
     */
    Flatdoc.run = function (options) {
      var runner = new Flatdoc.runner(options);
      runner.run();
      return runner;
    };

    /**
     * Explicit page config will override the same config from header props.
     */
    Flatdoc.getPageConfig = function(configKey, pageData, defaultVal) {
      if(pageData.explicitlySpecifiedPageConfig && pageData.explicitlySpecifiedPageConfig[configKey]) {
        return pageData.explicitlySpecifiedPageConfig[configKey];
      } else if(pageData.markdownAndHeader.headerProps && pageData.markdownAndHeader.headerProps[configKey]) {
        return pageData.markdownAndHeader.headerProps[configKey];
      } else {
        return defaultVal;
      }
    };
    /**
     * Gets the page config from explicit config or header prop, and normalizes
     * it to a boolean value or throws.
     */
    Flatdoc.getPageConfigBool = function(configKey, pageData, defaultVal) {
      if(pageData.explicitlySpecifiedPageConfig && pageData.explicitlySpecifiedPageConfig[configKey]) {
        return !!pageData.explicitlySpecifiedPageConfig[configKey];
      } else if(pageData.markdownAndHeader.headerProps && pageData.markdownAndHeader.headerProps[configKey]) {
        var val = pageData.markdownAndHeader.headerProps[configKey];
        if(val.toLowerCase() === 'true') {
          return true;
        } else if(val.toLowerCase() === 'false') {
          return false;
        } else {
          console.warn(
            'Header for page ' + pageData.___pageKeyForErrorMessages +
            ' has invalid value for property ' + configKey +
            '. It should be either true or false, but was specified as ' + val
          );
        }
      } else {
        return defaultVal;
      }
    };

    Flatdoc.emptyPageData = function(pageKey) {
      return {
        ___pageKeyForErrorMessages: pageKey,
        explicitlySpecifiedPageConfig: null,
        fetcher: null,
        markdownAndHeader: null,
        contentContainerNode: null,
        menuContainerNode: null,
        hierarchicalDoc: null,
        hierarchicalIndex: null
      }
    }

    /**
     * Simplified easy to use API that calls the underlying API.
     */
    Flatdoc.go = function (options) {
      var pageState = {};
      var actualOptions = {
        pageState: pageState,
        // Could flip to true
        discoveredToBePrerenderedAtUrl: null,
        discoveredToBePrerenderedPageKey: null,
        pageTemplateOptions: {
          runPrerenderedInSingleDocsMode: options.runPrerenderedInSingleDocsMode,
          runDevelopmentInSingleDocsMode: options.runDevelopmentInSingleDocsMode,
          sidenavify: options.sidenavify || defaultSidenavifyConfig,
          slugContributions: options.slugContributions || defaultSlugContributions,
          searchFormId: options.searchFormId,
          searchHitsId: options.searchHitsId,
          versionButtonId: options.versionButtonId,
          versionPageIs: options.versionPageIs ? options.versionPageIs.toLowerCase() : null,
        }
      };
      if (options.stylus) {
        actualOptions.stylusFetcher = Flatdoc.docPage(options.stylus);
      }
      var linkInfo = getLink(null, null, window.location, window.location.href);
      var pageKey = linkInfo.pageKey;
      // We'll treat whichever page you're loading from as the "start" page.
      // When you render your single page bundle, you'll pick the right one you
      // want to act as the "first" page.
      if (!options.pages || !(pageKey in options.pages)) {
        pageState[pageKey] = {
          ...Flatdoc.emptyPageData(pageKeyLowerCase),
          explicitlySpecifiedPageConfig: pages ? pages[pageKey] || null : null
        };
        Flatdoc.setFetcher(pageKey, pageState[pageKey]);
      }
      var pages = options.pages || {};
      for (var pageKey in pages) {
        var pageKeyLowerCase = pageKey.toLowerCase();
        var page = pages[pageKey];
        pageState[pageKeyLowerCase] = {
          ...Flatdoc.emptyPageData(pageKeyLowerCase),
          explicitlySpecifiedPageConfig: pages[pageKey]
        };
        Flatdoc.setFetcher(pageKeyLowerCase, pageState[pageKeyLowerCase]);
      }
      if (options.highlight) {
        actualOptions.highlight = options.highlight;
      }
      var runner = Flatdoc.run(actualOptions);
    };

    /**
     * File fetcher function.
     *
     * Fetches a given url via AJAX.
     * See [Runner#run()] for a description of fetcher functions.
     */

    Flatdoc.file = function (url) {
      function loadData(locations, response, callback) {
        if (locations.length === 0) callback(null, response);
        else
          $.get(locations.shift())
            .fail(function (e) {
              callback(e, null);
            })
            .done(function (data) {
              if (response.length > 0) response += "\n\n";
              response += data;
              loadData(locations, response, callback);
            });
      }

      return function (callback) {
        loadData(url instanceof Array ? url : [url], "", callback);
      };
    };

    Flatdoc.setFetcher = function (keyLowerCase, obj) {
      if (
        BookmarkTemplate.prefetchedCurrentPageBasename &&
        urlExtensionlessBasename(BookmarkTemplate.prefetchedCurrentPageBasename).toLowerCase() ===
          keyLowerCase
      ) {
        obj.fetcher = Flatdoc.prefetchedDocPageContent(
          keyLowerCase,
          BookmarkTemplate.prefetchedCurrentPageMarkdownAndHeader
        );
      } else {
        obj.fetcher = Flatdoc.docPage(keyLowerCase + ".html");
      }
    };

    /**
     * Runs with the already loaded string contents representing a doc.
     * This is used for "entrypoint mode".
     * TODO: Instead just maintain a cache, warm it up and use the regular
     * fetcher. This also allows reuse as a "style pre-fetch" property in the
     * yaml header.
     */
    Flatdoc.prefetchedDocPageContent = function (pageKey, url) {
      if (!Flatdoc.errorHandler) {
        var listenerID = window.addEventListener("message", function (e) {
          if (e.data.messageType === "docPageError") {
            console.error(e.data.error);
          }
        });
        Flatdoc.docPageErrorHandler = listenerID;
      }
      var fetchdocPage = function (content) {
        var onDone = null;
        var onFail = null;
        var returns = {
          fail: function (cb) {onFail = cb; return returns;},
          done: function (cb) {
            onDone = cb;
            onDone(content);
            return returns;
          },
        };
        return returns;
      };
      function loadData(locations, response, callback) {
        if (locations.length === 0) {
          callback(null, response);
        } else {
          fetchdocPage(locations.shift())
            .fail(function (e) {callback(e, null); })
            .done(function (data) {
              if (response.length > 0) response += "\n\n";
              response += data;
              loadData(locations, response, callback);
            });
        }
      }

      var url = url instanceof Array ? url : [url];
      var ret = function (callback) {
        loadData(url, "", callback);
      };
      // Tag the fetcher with the url in case you want it.
      ret.url = url;
      return ret;
    };

    /**
     * Local docPage doc fetcher function.
     *
     * Fetches a given url via iframe inclusion, expecting the file to be of
     * the "docPage" form of markdown which can be loaded offline.
     * See [Runner#run()] for a description of fetcher functions.
     *
     * Tags the url argument on the fetcher itself so it can be used for other
     * debugging/relativization.
     */

    Flatdoc.docPageErrorHandler = null;

    Flatdoc.docPage = function (url) {
      if (!Flatdoc.errorHandler) {
        var listenerID = window.addEventListener("message", function (e) {
          if (e.data.messageType === "docPageError") {
            console.error(e.data.error);
          }
        });
        Flatdoc.docPageErrorHandler = listenerID;
      }
      var fetchdocPage = function (url) {
        var onDoneCell = { contents: null };
        var onFailCell = { contents: null };
        var returns = {
          fail: function (cb) {
            onFailCell.contents = cb;
            return returns;
          },
          done: function (cb) {
            onDoneCell.contents = cb;
            return returns;
          },
        };
        queryContentsViaIframe(url, onDoneCell, onFailCell);
        // Even if using the local file system, this will immediately resume
        // after appending without waiting or blocking.  There is no way to tell
        // that an iframe has loaded successfully without some kind of a timeout.
        // Even bad src locations will fire the onload event. An onerror event is
        // a solid signal that the page failed, but abscense of an onerror on the
        // iframe is not a confirmation of success or that it hasn't failed.
        return returns;
      };
      function loadData(locations, response, callback) {
        if (locations.length === 0) callback(null, response);
        else
          fetchdocPage(locations.shift())
            .fail(function (e) {
              callback(e, null);
            })
            .done(function (data) {
              if (response.length > 0) response += "\n\n";
              response += data;
              loadData(locations, response, callback);
            });
      }

      var url = url instanceof Array ? url : [url];
      var ret = function (callback) {
        loadData(url, "", callback);
      };
      // Tag the fetcher with the url in case you want it.
      ret.url = url;
      return ret;
    };

    /**
     * Github fetcher.
     * Fetches from repo repo (in format 'user/repo').
     *
     * If the parameter filepath` is supplied, it fetches the contents of that
     * given file in the repo's default branch. To fetch the contents of
     * `filepath` from a different branch, the parameter `ref` should be
     * supplied with the target branch name.
     *
     * See [Runner#run()] for a description of fetcher functions.
     *
     * See: http://developer.github.com/v3/repos/contents/
     */
    Flatdoc.github = function (opts) {
      if (typeof opts === "string") {
        opts = {
          repo: arguments[0],
          filepath: arguments[1],
        };
      }
      var url;
      if (opts.filepath) {
        url = "https://api.github.com/repos/" + opts.repo + "/contents/" + opts.filepath;
      } else {
        url = "https://api.github.com/repos/" + opts.repo + "/readme";
      }
      var data = {};
      if (opts.token) {
        data.access_token = opts.token;
      }
      if (opts.ref) {
        data.ref = opts.ref;
      }
      return function (callback) {
        $.get(url, data)
          .fail(function (e) {
            callback(e, null);
          })
          .done(function (data) {
            var markdown = exports.Base64.decode(data.content);
            callback(null, markdown);
          });
      };
    };

    /**
     * Bitbucket fetcher.
     * Fetches from repo `repo` (in format 'user/repo').
     *
     * If the parameter `filepath` is supplied, it fetches the contents of that
     * given file in the repo.
     *
     * See [Runner#run()] for a description of fetcher functions.
     *
     * See: https://confluence.atlassian.com/display/BITBUCKET/src+Resources#srcResources-GETrawcontentofanindividualfile
     * See: http://ben.onfabrik.com/posts/embed-bitbucket-source-code-on-your-website
     * Bitbucket appears to have stricter restrictions on
     * Access-Control-Allow-Origin, and so the method here is a bit
     * more complicated than for Github
     *
     * If you don't pass a branch name, then 'default' for Hg repos is assumed
     * For git, you should pass 'master'. In both cases, you should also be able
     * to pass in a revision number here -- in Mercurial, this also includes
     * things like 'tip' or the repo-local integer revision number
     * Default to Mercurial because Git users historically tend to use GitHub
     */
    Flatdoc.bitbucket = function (opts) {
      if (typeof opts === "string") {
        opts = {
          repo: arguments[0],
          filepath: arguments[1],
          branch: arguments[2],
        };
      }
      if (!opts.filepath) opts.filepath = "readme.md";
      if (!opts.branch) opts.branch = "default";

      var url =
        "https://bitbucket.org/api/1.0/repositories/" +
        opts.repo +
        "/src/" +
        opts.branch +
        "/" +
        opts.filepath;

      return function (callback) {
        $.ajax({
          url: url,
          dataType: "jsonp",
          error: function (xhr, status, error) {
            alert(error);
          },
          success: function (response) {
            var markdown = response.data;
            callback(null, markdown);
          },
        });
      };
    };

    var Parser = {};

    /**
     * Parses a given Markdown document.
     * See `Parser` for more info.
     */
    Parser.parse = function (runner, markdownAndHeader, highlight, pageState, pageKey) {
      marked = exports.marked;

      Parser.setMarkedOptions(highlight);

      var html = $("<div>" + marked(markdownAndHeader.markdown));
      var title = markdownAndHeader.headerProps.title;
      if (!title) {
        title = html.find("h1").eq(0).text();
      }

      // Mangle content
      Transformer.mangle(runner, html, pageState, pageKey);
      var menu = Transformer.getMenu(runner, html);

      return { content: html, menu: menu };
    };

    Parser.setMarkedOptions = function (highlight) {
      marked.setOptions({
        highlight: function (code, lang) {
          if (lang) {
            return highlight(code, lang);
          }
          return code;
        },
      });
      marked.Renderer.prototype.paragraph = (text) => {
        if (text.startsWith("<codetabscontainer")) {
          return text + "\n";
        }
        return "<p>" + text + "</p>";
      };

      /**
       * This actually doesn't work because it escapes an extra time for some reason.
       * I think the problem is in highligh.js
      marked.Renderer.prototype.codespan = (text) => {
        return marked.Renderer.prototype.code(text, 'reason', false);
        return '<bookmark-inline-codeblock>' + highlight(text, 'reason') + '</bookmark-inline-codeblock>';
        return text;
      };
      */
    };

    var Transformer = (Flatdoc.transformer = {});

    /**
     * Adds IDs to headings. What's nice about this approach is that it is
     * agnostic to how the markup is rendered.
     * TODO: These (better) links won't always work in markdown on github because
     * github doesn't encode subsections into the links. To address this, we can allow
     * Github links in the markdown and then transform them into the better ones
     * on the rendered page.  This produces more stable linked slugs.
     */
    Transformer.addIDsToHierarchicalDoc = function (runner, hierarchicalDoc, pageKey) {
      forEachHierarchy(function (treeNode, inclusiveContext) {
        if (treeNode.slug) {
          var levelContent = treeNode.levelContent;
          levelContent.id = fullyQualifiedHeaderId(treeNode.slug, pageKey);
        }
      }, hierarchicalDoc);
    };

    /**
     * Returns menu data for a given HTML.
     *
     *     menu = Flatdoc.transformer.getMenu($content);
     *     menu == {
     *       level: 0,
     *       items: [{
     *         sectionHtml: "Getting started",
     *         level: 1,
     *         items: [...]}, ...]}
     */

    Transformer.getMenu = function (runner, $content) {
      var root = { items: [], linkifiedId: "", level: 0 };
      var cache = [root];

      function mkdir_p(level) {
        cache.length = level + 1;
        var obj = cache[level];
        if (!obj) {
          var parent = level > 1 ? mkdir_p(level - 1) : root;
          obj = { items: [], level: level };
          cache = cache.concat([obj, obj]);
          parent.items.push(obj);
        }
        return obj;
      }

      var query = [];
      var sidenavify = runner.pageTemplateOptions.sidenavify;
      if (sidenavify.h0) {
        query.push("h0");
      }
      if (sidenavify.h1) {
        query.push("h1");
      }
      if (sidenavify.h2) {
        query.push("h2");
      }
      if (sidenavify.h3) {
        query.push("h3");
      }
      if (sidenavify.h4) {
        query.push("h4");
      }
      if (sidenavify.h5) {
        query.push("h5");
      }
      if (sidenavify.h6) {
        query.push("h6");
      }
      $content.find(query.join(",")).each(function () {
        var $el = $(this);
        var level = +this.nodeName.substr(1);

        var parent = mkdir_p(level - 1);
        var text = $el.text();
        var el = $el[0];
        if (
          (el.childNodes.length === 1 && el.childNodes[0].tagName === "code") ||
          el.childNodes[0].tagName === "CODE"
        ) {
          text = "<code>" + escapeHtml(text) + "</code>";
        }
        var obj = { sectionHtml: text, items: [], level: level, linkifiedId: $el.attr("id") };
        parent.items.push(obj);
        cache[level] = obj;
      });

      return root;
    };

    /**
     * Changes "button >" text to buttons.
     */

    Transformer.buttonize = function (content) {
      $(content)
        .find("a")
        .each(function () {
          var $a = $(this);

          var m = $a.text().match(/^(.*) >$/);
          if (m) $a.text(m[1]).addClass("button");
        });
    };

    /**
     * Applies smart quotes to a given element.
     * It leaves `code` and `pre` blocks alone.
     */

    Transformer.smartquotes = function (content) {
      var nodes = getTextNodesIn($(content)),
        len = nodes.length;
      for (var i = 0; i < len; i++) {
        var node = nodes[i];
        node.nodeValue = quotify(node.nodeValue);
      }
    };

    /**
     * Syntax highlighters.
     *
     * You may add or change more highlighters via the `Flatdoc.highlighters`
     * object.
     *
     *     Flatdoc.highlighters.js = function(code) {
     *     };
     *
     * Each of these functions
     */

    var Highlighters = (Flatdoc.highlighters = {});

    /**
     * JavaScript syntax highlighter.
     *
     * Thanks @visionmedia!
     */

    Highlighters.js = Highlighters.javascript = function (code) {
      return code
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/("[^\"]*?")/g, '<span class="string">$1</span>')
        .replace(/('[^\']*?')/g, '<span class="string">$1</span>')
        .replace(/\/\/(.*)/gm, '<span class="comment">//$1</span>')
        .replace(/\/\*(.*)\*\//gm, '<span class="comment">/*$1*/</span>')
        .replace(/(\d+\.\d+)/gm, '<span class="number">$1</span>')
        .replace(/(\d+)/gm, '<span class="number">$1</span>')
        .replace(/\bnew *(\w+)/gm, '<span class="keyword">new</span> <span class="init">$1</span>')
        .replace(
          /\b(function|new|throw|return|var|if|else)\b/gm,
          '<span class="keyword">$1</span>'
        );
    };

    Highlighters.html = function (code) {
      return code
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/("[^\"]*?")/g, '<span class="string">$1</span>')
        .replace(/('[^\']*?')/g, '<span class="string">$1</span>')
        .replace(/&lt;!--(.*)--&gt;/g, '<span class="comment">&lt;!--$1--&gt;</span>')
        .replace(/&lt;([^!][^\s&]*)/g, '&lt;<span class="keyword">$1</span>');
    };

    Highlighters.generic = function (code) {
      return code
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/("[^\"]*?")/g, '<span class="string">$1</span>')
        .replace(/('[^\']*?')/g, '<span class="string">$1</span>')
        .replace(/(\/\/|#)(.*)/gm, '<span class="comment">$1$2</span>')
        .replace(/(\d+\.\d+)/gm, '<span class="number">$1</span>')
        .replace(/(\d+)/gm, '<span class="number">$1</span>');
    };

    /**
     * Menu view. Renders menus
     */

    var MenuView = (Flatdoc.menuView = function (menu, pageKey) {
      var $el = $("<ul>");

      function process(node, $parent) {
        var id = node.linkifiedId || "root";
        var nodeHashToChangeTo = node.linkifiedId ? hashForFullFullyQualifiedHeaderId(id) : '';
        var $li = $("<li>")
          .attr("id", id + "-item")
          .addClass("level-" + node.level)
          .appendTo($parent);

        if (node.sectionHtml) {
          var $a = $("<a>")
            .html(node.sectionHtml)
            .attr("id", id + "-link")
            .attr("href", './' + pageKey + ".html#" + nodeHashToChangeTo)
            .addClass("level-" + node.level)
            .appendTo($li);
        }

        if (node.items.length > 0) {
          var $ul = $("<ul>")
            .addClass("level-" + (node.level + 1))
            .attr("id", id + "-list")
            .appendTo($li);

          node.items.forEach(function (item) {
            process(item, $ul);
          });
        }
      }

      process(menu, $el);
      return $el;
    });

    /**
     * A runner module that fetches via a `fetcher` function.
     *
     *     var runner = new Flatdoc.runner({
     *       fetcher: Flatdoc.url('readme.txt')
     *     });
     *     runner.run();
     *
     * The following options are available:
     *
     *  - `fetcher` - a function that takes a callback as an argument and
     *    executes that callback when data is returned.
     *
     * See: [Flatdoc.run()]
     */

    var Runner = (Flatdoc.runner = function (options) {
      this.initialize(options);
    });

    Runner.prototype.pageRootSelector = "body";

    /**
     * Really, is used to model internal *component* state based on entered
     * control value.  Like if a text input is empty, the text input component
     * sets the search component to QueryStates.NONE_AND_HIDE.
     * If the user hits enter on a dropdown selector, it toggles it between NONE
     * and ALL.
     *
     * There's three bits of information per control that determine visibility:
     *
     * 1. Which component is "active" (like focused). This is currently modeled
     * by activeSearchComponent (but that is almost redundant with document focus). It's not
     * exactly the same as focused DOM element because we also want a component
     * to be able to keep the popup open even if the user tabs to other parts of
     * the document. That doesn't always make sense for every kind of component,
     * but it's a feature. So activeSearchComponent recreates _another_ notion of active
     * element apart from the document's.
     * 2. Whether or not the internal state of the component warrants showing any
     * popup. (QueryStates). Like a search input could have empty text which
     * warrants showing no results. Or a dropdown component (which always has
     * "empty text"), could be focused but it's not supposed to show any results
     * until you click or press enter/space. That internal component state helps
     * determine whether or not a popup should be shown. In the case of text
     * input this is redundant or derivable from its input text (but not the case
     * for other component types).
     * 3. Whether or not the user requested that a popup for the currently active
     * component be supressed. Even if 1 and 2 would otherwise result in showing
     * a popup, the user could press escape.
     * An autocomplete text input with non-empty input, that is currently focused
     * (or "active") could press ctrl-c closing the popup window.
     * A dropdown component could be "active", could have been clicked on, but
     * the user could click a second time closing it (or pressing escape).
     */
    var QueryStates = {
      NONE: "NONE",
      ALL: "ALL",
      FILTER: "FILTER",
    };

    function SearchComponentBase(root) {
      this.root = root;
      this.queryState = QueryStates.ALL;
      this.resultsByPageKey = {};
      /**
       *
       * The user's intent. Could be:
       * No intent: null
       * Intent to not highlight anything: -1
       * Intent to highlight specific row and page key: {pageCursor,  pageCursorIndex}
       *
       * This state is managed both internally and externally. Internally,
       * components know when they need to reset the user requested cursor. But
       * externally search lists know when to reach out and mutate this.
       * The "page cursor" is the page key that the current item is under.
       * The "page cursor index" is the index number inside of that page cursor.
       */
      this.userRequested = null;
    }

    function TextDocSearch(props) {
      SearchComponentBase.call(this, props.root);
      this.queryState = QueryStates.FILTER;
      var placeholder = this.getPlaceholder();
      if (this.root.tagName.toUpperCase() !== "FORM") {
        console.error("You provided a searchFormId that does not exist");
        return;
      }
      var theSearchInput;
      var theSearchClear;
      if (this.root.className.indexOf("bookmark-search-form-already-setup") !== -1) {
        theSearchInput = this.root.childNodes[0];
        theSearchClear = this.root.childNodes[1];
      } else {
        this.root.className += " bookmark-search-form  bookmark-search-form-already-setup";
        this.root.onsubmit = "";
        var theSearchInputContainer = document.createElement("div");
        theSearchInputContainer.innerHTML = "<input style='border: 1px solid transparent' />";
        var theSearchInput = theSearchInputContainer.childNodes[0];
        theSearchInput.autocomplete = "off";
        theSearchInput.name = "focus";
        theSearchInput.className = "bookmark-search-input";
        theSearchInput.placeholder = placeholder;
        theSearchInput.required = true;
        theSearchClear = document.createElement("button");
        theSearchClear.tabindex = 1;
        theSearchClear.className = "bookmark-search-input-right-reset-icon";
        theSearchClear.type = "reset";
        theSearchClear.tabIndex = -1;
        this.root.prepend(theSearchClear);
        this.root.prepend(theSearchInput);
      }
      this.theSearchInput = theSearchInput;
      theSearchInput.addEventListener(
        "focus",
        function (e) {
          var focusedPlaceholder = this.getFocusedPlaceholder(this.root);
          theSearchInput.placeholder = focusedPlaceholder;
          if (this.userRequested === -1) {
            this.userRequested = null;
          }
          if (this.valueWarrantsHiding()) {
            props.onDoesntWantActiveStatus && props.onDoesntWantActiveStatus(this);
          } else {
            props.onWantsToHaveActiveStatus && props.onWantsToHaveActiveStatus(this);
          }
          props.onFocus && props.onFocus(e);
        }.bind(this)
      );
      theSearchInput.addEventListener(
        "keydown",
        function (e) {
          props.onKeydown && props.onKeydown(e);
        }.bind(this)
      );
      theSearchInput.addEventListener(
        "input",
        function (e) {
          this.userRequested = null;
          if (this.valueWarrantsHiding()) {
            props.onDoesntWantActiveStatus && props.onDoesntWantActiveStatus(this);
          } else {
            props.onWantsToHaveActiveStatus && props.onWantsToHaveActiveStatus(this);
          }
          props.onInput && props.onInput(e);
        }.bind(this)
      );
      theSearchInput.addEventListener(
        "blur",
        function (e) {
          var focusedPlaceholder = this.getPlaceholder();
          theSearchInput.placeholder = focusedPlaceholder;
          props.onBlur && props.onBlur(e);
        }.bind(this)
      );

      // This one goes on the form itself
      this.root.addEventListener(
        "reset",
        function () {
          this.setValue("");
          this.focus();
          this.userRequested = null;
          props.onDoesntWantActiveStatus && props.onDoesntWantActiveStatus(this);
          if (props.onReset) {
            props.onReset;
          }
        }.bind(this)
      );
      this.root.addEventListener(
        "submit",
        function (e) {
          e.preventDefault();
        }.bind(this)
      );
    }
    TextDocSearch.prototype.getQuery = function () {
      return this.getValue().trim();
    };
    TextDocSearch.prototype.valueWarrantsHiding = function () {
      return this.getValue().trim() === "";
    };

    TextDocSearch.prototype.getFocusedPlaceholder = function () {
      var defaultTxt = "Search (Esc close)";
      return this.root ? this.root.dataset.focusedPlaceholder || defaultTxt : defaultTxt;
    };
    TextDocSearch.prototype.getPlaceholder = function (root) {
      var defaultTxt = "Press '/' to focus";
      return this.root ? this.root.dataset.placeholder || defaultTxt : defaultTxt;
    };
    TextDocSearch.prototype.focus = function () {
      return this.theSearchInput.focus();
    };
    TextDocSearch.prototype.selectAll = function () {
      return this.theSearchInput.select();
    };
    TextDocSearch.prototype.isFocused = function () {
      return document.activeElement === this.theSearchInput;
    };
    TextDocSearch.prototype.blur = function () {
      return this.theSearchInput.blur();
    };
    TextDocSearch.prototype.getValue = function () {
      return this.theSearchInput.value;
    };
    TextDocSearch.prototype.setValue = function (v) {
      this.theSearchInput.value = v;
    };
    TextDocSearch.prototype.setPlaceholder = function (ph) {
      this.theSearchInput.placeholder = ph;
    };
    TextDocSearch.prototype.onLostActiveSearchComponent = function () {
      // this.queryState = QueryStates.NONE_AND_HIDE;
    };
    TextDocSearch.prototype.onGainedActiveSearchComponent = function () {
      // this.queryState = QueryStates.ALL;
    };

    /**
     * An "input selector" style component that uses the navigation autocomplete window.
     */
    function TextDocSelector(props) {
      SearchComponentBase.call(this, props.root);
      this.queryState = QueryStates.ALL;

      this.root.addEventListener("focus", function (e) {
        if (this.userRequested !== null && this.userRequested === -1) {
          this.userRequested = null;
        }
        props.onFocus && props.onFocus(e);
      });
      this.root.addEventListener("keydown", function (e) {
        props.onKeydown && props.onKeydown(e);
      });
      this.root.addEventListener(
        "click",
        function (e) {
          if (props.isActiveComponent()) {
            props.onDoesntWantActiveStatus && props.onDoesntWantActiveStatus(this);
          } else {
            props.onWantsToHaveActiveStatus && props.onWantsToHaveActiveStatus(this);
          }
        }.bind(this)
      );
      this.root.addEventListener(
        "blur",
        function () {
          props.onDoesntWantActiveStatus && props.onDoesntWantActiveStatus(this);
        }.bind(this)
      );
    }
    TextDocSelector.prototype.getQuery = function () {
      return "";
    };
    TextDocSelector.prototype.onLostActiveSearchComponent = function () {};
    TextDocSelector.prototype.onGainedActiveSearchComponent = function () {};

    /**
     * Custom methods (extends base API for search components).
     */

    Runner.prototype.initialize = function (options) {
      this.pageState = {};
      this.searchState = {
        /**
         * "global" state - across all searches.
         */
        activeSearchComponent: null,
        /**
         * Typically until the next event that switches the active component.
         */
        userRequestedCloseEvenIfActive: true,
        VERSIONS: null,
        CONTENT: null,
      };
      this.nodes = {
        theSearchHits: null,
        theHitsScrollContainer: null,
        versionMenuButton: null,
        versionsContainer: null,
      };
      for (var k in options) {
        this[k] = options[k];
      }
    };

    /**
     * Syntax highlighting.
     *
     * You may define a custom highlight function such as `highlight` from
     * the highlight.js library.
     *
     *     Flatdoc.run({
     *       highlight: function (code, value) {
     *         return hljs.highlight(lang, code).value;
     *       },
     *       ...
     *     });
     *
     */

    /**
     * There is only one active search component. It is the one that will be
     * responsible for providing search results. The moment a different component
     * becomes the new active component, the new active component determines
     * which results will be shown, and helps decide whether or not to show the
     * popup menu at all.
     */
    Runner.prototype.setActiveSearchComponent = function (newComp) {
      if (newComp !== this.searchState.activeSearchComponent) {
        if (this.searchState.activeSearchComponent) {
          this.searchState.activeSearchComponent.onLostActiveSearchComponent();
        }
        this.searchState.activeSearchComponent = newComp;
        this.searchState.userRequestedCloseEvenIfActive = false;
        if (this.searchState.activeSearchComponent) {
          this.searchState.activeSearchComponent.onGainedActiveSearchComponent();
        }
      }
    };
    Runner.prototype.highlight = function (code, lang) {
      var fn = Flatdoc.highlighters[lang] || Flatdoc.highlighters.generic;
      return fn(code);
    };

    Runner.prototype.noResultsNode = function (query) {
      var d = document.createElement("div");
      d.className = "bookmark-hits-noresults-list";
      d.innerText = 'No results for "' + query + '"';
      return d;
    };
    Runner.prototype.getHitsScrollContainer = function () {
      return this.nodes.theHitsScrollContainer;
    };
    /**
     * Operates on an effective cursor (which is never null, but could be -1).
     * Stops at the last cursor - doesn't "roll over" into -1.
     * TODO: But what if there are no entries? It should probably be allowd to
     * return null in that case.
     */
    Runner.prototype.nextCursorFromEffectiveCursor = function (cursor, resultsByPageKey) {
      if (cursor === -1) {
        var nextPageKey = nextKeyWithNonEmptyArrayOrNullIfNone(null, resultsByPageKey);
        return nextPageKey === null ? -1 : { pageCursor: nextPageKey, pageCursorIndex: 0 };
      } else {
        var resultsForPageKey = resultsByPageKey[cursor.pageCursor];
        var maxIndex = resultsForPageKey.length - 1;
        if (maxIndex >= cursor.pageCursorIndex + 1) {
          return { pageCursor: cursor.pageCursor, pageCursorIndex: cursor.pageCursorIndex + 1 };
        } else {
          var nextPageKey = nextKeyWithNonEmptyArrayOrNullIfNone(
            cursor.pageCursor,
            resultsByPageKey
          );
          // Stays at the last cursor if there's no more.
          if (nextPageKey === null) {
            return cursor;
          } else {
            return { pageCursor: nextPageKey, pageCursorIndex: 0 };
          }
        }
      }
    };
    /**
     * Operates on an effective cursor (which is never null, but could be -1).
     * "rolls under" to -1 if going to the previous cursor before the first page
     * key and page index. Stays at -1 if already at -1.
     */
    Runner.prototype.prevCursorFromEffectiveCursor = function (cursor, resultsByPageKey) {
      if (cursor === -1) {
        return -1;
      } else {
        if (cursor.pageCursorIndex > 0) {
          return { pageCursor: cursor.pageCursor, pageCursorIndex: cursor.pageCursorIndex - 1 };
        } else {
          var prevPageKey = prevKeyWithNonEmptyArrayOrNullIfNone(cursor.pageCursor);
          // Stays at the last cursor if there's no more.
          if (prevPageKey === null) {
            return -1;
          } else {
            return {
              pageCursor: prevPageKey,
              pageCursorIndex: resultsByPageKey[prevPageKey].length - 1,
            };
          }
        }
      }
    };
    /**
     * Returns a normalied user requested cursor - which will never be null.
     * Might be negative one though.
     */
    Runner.prototype.effectiveCursor = function (searchComponent, resultsByPageKey) {
      return searchComponent.userRequested !== null
        ? searchComponent.userRequested
        : this.nextCursorFromEffectiveCursor(-1, resultsByPageKey);
    };
    Runner.prototype.updateSearchResultsList = function (
      searchComponent,
      query,
      prevResultsByPageKey,
      resultsByPageKey,
      clickHandler
    ) {
      var runner = this;
      var emptyFunction = function() {};
      var hitsScrollContainer = this.getHitsScrollContainer();
      var firstItem = null;
      var lastItem = null;
      var effectiveCursor = runner.effectiveCursor(searchComponent, resultsByPageKey);
      var moreThanJustCursorUpdate = prevResultsByPageKey !== resultsByPageKey;

      window.prevResultsByPageKey = prevResultsByPageKey;
      window.resultsByPageKey = resultsByPageKey;
      if (!resultsByPageKeyLen(resultsByPageKey)) {
        var len = hitsScrollContainer.childNodes.length;
        for (var i = 0; i < len; i++) {
          hitsScrollContainer.removeChild(hitsScrollContainer.childNodes[i]);
        }
        hitsScrollContainer.appendChild(this.noResultsNode(query));
      } else {
        var existingHitsList;
        var hitsList;
        if (
          moreThanJustCursorUpdate &&
          hitsScrollContainer.childNodes[0] &&
          hitsScrollContainer.childNodes[0].className === "bookmark-hits-noresults-list"
        ) {
          existingHitsList = null;
          hitsScrollContainer.removeChild(hitsScrollContainer.childNodes[0]);
        } else {
          existingHitsList = hitsScrollContainer.childNodes[0];
        }
        if (!existingHitsList) {
          hitsList = document.createElement("div");
          hitsList.className = "bookmark-hits-list";
          hitsScrollContainer.appendChild(hitsList);
        } else {
          hitsList = existingHitsList;
        }
        var numExistingHitsListPageGroups = hitsList ? hitsList.childNodes.length : 0;
        var numNonEmptyPageGroups = numKeysWhere(resultsByPageKey, function (k, v) {
          return v.length !== 0;
        });
        // Remove extra page groups
        if (moreThanJustCursorUpdate) {
          for (var i = numNonEmptyPageGroups; i < numExistingHitsListPageGroups; i++) {
            hitsList.removeChild(hitsList.childNodes[hitsList.childNodes.length - 1]);
          }
          for (var i = numExistingHitsListPageGroups; i < numNonEmptyPageGroups; i++) {
            var containerForHitsItemsForPage = document.createElement("div");
            containerForHitsItemsForPage.className = "bookmark-hits-list-page";
            hitsList.appendChild(containerForHitsItemsForPage);
          }
        }
        var pageNum = 0;
        var cursorItem = null;
        forEachKey(resultsByPageKey, function (resultsForPage, pageKey) {
          var iInPageKey = 0;
          var existingPageGroup = hitsList.childNodes[pageNum];
          var numExistingPageGroupItems = existingPageGroup.childNodes.length - NUM_HEADERS;
          if (moreThanJustCursorUpdate) {
            for (var i = resultsForPage.length; i < numExistingPageGroupItems; i++) {
              existingPageGroup.removeChild(
                existingPageGroup.childNodes[existingPageGroup.childNodes.length - 1]
              );
            }
            // Add or remove the header.
            if (resultsForPage.length > 0 && existingPageGroup.childNodes.length === 0) {
              var hitsItemsHeaderForPage = document.createElement("div");
              hitsItemsHeaderForPage.className = "bookmark-hits-page-header";
              runner.pageState;
              hitsItemsHeaderForPage.innerText =
                runner.pageState[pageKey].markdownAndHeader.headerProps.title;
              existingPageGroup.appendChild(hitsItemsHeaderForPage);
            } else if (resultsForPage.length === 0 && existingPageGroup.childNodes.length !== 0) {
              existingPageGroup.removeChild(existingPageGroup.childNodes[0]);
            }
          }

          // Batch the markup parsing for performance Reduces update time (for
          // not mere cursor movements) from 45ms to 32ms (for example)
          var hitsItemsToReplaceContentsIn = [];
          var allMarkupForAllButtonContents = "";
          for (var i = 0; i < resultsForPage.length; i++) {
            var searchable = resultsForPage[i].searchable;
            // innerText causes layout/style computation
            var textContent = searchable.indexable.textContent;
            var _highlightResultContentValue = resultsForPage[i].highlightedInnerText;
            var topRowMarkup = resultsForPage[i].topRowMarkup;
            var hitsItem;
            // Reuse dom nodes to avoid flickering of css classes/animation.
            if (moreThanJustCursorUpdate) {
              if (existingPageGroup && existingPageGroup.childNodes[NUM_HEADERS + iInPageKey]) {
                hitsItem = existingPageGroup.childNodes[NUM_HEADERS + iInPageKey];
                hitsItem.onclick = null;
              } else {
                hitsItem = document.createElement("a");
                hitsItem.tabIndex = -1;
                hitsItem.className = "bookmark-hits-item";
                existingPageGroup.appendChild(hitsItem);
              }
            } else {
              hitsItem = existingPageGroup.childNodes[NUM_HEADERS + iInPageKey];
            }
            hitsItemsToReplaceContentsIn.push(hitsItem);
            if (
              effectiveCursor !== -1 &&
              effectiveCursor.pageCursor === pageKey &&
              effectiveCursor.pageCursorIndex === iInPageKey
            ) {
              cursorItem = hitsItem;
              hitsItem.classList.add("cursor");
            } else {
              hitsItem.classList.remove("cursor");
            }
            if (moreThanJustCursorUpdate) {
              hitsItem.onclick = function (pageKey, iInPageKey, searchable, e) {
                clickHandler(
                  searchComponent,
                  query,
                  resultsByPageKey,
                  pageKey,
                  iInPageKey,
                  searchable,
                  e
                );
              }.bind(null, pageKey, iInPageKey, searchable);
              hitsItem.href = runner.getUrlFromRootIncludingHashAndQuery(
                runner.lazySearchableCharacterCounts(searchable),
                searchable.originalInclusiveContext,
                pageKey
              );
              hitsItem.ontouchstart = emptyFunction;
              allMarkupForAllButtonContents +=
                '<div class="bookmark-hits-item-button-contents">' +
                topRowMarkup +
                _highlightResultContentValue +
                "</div>";
            }
            var justCursorUpdate = !moreThanJustCursorUpdate;
            iInPageKey++;
          }
          if (moreThanJustCursorUpdate) {
            var dummyForButtonContents = document.createElement("div");
            dummyForButtonContents.innerHTML = allMarkupForAllButtonContents;
            var numButtons = hitsItemsToReplaceContentsIn.length;
            for (var btnI = 0; btnI < numButtons; btnI++) {
              var hitsItemToUpdate = hitsItemsToReplaceContentsIn[btnI];
              while (hitsItemToUpdate.firstChild) {
                hitsItemToUpdate.firstChild.remove();
              }
              hitsItemToUpdate.appendChild(dummyForButtonContents.childNodes[0]);
            }
          }
          pageNum++;
        });
        if (cursorItem) {
          window.setTimeout(function () {
            customScrollIntoView({
              smooth: !moreThanJustCursorUpdate, // Instant scroll if result of typing.
              container: hitsScrollContainer,
              element: cursorItem,
              mode: "closest-if-needed",
              topMargin: 100,
              bottomMargin: 100,
            });
          }, 16);
        }
      }
    };
    var ROW_START_MARKUP =
      '<div class="bookmark-hits-item-button-contents-top-row"><div class="bookmark-hits-item-contents-top-row-crumb">';
    var ROW_START_MARKUP_LEN = ROW_START_MARKUP.length;
    var CHEVRON_MARKUP = '<span class="bookmark-hits-item-button-contents-crumb-sep">›</span>';
    Runner.prototype._appendContextCrumb = function (row, currentLevel, originalContext, level) {
      if (!row) {
        row = ROW_START_MARKUP;
      }
      if (originalContext[level]) {
        if (row.length !== ROW_START_MARKUP_LEN) {
          var chevron = CHEVRON_MARKUP;
          row += chevron;
        }
        var seg =
          '<span class="bookmark-hits-item-button-contents-crumb-row-first">' +
          escapeHtml(originalContext[level].levelContent.textContent) +
          "</span>";
        row += seg;
      }
      return row;
    };
    /**
     * @param originalContext - the originally captured context before filtering
     * or transforming into "searchables". It is a dictionary of h1,h2.. to the
     * original tree node before being mapped into an "indexed" form.
     */
    Runner.prototype.topRowForDocSearch = function (currentLevel, originalContext) {
      var row = null;
      if (currentLevel !== 1) {
        row = this._appendContextCrumb(row, currentLevel, originalContext, "h1");
      }
      if (currentLevel !== 2) {
        row = this._appendContextCrumb(row, currentLevel, originalContext, "h2");
      }
      if (currentLevel !== 3) {
        row = this._appendContextCrumb(row, currentLevel, originalContext, "h3");
      }
      if (currentLevel !== 4) {
        row = this._appendContextCrumb(row, currentLevel, originalContext, "h4");
      }
      if (currentLevel !== 5) {
        row = this._appendContextCrumb(row, currentLevel, originalContext, "h5");
      }
      if (currentLevel !== 6) {
        row = this._appendContextCrumb(row, currentLevel, originalContext, "h6");
      }
      return row + "</div></div>";
    };
    Runner.prototype.setupHitsScrollContainer = function () {
      var theSearchHitsId = this.pageTemplateOptions.searchHitsId;
      var theSearchHits = document.getElementById(theSearchHitsId);
      var hitsScrollContainer = theSearchHits.childNodes[0];
      var hitsScrollContainerAppearsSetup =
        hitsScrollContainer && hitsScrollContainer.className.indexOf("bookmark-hits-scroll") !== -1;
      // After this then this.getHitsScrollContainer() will work:

      // We are probably reviving a prerendered page
      if (theSearchHits && hitsScrollContainerAppearsSetup) {
        this.nodes.theSearchHits = theSearchHits;
        this.nodes.theHitsScrollContainer = hitsScrollContainer;
      } else if (theSearchHits && !hitsScrollContainer) {
        hitsScrollContainer = document.createElement("div");
        var hiddenClass = "bookmark-hits-scroll bookmark-hits-scroll-hidden";
        hitsScrollContainer.className = hiddenClass;
        theSearchHits.appendChild(hitsScrollContainer);
        this.nodes.theSearchHits = theSearchHits;
        this.nodes.theHitsScrollContainer = hitsScrollContainer;
      } else if (theSearchHitsId) {
        console.error(
          "You supplied options searchHitsId but we could not find one of the elements " +
            theSearchHitsId +
            ". Either that or something is wrong with the pre-rendering of the page"
        );
      }

      /**
       * Prevent blur from any existing controls that already have focus by
       * preventDefault on mouseDown event.
       * You can still style the mouse down state by using the css :active
       * pseudo-class.
       */
      hitsScrollContainer.addEventListener("mousedown", function (e) {
        e.preventDefault();
      });
      /**
       * Fix the age old safari iOS problem of ":active" css state persisting even
       * after a touch turned into a scroll.
       */
      var numActiveTouches = 0;
      hitsScrollContainer.addEventListener("scroll", function (e) {
        if(numActiveTouches > 0) {
          hitsScrollContainer.classList.add('scrolled-since-active-touches');
        }
      });
      hitsScrollContainer.addEventListener("touchstart", function (e) {
        numActiveTouches = e.touches.length;
        if(e.touches.length > 1) {
          e.preventDefault();
        }
      });
      hitsScrollContainer.addEventListener("touchend", function (e) {
        if(e.touches.length > 0) {
          e.preventDefault();
        }
        numActiveTouches = e.touches.length;
        if(numActiveTouches === 0) {
          hitsScrollContainer.classList.remove('scrolled-since-active-touches');
        }
      });
      hitsScrollContainer.addEventListener("touchcancel", function (e) {
        numActiveTouches = e.touches.length;
      });
    };

    Runner.prototype.getItemForCursor = function (effectiveCursor, resultsByPageKey) {
      if (effectiveCursor !== -1 && effectiveCursor !== null) {
        var keyIndex = keyIndexOrNegativeOne(effectiveCursor.pageCursor, resultsByPageKey);
        if (keyIndex !== -1) {
          var hitsScrollContainer = this.getHitsScrollContainer();
          var maybeHitsList = hitsScrollContainer.childNodes[0];
          if (maybeHitsList.className.indexOf("bookmark-hits-list") === -1) {
            return null;
          } else {
            var pageGroupNode = maybeHitsList.childNodes[keyIndex];
            return pageGroupNode.childNodes[NUM_HEADERS + effectiveCursor.pageCursorIndex];
          }
        }
      }
    };
    // alert('TODO: When clicking on document, set the active mode to null - let compeonts decide what they want to do when they are no longer the active mode. Dropdowns can reset their querystate to NONE. Autocompletes would not. Then make it so that all components get a notification for any active state transition away from them (or maybe even to them).');
    Runner.prototype.shouldSearchBeVisible = function (activeSearchComponent) {
      if (!activeSearchComponent) {
        return false;
      }
      if (this.searchState.userRequestedCloseEvenIfActive) {
        return false;
      } else {
        return true;
        // return activeSearchComponent.queryState !== QueryStates.NONE_AND_HIDE;
      }
    };
    Runner.prototype.setupSearchInput = function () {
      var runner = this;
      var theSearchFormId = runner.pageTemplateOptions.searchFormId;
      if (theSearchFormId) {
        var theSearchForm = document.getElementById(theSearchFormId);
        runner.searchState.CONTENT = new TextDocSearch({
          root: theSearchForm,
          /**
           * When input is blurred we do not set the active component to null.
           */
          onBlur: function inputBlur(e) {
            // console.log('blur input');
          },
          // TODO: Rembember last focused element so that escape can jump back to it.
          // Ctrl-c can toggle open, and Esc can toggle open + focus.
          // When hitting enter it can reset the "last focused" memory.
          onFocus: function doInputFocus(e) {
            setTimeout(function() {
            if (window["bookmark-header"]) {
              console.log('custom scroll into view');
              customScrollIntoView({
                smooth: true,
                container: "page",
                element: window["bookmark-header"],
                mode: "top",
                topMargin: 0,
                bottomMargin: 0,
              });
            }
            }, 25);
            // document.body.scrollTop = 400;
            // Can't really prevent default to prevent scroll. Software keyboard triggers it.
            // e.preventDefault();
          },
          onDoesntWantActiveStatus: function (comp) {
            // console.log('search input doesnt want');
            if (runner.searchState.activeSearchComponent === comp) {
              runner.setActiveSearchComponent(null);
              runner.updateSearchHitsVisibility(runner.searchState.activeSearchComponent);
            }
          },
          /**
           * When the component wants the popup menu to be shown for it, and it
           * has a useful (or new) .getQuery() that can be polled.
           */
          onWantsToHaveActiveStatus: function (comp) {
            runner.setActiveSearchComponent(comp);
            // Upon focus, reselect the first result cursor, otherwise keep old one
            // console.log("text input wants to have active status");

            var startDate = Date.now();
            runner.runSearchWithInputValue();
            var endDate = Date.now();
            // console.warn('onWantsToHaveActiveStatus duration', endDate - startDate);
          },
          onKeydown: function (e) {
            var startDate = Date.now();
            var ret = runner.handleSearchComponentKeydown(runner.searchState.CONTENT, e);
            var endDate = Date.now();
            // console.warn('key down time', endDate - startDate);
            return ret;
          },
          /**
           * Allow components to test if they are the active component.
           */
          isActiveComponent: function () {
            return runner.searchState.activeSearchComponent === runner.searchState.CONTENT;
          },
        });
      }
    };

    Runner.prototype.searchDocsWithActiveSearchComponent = function (query, renderTopRow) {
      var runner = this;
      var searchComponent = runner.searchState.activeSearchComponent;
      lazyHierarchicalIndexForSearch(runner.pageState);
      var hits = [];
      // move the current page to the front of the set.
      var linkInfo = getLink(null, null, window.location, window.location.href);
      var pageStateWithCurrentPageAtFront = moveKeyToFront(runner.pageState, linkInfo.pageKey);
      var subsetOfPages =
        runner.searchState.activeSearchComponent === runner.searchState.CONTENT
          ? keepOnlyKeys(pageStateWithCurrentPageAtFront, function(pageData, pageKey) {
            return !Flatdoc.getPageConfigBool('hideInSearch', pageData, false);
          })
          : keepOnlyKeys(pageStateWithCurrentPageAtFront, function (pageData, pageKey) {
            return runner.pageTemplateOptions.versionPageIs.toLowerCase() === pageKey;
          });
      if (searchComponent.queryState === QueryStates.ALL) {
        return hierarchicalRenderFilteredSearchables(
          query,
          mapKeys(subsetOfPages, (pageData, _) => {
            return pageData.hierarchicalIndex;
          }),
          renderTopRow
        );
      } else if (searchComponent.queryState === QueryStates.FILTER) {
        return hierarchicalRenderFilteredSearchables(
          query,
          filterHierarchicalSearchables(query, subsetOfPages),
          renderTopRow
        );
      } else {
        console.error(
          "Unknown query state",
          searchComponent.queryState,
          "for component",
          searchComponent
        );
      }
    };

    Runner.prototype.runSearchWithInputValue = function () {
      var runner = this;
      var theTextDocSearch = runner.searchState.CONTENT;
      if (runner.searchState.activeSearchComponent === theTextDocSearch) {
        var start = Date.now();
        var query = theTextDocSearch.getQuery();
        var resultsByPageKey = runner.searchDocsWithActiveSearchComponent(
          query,
          runner.topRowForDocSearch.bind(runner)
        );
        runner.updateSearchResultsList(
          runner.searchState.activeSearchComponent,
          query,
          runner.searchState.activeSearchComponent.resultsByPageKey,
          resultsByPageKey,
          runner.standardResultsClickHandler.bind(runner)
        );
        runner.searchState.activeSearchComponent.resultsByPageKey = resultsByPageKey;
        runner.updateSearchHitsVisibility(runner.searchState.activeSearchComponent);
        var end = Date.now();
        // console.log('Search updated on text change in ms:', end-start);
      }
    };

    Runner.prototype.setupVersionButton = function () {
      var runner = this;
      if (this.pageTemplateOptions.versionButtonId && this.pageTemplateOptions.versionPageIs) {
        var versionMenuButton = document.getElementById(this.pageTemplateOptions.versionButtonId);
        if (!versionMenuButton) {
          console.error(
            "Version menu selector/content with id ",
            this.pageTemplateOptions.versionButtonId,
            " doesnt exist"
          );
        }
        this.searchState.VERSIONS = new TextDocSelector({
          root: versionMenuButton,
          onKeydown: function (e) {
            return this.handleSearchComponentKeydown(runner.searchState.VERSIONS, e);
          }.bind(this),
          onWantsToHaveActiveStatus: function (comp) {
            runner.setActiveSearchComponent(comp);
            // Upon focus, reselect the first result cursor, otherwise keep old one
            console.log("version selector wants to have active status");
            runner.runVersionsSearch();
          },
          /**
           * Allow components to test if they are the active component.
           */
          isActiveComponent: function () {
            return runner.searchState.activeSearchComponent === runner.searchState.VERSIONS;
          },
          onDoesntWantActiveStatus: function (comp) {
            if (runner.searchState.activeSearchComponent === comp) {
              runner.setActiveSearchComponent(null);
              runner.updateSearchHitsVisibility(runner.searchState.activeSearchComponent);
            }
          },
          onBlur: function inputBlur(e) {
            console.log("blur input");
          },
          // TODO: Rembember last focused element so that escape can jump back to it.
          // Ctrl-c can toggle open, and Esc can toggle open + focus.
          // When hitting enter it can reset the "last focused" memory.
          onFocus: function doInputFocus(e) {
            if (window["bookmark-header"]) {
              window["bookmark-header"].scrollIntoView({ behavior: "smooth" });
            }
          },
        });
      }
    };
    Runner.prototype.updateSearchHitsVisibility = function (searchComponent) {
      // console.log('updateSearchHitsVisibility');
      var hitsScrollContainer = this.nodes.theHitsScrollContainer;
      if (!this.shouldSearchBeVisible(searchComponent)) {
        hitsScrollContainer.className = "bookmark-hits-scroll bookmark-hits-scroll-hidden";
        return false;
      } else {
        hitsScrollContainer.className = "bookmark-hits-scroll";
        return true;
      }
    };
    Runner.prototype.handleSearchComponentKeydown = function (searchComponent, evt) {
      var runner = this;
      // alert('need to make sure the active component is set here');
      var effectiveCursor = runner.effectiveCursor(
        searchComponent,
        searchComponent.resultsByPageKey
      );
      var isVisible = runner.shouldSearchBeVisible(searchComponent);
      var nextUserRequested;
      var down = (evt.keyCode === 78 && evt.ctrlKey) || evt.keyCode === 40; /* down */
      var up = (evt.keyCode === 80 && evt.ctrlKey) || evt.keyCode === 38; /* up */
      // 219 is [ and 67 is c
      var controlClose =
        (evt.keyCode === 219 && evt.ctrlKey) || (evt.keyCode === 67 && evt.ctrlKey);
      // Control n (on mac) or down arrow.
      if (down) {
        if (!isVisible && searchComponent.getQuery() !== "") {
          // Promote to zero on first down if neg one
          runner.searchState.userRequestedCloseEvenIfActive = false;
        }
        nextUserRequested = runner.nextCursorFromEffectiveCursor(
          effectiveCursor,
          searchComponent.resultsByPageKey
        );
      }
      // Control p (on mac) or up arrow.
      if (up) {
        nextUserRequested = runner.prevCursorFromEffectiveCursor(
          effectiveCursor,
          searchComponent.resultsByPageKey
        );
      }
      if (down || up) {
        searchComponent.userRequested = nextUserRequested;
      }
      if (isVisible && evt.keyCode === 13) {
        // enter
        var itemForCursor = runner.getItemForCursor(
          effectiveCursor,
          searchComponent.resultsByPageKey
        );
        $(itemForCursor)[0].click();
      } else if (!isVisible && evt.keyCode === 13) {
        runner.searchState.userRequestedCloseEvenIfActive = false;
      } else if (evt.keyCode === 27) {
        // console.log('local escape');
        // // Let's make escape close and blur
        // $(theSearchInput).blur();
        // runner.searchState.userRequestedCloseEvenIfActive = !runner.searchState.userRequestedCloseEvenIfActive;
        // runner.updateSearchHitsVisibility(searchComponent);
      } else if (controlClose) {
        // esc or ctrl-c
        // But ctrl-c can toggle without losing focus
        // runner.searchState.userRequestedCloseEvenIfActive = !runner.searchState.userRequestedCloseEvenIfActive;
        // runner.updateSearchHitsVisibility(searchComponent);
      }

      // Either way, visible or not - if enter is pressed, prevent default.
      // Because a "required" form field that is empty will submit on enter and
      // then make an ugly Chrome popup saying "this is required".
      if (down || up || evt.keyCode === 13) {
        var start = Date.now();
        evt.preventDefault();
        runner.updateSearchResultsList(
          searchComponent,
          searchComponent.getQuery(),
          searchComponent.resultsByPageKey,
          searchComponent.resultsByPageKey,
          runner.standardResultsClickHandler.bind(runner)
        );
        var end = Date.now();
        // console.log("updated cursor in ms:", end-start);
      }
    };

    Runner.prototype.deepestContextWithSlug = function (context) {
      return context.h6 && context.h6.id
        ? context.h6
        : context.h5 && context.h5.id
        ? context.h5
        : context.h4 && context.h4.id
        ? context.h4
        : context.h3 && context.h3.id
        ? context.h3
        : context.h2 && context.h2.id
        ? context.h2
        : context.h1 && context.h1.id
        ? context.h1
        : null;
    };

    /**
     * Local developer mode renders in browser, not prerendered.
     */
    Runner.prototype.isDeveloperMode = function () {
      var runner = this;
      var isDeveloperMode = !runner.discoveredToBePrerenderedAtUrl;
    };
    Runner.prototype.isSingleDocsMode = function () {
      var runner = this;
      var runPrerenderedInSingleDocsMode = runner.pageTemplateOptions.runPrerenderedInSingleDocsMode;
      var discoveredToBePrerenderedAtUrl = runner.discoveredToBePrerenderedAtUrl;
      return runner.isDeveloperMode() ? runner.pageTemplateOptions.runDevelopmentInSingleDocsMode : runPrerenderedInSingleDocsMode;
    };
    /**
     * Accepts a page key as supplied.
     */
    Runner.prototype.constructEscapedBaseUrlFromRoot = function (nonNormalizedPageKey, slugAndQueryParams) {
      var runner = this;
      var escapedNonNormalizedPageKey = nonNormalizedPageKey == null ? null : escapeHtml(nonNormalizedPageKey);
      var escapedSlugAndQueryParams = (slugAndQueryParams == null || slugAndQueryParams == '') ? null : escapeHtml(slugAndQueryParams);
      var linkInfo = getLink(runner.discoveredToBePrerenderedPageKey, runner.discoveredToBePrerenderedAtUrl, window.location, window.location.href);
      var asAnEmbeddedSubpageOfEntrypointPageKey = linkInfo.asAnEmbeddedSubpageOfEntrypointPageKey;
      var isSingleDocMode = runner.isSingleDocsMode();
      if (isSingleDocMode) {
        // For single page mode, you must have the following for referring to
        // an embedded page even if you have no other query params.  It must
        // end with a hash.
        // myPage.html#embeddedpage#
        var escapedHashSlugAndQueryParams = (escapedSlugAndQueryParams == null ? '#' : "#" + escapedSlugAndQueryParams);
        return "#" + escapedNonNormalizedPageKey + escapedHashSlugAndQueryParams;
      } else {
        var escapedHashSlugAndQueryParams = (escapedSlugAndQueryParams == null ? '' : "#" + escapedSlugAndQueryParams);
        if (asAnEmbeddedSubpageOfEntrypointPageKey.toLowerCase() === escapedNonNormalizedPageKey.toLowerCase()) {
          return escapedSlugAndQueryParams == null ?
            (escapedNonNormalizedPageKey + ".html") :
            escapedHashSlugAndQueryParams;
        } else {
          return escapedNonNormalizedPageKey + ".html" + escapedHashSlugAndQueryParams;
        }
      }
    };
    Runner.prototype.getUrlFromRootIncludingHashAndQuery = function (
      characterCounts,
      itemContext,
      itemPageKey
    ) {
      var runner = this;
      var bestSlug = bestSlugForContext(itemContext);
      var slugAndQueryParams =
        (bestSlug === null ? "" : bestSlug) +
        dictToSearchParams({txt: characterCountsToEncoded(characterCounts) });
      return runner.constructEscapedBaseUrlFromRoot(itemPageKey, slugAndQueryParams);
    };

    /**
     * TODO: Just put the href on anchor links.
     */
    Runner.prototype.standardResultsClickHandler = function (
      searchComponent,
      query,
      resultsByPageKey,
      pageKey,
      iInPageKey,
      searchable,
      e
    ) {
      var runner = this;
      searchComponent.userRequested = {
        pageCursor: pageKey,
        pageCursorIndex: iInPageKey,
      };
      runner.updateSearchResultsList(
        searchComponent,
        query,
        resultsByPageKey,
        resultsByPageKey,
        runner.standardResultsClickHandler.bind(runner)
      );
    };

    Runner.prototype.setupSearch = function () {
      var runner = this;
      runner.setupSearchInput();
      runner.setupVersionButton();
      runner.setupHitsScrollContainer();
      var theTextDocSearch = runner.searchState.CONTENT;
      var theSearchHits = runner.nodes.theSearchHits;
      if (!theTextDocSearch || !theSearchHits) {
        return;
      }
      var hitsScrollContainer = runner.nodes.theHitsScrollContainer;
      runner.nodes.theSearchHits.style.cssText +=
        "position: sticky; top: " + (headerHeight - 1) + "px; z-index: 100;";
      function setupGlobalKeybindings() {
        window.document.body.addEventListener("keypress", (e) => {
          if (!theTextDocSearch.isFocused() && e.key === "/") {
            theTextDocSearch.focus();
            theTextDocSearch.selectAll();
            e.preventDefault();
          }
        });
      }
      document.addEventListener("keydown", function (evt) {
        var controlClose =
          (evt.keyCode === 219 && evt.ctrlKey) || (evt.keyCode === 67 && evt.ctrlKey);
        if (evt.keyCode === 27) {
          // Let's make escape close and blur
          if (theTextDocSearch.isFocused()) {
            theTextDocSearch.blur();
          }
          if (!runner.searchState.userRequestedCloseEvenIfActive) {
            runner.searchState.userRequestedCloseEvenIfActive = true;
          }
          runner.setActiveSearchComponent(null);
          // Maybe updateSearchHitsVisibility should happen in setActiveSearchComponent.
          runner.updateSearchHitsVisibility(runner.searchState.activeSearchComponent);
        } else if (controlClose) {
          // esc or ctrl-c
          // But ctrl-c can toggle without losing focus
          runner.searchState.userRequestedCloseEvenIfActive = !runner.searchState
            .userRequestedCloseEvenIfActive;
          runner.updateSearchHitsVisibility(runner.searchState.activeSearchComponent);
        }
        // alert('todo have ctrl-c keep the current active component, but tell that component to go to QueryMode.NONE_AND_HIDE');
      });
      setupGlobalKeybindings();

      function onGlobalClickOff(e) {
        runner.setActiveSearchComponent(null);
        // We'll consider all other search modes to be "ephemeral".
        runner.updateSearchHitsVisibility(null);
        // e.stopPropagation();
      }
      document
        .querySelectorAll(".bookmark-content-root")[0]
        .addEventListener("click", onGlobalClickOff);
    };

    /**
     * TODO: Customize this.
     */
    Runner.prototype.topRowForVersionSearch = Runner.prototype.topRowForDocSearch;
    Runner.prototype.runVersionsSearch = function runVersionsSearch() {
      var runner = this;
      var searchComponent = runner.searchState.VERSIONS;
      if (window["bookmark-header"]) {
        window["bookmark-header"].scrollIntoView({ behavior: "smooth" });
      }
      runner.setActiveSearchComponent(searchComponent);
      console.log("running version search");
      // TODO: Reset this to NONE on blur/selection etc.
      runner.updateSearchHitsVisibility(runner.searchState.VERSIONS);
      var resultsByPageKey = runner.searchDocsWithActiveSearchComponent(
        searchComponent.getQuery(),
        runner.topRowForVersionSearch.bind(runner)
      );
      runner.updateSearchResultsList(
        searchComponent,
        searchComponent.getQuery(),
        searchComponent.resultsByPageKey,
        resultsByPageKey,
        runner.standardResultsClickHandler.bind(runner)
      );
      searchComponent.resultsByPageKey = resultsByPageKey;
    };

    Runner.prototype.makeCodeTabsInteractive = function () {
      $("codetabbutton").each(function (i, e) {
        var forTabContainerId = e.dataset.forContainerId;
        var index = e.dataset.index;
        $(e).on("click", function (evt) {
          var tabContainer = e.parentNode;
          console.log(
            'searching this query what: $("' + "#" + forTabContainerId + ' codetabbutton")'
          );
          $(e).addClass("bookmark-codetabs-active");
          $(tabContainer).removeClass("bookmark-codetabs-active1");
          $(tabContainer).removeClass("bookmark-codetabs-active2");
          $(tabContainer).removeClass("bookmark-codetabs-active3");
          $(tabContainer).removeClass("bookmark-codetabs-active4");
          $(tabContainer).removeClass("bookmark-codetabs-active5");
          $(tabContainer).addClass("bookmark-codetabs-active" + index);
        });
      });
    };

    /**
     * Remove any nodes that are not needed once rendered. This way when
     * generating a pre-rendered `.rendered.html`, they won't become part of the
     * bundle, when that rendered page is turned into a `.html` bundle. They have
     * served their purpose. Add `class='removeFromRenderedPage'` to anything you
     * want removed once used to render the page. (Don't use for script tags that
     * are needed for interactivity).
     */
    Runner.prototype.removeFromRenderedPage = function () {
      $(".removeFromRenderedPage").each(function (i, e) {
        e.parentNode.removeChild(e);
      });
    };

    /**
     * See documentation for `continueRight` css class in style.styl.
     */
    Runner.prototype.fixupAlignmentClasses = function () {
      document
        .querySelectorAll(
          // TODO: Add the tabs container here too.
          ".bookmark-content > img + pre," +
            ".bookmark-content > img + blockquote," +
            ".bookmark-content > p + pre," +
            ".bookmark-content > p + blockquote," +
            ".bookmark-content > ul + pre," +
            ".bookmark-content > ul + blockquote," +
            ".bookmark-content > ol + pre," +
            ".bookmark-content > ol + blockquote," +
            ".bookmark-content > h0 + pre," +
            ".bookmark-content > h0 + blockquote," +
            ".bookmark-content > h1 + pre," +
            ".bookmark-content > h1 + blockquote," +
            ".bookmark-content > h2 + pre," +
            ".bookmark-content > h2 + blockquote," +
            ".bookmark-content > h3 + pre," +
            ".bookmark-content > h3 + blockquote," +
            ".bookmark-content > h4 + pre," +
            ".bookmark-content > h4 + blockquote," +
            ".bookmark-content > h5 + pre," +
            ".bookmark-content > h5 + blockquote," +
            ".bookmark-content > h6 + pre," +
            ".bookmark-content > h6 + blockquote," +
            ".bookmark-content > table + pre," +
            ".bookmark-content > table + blockquote"
        )
        .forEach(function (e) {
          // Annotate classes for the left and right items that are "resynced".
          // This allows styling them differently. Maybe more top margins.  TODO:
          // I don't think that bookmark-synced-up-left is needed. continueRight
          // seems to do the trick and the css for bookmark-synced-up-left seems to
          // just ruin it actually.
          e.className += "bookmark-synced-up-right";
          if (e.previousSibling) {
            e.previousSibling.className += "bookmark-synced-up-left";
          }
        });
    };

    Runner.prototype.setupLeftNavScrollHighlighting = function () {
      var majorHeaders = $("h2, h3");
      majorHeaders.length &&
        majorHeaders.scrollagent(function (cid, pid, currentElement, previousElement) {
          if (pid) {
            var anchorForHeader = document.getElementById(pid + '-link');
            $(anchorForHeader).removeClass('active');
          }
          if (cid) {
            var anchorForHeader = document.getElementById(cid + '-link');
            $(anchorForHeader).addClass('active');
          }
        });
    };

    Runner.prototype.lazySearchableCharacterCounts = function (searchable) {
      if (!searchable.characterCounts) {
        searchable.characterCounts = computeCharacterCounts(
          getDomThingInnerText(searchable.indexable)
        );
      }
      return searchable.characterCounts;
    };
    Runner.prototype.lazyComputeTreeNodeCharacterCounts = function (treeNode) {
      for (var i = 0; i < treeNode.levelContent.length; i++) {
        var oneSearchable = treeNode.levelContent[i];
        this.lazySearchableCharacterCounts(oneSearchable);
      }
    };
    Runner.prototype.findBestTextMatchInHierarchicalIndex = function (
      hashContents,
      encodedCharacterCountsFind,
      hierarchicalDoc
    ) {
      var runner = this;
      var bestCandidate = null;
      var bestCandidateDistance = 9999999;
      var bestCandidateSlugMatches = false;
      var characterCounts = encodedToCharacterCounts(encodedCharacterCountsFind);
      var checkCharacterCounts = function (treeNode, inclusiveContext) {
        if (!bestCandidateSlugMatches || bestCandidateDistance !== 0) {
          var bestSlug = bestSlugForContext(inclusiveContext);
          runner.lazyComputeTreeNodeCharacterCounts(treeNode);
          for (var i = 0; i < treeNode.levelContent.length; i++) {
            var oneSearchable = treeNode.levelContent[i];
            var distance = computeCharacterCountDistance(
              oneSearchable.characterCounts,
              characterCounts
            );
            var slugMatches = hashContents === bestSlug;
            if (
              distance < bestCandidateDistance ||
              (distance === bestCandidateDistance && slugMatches)
            ) {
              // You can watch it refine search results down.
              // console.log("Improving distance", distance, getDomThingInnerText(oneSearchable.indexable).substr(0, 400));
              bestCandidate = oneSearchable.indexable;
              bestCandidateDistance = distance;
              bestCandidateSlugMatches = slugMatches;
            }
          }
        }
      };
      forEachHierarchy(checkCharacterCounts, hierarchicalDoc);
      return bestCandidate;
    };

    Runner.prototype.handleWindowHashChange = function () {
      var runner = this;
      runner.activatePageForCurrentUrl();
      
      var linkInfo = getLink(
        runner.discoveredToBePrerenderedPageKey,
        runner.discoveredToBePrerenderedAtUrl,
        window.location,
        window.location.href
      );
      var pageData = runner.pageState[linkInfo.pageKey];
      if(!pageData) {
        console.error('Page does not exist in pages: config (usually in your siteTemplate)');
        var linkInfo = getLink(
          runner.discoveredToBePrerenderedPageKey,
          runner.discoveredToBePrerenderedAtUrl,
          window.location,
          window.location.href
        );
        return;
      }
      
      var hashContents = linkInfo.hashContents;
      var queryParams = linkInfo.queryParams;

      var goToHeaderAsFallbackIfNotFound = function () {
        scrollIntoViewAndHighlightNodeById(
          fullyQualifiedHeaderId(linkInfo.hashContents, linkInfo.pageKey)
        );
      };
      if(!linkInfo) {
        console.error('You are trying to load a page that is not registered in the site template');
        return;
      }
      if (queryParams && queryParams.txt != null) {
        var pageKey = linkInfo.pageKey;
        lazyHierarchicalIndexForSearch(runner.pageState);
        // TODO: redirect to moved text blocks.
        var found = runner.findBestTextMatchInHierarchicalIndex(
          hashContents,
          queryParams.txt,
          runner.pageState[pageKey].hierarchicalIndex
        );
        // Can't get client bounding rect of text nodes, so don't try to scroll
        // to them and markdown parsers won't generate floating text anyways.
        if (
          found &&
          getDomThingInnerText(found).trim() !== "" &&
          found.nodeType !== Node.TEXT_NODE
        ) {
          scrollIntoViewAndHighlightNode(found);
        } else {
          goToHeaderAsFallbackIfNotFound();
        }
      } else if (hashContents !== "") {
        goToHeaderAsFallbackIfNotFound();
      }
    };
    Runner.prototype.waitForImages = function () {
      var runner = this;
      var onAllImagesLoaded = function () {
        // Has to be done after images are loaded for correct detection of position.
        runner.setupLeftNavScrollHighlighting();
        window.addEventListener("hashchange", runner.handleWindowHashChange.bind(runner));
        // Rejump after images have loaded
        runner.handleWindowHashChange();
        /**
         * If you add a style="display:none" to your document body, we will clear
         * the style after the styles have been injected. This avoids a flash of
         * unstyled content.
         * Only after scrolling and loading a stable page with all styles, do we
         * reenable visibility.
         * TODO: This is only needed if there is a hash in the URL. Otherwise,
         * we can show the page immediately, non-blocking since we don't need to scroll
         * to the current anchor. (We don't need to wait for images to load which are
         * likely below the fold). This assumes we can implement a header that is scalable
         * entirely in css. As soon as styles are loaded, the visibility can be shown.
         */
        console.log("all images loaded at", Date.now());
        document.body.style = "visibility: revert";
      };

      var imageCount = $("img").length;
      var nImagesLoaded = 0;
      // Wait for all images to be loaded by cloning and checking:
      // https://cobwwweb.com/wait-until-all-images-loaded
      // Thankfully browsers cache images.
      function onOneImageLoaded(loadedEl) {
        nImagesLoaded++;
        if (nImagesLoaded == imageCount) {
          onAllImagesLoaded();
        }
      }
      if (imageCount === 0) {
        onAllImagesLoaded();
      } else {
        $("img").each(function (_i, imgEl) {
          $("<img>").on("load", onOneImageLoaded).attr("src", $(imgEl).attr("src"));
          $("<img>").on("error", onOneImageLoaded).attr("src", $(imgEl).attr("src"));
        });
      }
    };

    Runner.prototype.run = function (
      onCurrentRenderPageDone,
      onAllRenderPagesDone,
      onNextIndexPageDone,
      onAllIndexPagesDone
    ) {};

    /**
     * We create placeholder nodes inside the template to hold the old template
     * data. It can't remain in comment form otherwise page crushing tools
     * might strip the comments.
     */
    Runner.prototype.getTemplateStringsFromContainer = function(templateContainer) {
      var isAlreadyExpanded = templateContainer.className.indexOf('expanded') !== -1;
      if(isAlreadyExpanded) {
        var childElements = templateContainer.children;
        // They have been expanded into divs that have text content with the
        // original comment contents.
        return Array.prototype.map.call(childElements, function(ce) {
          return ce.textContent;
        });
      } else {
        var commentTexts = [];
        for (var j = 0; j < templateContainer.childNodes.length; j++) {
          var maybeComment = templateContainer.childNodes[j];
          if (maybeComment.nodeType === Node.COMMENT_NODE) {
            commentTexts.push(maybeComment.data);
          }
        }
        return commentTexts;
      };
    };

    Runner.prototype.substituteAndInjectTemplatesBefore = function(templateContainerNode, templateStrings, f) {
      var dummyDiv = document.createElement("div");
      var replacedTemplates = templateStrings.map(f);
      var newHTML = replacedTemplates.join("");
      dummyDiv.innerHTML = newHTML;
      Array.prototype.forEach.call(dummyDiv.children, function(newNode) {
        templateContainerNode.parentNode.insertBefore(newNode, templateContainerNode);
      });
    };

    Runner.prototype.templatePlaceholderNodes = function(templateStrings) {
      return templateStrings.map(function(template) {
        var newPlaceholderNode = document.createElement('div');
        newPlaceholderNode.textContent = template;
        return newPlaceholderNode;
      });
    };
    Runner.prototype.substituteInDomSiteTemplateAfterSiteTemplateLoadedSingle = function() {
      var runner = this;
      console.log(Object.keys(runner.pageState));
      var templateContainers = $("div.bookmarkTemplate");
      for (var i = 0; i < templateContainers.length; i++) {
        var templateContainer = templateContainers[i];
        var templateStrings = runner.getTemplateStringsFromContainer(templateContainer);
        var isAlreadyExpanded = templateContainer.className === 'expanded bookmarkTemplate';
        var replacer = function(template) {
          return template.replaceAll(
            /\$\{Bookmark\.Template\.Pages\.([a-zA-Z\-\/]+)\.number\}/g,
            function(s, key) {
              var pageKey = key.toLowerCase();
              return runner.pageState[pageKey] ? ("" + +(indexOfKey(runner.pageState, pageKey))) : 'ERROR';
            }
          ).replaceAll(
            /\$\{Bookmark\.Template\.DomResourcesById\.([a-zA-Z\/]+)\.([a-zA-Z\/]+)\}/g,
            function(s, id, attrName) {
              var element = document.getElementById(id);
              if(element) {
                var attr = element.getAttribute(attrName);
                return escapeHtml(attr);
              } else {
                return 'element-with-id-not-found';
              }
            }
          );
        };
        if(isAlreadyExpanded) {
          removeSiblingsBefore(templateStrings.length, templateContainer);
          runner.substituteAndInjectTemplatesBefore(templateContainer, templateStrings, replacer);
        } else {
          runner.substituteAndInjectTemplatesBefore(templateContainer, templateStrings, replacer);
          var placeholderTextContentNodes = runner.templatePlaceholderNodes(templateStrings);
          templateContainer.innerHTML = "";
          placeholderTextContentNodes.forEach(function(nd) {templateContainer.appendChild(nd);});
          templateContainer.className = "expanded bookmarkTemplate";
          templateContainer.style = "display:none";
        }
        // templateContainer.parentNode.removeChild(templateContainer);
      }
    };

    Runner.prototype.substituteInDomSiteTemplateAfterSiteTemplateLoadedForEach = function() {
      var runner = this;
      var templateContainers = $("div.bookmarkTemplateForEachPage");
      
      var replacer = function(pageKey, onePageState, commentText) {
        var originalKeyIndex = indexOfKey(runner.pageState, pageKey);
        var linkText = Flatdoc.getPageConfig('linkText', onePageState, kebabToWords(pageKey));
        var hideInNav = Flatdoc.getPageConfig('hideInNav', onePageState, false).toString();
        return commentText
          .replaceAll(/\$\{Bookmark\.Template\.ForEachPage\.number\}/g, "" + +originalKeyIndex)
          .replaceAll(/\$\{Bookmark\.Template\.ForEachPage\.url\}/g, runner.constructEscapedBaseUrlFromRoot(pageKey))
          .replaceAll(/\$\{Bookmark\.Template\.ForEachPage\.key\}/g, escapeHtml(pageKey))
          .replaceAll(/\$\{Bookmark\.Template\.ForEachPage\.linkText\}/g, escapeHtml(linkText))
          .replaceAll(/\$\{Bookmark\.Template\.ForEachPage\.hideInNav\}/g, escapeHtml(hideInNav));
      };
      for (var i = 0; i < templateContainers.length; i++) {
        var templateContainer = templateContainers[i];
        var templateStrings = runner.getTemplateStringsFromContainer(templateContainer);
        var isAlreadyExpanded = templateContainer.className === 'bookmarkTemplateForEachPage expanded';
        var substituteAndInjectForPage = function() {
          for (var pageKey in runner.pageState) {
            var onePageState = runner.pageState[pageKey];
            runner.substituteAndInjectTemplatesBefore(
              templateContainer,
              templateStrings,
              replacer.bind(null, pageKey, onePageState)
            );
          }
        };
        if(isAlreadyExpanded) {
          var pageCount = numKeys(runner.pageState);
          removeSiblingsBefore(templateStrings.length * pageCount, templateContainer);
          substituteAndInjectForPage();
        } else {
          substituteAndInjectForPage();
          var placeholderTextContentNodes = runner.templatePlaceholderNodes(templateStrings);
          templateContainer.innerHTML = "";
          placeholderTextContentNodes.forEach(function(nd) {templateContainer.appendChild(nd);});
          templateContainer.className = "bookmarkTemplateForEachPage expanded";
          templateContainer.style = "display:none";
        }
        // templateContainer.parentNode.removeChild(templateContainer);
      }
    };

    Runner.prototype.substituteInDomSiteTemplateAfterSiteTemplateLoaded = function () {
      this.substituteInDomSiteTemplateAfterSiteTemplateLoadedForEach();
      this.substituteInDomSiteTemplateAfterSiteTemplateLoadedSingle();
    };

    /**
     * Page level event handlers and styles.
     * https://stackoverflow.com/a/38514545
     * Detecting hardward keyboards is too hard, because you need to use key
     * timing and that's too unpredictable especially when your key down and up
     * have long running computations.
     * https://stackoverflow.com/a/42728257
     * Instead, we should do something for the search input specifically. Set
     * the cursor to negative one by default when we are on a touch device.
     * Then use any down/up/ctrl-p/ctrl-n to infer a physical keyboard and set
     * the cursor to the first item.
     * For now, we'll pretend we've solved that problem with a css class to
     * target styles '.probably-has-keyboard' which will (for now) always be
     * equal to !can-touch.
     */
    Runner.prototype.setupPage = function () {
      document.body.classList.add('probably-has-keyboard');
      var isTouch = false;
      var hasKeyboard = false;
      var isTouchTimer;
      //var indicating current document root class ("can-touch" or "")
      var curRootTouchClass = '';

      function addTouchClass(e) {
        clearTimeout(isTouchTimer);
        isTouch = true;
        //add "can-touch' class if it's not already present
        if (curRootTouchClass != 'can-touch') {
          curRootTouchClass = 'can-touch';
          document.body.classList.add(curRootTouchClass);
          document.body.classList.remove('probably-has-keyboard');
        }
        //maintain "istouch" state for 500ms so removetouchclass doesn't get
        //fired immediately following a touch event
        isTouchTimer = setTimeout(function(){isTouch = false;}, 500)
      }
      function removeTouchClass(e) {
        if (!isTouch && curRootTouchClass == 'can-touch'){ //remove 'can-touch' class if not triggered by a touch event and class is present
          isTouch = false;
          curRootTouchClass = '';
          document.body.classList.remove('can-touch')
          document.body.classList.add('probably-has-keyboard')
        }
      }
      
      document.addEventListener('touchstart', addTouchClass, false);
      document.addEventListener('mouseover', removeTouchClass, false);
    };
    Runner.prototype.handleReady = function() {
      var runner = this;
      this.removeFromRenderedPage();
      this.fixupAlignmentClasses();
      this.waitForImages();
      runner.makeCodeTabsInteractive();
      // Need to focus the window so global keyboard shortcuts are heard.
      $(window).focus();
      if (typeof mediumZoom !== 'undefined') {
        mediumZoom(document.querySelectorAll('.bookmark-content img'), {
          scrollOffset: 20,
          container: document.body,
          margin: 24,
          background: '#ffffff',
        });
        document.querySelectorAll('.bookmark-content img').forEach(function(img) {
          var parent = img.parentElement;
          if (parent && parent.tagName.toUpperCase() === 'P') {
            // Allows targeting css for containers of images
            // since has() selector is not yet supported in css
            parent.className += ' imageContainer';
          } 
        });
      }
    };
    /**
     * Loads the Markdown document (via the fetcher), parses it, and applies it
     * to the elements.
     */
    Runner.prototype.run = function (
      onCurrentRenderPageDone,
      onAllRenderPagesDone,
      onNextIndexPageDone,
      onAllIndexPagesDone
    ) {
      var start = Date.now();
      var runner = this;
      runner.setupPage();
      runner.setupSearch();
      if (document.body.dataset.bookmarkAlreadyRenderedAtHref) {
        runner.discoveredToBePrerenderedAtUrl = new URL(document.body.dataset.bookmarkAlreadyRenderedAtHref);
        runner.discoveredToBePrerenderedPageKey = document.body.dataset.bookmarkAlreadyRenderedPageKey;
        runner.handleReady();
        runner.handleDocsFetchedCachedInDom();
        return;
      }
      // Have to store the file protocol/domain/path because when using Save As
      // links aren't relativized and on loading the saved page we have to
      // rewrite them relative to the saved page.
      var currentLinkInfo = getLink(null, null, window.location, window.location.href);
      document.body.dataset.bookmarkAlreadyRenderedAtHref = window.location.href;
      document.body.dataset.bookmarkAlreadyRenderedPageKey = currentLinkInfo.pageKey;
      var stylusFetchedYet = !runner.stylusFetcher;
      var allDocsFetchedYet = false;
      var everythingFetchedYet = false;
      var stylusResult = null;
      function handleDones() {
        var foundUnfetchedDoc = false;
        forEachKey(runner.pageState, function (chapData, _) {
          foundUnfetchedDoc = foundUnfetchedDoc || chapData.markdownAndHeader === null;
        });
        var wasEverythingFetchedYetBefore = allDocsFetchedYet && stylusFetchedYet;
        if (!allDocsFetchedYet && !foundUnfetchedDoc) {
          allDocsFetchedYet = true;
          runner.handleDocsFetched();
        }
        if (!stylusFetchedYet && !!stylusResult) {
          stylusFetchedYet = true;
        }
        everythingFetchedYet = allDocsFetchedYet && stylusFetchedYet;
        if (everythingFetchedYet && !wasEverythingFetchedYetBefore) {
          runner.handleReady();
        }
      }

      var fetchOne = function (fetcher, cb) {
        fetcher(function (err, md) {
          if (err) {
            cb(err, null);
            return;
          }
          var markdown = normalizeMarkdownResponse(md);
          var markdownNormalizedCodeTabs = normalizeDocusaurusCodeTabs(markdown);
          var markdownNormalizedYaml = normalizeYamlMarkdownComments(markdownNormalizedCodeTabs);
          var markdownAndHeader = parseYamlHeader(markdownNormalizedYaml, window.location.pathname);
          // Parse out the YAML header if present.
          var data = markdownAndHeader;
          cb(err, data);
        });
      };
      var alreadySpecifiedPageKeys = Object.keys(runner.pageState);
      var handleFetchDone = function (pageKey, err, data) {
        console.log('handling fetch done', pageKey);
        runner.pageState[pageKey].markdownAndHeader = data;
        if(err) {
          console.error("[Flatdoc] fetching Markdown data failed for page:" + pageKey + ".", err);
        } else {
          // If we encounter a next page that hasn't been fetched yet, fetch it.
          var exploreKey = 
            (data.headerProps.nextPage && !runner.pageState[data.headerProps.nextPage]) ? data.headerProps.nextPage :
            (data.headerProps.rootPage && !runner.pageState[data.headerProps.rootPage]) ? data.headerProps.rootPage : null;
          if(data.headerProps.nextPage === pageKey) {
            console.error('Page ' + newPageKey + ' has set itself as the "nextPage". Fix this.');
          }
          if(exploreKey) {
            var newPageKey = exploreKey.toLowerCase();
            var newPageState = Flatdoc.emptyPageData(newPageKey);
            runner.pageState[newPageKey] = newPageState;
            runner.pageState = ensureKeyValOrderCircular(runner.pageState, pageKey, newPageKey);
            Flatdoc.setFetcher(newPageKey, runner.pageState[newPageKey]);
            fetchOne(runner.pageState[newPageKey].fetcher, handleFetchDone.bind(null, newPageKey));
          }
        }
        handleDones();
      };
      if (runner.stylusFetcher) {
        var templateFetchStart = Date.now();
        runner.stylusFetcher(function (err, stylusTxt) {
          // Will run sync
          runner.renderAndInjectStylus(err, stylusTxt, function (res) {
            stylusResult = res;
            handleDones();
          });
        });
      }
      forEachKey(runner.pageState, function (pageData, pageKey) {
        fetchOne(pageData.fetcher, handleFetchDone.bind(null, pageKey));
      });
    };

    Runner.prototype.renderAndInjectStylus = function (err, stylusTxt, cb) {
      var runner = this;
      if (err) {
        console.error("[Flatdoc] fetching Stylus data failed.", err);
        cb("");
      } else {
        window.stylus.render(stylusTxt, function (err, result) {
          if (err) {
            console.error("Stylus error:" + err.message);
            cb("");
          } else {
            var style = document.createElement("style");
            style.type = "text/css";
            style.name = "style generated from .styl.html file";
            style.innerHTML = result;
            var start = Date.now();
            document.getElementsByTagName("head")[0].appendChild(style);
            style.onload = function (e) {
              var end = Date.now();
              console.log("css load event delayed showing page by", end - start);
            };
            cb(stylusTxt);
          }
        });
      }
    };

    Runner.prototype.handleDocsFetchedCachedInDom = function () {
      var runner = this;
      var isSingleDocMode = runner.isSingleDocsMode();
      
      function findAndSlugifyExperience(pageKey, pageData) {
        var contentContainerForPage = $(".bookmark-content.page-" + pageKey)[0];
        var titleH0 = $(contentContainerForPage).find("h0").eq(0);
        var titleH1 = $(contentContainerForPage).find("h1").eq(0);
        var title = titleH0.length ? titleH0.text() : titleH1.length ? titleH1.text() : null;
        var subtitle = $(contentContainerForPage).find(".bookmark-content-subtitle").eq(0);
        var hierarchicalDoc = hierarchize($(contentContainerForPage)[0]);
        annotateSlugsOnTreeNodes(hierarchicalDoc, runner.pageTemplateOptions.slugContributions);
        // TODO: Can do this on setTimeout.
        var menuContainerNode = $(".bookmark-menubar.page-" + pageKey)[0];
        var contentContainerNode = $(".bookmark-content.page-" + pageKey)[0];
        fixAllAnchorLinksUnderRoot(runner, menuContainerNode);
        fixAllAnchorLinksUnderRoot(runner, contentContainerNode);
        return {
          ...pageData,
          markdownAndHeader: {
            // We don't retain the original markdown on prerendered pages.
            markdown: null,
            headerProps: {
              title: title,
              subtitle: subtitle,
              title: contentContainerNode.dataset.title,
              subtitle: contentContainerNode.dataset.subtitle,
              hideInSearch: contentContainerNode.dataset.hideInSearch,
              hideInNav: contentContainerNode.dataset.hideInNav
            },
          },
          contentContainerNode: contentContainerNode,
          menuContainerNode: menuContainerNode,
          hierarchicalDoc: hierarchicalDoc,
        };
      }
      $('.bookmark-content.page').each(function(index, node) {
        var pageKey = node.dataset.pageKey;
        runner.pageState[pageKey] = Flatdoc.emptyPageData(pageKey);
      });
      runner.pageState = mapKeys(runner.pageState, function (data, pageKey) {
        return findAndSlugifyExperience(pageKey, data);
      });
      runner.substituteInDomSiteTemplateAfterSiteTemplateLoaded();
    };
    Runner.prototype.handleDocsFetched = function () {
      var runner = this;
      function appendExperience(pageKey, pageData) {
        var markdownAndHeader = pageData.markdownAndHeader;

        marked = exports.marked;

        Parser.setMarkedOptions(runner.highlight);

        // TODO
        var premangledContent = $("<div>" + marked(markdownAndHeader.markdown) + "</div>");
        var pageClassName = "page page-" + pageKey;
        var containerForPageContent = document.createElement("div");
        containerForPageContent.className = "bookmark-content " + pageClassName;
        containerForPageContent.dataset.pageKey = pageKey;
        containerForPageContent.dataset.title = markdownAndHeader.headerProps.title;
        containerForPageContent.dataset.subtitle = markdownAndHeader.headerProps.subtitle;
        containerForPageContent.dataset.hideInSearch = markdownAndHeader.headerProps.hideInSearch;
        containerForPageContent.dataset.hideInNav = markdownAndHeader.headerProps.hideInNav;
        if (markdownAndHeader.headerProps.title) {
          var titleForPage = document.createElement("h0");
          titleForPage.className = "bookmark-content-title " + pageClassName;
          // Prepend the title to the main content section so it matches the style
          // of content (indentation etc).
          titleForPage.innerText = markdownAndHeader.headerProps.title;
          containerForPageContent.appendChild(titleForPage);
          if (markdownAndHeader.headerProps.subtitle) {
            var subtitleForPage = document.createElement("p");
            subtitleForPage.className = "bookmark-content-subtitle";
            containerForPageContent.appendChild(subtitleForPage);
            subtitleForPage.innerText = markdownAndHeader.headerProps.subtitle;
          }
        } else {
          // Not really doing anything with this right now. Should probably set
          // the page <title> to this if it wasn't set in the markdown header
          // props (but how at this point?)
          title = premangledContent.find("h1").eq(0).text();
        }
        var nonBlankContent = $(premangledContent).find(">*");
        var menuBarForPage = document.createElement("div");
        menuBarForPage.className = "bookmark-menubar " + pageClassName;
        var containerForPageMenu = document.createElement("div");
        containerForPageMenu.className = "bookmark-menu section " + pageClassName;
        menuBarForPage.appendChild(containerForPageMenu);

        // It's mutated.
        var mangledContentForPage = premangledContent;

        Array.prototype.forEach.call(nonBlankContent, (itm) =>
          containerForPageContent.appendChild(itm)
        );
        Transformer.buttonize(containerForPageContent);
        
        Transformer.smartquotes(containerForPageContent);

        var hierarchicalDoc = hierarchize(containerForPageContent);
        annotateSlugsOnTreeNodes(hierarchicalDoc, runner.pageTemplateOptions.slugContributions);
        // Has to be done after annotating slugs.
        Transformer.addIDsToHierarchicalDoc(runner, hierarchicalDoc, pageKey);
        var menu = Transformer.getMenu(runner, $(containerForPageContent));
        Array.prototype.forEach.call(MenuView(menu, pageKey), (itm) =>
          containerForPageMenu.appendChild(itm)
        );

        fixAllAnchorLinksUnderRoot(runner, containerForPageContent);
        fixAllAnchorLinksUnderRoot(runner, menuBarForPage);
        return {
          ...pageData,
          contentContainerNode: containerForPageContent,
          menuContainerNode: menuBarForPage,
          hierarchicalDoc: hierarchicalDoc,
        };
      }
      runner.pageState = mapKeys(runner.pageState, function (data, pageKey) {
        return appendExperience(pageKey, data);
      });

      runner.substituteInDomSiteTemplateAfterSiteTemplateLoaded();
      runner.appendDocNodesToDom(runner.pageState);
    };

    Runner.prototype.appendDocNodesToDom = function (data) {
      var contentRootNode = $(".bookmark-content-root")[0];
      var append = function (data, _) {
        contentRootNode.appendChild(data.contentContainerNode);
        contentRootNode.appendChild(data.menuContainerNode);
      };
      forEachKey(data, append, append);
    };

    Runner.prototype.activatePageForCurrentUrl = function () {
      var runner = this;
      var linkInfo = getLink(null, null, window.location, window.location.href);
      var linkInfo = getLink(
        runner.discoveredToBePrerenderedPageKey,
        runner.discoveredToBePrerenderedAtUrl,
        window.location,
        window.location.href
      );
      var pageData = runner.pageState[linkInfo.pageKey];
      if(!pageData) {
        var linkInfo = getLink(
          runner.discoveredToBePrerenderedPageKey,
          runner.discoveredToBePrerenderedAtUrl,
          window.location,
          window.location.href
        );
        console.error('Page does not exist in pages: config (usually in your siteTEmplate)');
        return;
      }
      var currentPageKeyClass = "current-page-key-" + linkInfo.pageKey;
      var alreadyActivated = document.body.classList.contains(currentPageKeyClass);
      if(alreadyActivated) {
        return;
      }
      for (var i = 0; i < 30; i++) {
        document.body.classList.remove("current-page-number-" + i);
      }
      var toggleClasses = function (data, pageKey) {
        document.body.classList.remove("current-page-key-" + pageKey);
        pageData === data
          ? data.contentContainerNode.classList.add("current")
          : data.contentContainerNode.classList.remove("current");
        pageData === data
          ? data.menuContainerNode.classList.add("current")
          : data.menuContainerNode.classList.remove("current");
      };
      if(pageData !== null) {
        if(pageData.markdownAndHeader.headerProps && pageData.markdownAndHeader.headerProps.title) {
          document.title = pageData.markdownAndHeader.headerProps.title;
        }
        var currentPageIndex = indexOfKey(runner.pageState, linkInfo.pageKey);
        if (currentPageIndex !== -1) {
          document.body.classList.add("current-page-number-" + currentPageIndex);
        }
        forEachKey(runner.pageState, toggleClasses, toggleClasses);
        document.body.classList.add(currentPageKeyClass);
        document.body.scrollTop = 0;
      }
    };

    /**
     * Fetches a given element from the DOM.
     *
     * Returns a jQuery object.
     * @api private
     */

    Runner.prototype.el = function (aspect) {
      return $(this[aspect], document.body);
    };

    /*
     * Helpers
     */

    // http://stackoverflow.com/questions/298750/how-do-i-select-text-nodes-with-jquery
    function getTextNodesIn(el) {
      var exclude = "iframe,pre,code";
      return $(el)
        .find(":not(" + exclude + ")")
        .andSelf()
        .contents()
        .filter(function () {
          return this.nodeType == 3 && $(this).closest(exclude).length === 0;
        });
    }

    // http://www.leancrew.com/all-this/2010/11/smart-quotes-in-javascript/
    function quotify(a) {
      a = a.replace(/(^|[\-\u2014\s(\["])'/g, "$1\u2018"); // opening singles
      a = a.replace(/'/g, "\u2019"); // closing singles & apostrophes
      a = a.replace(/(^|[\-\u2014\/\[(\u2018\s])"/g, "$1\u201c"); // opening doubles
      a = a.replace(/"/g, "\u201d"); // closing doubles
      a = a.replace(/\.\.\./g, "\u2026"); // ellipses
      a = a.replace(/--/g, "\u2014"); // em-dashes
      return a;
    }
  })(jQuery);

/*! jQuery.scrollagent (c) 2012, Rico Sta. Cruz. MIT License.
 *  https://github.com/rstacruz/jquery-stuff/tree/master/scrollagent */

// Call $(...).scrollagent() with a callback function.
//
// The callback will be called everytime the focus changes.
//
// Example:
//
//      $("h2").scrollagent(function(cid, pid, currentElement, previousElement) {
//        if (pid) {
//          $("[href='#"+pid+"']").removeClass('active');
//        }
//        if (cid) {
//          $("[href='#"+cid+"']").addClass('active');
//        }
//      });

(function($) {

  $.fn.scrollagent = function(options, callback) {
    if (typeof callback === 'undefined') {
      callback = options;
      options = {};
    }

    var $sections = $(this);
    var $parent = options.parent || $(window);

    // Find the top offsets of each section
    var offsets = [];
    $sections.each(function(i) {
      var offset = $(this).attr('data-anchor-offset') ?
        parseInt($(this).attr('data-anchor-offset'), 10) :
        (options.offset || 0);

      offsets.push({
        id: $(this).attr('id'),
        index: i,
        el: this,
        offset: offset
      });
    });

    // State
    var current = null;
    var height = null;
    var range = null;

    // Save the height. Do this only whenever the window is resized so we don't
    // recalculate often.
    $(window).on('resize', function() {
      height = $parent.height();
      range = $(document).height();
    });

    // Find the current active section every scroll tick.
    $parent.on('scroll', function() {
      var y = $parent.scrollTop();
      // y += height * (0.3 + 0.7 * Math.pow(y/range, 2));

      var latest = null;

      for (var i in offsets) {
        if (offsets.hasOwnProperty(i)) {
          var offset = offsets[i];
          var el = offset.el;
          var relToViewport = offset.el.getBoundingClientRect().top;
          if(relToViewport > 0 && relToViewport < height / 2) {
            latest = offset;
            break;
          }
        }
      }

      if (latest && (!current || (latest.index !== current.index))) {
        callback.call($sections,
          latest ? latest.id : null,
          current ? current.id : null,
          latest ? latest.el : null,
          current ? current.el : null);
        current = latest;
      }
    });

    console.log('triggering resize on window');
    $(window).trigger('resize');
    console.log('triggering scroll on parent');
    $parent.trigger('scroll');

    return this;
  };

})(jQuery);


/* jshint ignore:start */

/*!
 * base64.js
 * http://github.com/dankogai/js-base64
 * THERE's A PROBLEM LOADING THIS in entrypoint mode.
 */

(function(r){"use strict";if(r.Base64)return;var e="2.1.2";var t;if(typeof module!=="undefined"&&module.exports){t=require("buffer").Buffer}var n="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";var a=function(r){var e={};for(var t=0,n=r.length;t<n;t++)e[r.charAt(t)]=t;return e}(n);var o=String.fromCharCode;var u=function(r){if(r.length<2){var e=r.charCodeAt(0);return e<128?r:e<2048?o(192|e>>>6)+o(128|e&63):o(224|e>>>12&15)+o(128|e>>>6&63)+o(128|e&63)}else{var e=65536+(r.charCodeAt(0)-55296)*1024+(r.charCodeAt(1)-56320);return o(240|e>>>18&7)+o(128|e>>>12&63)+o(128|e>>>6&63)+o(128|e&63)}};var c=/[\uD800-\uDBFF][\uDC00-\uDFFFF]|[^\x00-\x7F]/g;var i=function(r){return r.replace(c,u)};var f=function(r){var e=[0,2,1][r.length%3],t=r.charCodeAt(0)<<16|(r.length>1?r.charCodeAt(1):0)<<8|(r.length>2?r.charCodeAt(2):0),a=[n.charAt(t>>>18),n.charAt(t>>>12&63),e>=2?"=":n.charAt(t>>>6&63),e>=1?"=":n.charAt(t&63)];return a.join("")};var h=r.btoa||function(r){return r.replace(/[\s\S]{1,3}/g,f)};var d=t?function(r){return new t(r).toString("base64")}:function(r){return h(i(r))};var v=function(r,e){return!e?d(r):d(r).replace(/[+\/]/g,function(r){return r=="+"?"-":"_"}).replace(/=/g,"")};var g=function(r){return v(r,true)};var l=new RegExp(["[À-ß][-¿]","[à-ï][-¿]{2}","[ð-÷][-¿]{3}"].join("|"),"g");var A=function(r){switch(r.length){case 4:var e=(7&r.charCodeAt(0))<<18|(63&r.charCodeAt(1))<<12|(63&r.charCodeAt(2))<<6|63&r.charCodeAt(3),t=e-65536;return o((t>>>10)+55296)+o((t&1023)+56320);case 3:return o((15&r.charCodeAt(0))<<12|(63&r.charCodeAt(1))<<6|63&r.charCodeAt(2));default:return o((31&r.charCodeAt(0))<<6|63&r.charCodeAt(1))}};var s=function(r){return r.replace(l,A)};var p=function(r){var e=r.length,t=e%4,n=(e>0?a[r.charAt(0)]<<18:0)|(e>1?a[r.charAt(1)]<<12:0)|(e>2?a[r.charAt(2)]<<6:0)|(e>3?a[r.charAt(3)]:0),u=[o(n>>>16),o(n>>>8&255),o(n&255)];u.length-=[0,0,2,1][t];return u.join("")};var C=r.atob||function(r){return r.replace(/[\s\S]{1,4}/g,p)};var b=t?function(r){return new t(r,"base64").toString()}:function(r){return s(C(r))};var B=function(r){return b(r.replace(/[-_]/g,function(r){return r=="-"?"+":"/"}).replace(/[^A-Za-z0-9\+\/]/g,""))};r.Base64={VERSION:e,atob:C,btoa:h,fromBase64:B,toBase64:v,utob:i,encode:v,encodeURI:g,btou:s,decode:B};if(typeof Object.defineProperty==="function"){var S=function(r){return{value:r,enumerable:false,writable:true,configurable:true}};r.Base64.extendString=function(){Object.defineProperty(String.prototype,"fromBase64",S(function(){return B(this)}));Object.defineProperty(String.prototype,"toBase64",S(function(r){return v(this,r)}));Object.defineProperty(String.prototype,"toBase64URI",S(function(){return v(this,true)}))}}})(this);

/**
 * marked - a markdown parser
 * Copyright (c) 2011-2020, Christopher Jeffrey. (MIT Licensed)
 * https://github.com/markedjs/marked
 */
(function(e,t){"object"==typeof exports&&"undefined"!=typeof module?module.exports=t():"function"==typeof define&&define.amd?define(t):(e=e||self).marked=t()}(this,function(){"use strict";function s(e,t){for(var n=0;n<t.length;n++){var r=t[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(e,r.key,r)}}function i(e,t){(null==t||t>e.length)&&(t=e.length);for(var n=0,r=new Array(t);n<t;n++)r[n]=e[n];return r}function g(e,t){var n;if("undefined"!=typeof Symbol&&null!=e[Symbol.iterator])return(n=e[Symbol.iterator]()).next.bind(n);if(Array.isArray(e)||(n=function(e,t){if(e){if("string"==typeof e)return i(e,t);var n=Object.prototype.toString.call(e).slice(8,-1);return"Object"===n&&e.constructor&&(n=e.constructor.name),"Map"===n||"Set"===n?Array.from(e):"Arguments"===n||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)?i(e,t):void 0}}(e))||t&&e&&"number"==typeof e.length){n&&(e=n);var r=0;return function(){return r>=e.length?{done:!0}:{done:!1,value:e[r++]}}}throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}function n(e){return c[e]}var e,t=(function(t){function e(){return{baseUrl:null,breaks:!1,gfm:!0,headerIds:!0,headerPrefix:"",highlight:null,langPrefix:"language-",mangle:!0,pedantic:!1,renderer:null,sanitize:!1,sanitizer:null,silent:!1,smartLists:!1,smartypants:!1,tokenizer:null,walkTokens:null,xhtml:!1}}t.exports={defaults:e(),getDefaults:e,changeDefaults:function(e){t.exports.defaults=e}}}(e={exports:{}}),e.exports),r=(t.defaults,t.getDefaults,t.changeDefaults,/[&<>"']/),l=/[&<>"']/g,a=/[<>"']|&(?!#?\w+;)/,o=/[<>"']|&(?!#?\w+;)/g,c={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"};var u=/&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/gi;function p(e){return e.replace(u,function(e,t){return"colon"===(t=t.toLowerCase())?":":"#"===t.charAt(0)?"x"===t.charAt(1)?String.fromCharCode(parseInt(t.substring(2),16)):String.fromCharCode(+t.substring(1)):""})}var h=/(^|[^\[])\^/g;var f=/[^\w:]/g,d=/^$|^[a-z][a-z0-9+.-]*:|^[?#]/i;var k={},b=/^[^:]+:\/*[^/]*$/,m=/^([^:]+:)[\s\S]*$/,x=/^([^:]+:\/*[^/]*)[\s\S]*$/;function v(e,t){k[" "+e]||(b.test(e)?k[" "+e]=e+"/":k[" "+e]=w(e,"/",!0));var n=-1===(e=k[" "+e]).indexOf(":");return"//"===t.substring(0,2)?n?t:e.replace(m,"$1")+t:"/"===t.charAt(0)?n?t:e.replace(x,"$1")+t:e+t}function w(e,t,n){var r=e.length;if(0===r)return"";for(var i=0;i<r;){var s=e.charAt(r-i-1);if(s!==t||n){if(s===t||!n)break;i++}else i++}return e.substr(0,r-i)}var _=function(e,t){if(t){if(r.test(e))return e.replace(l,n)}else if(a.test(e))return e.replace(o,n);return e},y=p,z=function(n,e){n=n.source||n,e=e||"";var r={replace:function(e,t){return t=(t=t.source||t).replace(h,"$1"),n=n.replace(e,t),r},getRegex:function(){return new RegExp(n,e)}};return r},S=function(e,t,n){if(e){var r;try{r=decodeURIComponent(p(n)).replace(f,"").toLowerCase()}catch(e){return null}if(0===r.indexOf("javascript:")||0===r.indexOf("vbscript:")||0===r.indexOf("data:"))return null}t&&!d.test(n)&&(n=v(t,n));try{n=encodeURI(n).replace(/%25/g,"%")}catch(e){return null}return n},$={exec:function(){}},A=function(e){for(var t,n,r=1;r<arguments.length;r++)for(n in t=arguments[r])Object.prototype.hasOwnProperty.call(t,n)&&(e[n]=t[n]);return e},R=function(e,t){var n=e.replace(/\|/g,function(e,t,n){for(var r=!1,i=t;0<=--i&&"\\"===n[i];)r=!r;return r?"|":" |"}).split(/ \|/),r=0;if(n.length>t)n.splice(t);else for(;n.length<t;)n.push("");for(;r<n.length;r++)n[r]=n[r].trim().replace(/\\\|/g,"|");return n},T=function(e,t){if(-1===e.indexOf(t[1]))return-1;for(var n=e.length,r=0,i=0;i<n;i++)if("\\"===e[i])i++;else if(e[i]===t[0])r++;else if(e[i]===t[1]&&--r<0)return i;return-1},I=function(e){e&&e.sanitize&&!e.silent&&console.warn("marked(): sanitize and sanitizer parameters are deprecated since version 0.7.0, should not be used and will be removed in the future. Read more here: https://marked.js.org/#/USING_ADVANCED.md#options")},Z=t.defaults,q=w,O=R,C=_,U=T;function j(e,t,n){var r=t.href,i=t.title?C(t.title):null,s=e[1].replace(/\\([\[\]])/g,"$1");return"!"!==e[0].charAt(0)?{type:"link",raw:n,href:r,title:i,text:s}:{type:"image",raw:n,href:r,title:i,text:C(s)}}var E=function(){function e(e){this.options=e||Z}var t=e.prototype;return t.space=function(e){var t=this.rules.block.newline.exec(e);if(t)return 1<t[0].length?{type:"space",raw:t[0]}:{raw:"\n"}},t.code=function(e,t){var n=this.rules.block.code.exec(e);if(n){var r=t[t.length-1];if(r&&"paragraph"===r.type)return{raw:n[0],text:n[0].trimRight()};var i=n[0].replace(/^ {4}/gm,"");return{type:"code",raw:n[0],codeBlockStyle:"indented",text:this.options.pedantic?i:q(i,"\n")}}},t.fences=function(e){var t=this.rules.block.fences.exec(e);if(t){var n=t[0],r=function(e,t){var n=e.match(/^(\s+)(?:```)/);if(null===n)return t;var r=n[1];return t.split("\n").map(function(e){var t=e.match(/^\s+/);return null!==t&&t[0].length>=r.length?e.slice(r.length):e}).join("\n")}(n,t[3]||"");return{type:"code",raw:n,lang:t[2]?t[2].trim():t[2],text:r}}},t.heading=function(e){var t=this.rules.block.heading.exec(e);if(t)return{type:"heading",raw:t[0],depth:t[1].length,text:t[2]}},t.nptable=function(e){var t=this.rules.block.nptable.exec(e);if(t){var n={type:"table",header:O(t[1].replace(/^ *| *\| *$/g,"")),align:t[2].replace(/^ *|\| *$/g,"").split(/ *\| */),cells:t[3]?t[3].replace(/\n$/,"").split("\n"):[],raw:t[0]};if(n.header.length===n.align.length){for(var r=n.align.length,i=0;i<r;i++)/^ *-+: *$/.test(n.align[i])?n.align[i]="right":/^ *:-+: *$/.test(n.align[i])?n.align[i]="center":/^ *:-+ *$/.test(n.align[i])?n.align[i]="left":n.align[i]=null;for(r=n.cells.length,i=0;i<r;i++)n.cells[i]=O(n.cells[i],n.header.length);return n}}},t.hr=function(e){var t=this.rules.block.hr.exec(e);if(t)return{type:"hr",raw:t[0]}},t.blockquote=function(e){var t=this.rules.block.blockquote.exec(e);if(t){var n=t[0].replace(/^ *> ?/gm,"");return{type:"blockquote",raw:t[0],text:n}}},t.list=function(e){var t=this.rules.block.list.exec(e);if(t){for(var n,r,i,s,l,a,o,c=t[0],u=t[2],p=1<u.length,h=")"===u[u.length-1],g={type:"list",raw:c,ordered:p,start:p?+u.slice(0,-1):"",loose:!1,items:[]},f=t[0].match(this.rules.block.item),d=!1,k=f.length,b=0;b<k;b++)r=(c=n=f[b]).length,~(n=n.replace(/^ *([*+-]|\d+[.)]) */,"")).indexOf("\n ")&&(r-=n.length,n=this.options.pedantic?n.replace(/^ {1,4}/gm,""):n.replace(new RegExp("^ {1,"+r+"}","gm"),"")),b!==k-1&&(i=this.rules.block.bullet.exec(f[b+1])[0],(p?1===i.length||!h&&")"===i[i.length-1]:1<i.length||this.options.smartLists&&i!==u)&&(s=f.slice(b+1).join("\n"),g.raw=g.raw.substring(0,g.raw.length-s.length),b=k-1)),l=d||/\n\n(?!\s*$)/.test(n),b!==k-1&&(d="\n"===n.charAt(n.length-1),l=l||d),l&&(g.loose=!0),o=void 0,(a=/^\[[ xX]\] /.test(n))&&(o=" "!==n[1],n=n.replace(/^\[[ xX]\] +/,"")),g.items.push({type:"list_item",raw:c,task:a,checked:o,loose:l,text:n});return g}},t.html=function(e){var t=this.rules.block.html.exec(e);if(t)return{type:this.options.sanitize?"paragraph":"html",raw:t[0],pre:!this.options.sanitizer&&("pre"===t[1]||"script"===t[1]||"style"===t[1]),text:this.options.sanitize?this.options.sanitizer?this.options.sanitizer(t[0]):C(t[0]):t[0]}},t.def=function(e){var t=this.rules.block.def.exec(e);if(t)return t[3]&&(t[3]=t[3].substring(1,t[3].length-1)),{tag:t[1].toLowerCase().replace(/\s+/g," "),raw:t[0],href:t[2],title:t[3]}},t.table=function(e){var t=this.rules.block.table.exec(e);if(t){var n={type:"table",header:O(t[1].replace(/^ *| *\| *$/g,"")),align:t[2].replace(/^ *|\| *$/g,"").split(/ *\| */),cells:t[3]?t[3].replace(/\n$/,"").split("\n"):[]};if(n.header.length===n.align.length){n.raw=t[0];for(var r=n.align.length,i=0;i<r;i++)/^ *-+: *$/.test(n.align[i])?n.align[i]="right":/^ *:-+: *$/.test(n.align[i])?n.align[i]="center":/^ *:-+ *$/.test(n.align[i])?n.align[i]="left":n.align[i]=null;for(r=n.cells.length,i=0;i<r;i++)n.cells[i]=O(n.cells[i].replace(/^ *\| *| *\| *$/g,""),n.header.length);return n}}},t.lheading=function(e){var t=this.rules.block.lheading.exec(e);if(t)return{type:"heading",raw:t[0],depth:"="===t[2].charAt(0)?1:2,text:t[1]}},t.paragraph=function(e){var t=this.rules.block.paragraph.exec(e);if(t)return{type:"paragraph",raw:t[0],text:"\n"===t[1].charAt(t[1].length-1)?t[1].slice(0,-1):t[1]}},t.text=function(e,t){var n=this.rules.block.text.exec(e);if(n){var r=t[t.length-1];return r&&"text"===r.type?{raw:n[0],text:n[0]}:{type:"text",raw:n[0],text:n[0]}}},t.escape=function(e){var t=this.rules.inline.escape.exec(e);if(t)return{type:"escape",raw:t[0],text:C(t[1])}},t.tag=function(e,t,n){var r=this.rules.inline.tag.exec(e);if(r)return!t&&/^<a /i.test(r[0])?t=!0:t&&/^<\/a>/i.test(r[0])&&(t=!1),!n&&/^<(pre|code|kbd|script)(\s|>)/i.test(r[0])?n=!0:n&&/^<\/(pre|code|kbd|script)(\s|>)/i.test(r[0])&&(n=!1),{type:this.options.sanitize?"text":"html",raw:r[0],inLink:t,inRawBlock:n,text:this.options.sanitize?this.options.sanitizer?this.options.sanitizer(r[0]):C(r[0]):r[0]}},t.link=function(e){var t=this.rules.inline.link.exec(e);if(t){var n,r=U(t[2],"()");-1<r&&(n=(0===t[0].indexOf("!")?5:4)+t[1].length+r,t[2]=t[2].substring(0,r),t[0]=t[0].substring(0,n).trim(),t[3]="");var i,s=t[2],l="";return l=this.options.pedantic?(i=/^([^'"]*[^\s])\s+(['"])(.*)\2/.exec(s),i?(s=i[1],i[3]):""):t[3]?t[3].slice(1,-1):"",j(t,{href:(s=s.trim().replace(/^<([\s\S]*)>$/,"$1"))?s.replace(this.rules.inline._escapes,"$1"):s,title:l?l.replace(this.rules.inline._escapes,"$1"):l},t[0])}},t.reflink=function(e,t){var n;if((n=this.rules.inline.reflink.exec(e))||(n=this.rules.inline.nolink.exec(e))){var r=(n[2]||n[1]).replace(/\s+/g," ");if((r=t[r.toLowerCase()])&&r.href)return j(n,r,n[0]);var i=n[0].charAt(0);return{type:"text",raw:i,text:i}}},t.strong=function(e,t,n){void 0===n&&(n="");var r=this.rules.inline.strong.start.exec(e);if(r&&(!r[1]||r[1]&&(""===n||this.rules.inline.punctuation.exec(n)))){t=t.slice(-1*e.length);var i,s="**"===r[0]?this.rules.inline.strong.endAst:this.rules.inline.strong.endUnd;for(s.lastIndex=0;null!=(r=s.exec(t));)if(i=this.rules.inline.strong.middle.exec(t.slice(0,r.index+3)))return{type:"strong",raw:e.slice(0,i[0].length),text:e.slice(2,i[0].length-2)}}},t.em=function(e,t,n){void 0===n&&(n="");var r=this.rules.inline.em.start.exec(e);if(r&&(!r[1]||r[1]&&(""===n||this.rules.inline.punctuation.exec(n)))){t=t.slice(-1*e.length);var i,s="*"===r[0]?this.rules.inline.em.endAst:this.rules.inline.em.endUnd;for(s.lastIndex=0;null!=(r=s.exec(t));)if(i=this.rules.inline.em.middle.exec(t.slice(0,r.index+2)))return{type:"em",raw:e.slice(0,i[0].length),text:e.slice(1,i[0].length-1)}}},t.codespan=function(e){var t=this.rules.inline.code.exec(e);if(t){var n=t[2].replace(/\n/g," "),r=/[^ ]/.test(n),i=n.startsWith(" ")&&n.endsWith(" ");return r&&i&&(n=n.substring(1,n.length-1)),n=C(n,!0),{type:"codespan",raw:t[0],text:n}}},t.br=function(e){var t=this.rules.inline.br.exec(e);if(t)return{type:"br",raw:t[0]}},t.del=function(e){var t=this.rules.inline.del.exec(e);if(t)return{type:"del",raw:t[0],text:t[1]}},t.autolink=function(e,t){var n=this.rules.inline.autolink.exec(e);if(n){var r,i="@"===n[2]?"mailto:"+(r=C(this.options.mangle?t(n[1]):n[1])):r=C(n[1]);return{type:"link",raw:n[0],text:r,href:i,tokens:[{type:"text",raw:r,text:r}]}}},t.url=function(e,t){var n,r,i,s;if(n=this.rules.inline.url.exec(e)){if("@"===n[2])i="mailto:"+(r=C(this.options.mangle?t(n[0]):n[0]));else{for(;s=n[0],n[0]=this.rules.inline._backpedal.exec(n[0])[0],s!==n[0];);r=C(n[0]),i="www."===n[1]?"http://"+r:r}return{type:"link",raw:n[0],text:r,href:i,tokens:[{type:"text",raw:r,text:r}]}}},t.inlineText=function(e,t,n){var r=this.rules.inline.text.exec(e);if(r){var i=t?this.options.sanitize?this.options.sanitizer?this.options.sanitizer(r[0]):C(r[0]):r[0]:C(this.options.smartypants?n(r[0]):r[0]);return{type:"text",raw:r[0],text:i}}},e}(),D=$,L=z,P=A,B={newline:/^\n+/,code:/^( {4}[^\n]+\n*)+/,fences:/^ {0,3}(`{3,}(?=[^`\n]*\n)|~{3,})([^\n]*)\n(?:|([\s\S]*?)\n)(?: {0,3}\1[~`]* *(?:\n+|$)|$)/,hr:/^ {0,3}((?:- *){3,}|(?:_ *){3,}|(?:\* *){3,})(?:\n+|$)/,heading:/^ {0,3}(#{1,6}) +([^\n]*?)(?: +#+)? *(?:\n+|$)/,blockquote:/^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/,list:/^( {0,3})(bull) [\s\S]+?(?:hr|def|\n{2,}(?! )(?!\1bull )\n*|\s*$)/,html:"^ {0,3}(?:<(script|pre|style)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?\\?>\\n*|<![A-Z][\\s\\S]*?>\\n*|<!\\[CDATA\\[[\\s\\S]*?\\]\\]>\\n*|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:\\n{2,}|$)|<(?!script|pre|style)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:\\n{2,}|$)|</(?!script|pre|style)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:\\n{2,}|$))",def:/^ {0,3}\[(label)\]: *\n? *<?([^\s>]+)>?(?:(?: +\n? *| *\n *)(title))? *(?:\n+|$)/,nptable:D,table:D,lheading:/^([^\n]+)\n {0,3}(=+|-+) *(?:\n+|$)/,_paragraph:/^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html)[^\n]+)*)/,text:/^[^\n]+/,_label:/(?!\s*\])(?:\\[\[\]]|[^\[\]])+/,_title:/(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/};B.def=L(B.def).replace("label",B._label).replace("title",B._title).getRegex(),B.bullet=/(?:[*+-]|\d{1,9}[.)])/,B.item=/^( *)(bull) ?[^\n]*(?:\n(?!\1bull ?)[^\n]*)*/,B.item=L(B.item,"gm").replace(/bull/g,B.bullet).getRegex(),B.list=L(B.list).replace(/bull/g,B.bullet).replace("hr","\\n+(?=\\1?(?:(?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$))").replace("def","\\n+(?="+B.def.source+")").getRegex(),B._tag="address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|section|source|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul",B._comment=/<!--(?!-?>)[\s\S]*?-->/,B.html=L(B.html,"i").replace("comment",B._comment).replace("tag",B._tag).replace("attribute",/ +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex(),B.paragraph=L(B._paragraph).replace("hr",B.hr).replace("heading"," {0,3}#{1,6} ").replace("|lheading","").replace("blockquote"," {0,3}>").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list"," {0,3}(?:[*+-]|1[.)]) ").replace("html","</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|!--)").replace("tag",B._tag).getRegex(),B.blockquote=L(B.blockquote).replace("paragraph",B.paragraph).getRegex(),B.normal=P({},B),B.gfm=P({},B.normal,{nptable:"^ *([^|\\n ].*\\|.*)\\n *([-:]+ *\\|[-| :]*)(?:\\n((?:(?!\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)",table:"^ *\\|(.+)\\n *\\|?( *[-:]+[-| :]*)(?:\\n *((?:(?!\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)"}),B.gfm.nptable=L(B.gfm.nptable).replace("hr",B.hr).replace("heading"," {0,3}#{1,6} ").replace("blockquote"," {0,3}>").replace("code"," {4}[^\\n]").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list"," {0,3}(?:[*+-]|1[.)]) ").replace("html","</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|!--)").replace("tag",B._tag).getRegex(),B.gfm.table=L(B.gfm.table).replace("hr",B.hr).replace("heading"," {0,3}#{1,6} ").replace("blockquote"," {0,3}>").replace("code"," {4}[^\\n]").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list"," {0,3}(?:[*+-]|1[.)]) ").replace("html","</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|!--)").replace("tag",B._tag).getRegex(),B.pedantic=P({},B.normal,{html:L("^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:\"[^\"]*\"|'[^']*'|\\s[^'\"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))").replace("comment",B._comment).replace(/tag/g,"(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b").getRegex(),def:/^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/,heading:/^ *(#{1,6}) *([^\n]+?) *(?:#+ *)?(?:\n+|$)/,fences:D,paragraph:L(B.normal._paragraph).replace("hr",B.hr).replace("heading"," *#{1,6} *[^\n]").replace("lheading",B.lheading).replace("blockquote"," {0,3}>").replace("|fences","").replace("|list","").replace("|html","").getRegex()});var F={escape:/^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/,autolink:/^<(scheme:[^\s\x00-\x1f<>]*|email)>/,url:D,tag:"^comment|^</[a-zA-Z][\\w:-]*\\s*>|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>",link:/^!?\[(label)\]\(\s*(href)(?:\s+(title))?\s*\)/,reflink:/^!?\[(label)\]\[(?!\s*\])((?:\\[\[\]]?|[^\[\]\\])+)\]/,nolink:/^!?\[(?!\s*\])((?:\[[^\[\]]*\]|\\[\[\]]|[^\[\]])*)\](?:\[\])?/,reflinkSearch:"reflink|nolink(?!\\()",strong:{start:/^(?:(\*\*(?=[*punctuation]))|\*\*)(?![\s])|__/,middle:/^\*\*(?:(?:(?!overlapSkip)(?:[^*]|\\\*)|overlapSkip)|\*(?:(?!overlapSkip)(?:[^*]|\\\*)|overlapSkip)*?\*)+?\*\*$|^__(?![\s])((?:(?:(?!overlapSkip)(?:[^_]|\\_)|overlapSkip)|_(?:(?!overlapSkip)(?:[^_]|\\_)|overlapSkip)*?_)+?)__$/,endAst:/[^punctuation\s]\*\*(?!\*)|[punctuation]\*\*(?!\*)(?:(?=[punctuation\s]|$))/,endUnd:/[^\s]__(?!_)(?:(?=[punctuation\s])|$)/},em:{start:/^(?:(\*(?=[punctuation]))|\*)(?![*\s])|_/,middle:/^\*(?:(?:(?!overlapSkip)(?:[^*]|\\\*)|overlapSkip)|\*(?:(?!overlapSkip)(?:[^*]|\\\*)|overlapSkip)*?\*)+?\*$|^_(?![_\s])(?:(?:(?!overlapSkip)(?:[^_]|\\_)|overlapSkip)|_(?:(?!overlapSkip)(?:[^_]|\\_)|overlapSkip)*?_)+?_$/,endAst:/[^punctuation\s]\*(?!\*)|[punctuation]\*(?!\*)(?:(?=[punctuation\s]|$))/,endUnd:/[^\s]_(?!_)(?:(?=[punctuation\s])|$)/},code:/^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/,br:/^( {2,}|\\)\n(?!\s*$)/,del:D,text:/^(`+|[^`])(?:[\s\S]*?(?:(?=[\\<!\[`*]|\b_|$)|[^ ](?= {2,}\n))|(?= {2,}\n))/,punctuation:/^([\s*punctuation])/,_punctuation:"!\"#$%&'()+\\-.,/:;<=>?@\\[\\]`^{|}~"};F.punctuation=L(F.punctuation).replace(/punctuation/g,F._punctuation).getRegex(),F._blockSkip="\\[[^\\]]*?\\]\\([^\\)]*?\\)|`[^`]*?`|<[^>]*?>",F._overlapSkip="__[^_]*?__|\\*\\*\\[^\\*\\]*?\\*\\*",F.em.start=L(F.em.start).replace(/punctuation/g,F._punctuation).getRegex(),F.em.middle=L(F.em.middle).replace(/punctuation/g,F._punctuation).replace(/overlapSkip/g,F._overlapSkip).getRegex(),F.em.endAst=L(F.em.endAst,"g").replace(/punctuation/g,F._punctuation).getRegex(),F.em.endUnd=L(F.em.endUnd,"g").replace(/punctuation/g,F._punctuation).getRegex(),F.strong.start=L(F.strong.start).replace(/punctuation/g,F._punctuation).getRegex(),F.strong.middle=L(F.strong.middle).replace(/punctuation/g,F._punctuation).replace(/blockSkip/g,F._blockSkip).getRegex(),F.strong.endAst=L(F.strong.endAst,"g").replace(/punctuation/g,F._punctuation).getRegex(),F.strong.endUnd=L(F.strong.endUnd,"g").replace(/punctuation/g,F._punctuation).getRegex(),F.blockSkip=L(F._blockSkip,"g").getRegex(),F.overlapSkip=L(F._overlapSkip,"g").getRegex(),F._escapes=/\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/g,F._scheme=/[a-zA-Z][a-zA-Z0-9+.-]{1,31}/,F._email=/[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/,F.autolink=L(F.autolink).replace("scheme",F._scheme).replace("email",F._email).getRegex(),F._attribute=/\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/,F.tag=L(F.tag).replace("comment",B._comment).replace("attribute",F._attribute).getRegex(),F._label=/(?:\[(?:\\.|[^\[\]\\])*\]|\\.|`[^`]*`|[^\[\]\\`])*?/,F._href=/<(?:\\[<>]?|[^\s<>\\])*>|[^\s\x00-\x1f]*/,F._title=/"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/,F.link=L(F.link).replace("label",F._label).replace("href",F._href).replace("title",F._title).getRegex(),F.reflink=L(F.reflink).replace("label",F._label).getRegex(),F.reflinkSearch=L(F.reflinkSearch,"g").replace("reflink",F.reflink).replace("nolink",F.nolink).getRegex(),F.normal=P({},F),F.pedantic=P({},F.normal,{strong:{start:/^__|\*\*/,middle:/^__(?=\S)([\s\S]*?\S)__(?!_)|^\*\*(?=\S)([\s\S]*?\S)\*\*(?!\*)/,endAst:/\*\*(?!\*)/g,endUnd:/__(?!_)/g},em:{start:/^_|\*/,middle:/^()\*(?=\S)([\s\S]*?\S)\*(?!\*)|^_(?=\S)([\s\S]*?\S)_(?!_)/,endAst:/\*(?!\*)/g,endUnd:/_(?!_)/g},link:L(/^!?\[(label)\]\((.*?)\)/).replace("label",F._label).getRegex(),reflink:L(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace("label",F._label).getRegex()}),F.gfm=P({},F.normal,{escape:L(F.escape).replace("])","~|])").getRegex(),_extended_email:/[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/,url:/^((?:ftp|https?):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/,_backpedal:/(?:[^?!.,:;*_~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_~)]+(?!$))+/,del:/^~+(?=\S)([\s\S]*?\S)~+/,text:/^(`+|[^`])(?:[\s\S]*?(?:(?=[\\<!\[`*~]|\b_|https?:\/\/|ftp:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@))|(?= {2,}\n|[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@))/}),F.gfm.url=L(F.gfm.url,"i").replace("email",F.gfm._extended_email).getRegex(),F.breaks=P({},F.gfm,{br:L(F.br).replace("{2,}","*").getRegex(),text:L(F.gfm.text).replace("\\b_","\\b_| {2,}\\n").replace(/\{2,\}/g,"*").getRegex()});var M={block:B,inline:F},N=t.defaults,W=M.block,X=M.inline;function G(e){return e.replace(/---/g,"—").replace(/--/g,"–").replace(/(^|[-\u2014/(\[{"\s])'/g,"$1‘").replace(/'/g,"’").replace(/(^|[-\u2014/(\[{\u2018\s])"/g,"$1“").replace(/"/g,"”").replace(/\.{3}/g,"…")}function V(e){for(var t,n="",r=e.length,i=0;i<r;i++)t=e.charCodeAt(i),.5<Math.random()&&(t="x"+t.toString(16)),n+="&#"+t+";";return n}var H=function(){function n(e){this.tokens=[],this.tokens.links=Object.create(null),this.options=e||N,this.options.tokenizer=this.options.tokenizer||new E,this.tokenizer=this.options.tokenizer,this.tokenizer.options=this.options;var t={block:W.normal,inline:X.normal};this.options.pedantic?(t.block=W.pedantic,t.inline=X.pedantic):this.options.gfm&&(t.block=W.gfm,this.options.breaks?t.inline=X.breaks:t.inline=X.gfm),this.tokenizer.rules=t}n.lex=function(e,t){return new n(t).lex(e)};var e,t,r,i=n.prototype;return i.lex=function(e){return e=e.replace(/\r\n|\r/g,"\n").replace(/\t/g,"    "),this.blockTokens(e,this.tokens,!0),this.inline(this.tokens),this.tokens},i.blockTokens=function(e,t,n){var r,i,s,l;for(void 0===t&&(t=[]),void 0===n&&(n=!0),e=e.replace(/^ +$/gm,"");e;)if(r=this.tokenizer.space(e))e=e.substring(r.raw.length),r.type&&t.push(r);else if(r=this.tokenizer.code(e,t))e=e.substring(r.raw.length),r.type?t.push(r):((l=t[t.length-1]).raw+="\n"+r.raw,l.text+="\n"+r.text);else if(r=this.tokenizer.fences(e))e=e.substring(r.raw.length),t.push(r);else if(r=this.tokenizer.heading(e))e=e.substring(r.raw.length),t.push(r);else if(r=this.tokenizer.nptable(e))e=e.substring(r.raw.length),t.push(r);else if(r=this.tokenizer.hr(e))e=e.substring(r.raw.length),t.push(r);else if(r=this.tokenizer.blockquote(e))e=e.substring(r.raw.length),r.tokens=this.blockTokens(r.text,[],n),t.push(r);else if(r=this.tokenizer.list(e)){for(e=e.substring(r.raw.length),s=r.items.length,i=0;i<s;i++)r.items[i].tokens=this.blockTokens(r.items[i].text,[],!1);t.push(r)}else if(r=this.tokenizer.html(e))e=e.substring(r.raw.length),t.push(r);else if(n&&(r=this.tokenizer.def(e)))e=e.substring(r.raw.length),this.tokens.links[r.tag]||(this.tokens.links[r.tag]={href:r.href,title:r.title});else if(r=this.tokenizer.table(e))e=e.substring(r.raw.length),t.push(r);else if(r=this.tokenizer.lheading(e))e=e.substring(r.raw.length),t.push(r);else if(n&&(r=this.tokenizer.paragraph(e)))e=e.substring(r.raw.length),t.push(r);else if(r=this.tokenizer.text(e,t))e=e.substring(r.raw.length),r.type?t.push(r):((l=t[t.length-1]).raw+="\n"+r.raw,l.text+="\n"+r.text);else if(e){var a="Infinite loop on byte: "+e.charCodeAt(0);if(this.options.silent){console.error(a);break}throw new Error(a)}return t},i.inline=function(e){for(var t,n,r,i,s,l=e.length,a=0;a<l;a++)switch((s=e[a]).type){case"paragraph":case"text":case"heading":s.tokens=[],this.inlineTokens(s.text,s.tokens);break;case"table":for(s.tokens={header:[],cells:[]},r=s.header.length,t=0;t<r;t++)s.tokens.header[t]=[],this.inlineTokens(s.header[t],s.tokens.header[t]);for(r=s.cells.length,t=0;t<r;t++)for(i=s.cells[t],s.tokens.cells[t]=[],n=0;n<i.length;n++)s.tokens.cells[t][n]=[],this.inlineTokens(i[n],s.tokens.cells[t][n]);break;case"blockquote":this.inline(s.tokens);break;case"list":for(r=s.items.length,t=0;t<r;t++)this.inline(s.items[t].tokens)}return e},i.inlineTokens=function(e,t,n,r,i){var s;void 0===t&&(t=[]),void 0===n&&(n=!1),void 0===r&&(r=!1),void 0===i&&(i="");var l,a=e;if(this.tokens.links){var o=Object.keys(this.tokens.links);if(0<o.length)for(;null!=(l=this.tokenizer.rules.inline.reflinkSearch.exec(a));)o.includes(l[0].slice(l[0].lastIndexOf("[")+1,-1))&&(a=a.slice(0,l.index)+"["+"a".repeat(l[0].length-2)+"]"+a.slice(this.tokenizer.rules.inline.reflinkSearch.lastIndex))}for(;null!=(l=this.tokenizer.rules.inline.blockSkip.exec(a));)a=a.slice(0,l.index)+"["+"a".repeat(l[0].length-2)+"]"+a.slice(this.tokenizer.rules.inline.blockSkip.lastIndex);for(;e;)if(s=this.tokenizer.escape(e))e=e.substring(s.raw.length),t.push(s);else if(s=this.tokenizer.tag(e,n,r))e=e.substring(s.raw.length),n=s.inLink,r=s.inRawBlock,t.push(s);else if(s=this.tokenizer.link(e))e=e.substring(s.raw.length),"link"===s.type&&(s.tokens=this.inlineTokens(s.text,[],!0,r)),t.push(s);else if(s=this.tokenizer.reflink(e,this.tokens.links))e=e.substring(s.raw.length),"link"===s.type&&(s.tokens=this.inlineTokens(s.text,[],!0,r)),t.push(s);else if(s=this.tokenizer.strong(e,a,i))e=e.substring(s.raw.length),s.tokens=this.inlineTokens(s.text,[],n,r),t.push(s);else if(s=this.tokenizer.em(e,a,i))e=e.substring(s.raw.length),s.tokens=this.inlineTokens(s.text,[],n,r),t.push(s);else if(s=this.tokenizer.codespan(e))e=e.substring(s.raw.length),t.push(s);else if(s=this.tokenizer.br(e))e=e.substring(s.raw.length),t.push(s);else if(s=this.tokenizer.del(e))e=e.substring(s.raw.length),s.tokens=this.inlineTokens(s.text,[],n,r),t.push(s);else if(s=this.tokenizer.autolink(e,V))e=e.substring(s.raw.length),t.push(s);else if(n||!(s=this.tokenizer.url(e,V))){if(s=this.tokenizer.inlineText(e,r,G))e=e.substring(s.raw.length),i=s.raw.slice(-1),t.push(s);else if(e){var c="Infinite loop on byte: "+e.charCodeAt(0);if(this.options.silent){console.error(c);break}throw new Error(c)}}else e=e.substring(s.raw.length),t.push(s);return t},e=n,r=[{key:"rules",get:function(){return{block:W,inline:X}}}],(t=null)&&s(e.prototype,t),r&&s(e,r),n}(),J=t.defaults,K=S,Q=_,Y=function(){function e(e){this.options=e||J}var t=e.prototype;return t.code=function(e,t,n){var r,i=(t||"").match(/\S*/)[0];return!this.options.highlight||null!=(r=this.options.highlight(e,i))&&r!==e&&(n=!0,e=r),i?'<pre><code class="'+this.options.langPrefix+Q(i,!0)+'">'+(n?e:Q(e,!0))+"</code></pre>\n":"<pre><code>"+(n?e:Q(e,!0))+"</code></pre>\n"},t.blockquote=function(e){return"<blockquote>\n"+e+"</blockquote>\n"},t.html=function(e){return e},t.heading=function(e,t,n,r){return this.options.headerIds?"<h"+t+' id="'+this.options.headerPrefix+r.slug(n)+'">'+e+"</h"+t+">\n":"<h"+t+">"+e+"</h"+t+">\n"},t.hr=function(){return this.options.xhtml?"<hr/>\n":"<hr>\n"},t.list=function(e,t,n){var r=t?"ol":"ul";return"<"+r+(t&&1!==n?' start="'+n+'"':"")+">\n"+e+"</"+r+">\n"},t.listitem=function(e){return"<li>"+e+"</li>\n"},t.checkbox=function(e){return"<input "+(e?'checked="" ':"")+'disabled="" type="checkbox"'+(this.options.xhtml?" /":"")+"> "},t.paragraph=function(e){return"<p>"+e+"</p>\n"},t.table=function(e,t){return"<table>\n<thead>\n"+e+"</thead>\n"+(t=t&&"<tbody>"+t+"</tbody>")+"</table>\n"},t.tablerow=function(e){return"<tr>\n"+e+"</tr>\n"},t.tablecell=function(e,t){var n=t.header?"th":"td";return(t.align?"<"+n+' align="'+t.align+'">':"<"+n+">")+e+"</"+n+">\n"},t.strong=function(e){return"<strong>"+e+"</strong>"},t.em=function(e){return"<em>"+e+"</em>"},t.codespan=function(e){return"<code>"+e+"</code>"},t.br=function(){return this.options.xhtml?"<br/>":"<br>"},t.del=function(e){return"<del>"+e+"</del>"},t.link=function(e,t,n){if(null===(e=K(this.options.sanitize,this.options.baseUrl,e)))return n;var r='<a href="'+Q(e)+'"';return t&&(r+=' title="'+t+'"'),r+=">"+n+"</a>"},t.image=function(e,t,n){if(null===(e=K(this.options.sanitize,this.options.baseUrl,e)))return n;var r='<img src="'+e+'" alt="'+n+'"';return t&&(r+=' title="'+t+'"'),r+=this.options.xhtml?"/>":">"},t.text=function(e){return e},e}(),ee=function(){function e(){}var t=e.prototype;return t.strong=function(e){return e},t.em=function(e){return e},t.codespan=function(e){return e},t.del=function(e){return e},t.html=function(e){return e},t.text=function(e){return e},t.link=function(e,t,n){return""+n},t.image=function(e,t,n){return""+n},t.br=function(){return""},e}(),te=function(){function e(){this.seen={}}return e.prototype.slug=function(e){var t=e.toLowerCase().trim().replace(/<[!\/a-z].*?>/gi,"").replace(/[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,./:;<=>?@[\]^`{|}~]/g,"").replace(/\s/g,"-");if(this.seen.hasOwnProperty(t))for(var n=t;this.seen[n]++,t=n+"-"+this.seen[n],this.seen.hasOwnProperty(t););return this.seen[t]=0,t},e}(),ne=t.defaults,re=y,ie=function(){function n(e){this.options=e||ne,this.options.renderer=this.options.renderer||new Y,this.renderer=this.options.renderer,this.renderer.options=this.options,this.textRenderer=new ee,this.slugger=new te}n.parse=function(e,t){return new n(t).parse(e)};var e=n.prototype;return e.parse=function(e,t){void 0===t&&(t=!0);for(var n,r,i,s,l,a,o,c,u,p,h,g,f,d,k,b,m,x="",v=e.length,w=0;w<v;w++)switch((u=e[w]).type){case"space":continue;case"hr":x+=this.renderer.hr();continue;case"heading":x+=this.renderer.heading(this.parseInline(u.tokens),u.depth,re(this.parseInline(u.tokens,this.textRenderer)),this.slugger);continue;case"code":x+=this.renderer.code(u.text,u.lang,u.escaped);continue;case"table":for(a=o="",i=u.header.length,n=0;n<i;n++)a+=this.renderer.tablecell(this.parseInline(u.tokens.header[n]),{header:!0,align:u.align[n]});for(o+=this.renderer.tablerow(a),c="",i=u.cells.length,n=0;n<i;n++){for(a="",s=(l=u.tokens.cells[n]).length,r=0;r<s;r++)a+=this.renderer.tablecell(this.parseInline(l[r]),{header:!1,align:u.align[r]});c+=this.renderer.tablerow(a)}x+=this.renderer.table(o,c);continue;case"blockquote":c=this.parse(u.tokens),x+=this.renderer.blockquote(c);continue;case"list":for(p=u.ordered,h=u.start,g=u.loose,i=u.items.length,c="",n=0;n<i;n++)k=(d=u.items[n]).checked,b=d.task,f="",d.task&&(m=this.renderer.checkbox(k),g?0<d.tokens.length&&"text"===d.tokens[0].type?(d.tokens[0].text=m+" "+d.tokens[0].text,d.tokens[0].tokens&&0<d.tokens[0].tokens.length&&"text"===d.tokens[0].tokens[0].type&&(d.tokens[0].tokens[0].text=m+" "+d.tokens[0].tokens[0].text)):d.tokens.unshift({type:"text",text:m}):f+=m),f+=this.parse(d.tokens,g),c+=this.renderer.listitem(f,b,k);x+=this.renderer.list(c,p,h);continue;case"html":x+=this.renderer.html(u.text);continue;case"paragraph":x+=this.renderer.paragraph(this.parseInline(u.tokens));continue;case"text":for(c=u.tokens?this.parseInline(u.tokens):u.text;w+1<v&&"text"===e[w+1].type;)c+="\n"+((u=e[++w]).tokens?this.parseInline(u.tokens):u.text);x+=t?this.renderer.paragraph(c):c;continue;default:var _='Token with "'+u.type+'" type was not found.';if(this.options.silent)return void console.error(_);throw new Error(_)}return x},e.parseInline=function(e,t){t=t||this.renderer;for(var n,r="",i=e.length,s=0;s<i;s++)switch((n=e[s]).type){case"escape":r+=t.text(n.text);break;case"html":r+=t.html(n.text);break;case"link":r+=t.link(n.href,n.title,this.parseInline(n.tokens,t));break;case"image":r+=t.image(n.href,n.title,n.text);break;case"strong":r+=t.strong(this.parseInline(n.tokens,t));break;case"em":r+=t.em(this.parseInline(n.tokens,t));break;case"codespan":r+=t.codespan(n.text);break;case"br":r+=t.br();break;case"del":r+=t.del(this.parseInline(n.tokens,t));break;case"text":r+=t.text(n.text);break;default:var l='Token with "'+n.type+'" type was not found.';if(this.options.silent)return void console.error(l);throw new Error(l)}return r},n}(),se=A,le=I,ae=_,oe=t.getDefaults,ce=t.changeDefaults,ue=t.defaults;function pe(e,n,r){if(null==e)throw new Error("marked(): input parameter is undefined or null");if("string"!=typeof e)throw new Error("marked(): input parameter is of type "+Object.prototype.toString.call(e)+", string expected");if("function"==typeof n&&(r=n,n=null),n=se({},pe.defaults,n||{}),le(n),r){var i,s=n.highlight;try{i=H.lex(e,n)}catch(e){return r(e)}var l=function(t){var e;if(!t)try{e=ie.parse(i,n)}catch(e){t=e}return n.highlight=s,t?r(t):r(null,e)};if(!s||s.length<3)return l();if(delete n.highlight,!i.length)return l();var a=0;return pe.walkTokens(i,function(n){"code"===n.type&&(a++,setTimeout(function(){s(n.text,n.lang,function(e,t){return e?l(e):(null!=t&&t!==n.text&&(n.text=t,n.escaped=!0),void(0===--a&&l()))})},0))}),void(0===a&&l())}try{var t=H.lex(e,n);return n.walkTokens&&pe.walkTokens(t,n.walkTokens),ie.parse(t,n)}catch(e){if(e.message+="\nPlease report this to https://github.com/markedjs/marked.",n.silent)return"<p>An error occurred:</p><pre>"+ae(e.message+"",!0)+"</pre>";throw e}}return pe.options=pe.setOptions=function(e){return se(pe.defaults,e),ce(pe.defaults),pe},pe.getDefaults=oe,pe.defaults=ue,pe.use=function(a){var t,n=se({},a);a.renderer&&function(){var l=pe.defaults.renderer||new Y;for(var e in a.renderer)!function(i){var s=l[i];l[i]=function(){for(var e=arguments.length,t=new Array(e),n=0;n<e;n++)t[n]=arguments[n];var r=a.renderer[i].apply(l,t);return!1===r&&(r=s.apply(l,t)),r}}(e);n.renderer=l}(),a.tokenizer&&function(){var l=pe.defaults.tokenizer||new E;for(var e in a.tokenizer)!function(i){var s=l[i];l[i]=function(){for(var e=arguments.length,t=new Array(e),n=0;n<e;n++)t[n]=arguments[n];var r=a.tokenizer[i].apply(l,t);return!1===r&&(r=s.apply(l,t)),r}}(e);n.tokenizer=l}(),a.walkTokens&&(t=pe.defaults.walkTokens,n.walkTokens=function(e){a.walkTokens(e),t&&t(e)}),pe.setOptions(n)},pe.walkTokens=function(e,t){for(var n,r=g(e);!(n=r()).done;){var i=n.value;switch(t(i),i.type){case"table":for(var s,l=g(i.tokens.header);!(s=l()).done;){var a=s.value;pe.walkTokens(a,t)}for(var o,c=g(i.tokens.cells);!(o=c()).done;)for(var u,p=g(o.value);!(u=p()).done;){var h=u.value;pe.walkTokens(h,t)}break;case"list":pe.walkTokens(i.items,t);break;default:i.tokens&&pe.walkTokens(i.tokens,t)}}},pe.Parser=ie,pe.parser=ie.parse,pe.Renderer=Y,pe.TextRenderer=ee,pe.Lexer=H,pe.lexer=H.lex,pe.Tokenizer=E,pe.Slugger=te,pe.parse=pe}));

/*!
 * node-parameterize 0.0.7
 * https://github.com/fyalavuz/node-parameterize
 * Exported as `Flatdoc.slugify`
 */

(function(r){var LATIN_MAP={"À":"A","Á":"A","Â":"A","Ã":"A","Ä":"A","Å":"A","Æ":"AE","Ç":"C","È":"E","É":"E","Ê":"E","Ë":"E","Ì":"I","Í":"I","Î":"I","Ï":"I","Ð":"D","Ñ":"N","Ò":"O","Ó":"O","Ô":"O","Õ":"O","Ö":"O","Ő":"O","Ø":"O","Ù":"U","Ú":"U","Û":"U","Ü":"U","Ű":"U","Ý":"Y","Þ":"TH","ß":"ss","à":"a","á":"a","â":"a","ã":"a","ä":"a","å":"a","æ":"ae","ç":"c","è":"e","é":"e","ê":"e","ë":"e","ì":"i","í":"i","î":"i","ï":"i","ð":"d","ñ":"n","ò":"o","ó":"o","ô":"o","õ":"o","ö":"o","ő":"o","ø":"o","ù":"u","ú":"u","û":"u","ü":"u","ű":"u","ý":"y","þ":"th","ÿ":"y"};var LATIN_SYMBOLS_MAP={"©":"(c)"};var GREEK_MAP={"α":"a","β":"b","γ":"g","δ":"d","ε":"e","ζ":"z","η":"h","θ":"8","ι":"i","κ":"k","λ":"l","μ":"m","ν":"n","ξ":"3","ο":"o","π":"p","ρ":"r","σ":"s","τ":"t","υ":"y","φ":"f","χ":"x","ψ":"ps","ω":"w","ά":"a","έ":"e","ί":"i","ό":"o","ύ":"y","ή":"h","ώ":"w","ς":"s","ϊ":"i","ΰ":"y","ϋ":"y","ΐ":"i","Α":"A","Β":"B","Γ":"G","Δ":"D","Ε":"E","Ζ":"Z","Η":"H","Θ":"8","Ι":"I","Κ":"K","Λ":"L","Μ":"M","Ν":"N","Ξ":"3","Ο":"O","Π":"P","Ρ":"R","Σ":"S","Τ":"T","Υ":"Y","Φ":"F","Χ":"X","Ψ":"PS","Ω":"W","Ά":"A","Έ":"E","Ί":"I","Ό":"O","Ύ":"Y","Ή":"H","Ώ":"W","Ϊ":"I","Ϋ":"Y"};var TURKISH_MAP={"ş":"s","Ş":"S","ı":"i","İ":"I","ç":"c","Ç":"C","ü":"u","Ü":"U","ö":"o","Ö":"O","ğ":"g","Ğ":"G"};var RUSSIAN_MAP={"а":"a","б":"b","в":"v","г":"g","д":"d","е":"e","ё":"yo","ж":"zh","з":"z","и":"i","й":"j","к":"k","л":"l","м":"m","н":"n","о":"o","п":"p","р":"r","с":"s","т":"t","у":"u","ф":"f","х":"h","ц":"c","ч":"ch","ш":"sh","щ":"sh","ъ":"","ы":"y","ь":"","э":"e","ю":"yu","я":"ya","А":"A","Б":"B","В":"V","Г":"G","Д":"D","Е":"E","Ё":"Yo","Ж":"Zh","З":"Z","И":"I","Й":"J","К":"K","Л":"L","М":"M","Н":"N","О":"O","П":"P","Р":"R","С":"S","Т":"T","У":"U","Ф":"F","Х":"H","Ц":"C","Ч":"Ch","Ш":"Sh","Щ":"Sh","Ъ":"","Ы":"Y","Ь":"","Э":"E","Ю":"Yu","Я":"Ya"};var UKRAINIAN_MAP={"Є":"Ye","І":"I","Ї":"Yi","Ґ":"G","є":"ye","і":"i","ї":"yi","ґ":"g"};var CZECH_MAP={"č":"c","ď":"d","ě":"e","ň":"n","ř":"r","š":"s","ť":"t","ů":"u","ž":"z","Č":"C","Ď":"D","Ě":"E","Ň":"N","Ř":"R","Š":"S","Ť":"T","Ů":"U","Ž":"Z"};var POLISH_MAP={"ą":"a","ć":"c","ę":"e","ł":"l","ń":"n","ó":"o","ś":"s","ź":"z","ż":"z","Ą":"A","Ć":"C","Ę":"e","Ł":"L","Ń":"N","Ó":"o","Ś":"S","Ź":"Z","Ż":"Z"};var LATVIAN_MAP={"ā":"a","č":"c","ē":"e","ģ":"g","ī":"i","ķ":"k","ļ":"l","ņ":"n","š":"s","ū":"u","ž":"z","Ā":"A","Č":"C","Ē":"E","Ģ":"G","Ī":"i","Ķ":"k","Ļ":"L","Ņ":"N","Š":"S","Ū":"u","Ž":"Z"};var ALL_DOWNCODE_MAPS=new Array;ALL_DOWNCODE_MAPS[0]=LATIN_MAP;ALL_DOWNCODE_MAPS[1]=LATIN_SYMBOLS_MAP;ALL_DOWNCODE_MAPS[2]=GREEK_MAP;ALL_DOWNCODE_MAPS[3]=TURKISH_MAP;ALL_DOWNCODE_MAPS[4]=RUSSIAN_MAP;ALL_DOWNCODE_MAPS[5]=UKRAINIAN_MAP;ALL_DOWNCODE_MAPS[6]=CZECH_MAP;ALL_DOWNCODE_MAPS[7]=POLISH_MAP;ALL_DOWNCODE_MAPS[8]=LATVIAN_MAP;var Downcoder=new Object;Downcoder.Initialize=function(){if(Downcoder.map)return;Downcoder.map={};Downcoder.chars="";for(var i in ALL_DOWNCODE_MAPS){var lookup=ALL_DOWNCODE_MAPS[i];for(var c in lookup){Downcoder.map[c]=lookup[c];Downcoder.chars+=c}}Downcoder.regex=new RegExp("["+Downcoder.chars+"]|[^"+Downcoder.chars+"]+","g")};downcode=function(slug){Downcoder.Initialize();var downcoded="";var pieces=slug.match(Downcoder.regex);if(pieces){for(var i=0;i<pieces.length;i++){if(pieces[i].length==1){var mapped=Downcoder.map[pieces[i]];if(mapped!=null){downcoded+=mapped;continue}}downcoded+=pieces[i]}}else{downcoded=slug}return downcoded};Flatdoc.slugify=function(s,num_chars){s=downcode(s);s=s.replace(/[^-\w\s]/g,"");s=s.replace(/^\s+|\s+$/g,"");s=s.replace(/[-\s]+/g,"-");s=s.toLowerCase();return s.substring(0,num_chars)};})();

/*!
 * url-polyfill
 * MIT
 * lifaon74
 * 
 * https://github.com/lifaon74/url-polyfill/blob/master/url-polyfill.min.js
 */
(function(t){var e=function(){try{return!!Symbol.iterator}catch(e){return false}};var r=e();var n=function(t){var e={next:function(){var e=t.shift();return{done:e===void 0,value:e}}};if(r){e[Symbol.iterator]=function(){return e}}return e};var i=function(e){return encodeURIComponent(e).replace(/%20/g,"+")};var o=function(e){return decodeURIComponent(String(e).replace(/\+/g," "))};var a=function(){var a=function(e){Object.defineProperty(this,"_entries",{writable:true,value:{}});var t=typeof e;if(t==="undefined"){}else if(t==="string"){if(e!==""){this._fromString(e)}}else if(e instanceof a){var r=this;e.forEach(function(e,t){r.append(t,e)})}else if(e!==null&&t==="object"){if(Object.prototype.toString.call(e)==="[object Array]"){for(var n=0;n<e.length;n++){var i=e[n];if(Object.prototype.toString.call(i)==="[object Array]"||i.length!==2){this.append(i[0],i[1])}else{throw new TypeError("Expected [string, any] as entry at index "+n+" of URLSearchParams's input")}}}else{for(var o in e){if(e.hasOwnProperty(o)){this.append(o,e[o])}}}}else{throw new TypeError("Unsupported input's type for URLSearchParams")}};var e=a.prototype;e.append=function(e,t){if(e in this._entries){this._entries[e].push(String(t))}else{this._entries[e]=[String(t)]}};e.delete=function(e){delete this._entries[e]};e.get=function(e){return e in this._entries?this._entries[e][0]:null};e.getAll=function(e){return e in this._entries?this._entries[e].slice(0):[]};e.has=function(e){return e in this._entries};e.set=function(e,t){this._entries[e]=[String(t)]};e.forEach=function(e,t){var r;for(var n in this._entries){if(this._entries.hasOwnProperty(n)){r=this._entries[n];for(var i=0;i<r.length;i++){e.call(t,r[i],n,this)}}}};e.keys=function(){var r=[];this.forEach(function(e,t){r.push(t)});return n(r)};e.values=function(){var t=[];this.forEach(function(e){t.push(e)});return n(t)};e.entries=function(){var r=[];this.forEach(function(e,t){r.push([t,e])});return n(r)};if(r){e[Symbol.iterator]=e.entries}e.toString=function(){var r=[];this.forEach(function(e,t){r.push(i(t)+"="+i(e))});return r.join("&")};t.URLSearchParams=a};var s=function(){try{var e=t.URLSearchParams;return new e("?a=1").toString()==="a=1"&&typeof e.prototype.set==="function"&&typeof e.prototype.entries==="function"}catch(e){return false}};if(!s()){a()}var f=t.URLSearchParams.prototype;if(typeof f.sort!=="function"){f.sort=function(){var r=this;var n=[];this.forEach(function(e,t){n.push([t,e]);if(!r._entries){r.delete(t)}});n.sort(function(e,t){if(e[0]<t[0]){return-1}else if(e[0]>t[0]){return+1}else{return 0}});if(r._entries){r._entries={}}for(var e=0;e<n.length;e++){this.append(n[e][0],n[e][1])}}}if(typeof f._fromString!=="function"){Object.defineProperty(f,"_fromString",{enumerable:false,configurable:false,writable:false,value:function(e){if(this._entries){this._entries={}}else{var r=[];this.forEach(function(e,t){r.push(t)});for(var t=0;t<r.length;t++){this.delete(r[t])}}e=e.replace(/^\?/,"");var n=e.split("&");var i;for(var t=0;t<n.length;t++){i=n[t].split("=");this.append(o(i[0]),i.length>1?o(i[1]):"")}}})}})(typeof global!=="undefined"?global:typeof window!=="undefined"?window:typeof self!=="undefined"?self:this);(function(u){var e=function(){try{var e=new u.URL("b","http://a");e.pathname="c d";return e.href==="http://a/c%20d"&&e.searchParams}catch(e){return false}};var t=function(){var t=u.URL;var e=function(e,t){if(typeof e!=="string")e=String(e);if(t&&typeof t!=="string")t=String(t);var r=document,n;if(t&&(u.location===void 0||t!==u.location.href)){t=t.toLowerCase();r=document.implementation.createHTMLDocument("");n=r.createElement("base");n.href=t;r.head.appendChild(n);try{if(n.href.indexOf(t)!==0)throw new Error(n.href)}catch(e){throw new Error("URL unable to set base "+t+" due to "+e)}}var i=r.createElement("a");i.href=e;if(n){r.body.appendChild(i);i.href=i.href}var o=r.createElement("input");o.type="url";o.value=e;if(i.protocol===":"||!/:/.test(i.href)||!o.checkValidity()&&!t){throw new TypeError("Invalid URL")}Object.defineProperty(this,"_anchorElement",{value:i});var a=new u.URLSearchParams(this.search);var s=true;var f=true;var c=this;["append","delete","set"].forEach(function(e){var t=a[e];a[e]=function(){t.apply(a,arguments);if(s){f=false;c.search=a.toString();f=true}}});Object.defineProperty(this,"searchParams",{value:a,enumerable:true});var h=void 0;Object.defineProperty(this,"_updateSearchParams",{enumerable:false,configurable:false,writable:false,value:function(){if(this.search!==h){h=this.search;if(f){s=false;this.searchParams._fromString(this.search);s=true}}}})};var r=e.prototype;var n=function(t){Object.defineProperty(r,t,{get:function(){return this._anchorElement[t]},set:function(e){this._anchorElement[t]=e},enumerable:true})};["hash","host","hostname","port","protocol"].forEach(function(e){n(e)});Object.defineProperty(r,"search",{get:function(){return this._anchorElement["search"]},set:function(e){this._anchorElement["search"]=e;this._updateSearchParams()},enumerable:true});Object.defineProperties(r,{toString:{get:function(){var e=this;return function(){return e.href}}},href:{get:function(){return this._anchorElement.href.replace(/\?$/,"")},set:function(e){this._anchorElement.href=e;this._updateSearchParams()},enumerable:true},pathname:{get:function(){return this._anchorElement.pathname.replace(/(^\/?)/,"/")},set:function(e){this._anchorElement.pathname=e},enumerable:true},origin:{get:function(){var e={"http:":80,"https:":443,"ftp:":21}[this._anchorElement.protocol];var t=this._anchorElement.port!=e&&this._anchorElement.port!=="";return this._anchorElement.protocol+"//"+this._anchorElement.hostname+(t?":"+this._anchorElement.port:"")},enumerable:true},password:{get:function(){return""},set:function(e){},enumerable:true},username:{get:function(){return""},set:function(e){},enumerable:true}});e.createObjectURL=function(e){return t.createObjectURL.apply(t,arguments)};e.revokeObjectURL=function(e){return t.revokeObjectURL.apply(t,arguments)};u.URL=e};if(!e()){t()}if(u.location!==void 0&&!("origin"in u.location)){var r=function(){return u.location.protocol+"//"+u.location.hostname+(u.location.port?":"+u.location.port:"")};try{Object.defineProperty(u.location,"origin",{get:r,enumerable:true})}catch(e){setInterval(function(){u.location.origin=r()},100)}}})(typeof global!=="undefined"?global:typeof window!=="undefined"?window:typeof self!=="undefined"?self:this);


/* jshint ignore:end */
// This } is for the initial if() statement that bails out early.
}
