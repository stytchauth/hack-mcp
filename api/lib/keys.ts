let aesKeyPromise: Promise<CryptoKey> | null = null;

/**
 * Initialize and memoize the AES key from a base64 string
 */
function initKey(env: Env): Promise<CryptoKey> {
    if(aesKeyPromise === null) {
        aesKeyPromise = crypto.subtle.importKey(
            "raw",
            Uint8Array.from(atob(env.ENCRYPTION_KEY), c => c.charCodeAt(0)),
            { name: "AES-GCM" },
            false,
            ["encrypt", "decrypt"]
        );
    }
    return aesKeyPromise;
}

/**
 * Encrypts the given secret into a base64 string (IV + ciphertext)
 */
export async function encryptSecret(env: Env, secret: string): Promise<string> {
    const key = await initKey(env);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(secret);

    const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        encoded
    );

    const fullBuffer = new Uint8Array(iv.length + encrypted.byteLength);
    fullBuffer.set(iv, 0);
    fullBuffer.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode(...fullBuffer));
}

/**
 * Decrypts a base64 string (IV + ciphertext) into the original string
 */
export async function decryptSecret(env: Env, encryptedBase64: string): Promise<string> {
    const key = await initKey(env);
    const fullBuffer = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
    const iv = fullBuffer.slice(0, 12);
    const ciphertext = fullBuffer.slice(12);

    const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        key,
        ciphertext
    );

    return new TextDecoder().decode(decrypted);
}
