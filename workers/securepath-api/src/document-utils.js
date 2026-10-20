export function isApprovedCloudinaryDocumentUrl(url, cloudName) {
  const name = String(cloudName || '').trim();
  return /^[a-zA-Z0-9_-]{1,128}$/.test(name)
    && String(url || '').startsWith('https://res.cloudinary.com/' + name + '/');
}
