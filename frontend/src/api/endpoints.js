/**
 * Catalogue complet des endpoints exposes par le backend Django.
 * Chaque fonction correspond a une URL reelle de core/urls.py ou userauths/urls.py.
 */
import { http } from './client'

/* ------------------------------------------------------------------ AUTH */
export const auth = {
  // POST /user/login/  -> { access, refresh }
  login: (email, password) => http.post('/user/login/', { email, password }, { auth: false }),

  // POST /user/register/ -> { message }
  register: (payload) => http.post('/user/register/', payload, { auth: false }),

  // POST /user/logout/ (blacklist du refresh token)
  logout: (refresh_token) => http.post('/user/logout/', { refresh_token }),

  // POST /user/token/refresh/ -> { access }
  refresh: (refresh) => http.post('/user/token/refresh/', { refresh }, { auth: false }),

  // GET /user/me/ -> { user, account, kyc, notifications, unread_notifications }
  me: () => http.get('/user/me/'),

  // PATCH /user/me/ -> met a jour l'utilisateur et la fiche KYC existante
  updateProfile: (payload) => http.patch('/user/me/', payload),

  // POST /user/change-password/ -> { detail, access, refresh }
  changePassword: (payload) => http.post('/user/change-password/', payload),
}

/* -------------------------------------------------------------- TRANSFERS */
export const transfers = {
  // POST /search-account-api/ -> { accounts: [], query }
  searchAccount: (account_number) => http.post('/search-account-api/', { account_number }),

  // GET /amount-transfer-api/<account_number>/ -> { account }
  getAccount: (accountNumber) => http.get(`/amount-transfer-api/${accountNumber}/`),

  // POST /amount-transfer-process-api/<account_number>/ -> { transaction_id }
  create: (accountNumber, amount, description) =>
    http.post(`/amount-transfer-process-api/${accountNumber}/`, {
      'amount-send': amount,
      description,
    }),

  // GET /transfer-confirmation-api/<account_number>/<transaction_id>/
  confirmation: (accountNumber, transactionId) =>
    http.get(`/transfer-confirmation-api/${accountNumber}/${transactionId}/`),

  // POST /transfer-process-api/<account_number>/<transaction_id>/ (validation par PIN)
  process: (accountNumber, transactionId, pin_number) =>
    http.post(`/transfer-process-api/${accountNumber}/${transactionId}/`, { pin_number }),

  // GET /transfer-completed-api/<account_number>/<transaction_id>/
  completed: (accountNumber, transactionId) =>
    http.get(`/transfer-completed-api/${accountNumber}/${transactionId}/`),
}

/* ----------------------------------------------------------- TRANSACTIONS */
export const transactions = {
  // GET /transactions-api/
  // -> { sender_transactions, reciever_transactions, request_sender_transactions, request_reciever_transactions }
  list: () => http.get('/transactions-api/'),

  // GET /transaction-detail-api/<transaction_id>/
  detail: (transactionId) => http.get(`/transaction-detail-api/${transactionId}/`),
}

/* -------------------------------------------------------- PAYMENT REQUESTS */
export const paymentRequests = {
  // POST /request-search-account-api/
  searchAccount: (account_number) => http.post('/request-search-account-api/', { account_number }),

  // GET /amount-request-api/<account_number>/
  getAccount: (accountNumber) => http.get(`/amount-request-api/${accountNumber}/`),

  // POST /amount-request-process-api/<account_number>/
  create: (accountNumber, amount, description) =>
    http.post(`/amount-request-process-api/${accountNumber}/`, {
      'amount-request': amount,
      description,
    }),

  // GET /amount-request-confirmation-api/<account_number>/<transaction_id>/
  confirmation: (accountNumber, transactionId) =>
    http.get(`/amount-request-confirmation-api/${accountNumber}/${transactionId}/`),

  // POST /amount-request-final-process-api/<account_number>/<transaction_id>/
  finalize: (accountNumber, transactionId, pin) =>
    http.post(`/amount-request-final-process-api/${accountNumber}/${transactionId}/`, {
      'pin-number': pin,
    }),

  // GET /request-completed-api/<account_number>/<transaction_id>/
  completed: (accountNumber, transactionId) =>
    http.get(`/request-completed-api/${accountNumber}/${transactionId}/`),

  /* --- reglement d'une demande recue --- */
  // GET /settlement-confirmation-api/<account_number>/<transaction_id>/
  settlementConfirmation: (accountNumber, transactionId) =>
    http.get(`/settlement-confirmation-api/${accountNumber}/${transactionId}/`),

  // POST /settlement-processing-api/<account_number>/<transaction_id>/
  settle: (accountNumber, transactionId, pin) =>
    http.post(`/settlement-processing-api/${accountNumber}/${transactionId}/`, { 'pin-number': pin }),

  // GET /settlement-completed-api/<account_number>/<transaction_id>/
  settlementCompleted: (accountNumber, transactionId) =>
    http.get(`/settlement-completed-api/${accountNumber}/${transactionId}/`),

  // DELETE /delete-payment-request-api/<account_number>/<transaction_id>/
  remove: (accountNumber, transactionId) =>
    http.del(`/delete-payment-request-api/${accountNumber}/${transactionId}/`),
}

/* ------------------------------------------------------------ CREDIT CARDS */
export const cards = {
  // GET /all-cards-api/ -> { account, credit_cards }
  list: () => http.get('/all-cards-api/'),

  // GET /card-api/<card_id>/ -> { account, credit_card }
  detail: (cardId) => http.get(`/card-api/${cardId}/`),

  // POST /fund-credit-card-api/<card_id>/
  fund: (cardId, funding_amount) => http.post(`/fund-credit-card-api/${cardId}/`, { funding_amount }),

  // POST /withdraw-fund-api/<card_id>/
  withdraw: (cardId, amount) => http.post(`/withdraw-fund-api/${cardId}/`, { amount }),

  // DELETE /delete-card-api/<card_id>/
  remove: (cardId) => http.del(`/delete-card-api/${cardId}/`),
}

/* --------------------------------------------------- RETRAITS AU GUICHET */
export const withdrawals = {
  // GET /withdrawals-api/ -> { withdrawals: [] } (les miennes)
  list: (statusFilter) => http.get(`/withdrawals-api/${statusFilter ? `?status=${statusFilter}` : ''}`),

  // POST /withdrawals-api/ -> { detail, withdrawal } avec le code unique
  create: (amount, description) => http.post('/withdrawals-api/', { amount, description }),

  // GET /withdrawal-api/<code>/
  detail: (code) => http.get(`/withdrawal-api/${code}/`),

  // POST /withdrawal-cancel-api/<code>/
  cancel: (code) => http.post(`/withdrawal-cancel-api/${code}/`, {}),

  // GET /withdrawals-pending-api/  (agent guichet uniquement)
  pending: (statusFilter = 'pending') => http.get(`/withdrawals-pending-api/?status=${statusFilter}`),

  // POST /withdrawal-validate-api/<code>/  (agent + mot de passe du client)
  validate: (code, password) => http.post(`/withdrawal-validate-api/${code}/`, { password }),
}

/* ------------------------------------------------- SERVICE : AGHARINA */
export const agharina = {
  // GET /agharina-biens-api/ -> catalogue relaye depuis l'API partenaire
  list: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== '' && v != null),
    ).toString()
    return http.get(`/agharina-biens-api/${qs ? `?${qs}` : ''}`)
  },

  // GET /agharina-bien-api/<reference>/?quantity=N -> { bien, quote, account_balance }
  detail: (reference, quantity = 1) =>
    http.get(`/agharina-bien-api/${encodeURIComponent(reference)}/?quantity=${quantity}`),

  // POST /agharina-pay-api/<reference>/ -> paiement (mot de passe + nb de periodes)
  pay: (reference, password, quantity = 1) =>
    http.post(`/agharina-pay-api/${encodeURIComponent(reference)}/`, { password, quantity }),
}

/* --------------------------------------------- PAIEMENTS DE SERVICES */
export const servicePayments = {
  // GET /service-payments-api/ -> { payments, totals }
  list: (service) => http.get(`/service-payments-api/${service ? `?service=${service}` : ''}`),

  // GET /service-payment-api/<payment_id>/
  detail: (paymentId) => http.get(`/service-payment-api/${paymentId}/`),
}

export default {
  auth,
  transfers,
  transactions,
  paymentRequests,
  cards,
  withdrawals,
  agharina,
  servicePayments,
}
