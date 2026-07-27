import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

export const provider = new GoogleAuthProvider();
// Scopes needed for Google Drive
provider.addScope('https://www.googleapis.com/auth/drive');
provider.addScope('https://www.googleapis.com/auth/drive.file');

// Cache the access token in memory
let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Custom callbacks list
const authListeners = new Set<(user: User | null, token: string | null) => void>();

export const initAuth = (
  callback: (user: User | null, token: string | null) => void
) => {
  authListeners.add(callback);
  
  // Return cleanup function
  const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
    if (user && cachedAccessToken) {
      callback(user, cachedAccessToken);
    } else {
      // If user is logged in but token is not cached, we can clear or wait for googleSignIn
      callback(user, cachedAccessToken);
    }
  });

  return () => {
    authListeners.delete(callback);
    unsubscribe();
  };
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }

    cachedAccessToken = credential.accessToken;
    // Save to session storage as fallback to survive quick page reloads, but only for ease of use
    sessionStorage.setItem('gd_access_token', cachedAccessToken);

    // Notify all listeners
    authListeners.forEach((listener) => listener(result.user, cachedAccessToken));

    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  if (!cachedAccessToken) {
    cachedAccessToken = sessionStorage.getItem('gd_access_token');
  }
  return cachedAccessToken;
};

export const logoutGD = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  sessionStorage.removeItem('gd_access_token');
  authListeners.forEach((listener) => listener(null, null));
};

// Google Drive Folder ID provided by user
export const GDRIVE_FOLDER_ID = '1iIhfp12UV5loA6C3FQyQPv0z0gbbTLzI';

export interface GDriveFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
  size?: string;
  webViewLink?: string;
  webContentLink?: string;
}

// List files in the specific Google Drive folder
export const listDriveFiles = async (accessToken: string): Promise<GDriveFile[]> => {
  try {
    const query = `'${GDRIVE_FOLDER_ID}' in parents and trashed = false`;
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
      query
    )}&orderBy=createdTime desc&fields=files(id,name,mimeType,createdTime,size,webViewLink,webContentLink)&pageSize=50`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Failed to list Google Drive files');
    }

    const data = await response.json();
    return data.files || [];
  } catch (error) {
    console.error('Error listing Drive files:', error);
    throw error;
  }
};

// Fetch Google Drive File Content as Blob for direct inline playback
export const fetchDriveFileBlob = async (accessToken: string, fileId: string): Promise<Blob> => {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch file content from Google Drive');
  }

  return await response.blob();
};

// Upload a generated file to the specific folder on Google Drive
export const uploadFileToDrive = async (
  accessToken: string,
  fileUrl: string,
  filename: string,
  mimeType: string = 'audio/mpeg'
): Promise<GDriveFile> => {
  try {
    // 1. Download file from server as blob
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error('Failed to retrieve synthesized audio from local server');
    }
    const fileBlob = await fileResponse.blob();

    // 2. Initiate Resumable Upload Session
    const createSessionResponse = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': mimeType,
        },
        body: JSON.stringify({
          name: filename,
          parents: [GDRIVE_FOLDER_ID],
        }),
      }
    );

    if (!createSessionResponse.ok) {
      const err = await createSessionResponse.json();
      throw new Error(err.error?.message || 'Failed to initiate resumable upload session');
    }

    const uploadUrl = createSessionResponse.headers.get('Location');
    if (!uploadUrl) {
      throw new Error('Resumable upload session location header not found');
    }

    // 3. Upload actual binary file content
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': mimeType,
      },
      body: fileBlob,
    });

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload file chunk to Google Drive');
    }

    const fileData = await uploadResponse.json();
    return fileData;
  } catch (error) {
    console.error('Error uploading file to Drive:', error);
    throw error;
  }
};

// Delete a file from Google Drive
export const deleteDriveFile = async (accessToken: string, fileId: string): Promise<void> => {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Failed to delete file from Google Drive');
  }
};
