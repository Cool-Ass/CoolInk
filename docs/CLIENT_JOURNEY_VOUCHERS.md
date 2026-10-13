# Client journey and single-use vouchers

## Decision and scope
Keep the existing appointments, documents, loyalty ledger, private storage and calendar lock; do not introduce a second checkout or payment gateway. A voucher is credit toward one tattoo appointment, not proof of a bank payment. Issuance is restricted to finance.manage. No historical appointment, account registration or real payment is rewritten by the additive migrations.

## Workflow
Calendar date → project → pending consents only → summary → studio confirmation → visit-bound signed documents → session → normal administrator settlement → contextual aftercare. Consultations do not request tattoo documents or aftercare. Aftercare administration lives in Settings / Opieka po sesji; old links redirect. General documents remain grouped, signatures remain immutable and tied to the confirmed tattoo visit.

## Voucher data and invariants
Voucher: high-entropy bearer code, issuance idempotency key, recipient name, face value in integer cents, Warsaw end-of-day expiry, first claiming client, unique appointment reservation, consumption timestamp and actual applied cents. A cancelled, unspent reservation may be rebooked by the same client. Eligibility is checked for the session date.

Owner decisions: one use, unused value forfeited, never combined with stamp discount. Client booking reserves the verified code in the calendar transaction. At settlement, credit = min(face value, visit price); actual receipt = visit price minus credit. No unverified photograph creates credit. A paper voucher must be checked and assigned a verified digital code. A paid deposit exceeding the net amount blocks settlement for explicit correction rather than silently creating a refund.

Database checks reject invalid financial values, incompatible appointment changes and mutation/deletion of redeemed voucher evidence. Only the existing exact-client approved privacy executor can erase evidence after its separately verified retention review. Finance reports show voucher credit separately from money received. Voiding a settlement does not revive a consumed code.

Stamp rewards are offered only when unreserved balance suffices; booking stores a validated rule snapshot. Manual redemption cannot spend another visit's reserved stamps. Reactivating a cancelled reward must reserve available stamps again.

## Messages
Server creation means sent. Recipient acknowledgement of fetched messages means delivered. A visible, focused conversation means read. Sender, foreign-client and foreign-project IDs are scoped out by the existing authorization boundaries. Existing read timestamps remain valid; new delivery timestamps start nullable.

## Verification and rollout
Unit tests cover parsing, authorization, idempotency, exclusivity, credit/receipt arithmetic, immutable consumption and reward reservations. Isolated database tests execute additive migrations against old rows, concurrent claims and financial/privacy guards. Desktop/mobile browser tests exercise voucher issuance, QR, booking, private photo, session document module, receipts and automatic settlement.

Production remains unchanged until exact-head CI, a verified backup/restore and final publication approval. Code rollback may preserve the additive columns; never roll back by deleting new financial records. No test fixture, real payment, broadcast, paid service or secret mutation is authorized by this implementation.
