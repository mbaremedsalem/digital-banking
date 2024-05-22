from rest_framework import serializers
from .models import *

class AccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Account
        fields =  ('__all__')

class TransactionSerializer(serializers.ModelSerializer):
    pin_number = serializers.CharField(write_only=True)  
    class Meta:
        model = Transaction
        fields = ('__all__') # Include other fields as necessary

class CreditCardSerializer(serializers.ModelSerializer):
    class Meta:
        model = CreditCard
        fields = ('__all__') 

class FundCreditCardSerializer(serializers.Serializer):
    funding_amount = serializers.DecimalField(max_digits=10, decimal_places=2)        

class WithdrawFundSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)    