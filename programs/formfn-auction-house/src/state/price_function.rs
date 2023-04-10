use anchor_lang::prelude::*;

use crate::constants::MAX_NUMBER_OF_PRICE_PARAMS;

#[repr(u8)]
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum PriceFunctionType {
    Constant = 0,
    Linear = 1,
    Minimum = 2,
}

#[repr(C)]
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct PriceFunction {
    pub starting_price_lamports: u64,
    pub price_function_type: PriceFunctionType,
    // E.g. for PriceFunctionType.Linear, will contain the slope
    pub params: Vec<f64>,
}

pub const PRICE_FUNCTION_SIZE: usize = 8 + // starting_price_lamports
1 + // price_function_type
4 + // extra overhead for vector storage
MAX_NUMBER_OF_PRICE_PARAMS * 8; // params
