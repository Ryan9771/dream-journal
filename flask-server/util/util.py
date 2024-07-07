def encrypt_data(data: str, fernet) -> str:
    return fernet.encrypt(data.encode()).decode()


def decrypt_data(encrypted_data: str, fernet) -> str:
    return fernet.decrypt(encrypted_data.encode()).decode()
