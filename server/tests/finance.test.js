const mongoose = require('mongoose');
const db = require('./setup');

let Payment, finance;
beforeAll(async () => {
  await db.start();
  Payment = require('../src/models/Payment');
  finance = require('../src/lib/finance');
});
afterAll(db.stop);
beforeEach(db.clear);

describe('balanceOf', () => {
  it('subtracts what was paid from the budget', () => {
    expect(finance.balanceOf({ _id: 'p', amount: 100 }, { p: 30 })).toBe(70);
  });
  it('clamps at zero when overpaid', () => {
    expect(finance.balanceOf({ _id: 'p', amount: 100 }, { p: 500 })).toBe(0);
  });
  it('treats missing amount / payments as zero', () => {
    expect(finance.balanceOf({ _id: 'p' }, {})).toBe(0);
    expect(finance.balanceOf({ _id: 'p', amount: 40 }, {})).toBe(40);
  });
});

describe('paidByProject', () => {
  it('returns {} without querying for no ids', async () => {
    expect(await finance.paidByProject(new mongoose.Types.ObjectId(), [])).toEqual({});
  });

  it('sums non-pending payments per project and scopes by user', async () => {
    const user = new mongoose.Types.ObjectId();
    const other = new mongoose.Types.ObjectId();
    const p1 = new mongoose.Types.ObjectId();
    const p2 = new mongoose.Types.ObjectId();
    await Payment.create([
      { user, project: p1, amount: 10 },
      { user, project: p1, amount: 5, status: 'partial' },
      { user, project: p1, amount: 100, status: 'pending' },
      { user, project: p2, amount: 7 },
      { user: other, project: p1, amount: 1000 },
    ]);
    const res = await finance.paidByProject(String(user), [String(p1), p2]);
    expect(res).toEqual({ [String(p1)]: 15, [String(p2)]: 7 });
  });
});
