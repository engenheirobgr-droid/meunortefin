import assert from 'node:assert/strict';
import {
  calculateMonthlyCashFlow,
  calculatePreviousBalance,
  filterCardInvoiceItemForPayment,
  filterTransactionByUniverse,
  isCardExpenseTransaction,
  isGeneratedGhostTransaction,
  isPersistedTransaction,
  normalizeSettlementsForCurrentMonth
} from '../src/domain/finance/cashflow.js';

const context = { profile: 'bruno', viewMode: 'personal' };

{
  const privateMine = { type: 'expense', ownerId: 'bruno', isShared: false };
  const sharedPaidByMe = { type: 'expense', ownerId: 'bruno', isShared: true, payer: 'me' };
  const sharedPaidByPartnerFromPartnerEntry = { type: 'expense', ownerId: 'maiara', isShared: true, payer: 'me' };
  const partnerCreatedAndIPaid = { type: 'expense', ownerId: 'maiara', isShared: true, payer: 'partner' };

  assert.equal(filterTransactionByUniverse(privateMine, context), true);
  assert.equal(filterTransactionByUniverse(sharedPaidByMe, context), true);
  assert.equal(filterTransactionByUniverse(sharedPaidByPartnerFromPartnerEntry, context), false);
  assert.equal(filterTransactionByUniverse(partnerCreatedAndIPaid, context), true);
}

{
  const myPrivateCard = { isCardExpense: true, isProjection: true, ownerId: 'bruno', isShared: false };
  const mySharedCard = { isCardExpense: true, isProjection: true, ownerId: 'bruno', isShared: true };
  const legacyPrivateCard = { type: 'expense', invoiceMonth: '2026-06', isProjection: true, ownerId: 'bruno', isShared: false };
  const partnerPrivateCard = { isCardExpense: true, isProjection: true, ownerId: 'maiara', isShared: false };
  const paidCard = { isCardExpense: true, isProjection: false, ownerId: 'bruno', isShared: false };
  const generatedGhost = { id: 'ghost_abc123', type: 'expense', isProjection: true };
  const persistedLegacyGhost = { id: 'abc123', type: 'expense', isProjection: true };

  assert.equal(isCardExpenseTransaction(myPrivateCard), true);
  assert.equal(isCardExpenseTransaction(legacyPrivateCard), true);
  assert.equal(isCardExpenseTransaction({ type: 'expense', invoiceMonth: null }), false);
  assert.equal(isGeneratedGhostTransaction(generatedGhost), true);
  assert.equal(isGeneratedGhostTransaction(persistedLegacyGhost), false);
  assert.equal(isPersistedTransaction(generatedGhost), false);
  assert.equal(isPersistedTransaction(persistedLegacyGhost), true);

  assert.equal(filterCardInvoiceItemForPayment(myPrivateCard, context), true);
  assert.equal(filterCardInvoiceItemForPayment(legacyPrivateCard, context), true);
  assert.equal(filterCardInvoiceItemForPayment(mySharedCard, context), true);
  assert.equal(filterCardInvoiceItemForPayment(partnerPrivateCard, context), false);
  assert.equal(filterCardInvoiceItemForPayment(paidCard, context), false);
  assert.equal(filterCardInvoiceItemForPayment(myPrivateCard, { profile: 'bruno', viewMode: 'joint' }), false);
  assert.equal(filterCardInvoiceItemForPayment(mySharedCard, { profile: 'bruno', viewMode: 'joint' }), true);
}

{
  const transactions = [
    { type: 'income', amount: 5000 },
    { type: 'expense', amount: 1200 },
    { type: 'investment', amount: 700, quantity: 7, isShared: false },
    { type: 'investment', amount: 250, quantity: -2, isShared: false },
    { type: 'p2p', amount: 100, payer: 'me', ownerId: 'bruno' },
    { type: 'p2p', amount: 50, payer: 'partner', ownerId: 'bruno' },
    { type: 'expense', amount: 999, isSettlement: true, status: 'pending', ownerId: 'maiara' },
    { type: 'expense', amount: 80, isSettlement: true, status: 'confirmed', ownerId: 'maiara' }
  ];

  assert.deepEqual(calculatePreviousBalance(transactions, context), {
    previousBalance: 3380,
    accumInvest: 450
  });
}

{
  const monthTransactions = [
    { type: 'income', amount: 5000, title: 'Salario', category: 'Salário', bank: 'Nubank', ownerId: 'bruno', isShared: false },
    { type: 'income', amount: 25, title: 'Dividendos ABCD4', category: 'Dividendos', bank: 'XP', ownerId: 'bruno', isShared: false },
    { type: 'expense', amount: 800, title: 'Mercado', category: 'Alimentação', bank: 'Nubank', ownerId: 'bruno', isShared: false },
    { type: 'investment', amount: 1000, quantity: 10, title: 'Compra ABCD4', category: 'Ações BR', bank: 'XP', ownerId: 'bruno', isShared: false },
    { type: 'investment', amount: 300, quantity: -3, title: 'Venda ABCD4', category: 'Ações BR', bank: 'XP', ownerId: 'bruno', isShared: false },
    { type: 'p2p', amount: 100, title: 'Acerto', category: 'Empréstimo/Acerto', payer: 'me', bank: 'Nubank', ownerId: 'bruno' },
    { type: 'expense', amount: 50, title: 'Pagamento de Acerto', category: 'Ajuste/Reembolso', bank: 'Nubank', isSettlement: true, status: 'confirmed', ownerId: 'bruno' }
  ];

  const result = calculateMonthlyCashFlow(monthTransactions, context);

  assert.equal(result.inc, 5025);
  assert.equal(result.exp, 950);
  assert.equal(result.earningIncome, 5025);
  assert.equal(result.spendingExp, 800);
  assert.equal(result.inv, 1000);
  assert.equal(result.resg, 300);
  assert.equal(result.strictScopeInv, 1000);
  assert.equal(result.strictScopeResg, 300);
  assert.equal(result.monthlyDividends, 25);
  assert.equal(result.bal, 3375);
  assert.equal(result.totalOutflows, 1650);
  assert.deepEqual(result.dailyCatMap, {
    'Alimentação': 800
  });
  assert.equal(result.incomeCatMap['Salário'], 5000);
  assert.equal(result.incomeCatMap.Dividendos, 25);
  assert.equal(result.dailyBankFlow.Nubank, 4050);
  assert.equal(result.dailyBankFlow.XP, -675);
}

{
  const normalized = normalizeSettlementsForCurrentMonth([
    { type: 'expense', amount: 40, isSettlement: true, ownerId: 'maiara' },
    { type: 'income', amount: 70, isSettlement: true, ownerId: 'maiara' },
    { type: 'expense', amount: 10, isSettlement: true, ownerId: 'bruno' }
  ], { profile: 'bruno' });

  assert.equal(normalized[0].type, 'income');
  assert.equal(normalized[0].title, 'Acerto Recebido');
  assert.equal(normalized[1].type, 'expense');
  assert.equal(normalized[1].title, 'Pagamento de Acerto');
  assert.equal(normalized[2].type, 'expense');
}

console.log('Cashflow unit tests passed.');
