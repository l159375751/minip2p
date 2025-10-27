## Plan for today

build a mini working poc -> poc1

we can cut corners and adapt as we go

we serve and consume ProjectGutenberg (PG) data

we use nostr to find peers and exchange with these

we are a webapp.
just some html with js and css
that comunicates with its like, just in other browser tabs, just like us


we can get and send books,
all from PG,
to our peers via webrtc
if they want them
we maybe use libp2p as to not reinvent shit
we can later siwtch to nostr for stun ice signaling


we can answer and send search requests


we have micro callibe fucntionalitty, where
downloaded books can be seen
and opened in new tab
and saved to disk


the xfer daemon:
needs sub to noostr
listens for xferRequests
send xfer [this and that]
optionally can run: partial fill me

the seach daemon:
needs sub to nostr
listens for keywords / hash / type
optionally can run: fetch index

the search client:
needs sub to nostr
listens for keywords / hash / type / npub
can ask for collection:ID for fuzzzy search
when gets reponse, display offered transport in xfer client

xfer client:
functionality to fullfill xfer

nc: (nanno callibre)
can show local storage files from browser vFS
can launch: newtabReader, saveToLocalDisk, rmVFSfile




helper not yet defined in deatil:
partialFillme
getIndex




nostr messages, pay somewhat attention to nostr standard.
use resonmable kind, 30k?
no stupid redundacne
search paramters should be optoionsl as possible

