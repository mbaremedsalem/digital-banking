from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from .serializers import *

@login_required
def deposit_1(request):

    return render(request, "deposit/deposit_1.html")