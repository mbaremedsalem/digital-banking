from django.shortcuts import render, redirect
from core.models import Transaction
from account.models import Account
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from .serializers import TransactionSerializer
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db.models import Q

#------- api --------
class TransactionListApi(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        sender_transactions = Transaction.objects.filter(sender=request.user, transaction_type="transfer").order_by("-id")
        reciever_transactions = Transaction.objects.filter(reciever=request.user, transaction_type="transfer").order_by("-id")

        request_sender_transactions = Transaction.objects.filter(sender=request.user, transaction_type="request")
        request_reciever_transactions = Transaction.objects.filter(reciever=request.user, transaction_type="request")

        sender_transactions_serializer = TransactionSerializer(sender_transactions, many=True)
        reciever_transactions_serializer = TransactionSerializer(reciever_transactions, many=True)
        request_sender_transactions_serializer = TransactionSerializer(request_sender_transactions, many=True)
        request_reciever_transactions_serializer = TransactionSerializer(request_reciever_transactions, many=True)

        # Les retraits especes au guichet : le client en est l'emetteur,
        # l'agent de caisse le destinataire.
        withdraw_transactions = Transaction.objects.filter(
            Q(sender=request.user) | Q(reciever=request.user),
            transaction_type="withdraw",
        ).order_by("-id")
        withdraw_transactions_serializer = TransactionSerializer(withdraw_transactions, many=True)

        # Paiements de services partenaires et taxes associees.
        service_transactions = Transaction.objects.filter(
            Q(sender=request.user) | Q(reciever=request.user),
            transaction_type__in=["payment", "fee"],
        ).order_by("-id")
        service_transactions_serializer = TransactionSerializer(service_transactions, many=True)

        return Response({
            "sender_transactions": sender_transactions_serializer.data,
            "reciever_transactions": reciever_transactions_serializer.data,
            "request_sender_transactions": request_sender_transactions_serializer.data,
            "request_reciever_transactions": request_reciever_transactions_serializer.data,
            "withdraw_transactions": withdraw_transactions_serializer.data,
            "service_transactions": service_transactions_serializer.data
        }, status=status.HTTP_200_OK)

class TransactionDetailApi(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, transaction_id):
        transaction = get_object_or_404(Transaction, transaction_id=transaction_id)
        serializer = TransactionSerializer(transaction)
        return Response(serializer.data, status=status.HTTP_200_OK)

@login_required
def transaction_lists(request):
    sender_transaction = Transaction.objects.filter(sender=request.user, transaction_type="transfer").order_by("-id")
    reciever_transaction = Transaction.objects.filter(reciever=request.user, transaction_type="transfer").order_by("-id")

    request_sender_transaction = Transaction.objects.filter(sender=request.user, transaction_type="request")
    request_reciever_transaction = Transaction.objects.filter(reciever=request.user, transaction_type="request")

    context = {
        "sender_transaction":sender_transaction,
        "reciever_transaction":reciever_transaction,

        'request_sender_transaction':request_sender_transaction,
        'request_reciever_transaction':request_reciever_transaction,
    }

    return render(request, "transaction/transaction-list.html", context)

@login_required
def transaction_detail(request, transaction_id):
    transaction = Transaction.objects.get(transaction_id=transaction_id)

    context = {
        "transaction":transaction,

    }

    return render(request, "transaction/transaction-detail.html", context)