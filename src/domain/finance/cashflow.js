export function filterTransactionByUniverse(transaction, { profile, viewMode }) {
  if (transaction.type === 'p2p') {
    if (viewMode === 'joint') return false;
    return true;
  }

  if (transaction.isSettlement) {
    if (viewMode === 'joint') return false;

    if (transaction.ownerId === profile) return true;
    if (transaction.ownerId !== profile) return transaction.status === 'confirmed';
    return false;
  }

  if (viewMode === 'joint') return transaction.isShared && !transaction.isSettlement;

  const myPrivate = transaction.ownerId === profile && !transaction.isShared;
  const iCreatedAndPaid = transaction.ownerId === profile && transaction.payer === 'me' && transaction.isShared;
  const partnerCreatedAndIPaid = transaction.ownerId !== profile && transaction.payer === 'partner' && transaction.isShared;

  return myPrivate || iCreatedAndPaid || partnerCreatedAndIPaid;
}

export function isCardExpenseTransaction(transaction) {
  if (!transaction || transaction.isSettlement) return false;

  if (transaction.isCardExpense === true) return true;

  return transaction.type === 'expense'
    && typeof transaction.invoiceMonth === 'string'
    && /^\d{4}-\d{2}$/.test(transaction.invoiceMonth);
}

export function filterCardInvoiceItemForPayment(transaction, { profile, viewMode }) {
  if (!isCardExpenseTransaction(transaction) || !transaction.isProjection || transaction.isSettlement) return false;
  if (transaction.ownerId !== profile) return false;

  if (viewMode === 'joint') return transaction.isShared === true;

  return true;
}

export function calculatePreviousBalance(previousTransactions, { profile, viewMode }) {
  let previousBalance = 0;
  let accumInvest = 0;

  previousTransactions.forEach(transaction => {
    const value = Number(transaction.amount);

    if (transaction.isSettlement) {
      if (transaction.status !== 'confirmed') return;

      const isMySettlement = transaction.ownerId === profile;
      const effectiveType = isMySettlement
        ? transaction.type
        : (transaction.type === 'expense' ? 'income' : 'expense');

      if (effectiveType === 'expense') previousBalance -= value;
      else previousBalance += value;
      return;
    }

    if (transaction.type === 'p2p') {
      const iPaid = transaction.payer === 'me'
        ? transaction.ownerId === profile
        : transaction.ownerId !== profile;

      if (iPaid) previousBalance -= value;
      else previousBalance += value;
      return;
    }

    if (transaction.type === 'income') previousBalance += value;
    else if (transaction.type === 'expense') previousBalance -= value;
    else if (transaction.type === 'investment') {
      const belongsToScope = viewMode === 'joint' ? transaction.isShared : !transaction.isShared;

      if (Number(transaction.quantity) < 0) {
        previousBalance += value;
        if (belongsToScope) accumInvest -= value;
      } else {
        previousBalance -= value;
        if (belongsToScope) accumInvest += value;
      }
    }
  });

  return { previousBalance, accumInvest };
}

export function normalizeSettlementsForCurrentMonth(monthTransactions, { profile }) {
  return monthTransactions.map(transaction => {
    if (transaction.isSettlement && transaction.ownerId !== profile) {
      const invertedType = transaction.type === 'expense' ? 'income' : 'expense';
      const invertedTitle = transaction.type === 'expense' ? 'Acerto Recebido' : 'Pagamento de Acerto';
      return { ...transaction, type: invertedType, title: invertedTitle };
    }

    return transaction;
  });
}

export function calculateMonthlyCashFlow(currentMonthList, { profile, viewMode }) {
  let inc = 0;
  let exp = 0;
  let inv = 0;
  let resg = 0;
  let strictScopeInv = 0;
  let strictScopeResg = 0;
  let monthlyDividends = 0;
  const dailyCatMap = {};
  const incomeCatMap = {};
  const dailyBankFlow = {};
  const sharedSpends = { bruno: 0, maiara: 0 };

  currentMonthList.forEach(transaction => {
    const value = Number(transaction.amount);

    if (transaction.isSettlement) {
      if (transaction.status !== 'confirmed') return;

      if (transaction.type === 'expense') {
        exp += value;
        const categoryName = transaction.category || 'Ajuste/Reembolso';
        dailyCatMap[categoryName] = (dailyCatMap[categoryName] || 0) + value;
      } else {
        inc += value;
      }
      return;
    }

    if (transaction.type === 'p2p') {
      const iPaid = transaction.payer === 'me'
        ? transaction.ownerId === profile
        : transaction.ownerId !== profile;

      if (iPaid) {
        exp += value;
        const categoryName = transaction.category || 'Empréstimo/Acerto';
        dailyCatMap[categoryName] = (dailyCatMap[categoryName] || 0) + value;
      } else {
        inc += value;
        const categoryName = transaction.category || 'Empréstimo/Acerto';
        incomeCatMap[categoryName] = (incomeCatMap[categoryName] || 0) + value;
      }
      return;
    }

    if (transaction.type === 'income') {
      inc += value;
      const categoryName = transaction.category || 'Outros';
      incomeCatMap[categoryName] = (incomeCatMap[categoryName] || 0) + value;

      if (transaction.title.toLowerCase().includes('dividendo') || transaction.category === 'Dividendos') {
        const dividendBelongsToScope = viewMode === 'joint'
          ? transaction.isShared
          : (!transaction.isShared && transaction.ownerId === profile);

        if (dividendBelongsToScope) monthlyDividends += value;
      }

      if (transaction.bank) dailyBankFlow[transaction.bank] = (dailyBankFlow[transaction.bank] || 0) + value;
    } else if (transaction.type === 'expense') {
      exp += value;
      const categoryName = transaction.category || 'Outros';
      dailyCatMap[categoryName] = (dailyCatMap[categoryName] || 0) + value;

      if (transaction.bank) {
        if (!dailyBankFlow[transaction.bank]) dailyBankFlow[transaction.bank] = 0;
        dailyBankFlow[transaction.bank] -= value;
      }

      if (viewMode === 'joint' && transaction.ownerId) {
        const realPayerId = getRealPayerId(transaction, profile);

        if (sharedSpends[realPayerId] !== undefined) {
          sharedSpends[realPayerId] += value;
        }
      }
    } else if (transaction.type === 'investment') {
      const transactionQuantity = Number(transaction.quantity);
      const isRedemption = transactionQuantity < 0;

      if (isRedemption) {
        resg += value;

        const belongsToScope = viewMode === 'joint' ? transaction.isShared : !transaction.isShared;
        if (belongsToScope) strictScopeResg += value;

        if (transaction.bank) dailyBankFlow[transaction.bank] = (dailyBankFlow[transaction.bank] || 0) + value;
      } else {
        inv += value;

        const belongsToScope = viewMode === 'joint' ? transaction.isShared : !transaction.isShared;
        if (belongsToScope) strictScopeInv += value;

        if (viewMode === 'joint' && transaction.isShared && transaction.ownerId) {
          const realPayerId = getRealPayerId(transaction, profile);

          if (sharedSpends[realPayerId] !== undefined) {
            sharedSpends[realPayerId] += value;
          }
        }
      }
    }
  });

  const bal = inc - exp - inv + resg;
  const totalOutflows = exp + inv - resg;

  return {
    inc,
    exp,
    inv,
    resg,
    strictScopeInv,
    strictScopeResg,
    dailyCatMap,
    incomeCatMap,
    dailyBankFlow,
    monthlyDividends,
    sharedSpends,
    bal,
    totalOutflows
  };
}

function getRealPayerId(transaction, profile) {
  let realPayerId = transaction.ownerId;

  if (transaction.payer === 'partner') {
    realPayerId = transaction.ownerId === profile
      ? (profile === 'bruno' ? 'maiara' : 'bruno')
      : profile;
  } else if (transaction.payer === 'me') {
    realPayerId = transaction.ownerId;
  }

  return realPayerId;
}
