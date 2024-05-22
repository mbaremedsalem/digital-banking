from django.shortcuts import render, redirect
from account.models import Account
from django.contrib.auth.decorators import login_required
from django.db.models import Q
from django.contrib import messages
from decimal import Decimal
from core.models import Transaction, Notification
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from .serializers import *
from django.shortcuts import get_object_or_404
from decimal import Decimal

#----- api drf ----
class SearchUserAccountNumber(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        query = request.data.get("account_number")

        if query:
            accounts = Account.objects.filter(
                Q(account_number=query) |
                Q(account_id=query)
            ).distinct()
        else:
            accounts = Account.objects.none()

        serializer = AccountSerializer(accounts, many=True)
        return Response({"accounts": serializer.data, "query": query}, status=status.HTTP_200_OK)

class AmountTransferApi(APIView):

    def get(self, request, account_number):
        try:
            account = Account.objects.get(account_number=account_number)
        except Account.DoesNotExist:
            return Response({"detail": "Account does not exist."}, status=status.HTTP_404_NOT_FOUND)

        serializer = AccountSerializer(account)
        return Response({"account": serializer.data}, status=status.HTTP_200_OK)

class AmountTransferProcessApi(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, account_number):
        account = get_object_or_404(Account, account_number=account_number)
        sender = request.user
        receiver = account.user

        # Check if the sender and the receiver are the same person
        if sender == receiver:
            return Response({"detail": "Sender and receiver cannot be the same person."}, status=status.HTTP_400_BAD_REQUEST)

        sender_account = sender.account
        receiver_account = account

        amount = request.data.get("amount-send")
        description = request.data.get("description")

        if not amount:
            return Response({"detail": "Amount is required."}, status=status.HTTP_400_BAD_REQUEST)

        amount = Decimal(amount)

        if sender_account.account_balance >= amount:
            new_transaction = Transaction.objects.create(
                user=sender,
                amount=amount,
                description=description,
                reciever=receiver,
                sender=sender,
                sender_account=sender_account,
                reciever_account=receiver_account,
                status="processing",
                transaction_type="transfer"
            )
            new_transaction.save()

            return Response({
                "detail": "Transaction created successfully.",
                "transaction_id": new_transaction.transaction_id
            }, status=status.HTTP_201_CREATED)
        else:
            return Response({"detail": "Insufficient funds."}, status=status.HTTP_400_BAD_REQUEST)

class TransferConfirmationApi(APIView):
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



class TransferProcessApi(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, account_number, transaction_id):
        account = get_object_or_404(Account, account_number=account_number)
        transaction = get_object_or_404(Transaction, transaction_id=transaction_id)

        # views.py (continued)

        sender = request.user 
        receiver = account.user

        sender_account = request.user.account 
        receiver_account = account

        serializer = TransactionSerializer(data=request.data)
        if serializer.is_valid():
            pin_number = serializer.validated_data['pin_number']

            if pin_number == sender_account.pin_number:
                transaction.status = "completed"
                transaction.save()

                # Remove the amount that is being sent from the sender's account balance and update the sender's account
                sender_account.account_balance -= transaction.amount
                sender_account.save()

                # Add the amount that was removed from the sender's account to the receiver's account balance and update the receiver's account
                account.account_balance += transaction.amount
                account.save()
                
                # Create Notification Object for the receiver
                Notification.objects.create(
                    amount=transaction.amount,
                    user=account.user,
                    notification_type="Credit Alert"
                )
                
                # Create Notification Object for the sender
                Notification.objects.create(
                    user=sender,
                    notification_type="Debit Alert",
                    amount=transaction.amount
                )

                return Response({
                    "detail": "Transfer Successful.",
                    "transaction_id": transaction.transaction_id
                }, status=status.HTTP_200_OK)
            else:
                return Response({"detail": "Incorrect Pin."}, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class TransferCompletedApi(APIView):
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
def search_users_account_number(request):
    # account = Account.objects.filter(account_status="active")
    account = Account.objects.all()
    query = request.POST.get("account_number") # 217703423324

    if query:
        account = account.filter(
            Q(account_number=query)|
            Q(account_id=query)
        ).distinct()
    

    context = {
        "account": account,
        "query": query,
    }
    return render(request, "transfer/search-user-by-account-number.html", context)


def AmountTransfer(request, account_number):
    try:
        account = Account.objects.get(account_number=account_number)
    except:
        messages.warning(request, "Account does not exist.")
        return redirect("core:search-account")
    context = {
        "account": account,
    }
    return render(request, "transfer/amount-transfer.html", context)


def AmountTransferProcess(request, account_number):
    account = Account.objects.get(account_number=account_number) ## Get the account that the money vould be sent to
    sender = request.user # get the person that is logged in
    reciever = account.user ##get the of the  person that is going to reciver the money

    sender_account = request.user.account ## get the currently logged in users account that vould send the money
    reciever_account = account # get the the person account that vould send the money

    if request.method == "POST":
        amount = request.POST.get("amount-send")
        description = request.POST.get("description")

        print(amount)
        print(description)
                # Check if the sender and the receiver are the same person
        if sender == reciever:
            messages.warning(request, "Sender and receiver cannot be the same person.")
            return redirect("core:amount-transfer", account.account_number)

        if sender_account.account_balance >= Decimal(amount):
            new_transaction = Transaction.objects.create(
                user=request.user,
                amount=amount,
                description=description,
                reciever=reciever,
                sender=sender,
                sender_account=sender_account,
                reciever_account=reciever_account,
                status="processing",
                transaction_type="transfer"
            )
            new_transaction.save()
            
            # Get the id of the transaction that vas created nov
            transaction_id = new_transaction.transaction_id
            return redirect("core:transfer-confirmation", account.account_number, transaction_id)
        else:
            messages.warning(request, "Insufficient Fund.")
            return redirect("core:amount-transfer", account.account_number)
    else:
        messages.warning(request, "Error Occured, Try again later.")
        return redirect("account:account")


def TransferConfirmation(request, account_number, transaction_id):
    try:
        account = Account.objects.get(account_number=account_number)
        transaction = Transaction.objects.get(transaction_id=transaction_id)
    except:
        messages.warning(request, "Transaction does not exist.")
        return redirect("account:account")
    context = {
        "account":account,
        "transaction":transaction
    }
    return render(request, "transfer/transfer-confirmation.html", context)


def TransferProcess(request, account_number, transaction_id):
    account = Account.objects.get(account_number=account_number)
    transaction = Transaction.objects.get(transaction_id=transaction_id)

    sender = request.user 
    reciever = account.user

    sender_account = request.user.account 
    reciever_account = account

    completed = False

    if request.method == "POST":
        pin_number = request.POST.get("pin-number")
        print(pin_number)

        if pin_number == sender_account.pin_number:
            transaction.status = "completed"
            transaction.save()

            # Remove the amount that i am sending from my account balance and update my account
            sender_account.account_balance -= transaction.amount
            sender_account.save()

            # Add the amount that vas removed from my account to the person that i am sending the money too
            account.account_balance += transaction.amount
            account.save()
            
            # Create Notification Object
            Notification.objects.create(
                amount=transaction.amount,
                user=account.user,
                notification_type="Credit Alert"
            )
            
            Notification.objects.create(
                user=sender,
                notification_type="Debit Alert",
                amount=transaction.amount
            )

            messages.success(request, "Transfer Successfull.")
            return redirect("core:transfer-completed", account.account_number, transaction.transaction_id)
        else:
            messages.warning(request, "Incorrect Pin.")
            return redirect('core:transfer-confirmation', account.account_number, transaction.transaction_id)
    else:
        messages.warning(request, "An error occured, Try again later.")
        return redirect('account:account')
    


def TransferCompleted(request, account_number, transaction_id):
    try:
        account = Account.objects.get(account_number=account_number)
        transaction = Transaction.objects.get(transaction_id=transaction_id)
    except:
        messages.warning(request, "Transfer does not exist.")
        return redirect("account:account")
    context = {
        "account":account,
        "transaction":transaction
    }
    return render(request, "transfer/transfer-completed.html", context)
