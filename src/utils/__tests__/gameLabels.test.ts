import { isPlaceholderTeam } from '../gameLabels';

describe('isPlaceholderTeam', () => {
  it('should recognize TBD as placeholder', () => {
    expect(isPlaceholderTeam('TBD')).toBe(true);
    expect(isPlaceholderTeam('tbd')).toBe(true);
    expect(isPlaceholderTeam('To Be Determined')).toBe(true);
  });

  it('should recognize Winner/Loser patterns as placeholders', () => {
    expect(isPlaceholderTeam('Winner of Game 1')).toBe(true);
    expect(isPlaceholderTeam('Loser of Game 2')).toBe(true);
    expect(isPlaceholderTeam('winner game 1')).toBe(true);
    expect(isPlaceholderTeam('loser game 2')).toBe(true);
  });

  it('should recognize pool placeholders', () => {
    expect(isPlaceholderTeam('1st Pool A')).toBe(true);
    expect(isPlaceholderTeam('2nd Pool B')).toBe(true);
    expect(isPlaceholderTeam('3rd Pool C')).toBe(true);
  });

  it('should recognize L1-L4 and W1-W4 patterns as placeholders', () => {
    expect(isPlaceholderTeam('L1')).toBe(true);
    expect(isPlaceholderTeam('L2')).toBe(true);
    expect(isPlaceholderTeam('L3')).toBe(true);
    expect(isPlaceholderTeam('L4')).toBe(true);
    expect(isPlaceholderTeam('W1')).toBe(true);
    expect(isPlaceholderTeam('W2')).toBe(true);
    expect(isPlaceholderTeam('l1')).toBe(true);
    expect(isPlaceholderTeam('w1')).toBe(true);
  });

  it('should recognize seed placeholders', () => {
    expect(isPlaceholderTeam('Seed 1')).toBe(true);
    expect(isPlaceholderTeam('seed 2')).toBe(true);
  });

  it('should recognize empty strings as placeholders', () => {
    expect(isPlaceholderTeam('')).toBe(true);
    expect(isPlaceholderTeam('-')).toBe(true);
  });

  it('should NOT recognize real team names as placeholders', () => {
    expect(isPlaceholderTeam('Lakers')).toBe(false);
    expect(isPlaceholderTeam('Warriors')).toBe(false);
    expect(isPlaceholderTeam('Veterans Memorial')).toBe(false);
    expect(isPlaceholderTeam('Ellison')).toBe(false);
    expect(isPlaceholderTeam('Harker Heights')).toBe(false);
  });
});
