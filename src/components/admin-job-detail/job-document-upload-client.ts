type GoogleUploadResult = { id?: string };

export function uploadFileToGoogleDrive(uploadUrl: string, file: File, onProgress: (percentage: number) => void) {
  return new Promise<string>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('PUT', uploadUrl);
    request.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    request.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) onProgress(Math.round(event.loaded / event.total * 100));
    });
    request.addEventListener('load', () => {
      if (request.status < 200 || request.status >= 300) {
        reject(new Error(`Google Drive upload failed (${request.status}).`));
        return;
      }
      try {
        const result = JSON.parse(request.responseText) as GoogleUploadResult;
        if (!result.id) throw new Error('Google Drive did not return a file ID.');
        resolve(result.id);
      } catch (error) {
        reject(error);
      }
    });
    request.addEventListener('error', () => reject(new Error('Koneksi ke Google Drive terputus saat upload.')));
    request.addEventListener('abort', () => reject(new Error('Upload dibatalkan.')));
    request.send(file);
  });
}
