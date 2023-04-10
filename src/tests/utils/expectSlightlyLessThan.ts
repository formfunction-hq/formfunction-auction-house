export default function expectSlightlyLessThan(
  a: number,
  b: number,
  numDigits = -8
) {
  expect(a).toBeLessThan(b);
  expect(a).toBeCloseTo(b, numDigits);
}
