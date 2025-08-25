"""
Forms for Authentication app
"""

from django import forms
from crispy_forms.helper import FormHelper
from crispy_forms.layout import Layout, Submit, Row, Column, HTML, Div, Fieldset
from crispy_forms.bootstrap import Field

class LoginForm(forms.Form):
    """
    User login form
    """
    username = forms.CharField(
        max_length=150,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Enter username',
            'autofocus': True
        })
    )
    password = forms.CharField(
        widget=forms.PasswordInput(attrs={
            'class': 'form-control',
            'placeholder': 'Enter password'
        })
    )
    remember_me = forms.BooleanField(
        required=False,
        widget=forms.CheckboxInput(attrs={
            'class': 'form-check-input'
        })
    )
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.helper = FormHelper()
        self.helper.form_method = 'post'
        self.helper.form_class = 'needs-validation'
        self.helper.attrs = {'novalidate': ''}
        
        self.helper.layout = Layout(
            HTML('<div class="text-center mb-4">'),
            HTML('<i class="fas fa-hospital-alt fa-3x text-primary mb-3"></i>'),
            HTML('<h3 class="mb-3">Hospital Management System</h3>'),
            HTML('<p class="text-muted">Please sign in to your account</p>'),
            HTML('</div>'),
            
            Div(
                Field('username', css_class='form-control-lg'),
                css_class='mb-3'
            ),
            Div(
                Field('password', css_class='form-control-lg'),
                css_class='mb-3'
            ),
            Div(
                Field('remember_me'),
                HTML('<label class="form-check-label" for="id_remember_me">Remember me</label>'),
                css_class='form-check mb-3'
            ),
            Submit('submit', 'Sign In', css_class='btn btn-primary btn-lg w-100 mb-3'),
            
            HTML('<div class="text-center">'),
            HTML('<small class="text-muted">'),
            HTML('Forgot your password? <a href="#" class="text-primary">Reset here</a>'),
            HTML('</small>'),
            HTML('</div>')
        )

class ChangePasswordForm(forms.Form):
    """
    Change password form
    """
    current_password = forms.CharField(
        label='Current Password',
        widget=forms.PasswordInput(attrs={
            'class': 'form-control',
            'placeholder': 'Enter current password'
        })
    )
    new_password = forms.CharField(
        label='New Password',
        widget=forms.PasswordInput(attrs={
            'class': 'form-control',
            'placeholder': 'Enter new password'
        }),
        help_text='Password must be at least 8 characters long and contain letters and numbers.'
    )
    confirm_password = forms.CharField(
        label='Confirm New Password',
        widget=forms.PasswordInput(attrs={
            'class': 'form-control',
            'placeholder': 'Confirm new password'
        })
    )
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.helper = FormHelper()
        self.helper.form_method = 'post'
        self.helper.form_class = 'needs-validation'
        self.helper.attrs = {'novalidate': ''}
        
        self.helper.layout = Layout(
            Row(
                Column('current_password', css_class='form-group col-md-12 mb-3'),
            ),
            Row(
                Column('new_password', css_class='form-group col-md-6 mb-3'),
                Column('confirm_password', css_class='form-group col-md-6 mb-3'),
            ),
            HTML('<div class="d-grid gap-2 d-md-flex justify-content-md-end">'),
            Submit('submit', 'Change Password', css_class='btn btn-primary'),
            HTML('<a href="{% url "authentication:profile" %}" class="btn btn-secondary">Cancel</a>'),
            HTML('</div>')
        )
    
    def clean(self):
        cleaned_data = super().clean()
        new_password = cleaned_data.get('new_password')
        confirm_password = cleaned_data.get('confirm_password')
        
        if new_password and confirm_password:
            if new_password != confirm_password:
                raise forms.ValidationError("New passwords don't match.")
        
        return cleaned_data


class ForgotPasswordForm(forms.Form):
    """
    Forgot password form
    """
    email = forms.EmailField(
        label='Email Address',
        widget=forms.EmailInput(attrs={
            'class': 'form-control',
            'placeholder': 'Enter your email address'
        }),
        help_text='Enter the email address associated with your account.'
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.helper = FormHelper()
        self.helper.form_method = 'post'
        self.helper.form_class = 'needs-validation'
        self.helper.attrs = {'novalidate': ''}

        self.helper.layout = Layout(
            Row(
                Column('email', css_class='form-group col-md-12 mb-3'),
            ),
            HTML('<div class="d-grid gap-2">'),
            Submit('submit', 'Send Reset Instructions', css_class='btn btn-primary'),
            HTML('</div>'),
            HTML('<div class="text-center mt-3">'),
            HTML('<a href="{% url "authentication:login" %}" class="btn btn-link">Back to Login</a>'),
            HTML('</div>')
        )


class RegistrationForm(forms.Form):
    """
    Form for user registration with complete profile information
    """
    # Account Information
    username = forms.CharField(
        max_length=150,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Username'
        }),
        label='Username'
    )

    email = forms.EmailField(
        widget=forms.EmailInput(attrs={
            'class': 'form-control',
            'placeholder': 'Email Address'
        }),
        label='Email Address'
    )

    password = forms.CharField(
        widget=forms.PasswordInput(attrs={
            'class': 'form-control',
            'placeholder': 'Password'
        }),
        label='Password',
        min_length=8,
        help_text='Password must be at least 8 characters long and contain at least one special character (!@#$%^&*).'
    )

    confirm_password = forms.CharField(
        widget=forms.PasswordInput(attrs={
            'class': 'form-control',
            'placeholder': 'Confirm Password'
        }),
        label='Confirm Password'
    )

    role = forms.ChoiceField(
        choices=[
            ('staff', 'Staff'),
            ('doctor', 'Doctor'),
            ('nurse', 'Nurse'),
            ('admin', 'Administrator'),
        ],
        widget=forms.Select(attrs={
            'class': 'form-control'
        }),
        label='Role',
        initial='staff'
    )

    # Personal Information
    first_name = forms.CharField(
        max_length=100,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'First Name'
        }),
        label='First Name'
    )

    last_name = forms.CharField(
        max_length=100,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Last Name'
        }),
        label='Last Name'
    )

    phone = forms.CharField(
        max_length=20,
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Phone Number'
        }),
        label='Phone Number'
    )

    date_of_birth = forms.DateField(
        required=False,
        widget=forms.DateInput(attrs={
            'class': 'form-control',
            'type': 'date'
        }),
        label='Date of Birth'
    )

    address = forms.CharField(
        required=False,
        widget=forms.Textarea(attrs={
            'class': 'form-control',
            'placeholder': 'Address',
            'rows': 3
        }),
        label='Address'
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.helper = FormHelper()
        self.helper.form_method = 'post'
        self.helper.form_class = 'needs-validation'
        self.helper.attrs = {'novalidate': ''}

        self.helper.layout = Layout(
            Fieldset(
                'Account Information',
                Row(
                    Column('username', css_class='form-group col-md-6 mb-3'),
                    Column('email', css_class='form-group col-md-6 mb-3'),
                ),
                Row(
                    Column('password', css_class='form-group col-md-6 mb-3'),
                    Column('confirm_password', css_class='form-group col-md-6 mb-3'),
                ),
                Field('role', css_class='mb-3'),
            ),
            Fieldset(
                'Personal Information',
                Row(
                    Column('first_name', css_class='form-group col-md-6 mb-3'),
                    Column('last_name', css_class='form-group col-md-6 mb-3'),
                ),
                Row(
                    Column('phone', css_class='form-group col-md-6 mb-3'),
                    Column('date_of_birth', css_class='form-group col-md-6 mb-3'),
                ),
                Field('address', css_class='mb-3'),
            ),
            HTML('<div class="d-grid gap-2 d-md-flex justify-content-md-end">'),
            Submit('submit', 'Register', css_class='btn btn-primary'),
            HTML('<a href="{% url "authentication:login" %}" class="btn btn-secondary">Back to Login</a>'),
            HTML('</div>')
        )

    def clean_password(self):
        password = self.cleaned_data.get('password')
        if password:
            # Check for special characters
            special_chars = '!@#$%^&*'
            if not any(char in special_chars for char in password):
                raise forms.ValidationError(
                    'Password must contain at least one special character (!@#$%^&*).'
                )

            # Check for at least one uppercase letter
            if not any(char.isupper() for char in password):
                raise forms.ValidationError(
                    'Password must contain at least one uppercase letter.'
                )

            # Check for at least one lowercase letter
            if not any(char.islower() for char in password):
                raise forms.ValidationError(
                    'Password must contain at least one lowercase letter.'
                )

            # Check for at least one digit
            if not any(char.isdigit() for char in password):
                raise forms.ValidationError(
                    'Password must contain at least one digit.'
                )

        return password

    def clean(self):
        cleaned_data = super().clean()
        password = cleaned_data.get('password')
        confirm_password = cleaned_data.get('confirm_password')

        if password and confirm_password:
            if password != confirm_password:
                raise forms.ValidationError("Passwords don't match")

        return cleaned_data


class ProfileEditForm(forms.Form):
    """
    Profile editing form
    """
    first_name = forms.CharField(
        max_length=50,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'First Name'
        }),
        label='First Name',
        required=True
    )

    last_name = forms.CharField(
        max_length=50,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Last Name'
        }),
        label='Last Name',
        required=True
    )

    phone = forms.CharField(
        max_length=20,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': '+1234567890'
        }),
        label='Phone Number',
        required=False
    )

    date_of_birth = forms.DateField(
        widget=forms.DateInput(attrs={
            'class': 'form-control',
            'type': 'date'
        }),
        label='Date of Birth',
        required=False
    )

    address = forms.CharField(
        widget=forms.Textarea(attrs={
            'class': 'form-control',
            'rows': 3,
            'placeholder': 'Enter your address'
        }),
        label='Address',
        required=False
    )

    avatar_url = forms.URLField(
        widget=forms.URLInput(attrs={
            'class': 'form-control',
            'placeholder': 'https://example.com/avatar.jpg'
        }),
        label='Avatar URL',
        required=False,
        help_text='Enter a URL for your profile picture'
    )

    def __init__(self, *args, **kwargs):
        # Extract initial data from user profile
        user_data = kwargs.pop('user_data', None)
        super().__init__(*args, **kwargs)

        if user_data and user_data.get('profile'):
            profile = user_data['profile']

            # Safely handle Unicode strings
            try:
                self.fields['first_name'].initial = str(profile.get('firstName', '')).strip()
                self.fields['last_name'].initial = str(profile.get('lastName', '')).strip()
                self.fields['phone'].initial = str(profile.get('phone', '')).strip()
                self.fields['address'].initial = str(profile.get('address', '')).strip()
                self.fields['avatar_url'].initial = str(profile.get('avatarUrl', '')).strip()

                # Handle date of birth
                dob = profile.get('dateOfBirth')
                if dob:
                    try:
                        # Parse ISO date format
                        if 'T' in str(dob):
                            from datetime import datetime
                            dt = datetime.fromisoformat(str(dob).replace('Z', ''))
                            self.fields['date_of_birth'].initial = dt.date()
                        else:
                            from datetime import datetime
                            dt = datetime.strptime(str(dob), '%Y-%m-%d')
                            self.fields['date_of_birth'].initial = dt.date()
                    except Exception:
                        # If date parsing fails, leave field empty
                        pass
            except Exception:
                # If any field initialization fails, continue with empty form
                pass
