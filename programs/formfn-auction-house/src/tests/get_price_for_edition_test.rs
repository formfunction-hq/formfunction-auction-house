#[cfg(test)]
mod tests {
    use crate::{utils::get_price_for_edition, PriceFunction, PriceFunctionType};

    struct TestCase<'a> {
        edition: u64,
        price_function: &'a PriceFunction,
        is_allowlist_sale: bool,
        allowlist_sale_price: Option<u64>,
        allowlist_number_sold: u64,
        expected_price: u64,
    }

    fn check_test_cases(test_cases: Vec<TestCase>) {
        for test_case in test_cases.iter() {
            let result = get_price_for_edition(
                test_case.edition,
                test_case.price_function,
                test_case.is_allowlist_sale,
                test_case.allowlist_sale_price,
                test_case.allowlist_number_sold,
            )
            .unwrap();
            assert_eq!(result, test_case.expected_price);
        }
    }

    #[test]
    fn get_price_for_edition_constant_price_test() {
        let constant_price_function = PriceFunction {
            starting_price_lamports: 1,
            params: vec![],
            price_function_type: PriceFunctionType::Constant,
        };

        let test_cases = vec![
            TestCase {
                edition: 1,
                price_function: &constant_price_function,
                is_allowlist_sale: false,
                allowlist_sale_price: None,
                allowlist_number_sold: 0,
                expected_price: 1,
            },
            TestCase {
                edition: 2,
                price_function: &constant_price_function,
                is_allowlist_sale: false,
                allowlist_sale_price: None,
                allowlist_number_sold: 0,
                expected_price: 1,
            },
        ];

        check_test_cases(test_cases);
    }

    #[test]
    fn get_price_for_edition_minimum_price_test() {
        let minimum_price_function = PriceFunction {
            starting_price_lamports: 1,
            params: vec![],
            price_function_type: PriceFunctionType::Minimum,
        };

        let test_cases = vec![
            TestCase {
                edition: 1,
                price_function: &minimum_price_function,
                is_allowlist_sale: false,
                allowlist_sale_price: None,
                allowlist_number_sold: 0,
                expected_price: 1,
            },
            TestCase {
                edition: 2,
                price_function: &minimum_price_function,
                is_allowlist_sale: false,
                allowlist_sale_price: None,
                allowlist_number_sold: 0,
                expected_price: 1,
            },
        ];

        check_test_cases(test_cases);
    }

    #[test]
    fn get_price_for_edition_linear_price_test() {
        let slope_in_lamports = 2;
        let linear_price_function = PriceFunction {
            starting_price_lamports: 1,
            params: vec![slope_in_lamports as f64],
            price_function_type: PriceFunctionType::Linear,
        };

        let test_cases = vec![
            TestCase {
                edition: 1,
                price_function: &linear_price_function,
                is_allowlist_sale: false,
                allowlist_sale_price: None,
                allowlist_number_sold: 0,
                expected_price: 1,
            },
            TestCase {
                edition: 2,
                price_function: &linear_price_function,
                is_allowlist_sale: false,
                allowlist_sale_price: None,
                allowlist_number_sold: 0,
                expected_price: 1 + slope_in_lamports,
            },
            TestCase {
                edition: 3,
                price_function: &linear_price_function,
                is_allowlist_sale: false,
                allowlist_sale_price: None,
                allowlist_number_sold: 0,
                expected_price: 1 + 2 * slope_in_lamports,
            },
        ];

        check_test_cases(test_cases);
    }

    #[test]
    fn get_price_for_edition_linear_price_with_max_test() {
        let slope_in_lamports = 2;
        let max_price_in_lamports = 2;
        let linear_price_function = PriceFunction {
            starting_price_lamports: 1,
            params: vec![slope_in_lamports as f64, max_price_in_lamports as f64],
            price_function_type: PriceFunctionType::Linear,
        };

        let test_cases = vec![
            TestCase {
                edition: 1,
                price_function: &linear_price_function,
                is_allowlist_sale: false,
                allowlist_sale_price: None,
                allowlist_number_sold: 0,
                expected_price: 1,
            },
            TestCase {
                edition: 2,
                price_function: &linear_price_function,
                is_allowlist_sale: false,
                allowlist_sale_price: None,
                allowlist_number_sold: 0,
                expected_price: 2,
            },
            TestCase {
                edition: 3,
                price_function: &linear_price_function,
                is_allowlist_sale: false,
                allowlist_sale_price: None,
                allowlist_number_sold: 0,
                expected_price: 2,
            },
        ];

        check_test_cases(test_cases);
    }

    #[test]
    fn get_price_for_edition_allowlist_sale() {
        let constant_price_function = PriceFunction {
            starting_price_lamports: 1,
            params: vec![],
            price_function_type: PriceFunctionType::Constant,
        };

        let test_cases = vec![
            TestCase {
                edition: 1,
                price_function: &constant_price_function,
                is_allowlist_sale: true,
                allowlist_sale_price: Some(10),
                allowlist_number_sold: 0,
                expected_price: 10,
            },
            TestCase {
                edition: 2,
                price_function: &constant_price_function,
                is_allowlist_sale: false,
                allowlist_sale_price: None,
                allowlist_number_sold: 0,
                expected_price: 1,
            },
        ];

        check_test_cases(test_cases);
    }

    #[test]
    fn get_incrementing_price_for_public_sale_with_allowlist_sales() {
        let slope_in_lamports = 2;
        let max_price_in_lamports = 10;
        let linear_price_function = PriceFunction {
            starting_price_lamports: 1,
            params: vec![slope_in_lamports as f64, max_price_in_lamports as f64],
            price_function_type: PriceFunctionType::Linear,
        };

        // Note that for the following test cases here and below arbitrary edition and allowlist_number_sold
        // values are passed in to test different input combinations for the incrementing price calculation.
        let test_cases = vec![
            TestCase {
                edition: 2,
                price_function: &linear_price_function,
                is_allowlist_sale: false,
                allowlist_sale_price: Some(1),
                allowlist_number_sold: 1,
                expected_price: 1,
            },
            TestCase {
                edition: 7,
                price_function: &linear_price_function,
                is_allowlist_sale: false,
                allowlist_sale_price: Some(1),
                allowlist_number_sold: 5,
                expected_price: 3,
            },
            TestCase {
                edition: 18,
                price_function: &linear_price_function,
                is_allowlist_sale: false,
                allowlist_sale_price: Some(1),
                allowlist_number_sold: 15,
                expected_price: 5,
            },
            TestCase {
                edition: 19,
                price_function: &linear_price_function,
                is_allowlist_sale: false,
                allowlist_sale_price: Some(1),
                allowlist_number_sold: 15,
                expected_price: 7,
            },
            TestCase {
                edition: 25,
                price_function: &linear_price_function,
                is_allowlist_sale: false,
                allowlist_sale_price: Some(1),
                allowlist_number_sold: 15,
                expected_price: 10,
            },
        ];

        check_test_cases(test_cases);

        // If no allowlist sales occurred, the prices should be the same for the same respective public sale edition numbers.
        let test_cases = vec![
            TestCase {
                edition: 1,
                price_function: &linear_price_function,
                is_allowlist_sale: false,
                allowlist_sale_price: Some(1),
                allowlist_number_sold: 0,
                expected_price: 1,
            },
            TestCase {
                edition: 2,
                price_function: &linear_price_function,
                is_allowlist_sale: false,
                allowlist_sale_price: Some(1),
                allowlist_number_sold: 0,
                expected_price: 3,
            },
            TestCase {
                edition: 3,
                price_function: &linear_price_function,
                is_allowlist_sale: false,
                allowlist_sale_price: Some(1),
                allowlist_number_sold: 0,
                expected_price: 5,
            },
            TestCase {
                edition: 4,
                price_function: &linear_price_function,
                is_allowlist_sale: false,
                allowlist_sale_price: Some(1),
                allowlist_number_sold: 0,
                expected_price: 7,
            },
            TestCase {
                edition: 25,
                price_function: &linear_price_function,
                is_allowlist_sale: false,
                allowlist_sale_price: Some(1),
                allowlist_number_sold: 0,
                expected_price: 10,
            },
        ];

        check_test_cases(test_cases);

        // If there was no allowlist price, then the allowlist sale and public sale should both follow the same linear price function.
        let test_cases = vec![
            TestCase {
                edition: 1,
                price_function: &linear_price_function,
                is_allowlist_sale: true,
                allowlist_sale_price: None,
                allowlist_number_sold: 0,
                expected_price: 1,
            },
            TestCase {
                edition: 2,
                price_function: &linear_price_function,
                is_allowlist_sale: true,
                allowlist_sale_price: None,
                allowlist_number_sold: 1,
                expected_price: 3,
            },
            TestCase {
                edition: 3,
                price_function: &linear_price_function,
                is_allowlist_sale: true,
                allowlist_sale_price: None,
                allowlist_number_sold: 2,
                expected_price: 5,
            },
            TestCase {
                edition: 4,
                price_function: &linear_price_function,
                is_allowlist_sale: true,
                allowlist_sale_price: None,
                allowlist_number_sold: 3,
                expected_price: 7,
            },
            TestCase {
                edition: 5,
                price_function: &linear_price_function,
                is_allowlist_sale: false,
                allowlist_sale_price: None,
                allowlist_number_sold: 3,
                expected_price: 9,
            },
            TestCase {
                edition: 6,
                price_function: &linear_price_function,
                is_allowlist_sale: false,
                allowlist_sale_price: None,
                allowlist_number_sold: 3,
                expected_price: 10,
            },
            TestCase {
                edition: 7,
                price_function: &linear_price_function,
                is_allowlist_sale: false,
                allowlist_sale_price: None,
                allowlist_number_sold: 3,
                expected_price: 10,
            },
            TestCase {
                edition: 8,
                price_function: &linear_price_function,
                is_allowlist_sale: false,
                allowlist_sale_price: None,
                allowlist_number_sold: 3,
                expected_price: 10,
            },
        ];

        check_test_cases(test_cases);
    }
}
