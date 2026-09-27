export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  webContentLink?: string;
  iconLink?: string;
  thumbnailLink?: string;
}

const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

/**
 * List files in Google Drive (root or specific folder)
 */
export async function listDriveFiles(
  accessToken: string,
  folderId?: string,
  searchQuery?: string
): Promise<DriveFileItem[]> {
  let q = "'me' in owners and trashed = false";
  if (folderId) {
    q += ` and '${folderId}' in parents`;
  }
  if (searchQuery && searchQuery.trim()) {
    q += ` and name contains '${searchQuery.trim().replace(/'/g, "\\'")}'`;
  }

  const params = new URLSearchParams({
    q,
    fields: 'files(id, name, mimeType, size, modifiedTime, webViewLink, webContentLink, iconLink, thumbnailLink)',
    orderBy: 'folder,modifiedTime desc',
    pageSize: '50'
  });

  const res = await fetch(`${DRIVE_API_URL}/files?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Drive API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.files || [];
}

/**
 * Create a folder in Google Drive
 */
export async function createDriveFolder(
  accessToken: string,
  folderName: string,
  parentFolderId?: string
): Promise<DriveFileItem> {
  const metadata: any = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentFolderId) {
    metadata.parents = [parentFolderId];
  }

  const res = await fetch(`${DRIVE_API_URL}/files`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(metadata)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gagal membuat folder: ${errText}`);
  }

  return await res.json();
}

/**
 * Upload text/JSON/CSV file to Google Drive using multipart upload
 */
export async function uploadDriveFile(
  accessToken: string,
  fileName: string,
  mimeType: string,
  content: string,
  parentFolderId?: string
): Promise<DriveFileItem> {
  const metadata: any = {
    name: fileName,
    mimeType
  };
  if (parentFolderId) {
    metadata.parents = [parentFolderId];
  }

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${mimeType}\r\n\r\n` +
    content +
    closeDelimiter;

  const res = await fetch(DRIVE_UPLOAD_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body: multipartRequestBody
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gagal mengunggah berkas ke Google Drive: ${errText}`);
  }

  return await res.json();
}

/**
 * Delete a file in Google Drive
 * MUST only be invoked after explicit user confirmation dialog
 */
export async function deleteDriveFile(
  accessToken: string,
  fileId: string
): Promise<void> {
  const res = await fetch(`${DRIVE_API_URL}/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!res.ok && res.status !== 204) {
    const errText = await res.text();
    throw new Error(`Gagal menghapus berkas: ${errText}`);
  }
}
