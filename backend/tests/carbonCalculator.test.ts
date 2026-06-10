import { sumEmissions } from '../src/utils/emissions';

describe('Carbon Calculator emissions utility tests', () => {
  // 1. Valid inputs for Energy, Transport, and Food return the correct mathematical sum.
  it('should return the correct mathematical sum for valid positive inputs', () => {
    expect(sumEmissions(10.5, 15.2, 5.3)).toBe(31.0);
    expect(sumEmissions(1.23, 4.56, 7.89)).toBe(13.68);
  });

  // 2. Missing, null, or zero inputs return 0 safely.
  it('should safely return 0 when inputs are missing, null, or zero', () => {
    expect(sumEmissions(0, 0, 0)).toBe(0);
    expect(sumEmissions(null, undefined, null)).toBe(0);
    expect(sumEmissions(undefined, 0, undefined)).toBe(0);
  });

  // 3. Edge/boundary conditions are handled gracefully without throwing errors.
  it('should handle negative or abnormal boundary values gracefully by clamping them to 0', () => {
    expect(sumEmissions(-10, -5, -2)).toBe(0);
    expect(sumEmissions(-12.5, 8.4, null)).toBe(8.4);
    expect(sumEmissions(NaN as any, undefined, -100)).toBe(0);
  });

  // 4. Test rounding behavior.
  it('should accurately round totals to 2 decimal places', () => {
    expect(sumEmissions(10.125, 20.556, 5.211)).toBe(35.89);
    expect(sumEmissions(0.004, 0.002, 0.001)).toBe(0.01);
  });

  // 5. Test string-to-number parsing.
  it('should handle string inputs correctly by parsing them before summing', () => {
    expect(sumEmissions("10.5" as any, "15" as any, "5.25" as any)).toBe(30.75);
    expect(sumEmissions("invalid" as any, null, 12)).toBe(12);
  });
});
