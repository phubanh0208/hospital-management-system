from django.shortcuts import render
from django.views import View
from utils.decorators import admin_required
from django.utils.decorators import method_decorator

@method_decorator(admin_required, name='dispatch')
class UserListView(View):
    def get(self, request):
        return render(request, 'users/list.html')
