we will spec a bit about what we want to do

we want to, iteraratively build a web app
exploring the choiuces as we go

start off prgapmatic, hardcoding, etc
then become generic and adaptable



the app it self is:
send and recives nostr notes and shares data from various colections


we like:
single page deisgn
small-codebase
poweruserfiredly



we grow it in many stages..

poc0
poc1
poc2 

etc ...


the app in detail in first iteration is:
a soly browser web pased html page that make use of webrtc to become a archive/mirros/cdn for the collection library: gutenberg

80k metadata
and same amount of books
20mb csv available


app can ask nostr for books
e,g who knows title=1984

then ppl (we too) would answer
e.g.: collection:Gtenberg:ID/or hash?

then we ask:
wo has delivery for said ID/addres?

then answer come in with:
offering transport webrtc for ID
offering .onion
offering libp2p for ID ..


then client can offere can fullfill this trasnaction.

the pdf then gos into briws4ers stroage
later a hash based verificytaion is needed

