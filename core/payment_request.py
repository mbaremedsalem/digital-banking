from django.shortcuts import render, redirect
from account.models import Account
from django.contrib.auth.decorators import login_required
from django.db.models import Q
from django.contrib import messages
from decimal import Decimal
from core.models import Notification, Transaction
from decimal import Decimal
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from .models import Account
from .serializers import *
from django.shortcuts import get_object_or_404
#------- API DRF ---------
class SearchUsersRequestApi(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        query = request.data.get("account_number")  # Get the query from the request data
        if not query:
            return Response({"detail": "Account number is required."}, status=status.HTTP_400_BAD_REQUEST)

        accounts = Account.objects.filter(
            Q(account_number=query) |
            Q(account_id=query)
        ).distinct()

        serializer = AccountSerializer(accounts, many=True)
        return Response({"accounts": serializer.data, "query": query})

class AmountRequestApi(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, account_number):
        account = get_object_or_404(Account, account_number=account_number)
        serializer = AccountSerializer(account)
        return Response({"account": serializer.data}, status=status.HTTP_200_OK) 
           
class AmountRequestProcessApi(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, account_number):
        account = get_object_or_404(Account, account_number=account_number)
        sender = request.user
        reciever = account.user

        if sender == reciever:
            return Response({"detail": "Sender and receiver cannot be the same person."}, status=status.HTTP_400_BAD_REQUEST)

        sender_account = sender.account
        reciever_account = account

        amount = request.data.get("amount-request")
        description = request.data.get("description")

        if not amount:
            return Response({"detail": "Amount is required."}, status=status.HTTP_400_BAD_REQUEST)

        new_request = Transaction.objects.create(
            user=sender,
            amount=amount,
            description=description,
            sender=sender,
            reciever=reciever,
            sender_account=sender_account,
            reciever_account=reciever_account,
            status="request_processing",
            transaction_type="request"
        )
        
        new_request.save()
        return Response({
            "detail": "Request created successfully.",
            "transaction_id": new_request.transaction_id
        }, status=status.HTTP_201_CREATED)
    
class AmountRequestConfirmationApi(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, account_number, transaction_id):
        account = get_object_or_404(Account, account_number=account_number)
        transaction = get_object_or_404(Transaction, transaction_id=transaction_id)
        
        account_serializer = AccountSerializer(account)
        transaction_serializer = TransactionSerializer(transaction)
        
        return Response({
            "account": account_serializer.data,
            "transaction": transaction_serializer.data,
        }, status=status.HTTP_200_OK)

class AmountRequestFinalProcessApi(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, account_number, transaction_id):
        account = get_object_or_404(Account, account_number=account_number)
        transaction = get_object_or_404(Transaction, transaction_id=transaction_id)

        pin_number = request.data.get("pin-number")
        if not pin_number:
            return Response({"detail": "Pin number is required."}, status=status.HTTP_400_BAD_REQUEST)

        if pin_number == request.user.account.pin_number:
            transaction.status = "request_sent"
            transaction.save()
            
            # Create Notification Objects
            Notification.objects.create(
                user=account.user,
                notification_type="Received Payment Request",
                amount=transaction.amount,
            )
            
            Notification.objects.create(
                user=request.user,
                amount=transaction.amount,
                notification_type="Sent Payment Request",
            )

            return Response({
                "detail": "Your payment request has been sent successfully.",
                "transaction_id": transaction.transaction_id
            }, status=status.HTTP_200_OK)
        else:
            return Response({"detail": "Incorrect pin number."}, status=status.HTTP_400_BAD_REQUEST)

class RequestCompletedApi(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, account_number, transaction_id):
        account = get_object_or_404(Account, account_number=account_number)
        transaction = get_object_or_404(Transaction, transaction_id=transaction_id)
        
        account_serializer = AccountSerializer(account)
        transaction_serializer = TransactionSerializer(transaction)

        return Response({
            "account": account_serializer.data,
            "transaction": transaction_serializer.data
        }, status=status.HTTP_200_OK)

@login_required
def SearchUsersRequest(request):
    account = Account.objects.all() ## all the account in my db
    query = request.POST.get("account_number") ## <input name="account_number">

    if query:
        account = account.filter(
            Q(account_number=query)|
            Q(account_id=query)
        ).distinct()
    
    context = {
        "account": account,
        "query": query,
    }
    return render(request, "payment_request/search-users.html", context)

def AmountRequest(request, account_number):
    account = Account.objects.get(account_number=account_number)
    context = {
        "account": account,
    }
    return render(request, "payment_request/amount-request.html", context)

def AmountRequestProcess(request, account_number):
    account = Account.objects.get(account_number=account_number)

    sender = request.user
    reciever = account.user

    sender_account = request.user.account
    reciever_account = account

    if sender == reciever:
            messages.warning(request, "Sender and receiver cannot be the same person.")
            return redirect("core:amount-transfer", account.account_number)
    
    if request.method == "POST":
        amount = request.POST.get("amount-request")
        description = request.POST.get("description")

        new_request = Transaction.objects.create(
            user=request.user,
            amount=amount,
            description=description,

            sender=sender,
            reciever=reciever,

            sender_account=sender_account,
            reciever_account=reciever_account,

            status="request_processing",
            transaction_type="request"
        )
        new_request.save()
        transaction_id = new_request.transaction_id
        return redirect("core:amount-request-confirmation", account.account_number, transaction_id)
    else:
        messages.warning(request, "Error Occured, try again later.")
        return redirect("account:dashboard")

def AmountRequestConfirmation(request, account_number, transaction_id):
    account = Account.objects.get(account_number=account_number)
    transaction = Transaction.objects.get(transaction_id=transaction_id)

    context = {
        "account":account,
        "transaction":transaction,
    }
    return render(request, "payment_request/amount-request-confirmation.html", context)


def AmountRequestFinalProcess(request, account_number, transaction_id):
    account = Account.objects.get(account_number=account_number)
    transaction = Transaction.objects.get(transaction_id=transaction_id)

    if request.method == "POST":
        pin_number = request.POST.get("pin-number")
        if pin_number == request.user.account.pin_number:
            transaction.status = "request_sent"
            transaction.save()
            
            Notification.objects.create(
                user=account.user,
                notification_type="Recieved Payment Request",
                amount=transaction.amount,
                
            )
            
            Notification.objects.create(
                user=request.user,
                amount=transaction.amount,
                notification_type="Sent Payment Request"
            )

            messages.success(request, "Your payment request have been sent successfully.")
            return redirect("core:amount-request-completed", account.account_number, transaction.transaction_id)
    else:
        messages.warning(request, "An Error Occured, try again later.")
        return redirect("account:dashboard")
    

def RequestCompleted(request, account_number ,transaction_id):
    account = Account.objects.get(account_number=account_number)
    transaction = Transaction.objects.get(transaction_id=transaction_id)
    
    context = {
            "account":account,
            "transaction":transaction,
        }
    return render(request, "payment_request/amount-request-completed.html", context)





################################## Settled ##########################3
#-------------- api settled ---------------
class SettlementConfirmationApi(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, account_number, transaction_id):
        account = get_object_or_404(Account, account_number=account_number)
        transaction = get_object_or_404(Transaction, transaction_id=transaction_id)
        
        account_serializer = AccountSerializer(account)
        transaction_serializer = TransactionSerializer(transaction)

        return Response({
            "account": account_serializer.data,
            "transaction": transaction_serializer.data
        }, status=status.HTTP_200_OK)

class SettlementProcessingApi(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, account_number, transaction_id):
        account = get_object_or_404(Account, account_number=account_number)
        transaction = get_object_or_404(Transaction, transaction_id=transaction_id)

        sender = request.user
        sender_account = request.user.account

        pin_number = request.data.get("pin-number")
        if pin_number != request.user.account.pin_number:
            return Response({"detail": "Incorrect Pin"}, status=status.HTTP_400_BAD_REQUEST)
        
        if sender_account.account_balance <= 0 or sender_account.account_balance < transaction.amount:
            return Response({"detail": "Insufficient Funds, fund your account and try again."}, status=status.HTTP_400_BAD_REQUEST)
        
        sender_account.account_balance -= transaction.amount
        sender_account.save()

        account.account_balance += transaction.amount
        account.save()

        transaction.status = "request_settled"
        transaction.save()

        return Response({
            "detail": f"Settlement to {account.user.kyc.full_name} was successful.",
            "account": AccountSerializer(account).data,
            "transaction": TransactionSerializer(transaction).data
        }, status=status.HTTP_200_OK)

class SettlementCompletedApi(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, account_number, transaction_id):
        account = get_object_or_404(Account, account_number=account_number)
        transaction = get_object_or_404(Transaction, transaction_id=transaction_id)
        
        account_serializer = AccountSerializer(account)
        transaction_serializer = TransactionSerializer(transaction)

        return Response({
            "account": account_serializer.data,
            "transaction": transaction_serializer.data
        }, status=status.HTTP_200_OK)

class DeletePaymentRequestApi(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, account_number, transaction_id):
        account = get_object_or_404(Account, account_number=account_number)
        transaction = get_object_or_404(Transaction, transaction_id=transaction_id)

        if request.user == transaction.user:
            transaction.delete()
            return Response({"detail": "Payment Request Deleted Successfully"}, status=status.HTTP_200_OK)
        else:
            return Response({"detail": "You do not have permission to delete this payment request"}, status=status.HTTP_403_FORBIDDEN)

def settlement_confirmation(request, account_number ,transaction_id):
    account = Account.objects.get(account_number=account_number)
    transaction = Transaction.objects.get(transaction_id=transaction_id)
    
    context = {
            "account":account,
            "transaction":transaction,
        }
    return render(request, "payment_request/settlement-confirmation.html", context)


def settlement_processing(request, account_number, transaction_id):
    account = Account.objects.get(account_number=account_number)
    transaction = Transaction.objects.get(transaction_id=transaction_id)

    sender = request.user 
    sender_account = request.user.account ## me, 

    if request.method == "POST":
        pin_number = request.POST.get("pin-number")
        if pin_number == request.user.account.pin_number:
            if sender_account.account_balance <= 0 or sender_account.account_balance < transaction.amount:
                messages.warning(request, "Insufficient Funds, fund your account and try again.")
            else:
                sender_account.account_balance -= transaction.amount
                sender_account.save()

                account.account_balance += transaction.amount
                account.save()

                transaction.status = "request_settled"
                transaction.save()

                messages.success(request, f"Settled to {account.user.kyc.full_name} was successfull.")
                return redirect("core:settlement-completed", account.account_number, transaction.transaction_id)

        else:
            messages.warning(request, "Incorrect Pin")
            return redirect("core:settlement-confirmation", account.account_number, transaction.transaction_id)
    else:
        messages.warning(request, "Error Occured")
        return redirect("account:dashboard")


def SettlementCompleted(request, account_number ,transaction_id):
    account = Account.objects.get(account_number=account_number)
    transaction = Transaction.objects.get(transaction_id=transaction_id)
    
    context = {
            "account":account,
            "transaction":transaction,
        }
    return render(request, "payment_request/settlement-completed.html", context)


def deletepaymentrequest(request, account_number ,transaction_id):
    account = Account.objects.get(account_number=account_number)
    transaction = Transaction.objects.get(transaction_id=transaction_id)

    if request.user == transaction.user:
        transaction.delete()
        messages.success(request, "Payment Request Deleted Sucessfully")
        return redirect("core:transactions")
    