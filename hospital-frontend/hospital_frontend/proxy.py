from django.http import HttpResponse
from django.conf import settings
import requests

def proxy_view(request, path):
    base_url = getattr(settings, 'API_GATEWAY_URL', 'http://localhost:3000')
    url = f'{base_url}/api/{path}'

    headers = {
        'Content-Type': request.headers.get('Content-Type'),
        'Authorization': request.headers.get('Authorization'),
    }
    # Filter out None values
    headers = {k: v for k, v in headers.items() if v is not None}

    try:
        response = requests.request(
            method=request.method,
            url=url,
            headers=headers,
            data=request.body,
            params=request.GET,
            timeout=10 # 10 seconds timeout
        )

        return HttpResponse(
            response.content,
            status=response.status_code,
            content_type=response.headers.get('Content-Type')
        )
    except requests.exceptions.RequestException as e:
        return HttpResponse(f'Proxy error: {e}', status=502)

