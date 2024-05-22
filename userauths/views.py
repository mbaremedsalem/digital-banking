from django.shortcuts import render,redirect
from .forms import *
from django.contrib.auth import authenticate, login, logout
from django.contrib import messages
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import *
from rest_framework.permissions import IsAuthenticated
# from rest_framework_simplejwt.views import TokenObtainPairView
# Create your views here.

#-------- restframework --------

#------ api login --------
import logging
logger = logging.getLogger(__name__)

class MyLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        email = request.data.get('email')
        password = request.data.get('password')
        logger.debug(f"Attempting login with email: {email}")

        if not email or not password:
            return Response({'error': 'Email and password are required'}, status=status.HTTP_400_BAD_REQUEST)

        user = authenticate(request, username=email, password=password)
        if user is not None:
            refresh = RefreshToken.for_user(user)
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            })
        logger.debug("Invalid credentials")
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
    
#------ api Register --------
class MyRegisterView(APIView):
    permission_classes = [AllowAny]
    def post(self, request, *args, **kwargs):
        print("Request data:", request.data)  # Debugging statement
        serializer = UserRegisterSerializer(data=request.data)
        if serializer.is_valid():
            print("Serializer valid")  # Debugging statement
            user = serializer.save()
            username = serializer.validated_data['username']
            message = f"Hey {username}, your account was created successfully"

            # Authenticate the new user with their email and password
            new_user = authenticate(username=user.email, password=request.data['password1'])
            if new_user is not None:
                login(request, new_user)

            return Response({'message': message}, status=status.HTTP_201_CREATED)

        print("Serializer errors:", serializer.errors)  # Debugging statement
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
#------ my logout -----
# class MyLogoutView(APIView):
#     permission_classes = (IsAuthenticated)
#     def post(self, request):
#         auth_header = request.headers.get('Authorization')
#         if auth_header:
#             try:
#                 # Expecting the header format: "Bearer <token>"
#                 token_type, token = auth_header.split()
#                 if token_type.lower() == 'Bearer':
#                     refresh_token = token
#                     token = RefreshToken(refresh_token)
#                     token.blacklist()
#                     return Response({"detail": "Successfully logged out."}, status=status.HTTP_205_RESET_CONTENT)
#                 else:
#                     return Response({"error": "Invalid token type."}, status=status.HTTP_400_BAD_REQUEST)
#             except Exception as e:
#                 return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
#         else:
#             return Response({"error": "Authorization header not provided."}, status=status.HTTP_400_BAD_REQUEST)
class MyLogoutView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        try:
            refresh_token = request.data["refresh_token"]
            token = RefreshToken(refresh_token)
            print(token)
            token.blacklist()
            return Response({'status': status.HTTP_200_OK, 'Message':"Vous avez été déconnecté avec succès"})
        except Exception as e:
            # return Response(status=status.HTTP_400_BAD_REQUEST)
            return Response({'status':status.HTTP_400_BAD_REQUEST, 'Message':'Requête incorrecte'})
       
#---- view django -----
def RegisterView(request):
    if request.method == "POST":
        form = UserRegisterForm(request.POST)
        if form.is_valid():
            # form.save()
            new_user = form.save() #new user.email
            username = form.cleaned_data.get("username")
            # username = request.POST.get("username")
            messages.success(request,f"Hey {username}, your account was created successfully")
            # new_user = authenticate(username=form.cleaned_data.get('email'))
            new_user = authenticate(username=form.cleaned_data['email'],
                                    password=form.cleaned_data['password1'])
            login(request,new_user)
            return redirect("core:index")
        
    # elif request.user.is_authenticated:
    #     messages.success(request,f"your are already logged in")

    #     return redirect("core:index")        

    else:
        form = UserRegisterForm()       
    context = {
        "form":form
    } 
    return render(request,"userauths/sign-up.html",context)


def LoginView(request):
    if request.method == "POST":
        email = request.POST.get("email")
        password = request.POST.get("password")

        try:
            user = User.objects.get(email=email)
            user = authenticate(request, email=email, password=password)

            if user is not None: # if there is a user
                login(request, user)
                messages.success(request, "You are logged.")
                return redirect("account:account")
            else:
                messages.warning(request, "Username or password does not exist")
                return redirect("userauths:sign-in")
        except:
            messages.warning(request, "User does not exist")

    if request.user.is_authenticated:
        messages.warning(request, "You are already logged In")
        return redirect("account:account")
        
    return render(request, "userauths/sign-in.html")


def logoutView(request):
    logout(request)
    messages.success(request, "You have been logged out.")
    return redirect("userauths:sign-in")