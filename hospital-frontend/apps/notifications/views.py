from django.shortcuts import render
from django.views import View
from utils.decorators import login_required
from django.utils.decorators import method_decorator

@method_decorator(login_required, name='dispatch')
class NotificationListView(View):
    def get(self, request):
        return render(request, 'notifications/list.html')
