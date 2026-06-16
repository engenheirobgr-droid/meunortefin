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

export function isGeneratedGhostTransaction(transaction) {
  return typeof transaction?.id === 'string' && transaction.id.startsWith('ghost_');
}

export function isPersistedTransaction(transaction) {
  return Boolean(transaction?.id) && !isGeneratedGhostTransaction(transaction);
}

const INSTALLMENT_TITLE_PATTERN = /\((\d+)\/(\d+)\)$/;

export function parseInstallmentTitle(title) {
  if (typeof title !== 'string') return null;

  const match = title.match(INSTALLMENT_TITLE_PATTERN);
  if (!match) return null;

  const index = Number(match[1]);
  const total = Number(match[2]);

  if (!Number.isInteger(index) || !Number.isInteger(total) || index < 1 || total < 2 || index > total) {
    return null;
  }

  return { index, total };
}

export function stripInstallmentSuffix(title) {
  if (typeof title !== 'string') return '';
  return title.replace(/\s*\(\d+\/\d+\)$/, '');
}

export function inferInstallmentSeriesInfo(transaction, siblings = []) {
  const ownMeta = parseInstallmentTitle(transaction?.title);
  if (ownMeta) {
    return {
      isInstallment: true,
      installmentIndex: ownMeta.index,
      installmentCount: ownMeta.total
    };
  }

  if (!Array.isArray(siblings) || siblings.length < 2) {
    return { isInstallment: false, installmentIndex: null, installmentCount: 1 };
  }

  const metas = siblings
    .map(item => parseInstallmentTitle(item?.title))
    .filter(Boolean);

  if (metas.length !== siblings.length) {
    return { isInstallment: false, installmentIndex: null, installmentCount: 1 };
  }

  const total = metas[0].total;
  if (!metas.every(meta => meta.total === total)) {
    return { isInstallment: false, installmentIndex: null, installmentCount: 1 };
  }

  const ownSiblingMeta = transaction?.id
    ? metas[siblings.findIndex(item => item.id === transaction.id)]
    : null;

  return {
    isInstallment: true,
    installmentIndex: ownSiblingMeta?.index || null,
    installmentCount: total
  };
}

export function shiftMonthKey(monthKey, offset) {
  if (typeof monthKey !== 'string' || !/^\d{4}-\d{2}$/.test(monthKey)) return null;

  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, (month - 1) + Number(offset || 0), 1));
  const nextYear = date.getUTCFullYear();
  const nextMonth = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${nextYear}-${nextMonth}`;
}

export function shiftDatePreservingDay(dateString, offset) {
  if (typeof dateString !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return null;

  const [year, month, day] = dateString.split('-').map(Number);
  const targetBase = new Date(Date.UTC(year, (month - 1) + Number(offset || 0), 1));
  const targetYear = targetBase.getUTCFullYear();
  const targetMonthIndex = targetBase.getUTCMonth();
  const lastDay = new Date(Date.UTC(targetYear, targetMonthIndex + 1, 0)).getUTCDate();
  const targetDay = String(Math.min(day, lastDay)).padStart(2, '0');
  const targetMonth = String(targetMonthIndex + 1).padStart(2, '0');

  return `${targetYear}-${targetMonth}-${targetDay}`;
}

export function getMonthOffset(fromDate, toDate) {
  if (
    typeof fromDate !== 'string'
    || typeof toDate !== 'string'
    || !/^\d{4}-\d{2}-\d{2}$/.test(fromDate)
    || !/^\d{4}-\d{2}-\d{2}$/.test(toDate)
  ) {
    return 0;
  }

  const [fromYear, fromMonth] = fromDate.split('-').map(Number);
  const [toYear, toMonth] = toDate.split('-').map(Number);

  return ((toYear - fromYear) * 12) + (toMonth - fromMonth);
}

export function buildInstallmentPlan({ amount, date, installments, title, isCard, invoiceMonth }) {
  const totalInstallments = Math.max(Number(installments) || 1, 1);
  const totalAmount = Number(amount) || 0;
  const amountPerInstallment = totalAmount / totalInstallments;

  return Array.from({ length: totalInstallments }, (_, index) => ({
    index: index + 1,
    total: totalInstallments,
    title: totalInstallments > 1 ? `${title} (${index + 1}/${totalInstallments})` : title,
    amount: amountPerInstallment,
    date: shiftDatePreservingDay(date, index) || date,
    invoiceMonth: isCard ? shiftMonthKey(invoiceMonth, index) : null
  }));
}

export function hasPaidCardTransactions(transactions) {
  return Array.isArray(transactions)
    && transactions.some(transaction => isCardExpenseTransaction(transaction) && !transaction.isProjection);
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
  let earningIncome = 0;
  let spendingExp = 0;
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
        addBankFlow(dailyBankFlow, transaction.bank, -value);
      } else {
        inc += value;
        addBankFlow(dailyBankFlow, transaction.bank, value);
      }
      return;
    }

    if (transaction.type === 'p2p') {
      const iPaid = transaction.payer === 'me'
        ? transaction.ownerId === profile
        : transaction.ownerId !== profile;

      if (iPaid) {
        exp += value;
        addBankFlow(dailyBankFlow, transaction.bank, -value);
      } else {
        inc += value;
        addBankFlow(dailyBankFlow, transaction.bank, value);
      }
      return;
    }

    if (transaction.type === 'income') {
      inc += value;
      earningIncome += value;
      const categoryName = transaction.category || 'Outros';
      incomeCatMap[categoryName] = (incomeCatMap[categoryName] || 0) + value;

      if ((transaction.title || '').toLowerCase().includes('dividendo') || transaction.category === 'Dividendos') {
        const dividendBelongsToScope = viewMode === 'joint'
          ? transaction.isShared
          : (!transaction.isShared && transaction.ownerId === profile);

        if (dividendBelongsToScope) monthlyDividends += value;
      }

      if (transaction.bank) dailyBankFlow[transaction.bank] = (dailyBankFlow[transaction.bank] || 0) + value;
    } else if (transaction.type === 'expense') {
      exp += value;
      spendingExp += value;
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

        addBankFlow(dailyBankFlow, transaction.bank, -value);

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
    earningIncome,
    spendingExp,
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

function addBankFlow(bankFlow, bank, amount) {
  if (!bank) return;
  bankFlow[bank] = (bankFlow[bank] || 0) + amount;
}
