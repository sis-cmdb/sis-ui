// Based off of initial arithmetic grammar from http://pegjs.majda.cz/online
// and hacked up for our needs

start
 = base_conj

// leaf operators
op
 = ">="
 / "<="
 / "!="
 / "="
 / "like"i
 / ">"
 / "<"
 / "in"i
 / "nin"i

// combiners for expressions
conj
 = "and"i
 / "or"i

// whitespace
sep
  = c:[ \t\r\n]+ { return null; }

// part of the expression
word
 = parts:word_part+ { return parts.join(""); }
 / '"' letters:[a-zA-Z0-9_\+\=\%\$\@\!\^\&\(\)\[\]\:\;\*\-\., \?\^\$\/]+ '"' { return letters.join(""); }

// Unquoted words only contain balanced parentheses, so the ")" closing a group
// is not taken as part of its last word: (a=b) is a group, f(o) is a word.
// A "!" starting "!=" is the operator, so a!=b is a != b.
word_part
 = !"!=" c:[a-zA-Z0-9_\+\%\$\@\!\^\&\[\]\:\;\*\-\.,\^\$\/] { return c; }
 / "(" inner:word_part* ")" { return "(" + inner.join("") + ")"; }

// word op word i.e.
//   foo = bar
//   foo = "bar"
//   foo=bar
//   foo="bar"
base
 = w1:word sep* o:op sep* w2:word { return [w1,o,w2]; }

// advanced rules
// the base expression (as above)
// a complex expression that is surrounded by parens
// two base expressions separated by conjunction
base_primary
 = "(" sep* bc:base_conj sep* ")" { return bc }
 / b:base sep c:conj sep bp:base_primary { return [b,c,bp]; }
 / base

// base expressions separated by conjunctions
base_conj
 = bp:base_primary sep+ c:conj sep+ bp2:base_primary { return [bp, c, bp2]; }
 / base_primary
