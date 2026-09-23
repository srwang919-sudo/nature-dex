# CloudBase doc-only privacy transaction correction

Supersedes unsupported transaction queries in aaada0e. No deployment or production invocation.

CloudBase transaction scope supports document methods, not collection queries. Erasure now enumerates remaining assets and art outside the transaction, reads the account generation fence before enumeration, and finalizes only through the marker document after verifying its generation is unchanged. Every late private-art callback increments this same fence and reopens pending erasure. Sensitive writers already conflict on the account guard document.

Retention enumerates candidate operations outside its transaction, then rereads their document IDs inside it. Ready art remains retained; active leases defer cleanup. It cancels the owner/observation recognition receipt and writes the observation deletion marker. New art claims now revalidate and mutate that same receipt document inside their claim transaction, preventing paid work from racing retention. No undocumented transaction `where` operation remains.

Invites are removed for both issuer and recipient. Relationship cleanup paginates owned edges and removes counterpart edges before removing the relationship. Tests include 25 relationships and 25 recipient invitations. The transaction mock intentionally exposes only `doc`, so unsupported query use fails.

Account guard/tombstone documents store no raw OPENID; their SHA-256 document ID is sufficient. RequestErasure creates erasing state; continueErasure rejects an ordinary active guard, preventing accidental deletion without a request. Private file and operational records retain owner only while necessary to select and safely delete them; financial audit minimization remains a separately stated release gate.

Focused privacy/social/receipt checks: 26 passed before the final added active-guard regression. Isolated clean-checkout full count/build is supplied with the commit report. Real CloudBase concurrency/storage semantics, operator deployment and legal retention remain unverified external gates.
