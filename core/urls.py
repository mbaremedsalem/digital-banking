from django.urls import path
from core import deposit, views, transfer, transaction, payment_request, credit_card


app_name = "core"

urlpatterns = [
    path("", views.index, name="index"),

    # -------------- Transfers ----------
    path("search-account/", transfer.search_users_account_number, name="search-account"),
    path("amount-transfer/<account_number>/", transfer.AmountTransfer, name="amount-transfer"),
    path("amount-transfer-process/<account_number>/", transfer.AmountTransferProcess, name="amount-transfer-process"),
    path("transfer-confirmation/<account_number>/<transaction_id>/", transfer.TransferConfirmation, name="transfer-confirmation"),
    path("transfer-process/<account_number>/<transaction_id>/", transfer.TransferProcess, name="transfer-process"),
    path("transfer-completed/<account_number>/<transaction_id>/", transfer.TransferCompleted, name="transfer-completed"),

    # ---------- Transfers API ---------
    path("search-account-api/", transfer.SearchUserAccountNumber.as_view(), name='search-account-api'),
    path("amount-transfer-api/<str:account_number>/", transfer.AmountTransferApi.as_view(), name='amount-transfer-api'),
    path('amount-transfer-process-api/<str:account_number>/', transfer.AmountTransferProcessApi.as_view(), name='amount-transfer-process-api'),
    path('transfer-confirmation-api/<str:account_number>/<str:transaction_id>/', transfer.TransferConfirmationApi.as_view(), name='transfer-confirmation-api'),
    path('transfer-process-api/<str:account_number>/<str:transaction_id>/', transfer.TransferProcessApi.as_view(), name='transfer-process-api'),
    path('transfer-completed-api/<str:account_number>/<str:transaction_id>/', transfer.TransferCompletedApi.as_view(), name='transfer-completed-api'),
    
    # -------- transactions ------------
    path("transactions/", transaction.transaction_lists, name="transactions"),
    path("transaction-detail/<transaction_id>/", transaction.transaction_detail, name="transaction-detail"),
    # ---------- transactions API ---------
    path('transactions-api/', transaction.TransactionListApi.as_view(), name='transaction-api'),
    path('transaction-detail-api/<str:transaction_id>/', transaction.TransactionDetailApi.as_view(), name='transaction-detail-api'),

    # -------- Payment Request
    path("request-search-account/", payment_request.SearchUsersRequest, name="request-search-account"),
    path("amount-request/<account_number>/", payment_request.AmountRequest, name="amount-request"),
    path("amount-request-process/<account_number>/", payment_request.AmountRequestProcess, name="amount-request-process"),
    path("amount-request-confirmation/<account_number>/<transaction_id>/", payment_request.AmountRequestConfirmation, name="amount-request-confirmation"),
    path("amount-request-final-process/<account_number>/<transaction_id>/", payment_request.AmountRequestFinalProcess, name="amount-request-final-process"),
    path("amount-request-completed/<account_number>/<transaction_id>/", payment_request.RequestCompleted, name="amount-request-completed"),
    # ---------- Payment API ---------
    path("request-search-account-api/", payment_request.SearchUsersRequestApi.as_view(), name="request-search-account-api"),
    path('amount-request-api/<str:account_number>/', payment_request.AmountRequestApi.as_view(), name='amount-request-api'),
    path('amount-request-process-api/<str:account_number>/', payment_request.AmountRequestProcessApi.as_view(), name='amount-request-process-api'),
    path('amount-request-confirmation-api/<str:account_number>/<str:transaction_id>/', payment_request.AmountRequestConfirmationApi.as_view(), name='amount-request-confirmation-api'),
    path('amount-request-final-process-api/<str:account_number>/<str:transaction_id>/', payment_request.AmountRequestFinalProcessApi.as_view(), name='amount-request-final-process-api'),
    path('request-completed-api/<str:account_number>/<str:transaction_id>/', payment_request.RequestCompletedApi.as_view(), name='request-completed-api'),

    # --------- Request Settlement --------
    path("settlement-confirmation/<account_number>/<transaction_id>/", payment_request.settlement_confirmation, name="settlement-confirmation"),
    path("settlement-processing/<account_number>/<transaction_id>/", payment_request.settlement_processing, name="settlement-processing"),
    path("settlement-completed/<account_number>/<transaction_id>/", payment_request.SettlementCompleted, name="settlement-completed"),
    path("delete-request/<account_number>/<transaction_id>/", payment_request.deletepaymentrequest, name="delete-request"),
    #------- api urls ---------------
    path('settlement-confirmation-api/<str:account_number>/<str:transaction_id>/', payment_request.SettlementConfirmationApi.as_view(), name='settlement-confirmation-api'),
    path('settlement-processing-api/<str:account_number>/<str:transaction_id>/', payment_request.SettlementProcessingApi.as_view(), name='settlement-processing-api'),
    path('settlement-completed-api/<str:account_number>/<str:transaction_id>/', payment_request.SettlementCompletedApi.as_view(), name='settlement-completed-api'),
    path('delete-payment-request-api/<str:account_number>/<str:transaction_id>/', payment_request.DeletePaymentRequestApi.as_view(), name='delete-payment-request-api'),
    # ------- Credit Card URLS --------
    path("card/<card_id>/", credit_card.card_detail, name="card-detail"),
    path("fund-credit-card/<card_id>/", credit_card.fund_credit_card, name="fund-credit-card"),
    path("withdraw_fund/<card_id>/", credit_card.withdraw_fund, name="withdraw_fund"),
    path("delete_card/<card_id>/", credit_card.delete_card, name="delete_card"),
    #------- api urls ---------------
    path('all-cards-api/', credit_card.AllCardsApi.as_view(), name='all-cards-api'),
    path('card-api/<str:card_id>/', credit_card.CardDetailApi.as_view(), name='card-api'),
    path('fund-credit-card-api/<str:card_id>/', credit_card.FundCreditCardApi.as_view(), name="fund-credit-card-api"),
    path('withdraw-fund-api/<str:card_id>/', credit_card.WithdrawFundApi.as_view(), name='withdraw-fund-api'),
    path('delete-card-api/<str:card_id>/', credit_card.DeleteCardApi.as_view(), name='delete-card-api'),
    
    # -------------- deposite ----------
    path("deposit_1/", deposit.deposit_1, name="deposit_1"),
]
