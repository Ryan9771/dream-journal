from cryptography.fernet import Fernet
from dotenv import dotenv_values

secrets = dotenv_values(".env")
cipher_suite = Fernet(secrets["ENCRYPTION_KEY"].encode("utf-8"))


def encrypt_data(data: str) -> str:
    return cipher_suite.encrypt(data.encode("utf-8")).decode("utf-8")


def decrypt_data(encrypted_data: str) -> str:
    return cipher_suite.decrypt(encrypted_data.encode("utf-8")).decode("utf-8")
