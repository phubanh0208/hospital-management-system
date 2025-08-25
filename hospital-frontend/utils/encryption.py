"""
Encryption utilities for decrypting sensitive data from backend
"""
import os
import binascii
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
import logging

logger = logging.getLogger(__name__)

def get_encryption_key():
    """Get encryption key from environment variable"""
    key_hex = os.getenv('ENCRYPTION_KEY', 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456')
    if len(key_hex) != 64:  # 32 bytes = 64 hex chars
        raise ValueError('ENCRYPTION_KEY must be 64 hex characters (32 bytes)')
    return bytes.fromhex(key_hex)

def decrypt_sensitive_data(encrypted_text):
    """
    Decrypt sensitive data using AES-256-CBC
    Format: IV (16 bytes) + encrypted data
    """
    if not encrypted_text or encrypted_text.strip() == '':
        return encrypted_text
    
    try:
        key = get_encryption_key()
        
        # Extract IV and encrypted data
        iv_length = 16  # 16 bytes = 32 hex chars
        iv = bytes.fromhex(encrypted_text[:iv_length * 2])
        encrypted = bytes.fromhex(encrypted_text[iv_length * 2:])
        
        # Create cipher and decrypt
        cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
        decryptor = cipher.decryptor()
        
        decrypted_padded = decryptor.update(encrypted) + decryptor.finalize()
        
        # Remove PKCS7 padding
        padding_length = decrypted_padded[-1]
        decrypted = decrypted_padded[:-padding_length]
        
        return decrypted.decode('utf-8')
        
    except Exception as e:
        logger.error(f"Decryption failed for data: {encrypted_text[:20]}... Error: {e}")
        return encrypted_text  # Return original if decryption fails

def decrypt_email(encrypted_email):
    """Decrypt email address"""
    return decrypt_sensitive_data(encrypted_email)

def decrypt_phone(encrypted_phone):
    """Decrypt phone number"""
    return decrypt_sensitive_data(encrypted_phone)

def decrypt_user_data(user_data):
    """
    Decrypt sensitive fields in user data dictionary
    """
    if not isinstance(user_data, dict):
        return user_data
    
    decrypted_data = user_data.copy()
    
    # Decrypt email if present
    if 'email' in decrypted_data and decrypted_data['email']:
        try:
            decrypted_data['email'] = decrypt_email(decrypted_data['email'])
        except Exception as e:
            logger.warning(f"Failed to decrypt email: {e}")
    
    # Decrypt phone if present (could be in profile sub-object)
    if 'profile' in decrypted_data and isinstance(decrypted_data['profile'], dict):
        profile = decrypted_data['profile']
        if 'phone' in profile and profile['phone']:
            try:
                profile['phone'] = decrypt_phone(profile['phone'])
            except Exception as e:
                logger.warning(f"Failed to decrypt phone: {e}")
    
    # Also check for phone at top level
    if 'phone' in decrypted_data and decrypted_data['phone']:
        try:
            decrypted_data['phone'] = decrypt_phone(decrypted_data['phone'])
        except Exception as e:
            logger.warning(f"Failed to decrypt phone: {e}")
    
    return decrypted_data
