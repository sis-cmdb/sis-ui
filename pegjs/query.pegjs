// Based off of initial arithmetic grammar from http://pegjs.majda.cz/online
// and hacked up for our needs

start
 = base_conj

op
 = "="
 / "like"i
 / ">"
 / "<"

conj
 = "and"i
 / "or"i

sep
  = c:[ \t\r\n]+ { return null; }

word
 = letters:[a-zA-Z0-9_\*]+ { return letters.join(""); }
 / '"' letters:[a-zA-Z0_9_\* \?]+ '"' { return letters.join(""); }


base
 = w1:word sep* o:op sep* w2:word { return [w1,o,w2]; }


base_conj
 = bp:base_primary sep+ c:conj sep+ bp2:base_primary { return [bp, c, bp2]; }
 / base_primary

base_primary
 = "(" sep* bc:base_conj sep* ")" { return bc }
 / b:base sep c:conj sep bp:base_primary { return [b,c,bp]; }
 / base
