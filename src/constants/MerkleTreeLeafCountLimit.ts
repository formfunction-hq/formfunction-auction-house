/**
 * This limit determines how many allowlist buyer addresses are used for
 * each merkle tree and by extension the size of each proof provided when
 * a buyer is minting. As such, the actual size limit depends on the mint ix
 * size and how large a proof can fit in that ix.
 *
 * Here is an example buy edition transaction using an allowlist proof with a
 * address lookup table:
 * https://explorer.solana.com/tx/57FMyAtTn4C9GPiHNrqTHixVG5xU7ARHmxQmYUoV1vmM6DbWh7UnzeJ1SmZpL92Y5U7FBS64MGGixmaF56bc1Hqw/inspect?cluster=devnet
 *
 * The transaction size is 831 bytes (limit is 1232 bytes), but the above
 * transaction was probably using a very small merkle tree for the allowlist.
 *
 * That means there are roughly ~400 bytes of space left in that transaction.
 *
 * Based on this research into proof sizes:
 * https://github.com/formfunction-hq/formfn-gumdrop/pull/95/files#diff-7779486f4260a55566c09e18350d62c73a0a8e9756413408dcb26a9fa5019f34
 * Which is now committed here:
 * https://github.com/formfunction-hq/formfn-gumdrop/blob/main/src/scripts/estimateMerkleProofSizes.ts
 *
 * The above transaction used the smallest tree size of 2 addresses which
 * requires a proof size of 32 bytes.
 *
 * That means we could add up to 433 more bytes of proof space, but we don't
 * want to use up all the remaining available transaction space.
 *
 * We can go with 250 addresses per tree and will store 100 trees on-chain,
 * which will give us a max allowlist size of 25,000.
 *
 * The proofs should take up a total of 256 bytes (8 proof elements), which
 * should leave 177 bytes available in the transaction.
 */
const MERKLE_TREE_LEAF_COUNT_LIMIT = 250;

export default MERKLE_TREE_LEAF_COUNT_LIMIT;
