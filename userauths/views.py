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
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
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

# ---------------------------------------------------------------------------
# Profil de l'utilisateur connecte : utilisateur + compte + KYC + notifications
# Utilise par le frontend React pour alimenter le dashboard.
# ---------------------------------------------------------------------------
class MeApi(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        account = getattr(user, "account", None)
        kyc = getattr(user, "kyc", None)

        from core.models import Notification

        notifications = Notification.objects.filter(user=user)[:10]

        data = {
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "is_staff": user.is_staff,
                "date_joined": user.date_joined,
            },
            "account": None,
            "kyc": None,
            "notifications": [
                {
                    "nid": n.nid,
                    "notification_type": n.notification_type,
                    "amount": n.amount,
                    "is_read": n.is_read,
                    "date": n.date,
                }
                for n in notifications
            ],
            "unread_notifications": Notification.objects.filter(user=user, is_read=False).count(),
        }

        if account is not None:
            data["account"] = {
                "id": str(account.id),
                "account_number": account.account_number,
                "account_id": account.account_id,
                "account_balance": str(account.account_balance),
                "account_status": account.account_status,
                "kyc_submitted": account.kyc_submitted,
                "kyc_confirmed": account.kyc_confirmed,
                "date": account.date,
            }

        if kyc is not None:
            data["kyc"] = {
                "full_name": kyc.full_name,
                "image": kyc.image.url if kyc.image else None,
                "gender": kyc.gender,
                "mobile": kyc.mobile,
                "country": kyc.country,
                "state": kyc.state,
                "city": kyc.city,
            }

        return Response(data, status=status.HTTP_200_OK)

    def patch(self, request):
        """Mise a jour du profil : identite utilisateur + fiche KYC si elle existe."""
        user = request.user
        errors = {}

        username = request.data.get("username")
        if username is not None:
            username = str(username).strip()
            if not username:
                errors["username"] = "Le nom d'utilisateur ne peut pas etre vide."
            else:
                user.username = username

        email = request.data.get("email")
        if email is not None:
            email = str(email).strip().lower()
            if not email:
                errors["email"] = "L'email ne peut pas etre vide."
            elif User.objects.filter(email__iexact=email).exclude(pk=user.pk).exists():
                errors["email"] = "Cet email est deja utilise par un autre compte."
            else:
                user.email = email

        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        user.save()

        # La fiche KYC n'est modifiable que si elle a deja ete creee : sa
        # creation exige des pieces jointes (signature, piece d'identite).
        kyc = getattr(user, "kyc", None)
        kyc_fields = ["full_name", "mobile", "fax", "gender", "marrital_status", "country", "state", "city"]
        kyc_updated = False

        if kyc is not None:
            for field in kyc_fields:
                if field in request.data:
                    setattr(kyc, field, request.data.get(field))
                    kyc_updated = True
            if kyc_updated:
                kyc.save()

        return Response(
            {
                "detail": "Profil mis a jour.",
                "kyc_updated": kyc_updated,
                "kyc_missing": kyc is None,
            },
            status=status.HTTP_200_OK,
        )


class ChangePasswordApi(APIView):
    """Changement du mot de passe par le client lui-meme."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        old_password = request.data.get("old_password")
        new_password1 = request.data.get("new_password1")
        new_password2 = request.data.get("new_password2")

        if not old_password or not new_password1 or not new_password2:
            return Response(
                {"detail": "Ancien mot de passe et nouveau mot de passe (deux fois) sont requis."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.check_password(old_password):
            return Response({"old_password": "Mot de passe actuel incorrect."}, status=status.HTTP_400_BAD_REQUEST)

        if new_password1 != new_password2:
            return Response(
                {"new_password2": "Les deux mots de passe ne correspondent pas."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if new_password1 == old_password:
            return Response(
                {"new_password1": "Le nouveau mot de passe doit etre different de l'ancien."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validate_password(new_password1, user=user)
        except DjangoValidationError as exc:
            return Response({"new_password1": list(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password1)
        user.save()

        # Les tokens JWT deja emis restent valides : on en renvoie une paire
        # fraiche pour que le client puisse remplacer la sienne.
        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "detail": "Mot de passe modifie avec succes.",
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            status=status.HTTP_200_OK,
        )
