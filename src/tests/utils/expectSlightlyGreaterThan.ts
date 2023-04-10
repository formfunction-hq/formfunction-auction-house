export default function expectSlightlyGreaterThan(
  a: number,
  b: number,
  numDigits = -8
) {
  if (numDigits === 0) {
    expect(a).toEqual(b);
  } else {
    expect(a).toBeGreaterThan(b);
    expect(a).toBeCloseTo(b, numDigits);
  }
}
