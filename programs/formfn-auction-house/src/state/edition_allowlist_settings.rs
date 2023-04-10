use anchor_lang::prelude::*;

/// State for the account which distributes NFT editions.
#[account]
pub struct EditionAllowlistSettings {
    pub bump: u8,
    // Vector of merkle tree root hashes for edition allowlist.
    pub merkle_roots: Vec<[u8; 32]>,
}

pub const MERKLE_ROOT_SIZE: usize = 32;

// Max allowlist size is 25,000 addresses. See also MerkleTreeLeafCountLimit.ts.
// This constant should match the same named constant in the buyEditionAllowlistGiant test.
pub const NUMBER_OF_MERKLE_ROOTS_TO_STORE: usize = 100;
pub const MERKLE_ALLOWLIST_ROOT_LIST_SIZE: usize =
    MERKLE_ROOT_SIZE * NUMBER_OF_MERKLE_ROOTS_TO_STORE;

pub const EDITION_ALLOWLIST_SETTINGS_SIZE: usize = 8 + // Discriminator
1 + // bump
4 + // extra overhead for vector storage
MERKLE_ALLOWLIST_ROOT_LIST_SIZE + // list of merkle_roots
128; // padding
