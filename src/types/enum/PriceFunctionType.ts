// Keep in sync with PriceFunctionType in programs/formfn-auction-house/src/lib.rs
enum PriceFunctionType {
  Constant = 0,
  Linear = 1,
  Minimum = 2,
}

export default PriceFunctionType;
