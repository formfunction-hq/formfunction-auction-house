use num_derive::FromPrimitive;

// Will be used to check sale_type set in trade state accounts
// NOTE: Keep in sync with JS enum at src/types/enums/SaleType.ts
#[derive(Eq, FromPrimitive, PartialEq)]
#[repr(u8)]
pub enum TradeStateSaleType {
    Auction = 1,
    InstantSale = 2,
    Offer = 3,
}

// Needed for msg!
impl std::fmt::Display for TradeStateSaleType {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        match *self {
            TradeStateSaleType::Auction => write!(f, "Auction"),
            TradeStateSaleType::InstantSale => write!(f, "InstantSale"),
            TradeStateSaleType::Offer => write!(f, "Offer"),
        }
    }
}

pub const TRADE_STATE_SIZE_U16: u16 = 1 + // bump
1 + // sale type Enum
128; // padding
pub const TRADE_STATE_SIZE: usize = TRADE_STATE_SIZE_U16 as usize;
